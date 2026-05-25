package io.quorum.session.orchestrator;

import io.quorum.agent.domain.AgentProfile;
import io.quorum.agent.store.AgentProfileRepository;
import io.quorum.committee.domain.Committee;
import io.quorum.committee.domain.CommitteeMember;
import io.quorum.committee.domain.QaIntensity;
import io.quorum.committee.store.CommitteeMemberRepository;
import io.quorum.committee.store.CommitteeRepository;
import io.quorum.platform.telemetry.CorrelationContext;
import io.quorum.brief.domain.Brief;
import io.quorum.brief.service.Consolidator;
import io.quorum.session.cos.ChiefOfStaffService;
import io.quorum.session.cos.CosReview;
import io.quorum.session.cos.CosReviewRepository;
import io.quorum.session.cos.CosReviewResult;
import io.quorum.session.cos.CosVerdict;
import io.quorum.session.documents.DocumentContextFormatter;
import io.quorum.session.domain.SessionAgentDraft;
import io.quorum.session.domain.SessionDocument;
import io.quorum.session.store.SessionAgentDraftRepository;
import io.quorum.session.store.SessionDocumentRepository;
import io.quorum.session.domain.AgentRunState;
import io.quorum.session.domain.Phase;
import io.quorum.session.domain.Session;
import io.quorum.session.domain.SessionAgentState;
import io.quorum.session.store.SessionAgentStateRepository;
import io.quorum.session.store.SessionRepository;
import io.quorum.session.streaming.SseChannelManager;
import io.quorum.session.streaming.SseEventType;
import io.quorum.session.streaming.events.AgentDraftDoneEvent;
import io.quorum.session.streaming.events.AgentDraftTokenEvent;
import io.quorum.session.streaming.events.AgentFailedEvent;
import io.quorum.session.streaming.events.AgentStateEvent;
import io.quorum.session.streaming.events.PhaseChangedEvent;
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
import java.util.concurrent.atomic.AtomicBoolean;

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
    private final SessionDocumentRepository sessionDocuments;
    private final SessionAgentDraftRepository sessionAgentDrafts;
    private final AgentInvoker invoker;
    private final ChiefOfStaffService cos;
    private final CosReviewRepository cosReviews;
    private final Consolidator consolidator;
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

        long deliberationMs = Duration.between(t0, Instant.now()).toMillis();
        log.info("Deliberation + CoS gate complete: session={} agents={} wallClock={}ms",
            sessionId, roster.size(), deliberationMs);

        // ---- BRIEF ----
        Brief brief;
        try {
            brief = consolidator.build(sessionId);
            sse.send(sessionId, SseEventType.BRIEF_READY, Map.of(
                "sessionId", sessionId,
                "briefId", brief.getId(),
                "recommendation", brief.getRecommendation() == null ? "" : brief.getRecommendation(),
                "confidence", brief.getConfidence() == null ? "" : brief.getConfidence()
            ));
        } catch (RuntimeException e) {
            log.error("Brief consolidation failed: session={}", sessionId, e);
            sse.send(sessionId, SseEventType.AGENT_FAILED, Map.of(
                "sessionId", sessionId,
                "stage", "brief",
                "reason", e.getMessage() == null ? "unknown" : e.getMessage()
            ));
        }

        long wallMs = Duration.between(t0, Instant.now()).toMillis();
        transitionPhase(reload(sessionId), Phase.BRIEFED);
        sse.send(sessionId, SseEventType.SESSION_COMPLETED, Map.of(
            "sessionId", sessionId,
            "wallClockMs", wallMs,
            "deliberationMs", deliberationMs
        ));
        sse.closeSession(sessionId);
    }

    // ---------------------------------------------------------------------

    private void runOneAgent(UUID sessionId, Committee committee, UUID agentId) {
        AgentProfile agent = agents.findById(agentId).orElseThrow();
        Session s = reload(sessionId);
        String topic = s.getTopic();
        String context = s.getContextMd();
        List<SessionDocument> docs = sessionDocuments.findBySessionIdOrderByCreatedAtAsc(sessionId);
        String supportingDocsMd = DocumentContextFormatter.render(docs);
        // Standing-doctrine wikis — read once at session start; if the chair
        // edits them mid-session, the new value won't apply until next session.
        String committeeKnowledgeMd = committee.getKnowledgeText();
        String agentKnowledgeMd = agent.getKnowledgeText();
        QaIntensity qa = committee.getQaIntensity();
        // SINGLE caps revisions at 1 regardless of committee setting; DEEP
        // honours the full maxRevisionRounds budget; NONE skips CoS entirely
        // below so the budget is moot.
        int revisionBudget = switch (qa) {
            case NONE   -> 0;
            case SINGLE -> Math.min(1, committee.getMaxRevisionRounds());
            case DEEP   -> committee.getMaxRevisionRounds();
        };

        // ---- THINKING -> initial DRAFT ----
        updateState(sessionId, agentId, AgentRunState.THINKING, 25);
        emitAgentState(sessionId, agent, AgentRunState.THINKING, 25);

        AgentDraft draft;
        try {
            draft = invoker.invokeStreaming(agent, committee.getName(), topic, context,
                committeeKnowledgeMd, agentKnowledgeMd, supportingDocsMd,
                tokenStreamer(sessionId, agent));
        } catch (RuntimeException e) {
            failAgent(sessionId, agent, e.getMessage());
            return;
        }
        persistDraft(sessionId, agentId, AgentRunState.SUBMITTED, draft.text());
        persistDraftRow(sessionId, agentId, 1, draft);
        emitAgentState(sessionId, agent, AgentRunState.SUBMITTED, 100);
        sse.send(sessionId, SseEventType.AGENT_DRAFT_DONE,
            new AgentDraftDoneEvent(sessionId, agentId, agent.getName(),
                draft.modelUsed(), draft.promptTokens(), draft.completionTokens(),
                draft.latency().toMillis(), Instant.now()));

        // ---- QA = NONE: no CoS gate, ship the first draft ----
        if (qa == QaIntensity.NONE) {
            updateState(sessionId, agentId, AgentRunState.PASSED, 100);
            emitAgentState(sessionId, agent, AgentRunState.PASSED, 100);
            return;
        }

        // ---- CoS LOOP (SINGLE: 1 review + up to 1 revision;
        //                 DEEP: review until pass or budget exhausted) ----
        AgentDraft currentDraft = draft;
        int round = 1;
        int revisionsUsed = 0;

        while (true) {
            CosReviewResult review = cos.review(agent, committee.getName(), topic, context,
                committeeKnowledgeMd, agentKnowledgeMd, supportingDocsMd, currentDraft.text());
            persistCosReview(sessionId, agentId, round, review);

            switch (review.verdict()) {
                case PASSED -> {
                    terminate(sessionId, agent, AgentRunState.PASSED, review);
                    return;
                }
                case PASSED_WITH_NOTE -> {
                    terminate(sessionId, agent, AgentRunState.PASSED_WITH_NOTE, review);
                    return;
                }
                case FAILED -> {
                    terminate(sessionId, agent, AgentRunState.FAILED, review);
                    return;
                }
                case REVISION_REQUESTED -> {
                    if (revisionsUsed >= revisionBudget) {
                        // Out of rounds — accept the latest draft with note
                        terminate(sessionId, agent, AgentRunState.PASSED_WITH_NOTE, review);
                        return;
                    }
                    // fall through to revise
                }
            }

            sse.send(sessionId, SseEventType.COS_REVISION_REQ, Map.of(
                "sessionId", sessionId,
                "agentId", agentId,
                "agentName", agent.getName(),
                "challenge", review.challenge() == null ? "" : review.challenge()
            ));

            updateState(sessionId, agentId, AgentRunState.REVISING, 60);
            emitAgentState(sessionId, agent, AgentRunState.REVISING, 60);

            AgentDraft revised;
            try {
                revised = invoker.invokeRevisionStreaming(agent, committee.getName(), topic, context,
                    committeeKnowledgeMd, agentKnowledgeMd, supportingDocsMd,
                    currentDraft.text(), review.challenge(),
                    tokenStreamer(sessionId, agent));
            } catch (RuntimeException e) {
                failAgent(sessionId, agent, e.getMessage());
                return;
            }
            persistDraft(sessionId, agentId, AgentRunState.SUBMITTED, revised.text());
            // round_no for the revised draft is the upcoming CoS round (1-indexed
            // and aligned with cos_reviews): round 2 = first revision, round 3 = second.
            persistDraftRow(sessionId, agentId, round + 1, revised);
            emitAgentState(sessionId, agent, AgentRunState.SUBMITTED, 90);
            sse.send(sessionId, SseEventType.AGENT_DRAFT_DONE,
                new AgentDraftDoneEvent(sessionId, agentId, agent.getName(),
                    revised.modelUsed(), revised.promptTokens(), revised.completionTokens(),
                    revised.latency().toMillis(), Instant.now()));

            currentDraft = revised;
            revisionsUsed++;
            round++;
        }
    }

    private void terminate(UUID sessionId, AgentProfile agent,
                           AgentRunState terminalState, CosReviewResult review) {
        updateState(sessionId, agent.getId(), terminalState, 100);
        emitAgentState(sessionId, agent, terminalState, 100);
        String eventType = switch (review.verdict()) {
            case PASSED              -> SseEventType.COS_REVIEW_PASSED;
            case PASSED_WITH_NOTE    -> SseEventType.COS_REVIEW_NOTED;
            case REVISION_REQUESTED  -> SseEventType.COS_REVIEW_NOTED; // out of rounds
            case FAILED              -> SseEventType.AGENT_FAILED;
        };
        sse.send(sessionId, eventType, Map.of(
            "sessionId", sessionId,
            "agentId", agent.getId(),
            "agentName", agent.getName(),
            "verdict", review.verdict(),
            "scores", Map.of(
                "specificity",  review.specificity(),
                "completeness", review.completeness(),
                "evidence",     review.evidence(),
                "boundaries",   review.boundaries(),
                "ideology",     review.ideology()),
            "note", review.challenge() == null ? "" : review.challenge()
        ));
    }

    private void failAgent(UUID sessionId, AgentProfile agent, String reason) {
        updateState(sessionId, agent.getId(), AgentRunState.FAILED, 0);
        emitAgentState(sessionId, agent, AgentRunState.FAILED, 0);
        sse.send(sessionId, SseEventType.AGENT_FAILED,
            AgentFailedEvent.of(sessionId, agent.getId(), agent.getName(), reason));
        log.error("Agent failed: session={} agent={} reason={}",
            sessionId, agent.getName(), reason);
    }

    private void persistDraft(UUID sessionId, UUID agentId, AgentRunState state, String draft) {
        updateStateWithDraft(sessionId, agentId, state, 100, draft);
    }

    private void persistDraftRow(UUID sessionId, UUID agentId, int roundNo, AgentDraft d) {
        sessionAgentDrafts.save(SessionAgentDraft.builder()
            .sessionId(sessionId)
            .agentId(agentId)
            .roundNo(roundNo)
            .draftText(d.text())
            .modelUsed(d.modelUsed())
            .promptTokens(d.promptTokens())
            .completionTokens(d.completionTokens())
            .latencyMs(d.latency() == null ? null : (int) d.latency().toMillis())
            .build());
    }

    private void persistCosReview(UUID sessionId, UUID agentId, int round, CosReviewResult r) {
        cosReviews.save(CosReview.builder()
            .sessionId(sessionId)
            .agentId(agentId)
            .roundNo(round)
            .specificityScore((short) r.specificity())
            .completenessScore((short) r.completeness())
            .evidenceScore((short) r.evidence())
            .boundariesScore((short) r.boundaries())
            .ideologyScore((short) r.ideology())
            .verdict(r.verdict())
            .challengeText(r.challenge())
            .build());
    }

    private void emitAgentState(UUID sessionId, AgentProfile agent,
                                AgentRunState state, int progress) {
        sse.send(sessionId, SseEventType.AGENT_STATE,
            AgentStateEvent.of(sessionId, agent.getId(), agent.getName(), state, progress));
    }

    /**
     * Returns a token-stream callback that handles two responsibilities:
     *   1) On the FIRST chunk, transitions agent state THINKING → DRAFTING
     *      and emits the state-change event. This is the visible moment
     *      where the tile starts "typing" — reasoner models have a noticeable
     *      delay before the first token arrives.
     *   2) For every chunk (including the first), emits an
     *      {@code agent.draft.token} SSE event carrying just the delta.
     */
    private java.util.function.Consumer<String> tokenStreamer(UUID sessionId, AgentProfile agent) {
        AtomicBoolean transitionedToDrafting = new AtomicBoolean(false);
        return delta -> {
            if (transitionedToDrafting.compareAndSet(false, true)) {
                updateState(sessionId, agent.getId(), AgentRunState.DRAFTING, 60);
                emitAgentState(sessionId, agent, AgentRunState.DRAFTING, 60);
            }
            sse.send(sessionId, SseEventType.AGENT_DRAFT_TOKEN,
                AgentDraftTokenEvent.of(sessionId, agent.getId(), agent.getName(), delta));
        };
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
