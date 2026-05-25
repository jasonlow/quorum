package io.quorum.session.cos;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quorum.agent.domain.AgentProfile;
import io.quorum.session.llm.PromptTemplates;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Reviews an agent draft on the 5-axis rubric and returns a verdict.
 *
 * <p>The CoS uses its own dedicated {@link ChatClient}, distinct from the
 * agents' clients — it has its own system prompt ("you are the Chief of
 * Staff…") and a different (or same) backing model, settable via
 * {@code quorum.llm.cos-model} property.
 *
 * <p>Resilience: a malformed JSON response is downgraded to
 * {@code PASSED_WITH_NOTE} rather than crashing the orchestrator. The
 * raw response head is captured in the audit log for diagnosis.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChiefOfStaffService {

    private static final String COS_SYSTEM_PROMPT = """
        You are the Chief of Staff for a committee of senior specialists.
        Your purpose is to **find weaknesses** in first drafts before
        they reach the chair. You assume every first draft can be
        improved. You are direct, terse, and willing — eager — to send
        work back.

        A score of 3 means "competent but generic" and is unsatisfactory:
        anything below the 4-of-5 bar on any axis triggers a revision.
        Default to REVISION_REQUESTED unless the draft is demonstrably
        excellent on every axis.

        You do not rewrite drafts; you either pass them, send them back
        with one concrete fix, or pass them with a documented note for
        the chair.

        You always respond with a single JSON object — no preface, no
        markdown fences, no commentary.
        """;

    private final ChatModel chatModel;
    private final PromptTemplates prompts;
    private final ObjectMapper json;

    @Value("${quorum.llm.cos-model:#{null}}")
    private String cosModelOverride;

    /** Run one review pass. Always returns — never throws on LLM error. */
    public CosReviewResult review(AgentProfile agent, String committeeName,
                                  String topic, String contextMd,
                                  String committeeKnowledgeMd, String agentKnowledgeMd,
                                  String supportingDocsMd, String draft) {
        Map<String, Object> vars = new HashMap<>();
        vars.put("committeeName", committeeName);
        vars.put("agentName", agent.getName());
        vars.put("topic", topic);
        vars.put("contextMd", contextMd);
        if (committeeKnowledgeMd != null && !committeeKnowledgeMd.isBlank()) {
            vars.put("committeeKnowledgeMd", committeeKnowledgeMd);
        }
        if (agentKnowledgeMd != null && !agentKnowledgeMd.isBlank()) {
            vars.put("agentKnowledgeMd", agentKnowledgeMd);
        }
        if (supportingDocsMd != null && !supportingDocsMd.isBlank()) {
            vars.put("supportingDocsMd", supportingDocsMd);
        }
        vars.put("draft", draft);

        String user = prompts.render("cos-review", vars);

        ChatClient client = ChatClient.builder(chatModel)
            .defaultSystem(COS_SYSTEM_PROMPT)
            .defaultOptions(buildOptions())
            .build();

        String raw;
        try {
            raw = client.prompt().user(user).call().content();
        } catch (RuntimeException e) {
            log.error("CoS LLM call failed for agent {}: {}", agent.getName(), e.toString());
            return CosReviewResult.parseError("(LLM call failed: " + e.getMessage() + ")");
        }

        try {
            String cleaned = stripCodeFence(raw);
            CosReviewResult result = json.readValue(cleaned, CosReviewResult.class);
            log.info("CoS review: agent={} verdict={} scores={}/{}/{}/{}/{}",
                agent.getName(), result.verdict(),
                result.specificity(), result.completeness(),
                result.evidence(), result.boundaries(), result.ideology());
            return result;
        } catch (Exception e) {
            log.warn("CoS response not parseable for agent {}: head={}",
                agent.getName(), raw == null ? "null" : raw.substring(0, Math.min(120, raw.length())));
            return CosReviewResult.parseError(raw);
        }
    }

    private ChatOptions buildOptions() {
        ChatOptions.Builder b = ChatOptions.builder();
        if (cosModelOverride != null && !cosModelOverride.isBlank()) {
            b.model(cosModelOverride);
        }
        // Reasoning-tier DeepSeek models don't accept temperature (ignored,
        // but cleaner to be explicit). For chat-tier we want deterministic
        // critique. Uses the same isReasoningTier rule as LlmRoutingService —
        // matches both the legacy "deepseek-reasoner" alias and the current
        // "deepseek-v4-pro" canonical name.
        if (!io.quorum.session.llm.LlmRoutingService.isReasoningTier(cosModelOverride)) {
            b.temperature(0.15);
        }
        return b.build();
    }

    /** Models sometimes wrap JSON in ```json ... ``` fences despite the instruction. Strip them. */
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
