package io.concilium.agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.concilium.agent.api.dto.AgentRequest;
import io.concilium.session.llm.PromptTemplates;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Takes a natural-language description of a desired agent and returns a
 * structured {@link AgentRequest} draft the chair can review before saving.
 *
 * <p>Mirrors the resilience pattern of {@code ChiefOfStaffService}: stripped
 * code fences, Jackson parsing, on any failure throws a runtime so the
 * controller can return a 502/422 rather than crashing.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AgentGenerationService {

    private static final String SYSTEM_PROMPT = """
        You produce structured agent profiles in JSON. You always respond
        with a single JSON object — no preface, no markdown fences, no
        commentary.
        """;

    private final ChatModel chatModel;
    private final PromptTemplates prompts;
    private final ObjectMapper json;

    public AgentRequest generate(String description) {
        String user = prompts.render("agent-generate", Map.of("description", description));

        ChatClient client = ChatClient.builder(chatModel)
            .defaultSystem(SYSTEM_PROMPT)
            .defaultOptions(ChatOptions.builder().temperature(0.5).build())
            .build();

        String raw;
        try {
            raw = client.prompt().user(user).call().content();
        } catch (RuntimeException e) {
            log.error("Agent generation LLM call failed: {}", e.toString());
            throw new IllegalStateException("Agent generation failed: " + e.getMessage(), e);
        }

        try {
            String cleaned = stripCodeFence(raw);
            AgentRequest parsed = json.readValue(cleaned, AgentRequest.class);
            // Belt-and-braces: drop any modelOverride the LLM hallucinated.
            // The chair selects the model separately via the UI control after
            // reviewing the generated profile. (Observed failure: LLM
            // occasionally fabricates names like "deepseek-v4-flash" that
            // DeepSeek doesn't recognise.)
            AgentRequest result = new AgentRequest(
                parsed.name(), parsed.description(), parsed.skills(),
                parsed.ideology(), parsed.biases(), parsed.boundaries(),
                parsed.speakingStyle(), parsed.systemPrompt(),
                null,                       // ← modelOverride forced null
                parsed.temperature(),
                null                        // ← knowledgeText: chair fills this in manually
            );
            log.info("Generated agent draft: name='{}' ideology='{}' biases={} skills={}",
                result.name(), result.ideology(),
                result.biases() == null ? 0 : result.biases().size(),
                result.skills() == null ? 0 : result.skills().size());
            return result;
        } catch (Exception e) {
            log.warn("Agent generation response not parseable: head={}",
                raw == null ? "null" : raw.substring(0, Math.min(160, raw.length())));
            throw new IllegalStateException(
                "Could not parse LLM response as AgentRequest. Raw head: "
                    + (raw == null ? "null" : raw.substring(0, Math.min(120, raw.length())))
                    + "…", e);
        }
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
