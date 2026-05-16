package io.concilium.audit.service;

import io.concilium.agent.domain.AgentProfile;
import io.concilium.agent.store.AgentProfileRepository;
import io.concilium.brief.domain.Brief;
import io.concilium.brief.store.BriefRepository;
import io.concilium.committee.domain.Committee;
import io.concilium.committee.domain.CommitteeMember;
import io.concilium.committee.store.CommitteeMemberRepository;
import io.concilium.committee.store.CommitteeRepository;
import io.concilium.decision.domain.Decision;
import io.concilium.session.cos.CosReview;
import io.concilium.session.cos.CosReviewRepository;
import io.concilium.session.domain.Session;
import io.concilium.session.domain.SessionAgentState;
import io.concilium.session.store.SessionAgentStateRepository;
import io.concilium.session.store.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Assembles the full set of session artefacts into a deterministic
 * {@code Map<String, Object>} suitable for canonical serialisation.
 * The shape of this map is the audit contract — change cautiously.
 *
 * <p>Includes: session metadata, agent rosters + drafts, every CoS
 * review pass, brief, decision. The hash chain prev_hash + signature
 * sit OUTSIDE this payload in the surrounding envelope (so the
 * verifier doesn't double-include them when recomputing the hash).
 */
@Component
@RequiredArgsConstructor
public class CanonicalPayloadBuilder {

    private final SessionRepository sessions;
    private final SessionAgentStateRepository agentStates;
    private final CommitteeRepository committees;
    private final CommitteeMemberRepository members;
    private final AgentProfileRepository agents;
    private final CosReviewRepository cosReviews;
    private final BriefRepository briefs;

    public Map<String, Object> build(UUID sessionId, Decision decision) {
        Session session = sessions.findById(sessionId).orElseThrow();
        Committee committee = committees.findById(session.getCommitteeId()).orElseThrow();
        List<CommitteeMember> roster = members.findByCommitteeIdOrderBySpeakingOrderAsc(committee.getId());
        List<SessionAgentState> states = agentStates.findBySessionId(sessionId);

        Map<UUID, AgentProfile> byId = agents.findAllById(
                roster.stream().map(CommitteeMember::getAgentId).toList()).stream()
            .collect(Collectors.toMap(AgentProfile::getId, a -> a));

        Map<String, Object> root = new LinkedHashMap<>();

        // --- session
        Map<String, Object> sessionMap = new LinkedHashMap<>();
        sessionMap.put("id", session.getId().toString());
        sessionMap.put("committeeId", committee.getId().toString());
        sessionMap.put("committeeName", committee.getName());
        sessionMap.put("orchestrationPattern", committee.getOrchestrationPattern().name());
        sessionMap.put("qaIntensity", committee.getQaIntensity().name());
        sessionMap.put("decisionRule", committee.getDecisionRule());
        sessionMap.put("topic", session.getTopic());
        sessionMap.put("contextMd", session.getContextMd());
        sessionMap.put("phase", session.getPhase().name());
        sessionMap.put("startedAt", session.getStartedAt());
        root.put("session", sessionMap);

        // --- agents (with their final draft + state)
        List<Map<String, Object>> agentEntries = new ArrayList<>();
        for (CommitteeMember m : roster) {
            AgentProfile a = byId.get(m.getAgentId());
            if (a == null) continue;
            SessionAgentState st = states.stream()
                .filter(s -> s.getAgentId().equals(m.getAgentId()))
                .findFirst().orElse(null);
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("agentId", a.getId().toString());
            e.put("agentName", a.getName());
            e.put("speakingOrder", m.getSpeakingOrder());
            e.put("ideology", a.getIdeology());
            e.put("modelOverride", a.getModelOverride());
            e.put("finalState", st == null ? null : st.getState().name());
            e.put("draft", st == null ? null : st.getDraftText());
            agentEntries.add(e);
        }
        root.put("agents", agentEntries);

        // --- CoS reviews (every round, every agent)
        List<CosReview> reviews = cosReviews.findBySessionIdOrderByCreatedAtAsc(sessionId);
        List<Map<String, Object>> reviewEntries = new ArrayList<>();
        for (CosReview r : reviews) {
            AgentProfile a = byId.get(r.getAgentId());
            Map<String, Object> e = new LinkedHashMap<>();
            e.put("agentId", r.getAgentId().toString());
            e.put("agentName", a == null ? null : a.getName());
            e.put("round", r.getRoundNo());
            e.put("verdict", r.getVerdict().name());
            Map<String, Object> scores = new LinkedHashMap<>();
            scores.put("specificity",  r.getSpecificityScore());
            scores.put("completeness", r.getCompletenessScore());
            scores.put("evidence",     r.getEvidenceScore());
            scores.put("boundaries",   r.getBoundariesScore());
            scores.put("ideology",     r.getIdeologyScore());
            e.put("scores", scores);
            e.put("challenge", r.getChallengeText());
            e.put("createdAt", r.getCreatedAt());
            reviewEntries.add(e);
        }
        root.put("cosReviews", reviewEntries);

        // --- brief
        Brief brief = briefs.findBySessionId(sessionId).orElse(null);
        if (brief != null) {
            Map<String, Object> b = new LinkedHashMap<>();
            b.put("recommendation", brief.getRecommendation());
            b.put("confidence", brief.getConfidence());
            b.put("body", brief.getBodyJson());
            b.put("createdAt", brief.getCreatedAt());
            root.put("brief", b);
        }

        // --- decision
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("type", decision.getDecisionType().name());
        d.put("chairLabel", decision.getChairLabel());
        d.put("notes", decision.getNotes());
        d.put("overrides", decision.getOverrides());
        d.put("sealedAt", decision.getSealedAt());
        root.put("decision", d);

        return root;
    }
}
