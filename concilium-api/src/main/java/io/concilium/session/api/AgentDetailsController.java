package io.concilium.session.api;

import io.concilium.agent.domain.AgentProfile;
import io.concilium.agent.store.AgentProfileRepository;
import io.concilium.committee.domain.Committee;
import io.concilium.committee.store.CommitteeRepository;
import io.concilium.session.api.dto.AgentDetailsView;
import io.concilium.session.cos.CosReview;
import io.concilium.session.cos.CosReviewRepository;
import io.concilium.session.documents.DocumentContextFormatter;
import io.concilium.session.domain.Session;
import io.concilium.session.domain.SessionAgentDraft;
import io.concilium.session.domain.SessionDocument;
import io.concilium.session.llm.PromptTemplates;
import io.concilium.session.store.SessionAgentDraftRepository;
import io.concilium.session.store.SessionDocumentRepository;
import io.concilium.session.store.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * Per-agent expanded-view endpoints for the Boardroom click-to-expand panel.
 *
 * <ul>
 *   <li>{@code GET .../details} — round-by-round drafts + CoS reviews + 5-axis scores</li>
 *   <li>{@code GET .../prompt} — the assembled user prompt for this agent, with
 *       committee doctrine + agent wiki + topic + context + supporting docs
 *       in the exact same shape the LLM saw. Pure text/plain.</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/sessions/{sessionId}/agents/{agentId}")
@RequiredArgsConstructor
public class AgentDetailsController {

    private final SessionRepository sessions;
    private final CommitteeRepository committees;
    private final AgentProfileRepository agents;
    private final SessionAgentDraftRepository sessionAgentDrafts;
    private final CosReviewRepository cosReviews;
    private final SessionDocumentRepository sessionDocuments;
    private final PromptTemplates prompts;

    @GetMapping("/details")
    public AgentDetailsView details(@PathVariable UUID sessionId, @PathVariable UUID agentId) {
        AgentProfile agent = agents.findById(agentId).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found: " + agentId));
        sessions.findById(sessionId).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found: " + sessionId));

        List<SessionAgentDraft> drafts = sessionAgentDrafts
            .findBySessionIdAndAgentIdOrderByRoundNoAsc(sessionId, agentId);
        List<CosReview> reviews = cosReviews
            .findBySessionIdAndAgentIdOrderByRoundNoAsc(sessionId, agentId);

        // Join drafts and reviews on round_no into ordered Round records.
        // Either side may be missing for a given round (e.g. QA=NONE has
        // drafts but no reviews; a failed agent has neither in extreme cases).
        Map<Integer, AgentDetailsView.DraftSnapshot> draftsByRound = new HashMap<>();
        for (SessionAgentDraft d : drafts) {
            draftsByRound.put(d.getRoundNo(), new AgentDetailsView.DraftSnapshot(
                d.getDraftText(), d.getModelUsed(),
                d.getPromptTokens(), d.getCompletionTokens(), d.getLatencyMs(),
                d.getCreatedAt()));
        }
        Map<Integer, AgentDetailsView.ReviewSnapshot> reviewsByRound = new HashMap<>();
        for (CosReview r : reviews) {
            reviewsByRound.put(r.getRoundNo(), new AgentDetailsView.ReviewSnapshot(
                r.getVerdict(),
                new AgentDetailsView.Scores(
                    r.getSpecificityScore(), r.getCompletenessScore(),
                    r.getEvidenceScore(), r.getBoundariesScore(),
                    r.getIdeologyScore()),
                r.getChallengeText(),
                r.getCreatedAt()));
        }

        // Ordered union of round numbers
        TreeMap<Integer, Integer> roundKeys = new TreeMap<>();
        draftsByRound.keySet().forEach(k -> roundKeys.put(k, k));
        reviewsByRound.keySet().forEach(k -> roundKeys.put(k, k));

        List<AgentDetailsView.Round> rounds = new ArrayList<>();
        for (Integer r : roundKeys.keySet()) {
            rounds.add(new AgentDetailsView.Round(
                r,
                draftsByRound.get(r),
                reviewsByRound.get(r)));
        }

        return new AgentDetailsView(sessionId, agentId, agent.getName(), rounds);
    }

    /**
     * Returns the assembled user-prompt this agent would receive for this
     * session, including committee doctrine, agent reference library,
     * topic, context, and supporting documents. Used by the Boardroom's
     * "Show prompt" debug button so the chair can verify the wiki landed.
     *
     * <p>Does NOT call the LLM. Pure text/plain output for easy copy-paste.
     */
    @GetMapping(value = "/prompt", produces = MediaType.TEXT_PLAIN_VALUE)
    public String prompt(@PathVariable UUID sessionId, @PathVariable UUID agentId) {
        Session session = sessions.findById(sessionId).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found: " + sessionId));
        AgentProfile agent = agents.findById(agentId).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found: " + agentId));
        Committee committee = committees.findById(session.getCommitteeId()).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Committee not found"));

        List<SessionDocument> docs = sessionDocuments
            .findBySessionIdOrderByCreatedAtAsc(sessionId);
        String supportingDocsMd = DocumentContextFormatter.render(docs);

        Map<String, Object> vars = new HashMap<>();
        vars.put("committeeName", committee.getName());
        vars.put("topic", session.getTopic());
        vars.put("contextMd", session.getContextMd());
        String committeeKnowledgeMd = committee.getKnowledgeText();
        if (committeeKnowledgeMd != null && !committeeKnowledgeMd.isBlank()) {
            vars.put("committeeKnowledgeMd", committeeKnowledgeMd);
        }
        String agentKnowledgeMd = agent.getKnowledgeText();
        if (agentKnowledgeMd != null && !agentKnowledgeMd.isBlank()) {
            vars.put("agentKnowledgeMd", agentKnowledgeMd);
        }
        if (supportingDocsMd != null && !supportingDocsMd.isBlank()) {
            vars.put("supportingDocsMd", supportingDocsMd);
        }

        // Annotate the output so the chair can read the assembled prompt
        // alongside the metadata that produced it.
        StringBuilder out = new StringBuilder();
        out.append("=== ASSEMBLED USER PROMPT ===\n");
        out.append("Agent:     ").append(agent.getName()).append('\n');
        out.append("Committee: ").append(committee.getName()).append('\n');
        out.append("Session:   ").append(sessionId).append('\n');
        out.append("\n--- SYSTEM PROMPT (sent separately to the LLM) ---\n");
        out.append(agent.getSystemPrompt() == null ? "(none)" : agent.getSystemPrompt());
        out.append("\n\n--- USER PROMPT (rendered from agent-user-prompt.hbs) ---\n");
        out.append(prompts.render("agent-user-prompt", vars));
        return out.toString();
    }
}
