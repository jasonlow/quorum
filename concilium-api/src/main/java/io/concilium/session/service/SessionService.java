package io.concilium.session.service;

import io.concilium.agent.domain.AgentProfile;
import io.concilium.agent.store.AgentProfileRepository;
import io.concilium.committee.domain.Committee;
import io.concilium.committee.domain.CommitteeMember;
import io.concilium.committee.store.CommitteeMemberRepository;
import io.concilium.committee.store.CommitteeRepository;
import io.concilium.session.api.dto.AgentDraftView;
import io.concilium.session.api.dto.ConveneRequest;
import io.concilium.session.api.dto.SessionListItem;
import io.concilium.session.api.dto.SessionView;
import io.concilium.session.domain.AgentRunState;
import io.concilium.session.domain.Phase;
import io.concilium.session.domain.Session;
import io.concilium.session.domain.SessionAgentState;
import io.concilium.session.orchestrator.AgentDraft;
import io.concilium.session.orchestrator.AgentInvoker;
import io.concilium.session.store.SessionAgentStateRepository;
import io.concilium.session.store.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Session lifecycle operations. PoC scope: convene + run-one-agent.
 * Full orchestrator (parallel fan-out, CoS gate, brief) lands in Week 2.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {

    private static final String DEFAULT_COMMITTEE = "Investment Risk Committee";

    private final SessionRepository sessions;
    private final SessionAgentStateRepository agentStates;
    private final CommitteeRepository committees;
    private final CommitteeMemberRepository members;
    private final AgentProfileRepository agents;
    private final AgentInvoker invoker;

    /** Creates a new session in CONVENED phase with agent states in QUEUED. */
    @Transactional
    public SessionView convene(ConveneRequest req) {
        Committee committee = resolveCommittee(req.committeeId());

        Session session = sessions.save(Session.builder()
            .committeeId(committee.getId())
            .topic(req.topic())
            .contextMd(req.contextMd())
            .phase(Phase.CONVENED)
            .build());

        List<CommitteeMember> memberList = members
            .findByCommitteeIdOrderBySpeakingOrderAsc(committee.getId());
        if (memberList.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST,
                "Committee '" + committee.getName() + "' has no members");
        }

        for (CommitteeMember m : memberList) {
            agentStates.save(SessionAgentState.builder()
                .sessionId(session.getId())
                .agentId(m.getAgentId())
                .state(AgentRunState.QUEUED)
                .progress(0)
                .build());
        }

        log.info("Convened session {} on committee '{}' with {} members",
            session.getId(), committee.getName(), memberList.size());

        return toView(session);
    }

    /** Synchronously invokes one agent on a session and stores the draft. */
    @Transactional
    public AgentDraftView runOneAgent(UUID sessionId, UUID agentId) {
        Session session = sessions.findById(sessionId).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Session not found: " + sessionId));

        Committee committee = committees.findById(session.getCommitteeId()).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND,
                "Committee gone for session " + sessionId));

        // Ensure the agent is a member of this committee
        boolean isMember = members
            .findByCommitteeIdOrderBySpeakingOrderAsc(committee.getId())
            .stream().anyMatch(m -> m.getAgentId().equals(agentId));
        if (!isMember) {
            throw new ResponseStatusException(BAD_REQUEST,
                "Agent " + agentId + " is not a member of committee '" + committee.getName() + "'");
        }

        AgentProfile agent = agents.findById(agentId).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Agent not found: " + agentId));

        // Transition to THINKING (state changes are streamed in W2)
        SessionAgentState st = agentStates.findById(
            new SessionAgentState.PK(sessionId, agentId)).orElseThrow();
        st.setState(AgentRunState.THINKING);
        agentStates.save(st);

        // First real LLM call. Synchronous and blocking — fine on a Java 21
        // virtual thread (Spring Boot 3.5 default for MVC).
        AgentDraft draft;
        try {
            draft = invoker.invoke(agent, committee.getName(),
                session.getTopic(), session.getContextMd());
        } catch (RuntimeException e) {
            st.setState(AgentRunState.FAILED);
            agentStates.save(st);
            log.error("Agent invocation failed: agent={}, session={}", agent.getName(), sessionId, e);
            throw e;
        }

        st.setState(AgentRunState.SUBMITTED);
        st.setProgress(100);
        st.setDraftText(draft.text());
        agentStates.save(st);

        // PoC: also nudge session phase forward so callers can see we're past CONVENED
        if (session.getPhase() == Phase.CONVENED) {
            session.setPhase(Phase.DELIBERATING);
            sessions.save(session);
        }

        return new AgentDraftView(
            sessionId, agentId, agent.getName(),
            AgentRunState.SUBMITTED, draft.text(),
            draft.modelUsed(), draft.promptTokens(), draft.completionTokens(),
            draft.latency().toMillis()
        );
    }

    @Transactional(readOnly = true)
    public SessionView get(UUID sessionId) {
        Session s = sessions.findById(sessionId).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Session not found: " + sessionId));
        return toView(s);
    }

    /** Recent sessions newest-first, with decision summary joined. */
    @Transactional(readOnly = true)
    public List<SessionListItem> listRecent(int limit) {
        int capped = Math.max(1, Math.min(limit, 500));
        return sessions.listRecent(org.springframework.data.domain.PageRequest.of(0, capped));
    }

    // ---------------------------------------------------------------------

    private Committee resolveCommittee(UUID requested) {
        if (requested == null) {
            return committees.findByName(DEFAULT_COMMITTEE).orElseThrow(
                () -> new ResponseStatusException(BAD_REQUEST,
                    "Default committee '" + DEFAULT_COMMITTEE + "' not found"));
        }
        return committees.findById(requested).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Committee not found: " + requested));
    }

    private SessionView toView(Session session) {
        var states = agentStates.findBySessionId(session.getId());
        // Resolve agent names in one batch
        var byId = agents.findAllById(states.stream().map(SessionAgentState::getAgentId).toList())
            .stream().collect(java.util.stream.Collectors.toMap(AgentProfile::getId, a -> a));

        var entries = states.stream()
            .map(s -> new SessionView.AgentEntry(
                s.getAgentId(),
                byId.getOrDefault(s.getAgentId(),
                    AgentProfile.builder().name("(unknown)").build()).getName(),
                s.getState(),
                s.getProgress(),
                s.getDraftText() != null && !s.getDraftText().isBlank()))
            .toList();

        String committeeName = committees.findById(session.getCommitteeId())
            .map(Committee::getName)
            .orElse("(unknown committee)");

        return SessionView.from(session, committeeName, entries);
    }
}
