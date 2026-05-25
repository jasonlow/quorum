package io.concilium.brief.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.concilium.agent.domain.AgentProfile;
import io.concilium.agent.store.AgentProfileRepository;
import io.concilium.brief.domain.Brief;
import io.concilium.brief.store.BriefRepository;
import io.concilium.committee.store.CommitteeRepository;
import io.concilium.session.cos.CosReview;
import io.concilium.session.cos.CosReviewRepository;
import io.concilium.session.documents.DocumentContextFormatter;
import io.concilium.session.domain.AgentRunState;
import io.concilium.session.domain.Session;
import io.concilium.session.domain.SessionAgentState;
import io.concilium.session.domain.SessionDocument;
import io.concilium.session.llm.PromptTemplates;
import io.concilium.session.store.SessionAgentStateRepository;
import io.concilium.session.store.SessionDocumentRepository;
import io.concilium.session.store.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Builds a structured {@link Brief} from all PASSED / PASSED_WITH_NOTE
 * drafts in a session.
 *
 * <p>Resilience: a malformed brief JSON does not crash the orchestrator —
 * a minimal fallback brief is persisted with the raw text under
 * {@code body_json.parse_error}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class Consolidator {

    private static final String CONSOLIDATION_SYSTEM_PROMPT = """
        You are the Chief of Staff. You produce structured executive briefs
        that surface consensus, expose disagreement honestly, and end with
        a single recommendation the chair can act on. You always respond
        with a single JSON object — no preface, no markdown fences.
        """;

    private final SessionRepository sessions;
    private final SessionAgentStateRepository agentStates;
    private final AgentProfileRepository agents;
    private final CommitteeRepository committees;
    private final CosReviewRepository cosReviews;
    private final SessionDocumentRepository sessionDocuments;
    private final BriefRepository briefs;
    private final PromptTemplates prompts;
    private final ChatModel chatModel;
    private final ObjectMapper json;

    @Transactional
    public Brief build(UUID sessionId) {
        if (briefs.findBySessionId(sessionId).isPresent()) {
            log.info("Brief already exists for session {} — returning existing", sessionId);
            return briefs.findBySessionId(sessionId).get();
        }
        Session session = sessions.findById(sessionId).orElseThrow();
        List<SessionAgentState> states = agentStates.findBySessionId(sessionId);

        // Use only drafts that passed quality gate (or passed with note)
        Map<UUID, AgentProfile> byId = agents.findAllById(
                states.stream().map(SessionAgentState::getAgentId).toList()).stream()
            .collect(java.util.stream.Collectors.toMap(AgentProfile::getId, a -> a));

        List<Map<String, Object>> agentEntries = new ArrayList<>();
        for (SessionAgentState st : states) {
            AgentProfile a = byId.get(st.getAgentId());
            if (a == null || st.getDraftText() == null || st.getDraftText().isBlank()) continue;
            if (st.getState() != AgentRunState.PASSED
                && st.getState() != AgentRunState.PASSED_WITH_NOTE
                && st.getState() != AgentRunState.SUBMITTED) {
                continue;
            }
            // Latest verdict for this agent
            List<CosReview> reviews = cosReviews.findBySessionIdAndAgentIdOrderByRoundNoAsc(
                sessionId, a.getId());
            String latestVerdict = reviews.isEmpty()
                ? "PASSED"
                : reviews.get(reviews.size() - 1).getVerdict().name();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("name", a.getName());
            entry.put("ideology", a.getIdeology() == null ? "" : a.getIdeology());
            entry.put("draft", st.getDraftText());
            entry.put("cosVerdict", latestVerdict);
            agentEntries.add(entry);
        }

        if (agentEntries.isEmpty()) {
            log.warn("Consolidator: no usable drafts for session {} — writing empty brief", sessionId);
            return persistFallback(session, Map.of("error", "no usable drafts"));
        }

        var committee = committees.findById(session.getCommitteeId()).orElse(null);
        String committeeName = committee == null ? "the committee" : committee.getName();
        String committeeKnowledgeMd = committee == null ? null : committee.getKnowledgeText();

        List<SessionDocument> docs = sessionDocuments.findBySessionIdOrderByCreatedAtAsc(sessionId);
        String supportingDocsMd = DocumentContextFormatter.render(docs);

        Map<String, Object> vars = new HashMap<>();
        vars.put("committeeName", committeeName);
        vars.put("topic", session.getTopic());
        vars.put("contextMd", session.getContextMd());
        if (committeeKnowledgeMd != null && !committeeKnowledgeMd.isBlank()) {
            vars.put("committeeKnowledgeMd", committeeKnowledgeMd);
        }
        if (supportingDocsMd != null && !supportingDocsMd.isBlank()) {
            vars.put("supportingDocsMd", supportingDocsMd);
        }
        vars.put("agents", agentEntries);
        String user = prompts.render("consolidation", vars);

        ChatClient client = ChatClient.builder(chatModel)
            .defaultSystem(CONSOLIDATION_SYSTEM_PROMPT)
            .defaultOptions(buildOptions())
            .build();

        String raw;
        try {
            raw = client.prompt().user(user).call().content();
        } catch (RuntimeException e) {
            log.error("Consolidator LLM call failed for session {}: {}", sessionId, e.toString());
            return persistFallback(session, Map.of(
                "parse_error", "LLM call failed: " + e.getMessage()));
        }

        Map<String, Object> body;
        try {
            String cleaned = stripCodeFence(raw);
            body = json.readValue(cleaned, new TypeReference<LinkedHashMap<String, Object>>() {});
        } catch (Exception e) {
            log.warn("Brief response not parseable for session {}: head={}",
                sessionId, raw == null ? "null" : raw.substring(0, Math.min(160, raw.length())));
            body = new LinkedHashMap<>();
            body.put("parse_error", "brief JSON unparseable");
            body.put("raw_text", raw);
        }

        Brief b = Brief.builder()
            .sessionId(sessionId)
            .recommendation(asString(body.get("recommendation")))
            .confidence(asString(body.get("confidence")))
            .bodyJson(body)
            .build();
        briefs.save(b);
        log.info("Brief built for session {}: recommendation={} confidence={}",
            sessionId, b.getRecommendation(), b.getConfidence());
        return b;
    }

    public Optional<Brief> get(UUID sessionId) {
        return briefs.findBySessionId(sessionId);
    }

    // ------------------------------------------------------------------

    private Brief persistFallback(Session session, Map<String, Object> body) {
        Brief b = Brief.builder()
            .sessionId(session.getId())
            .recommendation("ESCALATE")
            .confidence("LOW")
            .bodyJson(body)
            .build();
        briefs.save(b);
        return b;
    }

    private ChatOptions buildOptions() {
        // Brief consolidation always uses the default chat model
        // (deepseek-chat) — fast, sufficient for synthesis. CoS uses
        // deepseek-reasoner separately for rigorous critique.
        return ChatOptions.builder().temperature(0.3).build();
    }

    private static String asString(Object v) {
        return v == null ? null : v.toString();
    }

    private static String stripCodeFence(String s) {
        if (s == null) return null;
        String trimmed = s.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNewline > 0 && lastFence > firstNewline) {
                return trimmed.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return trimmed;
    }
}
