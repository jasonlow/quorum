package io.quorum.session.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quorum.committee.store.CommitteeRepository;
import io.quorum.session.api.dto.AgendaDraft;
import io.quorum.session.llm.PromptTemplates;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Takes a short NL description of what the chair wants to deliberate on
 * and returns a structured {@link AgendaDraft} (topic + contextMd) the
 * chair can review before convening.
 *
 * <p>Same resilience pattern as {@code AgentGenerationService}: strips
 * code fences, Jackson parses, on failure throws a runtime so the
 * controller can map to 502.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AgendaGenerationService {

    private static final String SYSTEM_PROMPT = """
        You produce structured deliberation agendas in JSON. You always
        respond with a single JSON object — no preface, no markdown
        fences, no commentary.
        """;

    private final ChatModel chatModel;
    private final CommitteeRepository committees;
    private final PromptTemplates prompts;
    private final ObjectMapper json;

    public AgendaDraft generate(UUID committeeId, String description) {
        String committeeName = committeeId == null
            ? null
            : committees.findById(committeeId).map(c -> c.getName()).orElse(null);

        Map<String, Object> vars = new HashMap<>();
        vars.put("committeeName", committeeName);
        vars.put("description", description);
        String user = prompts.render("agenda-generate", vars);

        ChatClient client = ChatClient.builder(chatModel)
            .defaultSystem(SYSTEM_PROMPT)
            .defaultOptions(ChatOptions.builder().temperature(0.5).build())
            .build();

        String raw;
        try {
            raw = client.prompt().user(user).call().content();
        } catch (RuntimeException e) {
            log.error("Agenda generation LLM call failed: {}", e.toString());
            throw new IllegalStateException("Agenda generation failed: " + e.getMessage(), e);
        }

        try {
            String cleaned = stripCodeFence(raw);
            AgendaDraft draft = json.readValue(cleaned, AgendaDraft.class);
            log.info("Generated agenda draft: topic-len={} context-len={}",
                draft.topic() == null ? 0 : draft.topic().length(),
                draft.contextMd() == null ? 0 : draft.contextMd().length());
            return draft;
        } catch (Exception e) {
            log.warn("Agenda generation response not parseable: head={}",
                raw == null ? "null" : raw.substring(0, Math.min(160, raw.length())));
            throw new IllegalStateException(
                "Could not parse LLM response as AgendaDraft. Raw head: "
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
