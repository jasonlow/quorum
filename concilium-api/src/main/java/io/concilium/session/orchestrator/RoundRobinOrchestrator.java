package io.concilium.session.orchestrator;

import io.concilium.agent.domain.AgentProfile;
import io.concilium.agent.store.AgentProfileRepository;
import io.concilium.committee.domain.Committee;
import io.concilium.committee.domain.CommitteeMember;
import io.concilium.committee.store.CommitteeMemberRepository;
import io.concilium.committee.store.CommitteeRepository;
import io.concilium.platform.telemetry.CorrelationContext;
import io.concilium.session.domain.AgentRunState;
import io.concilium.session.domain.Phase;
import io.concilium.session.domain.Session;
import io.concilium.session.domain.SessionAgentState;
import io.concilium.session.store.SessionAgentStateRepository;
import io.concilium.session.store.SessionRepository;
import io.concilium.session.streaming.SseChannelManager;
import io.concilium.session.streaming.SseEventType;
import io.concilium.session.streaming.events.AgentDraftDoneEvent;
import io.concilium.session.streaming.events.AgentFailedEvent;
import io.concilium.session.streaming.events.AgentStateEvent;
import io.concilium.session.streaming.events.PhaseChangedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Fans out the committee's agents on Java 21 virtual threads, awaits all
 * drafts, and emits SSE state events at every transition.
 *
 * <p>Pattern label is "Round Robin" per the committee spec, but for the
 * PoC the actual flow is <em>parallel</em>: all agents see the same context
 * simultaneously — this matches the boardroom UX where every tile lights up
 * at once. Speak-in-turn semantics (where agent N sees agents 1..N-1's
 * drafts) is a Phase 2 enhancement once Q&amp;A lands.
 *
 * <p>Validates PoC Bet B1: wall-clock should approach {@code max(per-agent
 * latency)}, not {@code sum}. The CoS quality gate lands in W2-T07 — for
 * now we finish at BRIEFED with raw drafts.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RoundRobinOrchestrator {

    private final SessionRepository sessions;
    private final SessionAgentStateRepository agentStates;
    private final CommitteeRepository committees;
    private final CommitteeMemberRepository members;
    private final AgentProfileRepository agents;
    private final AgentInvoker invoker;
    private final SseChannelManager sse;

    /**
     * Kicks off deliberation on a background virtual thread and returns
     * immediately. Caller should subscribe to {@code GET /sessions/{id}/stream}
     * to watch progress.
     */
    public void startAsync(UUID sessionId) {
        Map<String, String> mdc = CorrelationContext.snapshot();
        Thread.ofVirtual()
            .name("orchestrator-" + sessionId)
            .start(() -> CorrelationContext.runWith(mdc, () -> runBlocking(sessionId)));
    }

    /** Blocking version. Spawns a virtual thread per agent, awaits all. */
    public void runBlocking(UUID sessionId) {
        Instant t0 = Instant.now();
        log.info("Deliberation started: session={}", sessionId);

        Session session = sessions.findById(sessionId).orElseThrow(
            () -> new IllegalStateException("Session not found: " + sessionId));
        Committee committee = committees.findById(session.getCommitteeId()).orElseThrow(
            () -> new IllegalStateException("Committee not found"));
        List<CommitteeMember> roster = members
            .findByCommitteeIdOrderBySpeakingOrderAsc(committee.getId());

        transitionPhase(session, Phase.DELIBERATING);

        // Snapshot MDC once, propagate to every fan-out thread
        Map<String, String> mdc = CorrelationContext.snapshot();

        try (ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<?>> futures = new java.util.ArrayList<>(roster.size());
            for (CommitteeMember m : roster) {
                futures.add(pool.submit(() ->
                    CorrelationContext.runWith(mdc, () ->
                        runOneAgent(sessionId, committee, m.getAgentId()))));
            }
            for (Future<?> f : futures) {
                try { f.get(); } catch (Exception ignore) { /* logged at source */ }
            }
        }

        long wallMs = Duration.between(t0, Instant.now()).toMillis();
        log.info("Deliberation phase complete: session={} agents={} wallClock={}ms",
            sessionId, roster.size(), wallMs);

        // CoS gate lands in W2-T07. For now we close at BRIEFED with raw drafts.
        transitionPhase(reload(sessionId), Phase.BRIEFED);
        sse.send(sessionId, SseEventType.SESSION_COMPLETED,
            Map.of("sessionId", sessionId, "wallClockMs", wallMs));
        sse.closeSession(sessionId);
    }

    // ---------------------------------------------------------------------

    private void runOneAgent(UUID sessionId, Committee committee, UUID agentId) {
        AgentProfile agent = agents.findById(agentId).orElseThrow();

        // QUEUED -> THINKING
        updateState(sessionId, agentId, AgentRunState.THINKING, 25);
        emitAgentState(sessionId, agent, AgentRunState.THINKING, 25);

        AgentDraft draft;
        try {
            Session s = reload(sessionId);
            draft = invoker.invoke(agent, committee.getName(),
                s.getTopic(), s.getContextMd());
        } catch (RuntimeException e) {
            updateState(sessionId, agentId, AgentRunState.FAILED, 0);
            sse.send(sessionId, SseEventType.AGENT_FAILED,
                AgentFailedEvent.of(sessionId, agentId, agent.getName(), e.getMessage()));
            log.error("Agent failed: session={} agent={}", sessionId, agent.getName(), e);
            return;
        }

        // SUBMITTED with draft saved
        updateStateWithDraft(sessionId, agentId, AgentRunState.SUBMITTED, 100, draft.text());
        emitAgentState(sessionId, agent, AgentRunState.SUBMITTED, 100);
        sse.send(sessionId, SseEventType.AGENT_DRAFT_DONE,
            new AgentDraftDoneEvent(sessionId, agentId, agent.getName(),
                draft.modelUsed(), draft.promptTokens(), draft.completionTokens(),
                draft.latency().toMillis(), Instant.now()));
    }

    private void emitAgentState(UUID sessionId, AgentProfile agent,
                                AgentRunState state, int progress) {
        sse.send(sessionId, SseEventType.AGENT_STATE,
            AgentStateEvent.of(sessionId, agent.getId(), agent.getName(), state, progress));
    }

    private Session reload(UUID sessionId) {
        return sessions.findById(sessionId).orElseThrow();
    }

    private void transitionPhase(Session session, Phase to) {
        Phase from = session.getPhase();
        if (from == to) return;
        session.setPhase(to);
        sessions.save(session);
        sse.send(session.getId(), SseEventType.PHASE_CHANGED,
            PhaseChangedEvent.of(session.getId(), from, to));
        log.info("phase: session={} {} -> {}", session.getId(), from, to);
    }

    private void updateState(UUID sessionId, UUID agentId, AgentRunState state, int progress) {
        var st = agentStates.findById(new SessionAgentState.PK(sessionId, agentId)).orElseThrow();
        st.setState(state);
        st.setProgress(progress);
        agentStates.save(st);
    }

    private void updateStateWithDraft(UUID sessionId, UUID agentId,
                                      AgentRunState state, int progress, String draft) {
        var st = agentStates.findById(new SessionAgentState.PK(sessionId, agentId)).orElseThrow();
        st.setState(state);
        st.setProgress(progress);
        st.setDraftText(draft);
        agentStates.save(st);
    }
}
