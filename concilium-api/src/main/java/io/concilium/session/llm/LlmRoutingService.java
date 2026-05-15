package io.concilium.session.llm;

import io.concilium.agent.domain.AgentProfile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.stereotype.Service;

/**
 * Returns a configured {@link ChatClient} for a given agent.
 *
 * <p>PoC contract: there is exactly one {@link ChatModel} bean active
 * per Spring profile ({@code local} → DeepSeek via OpenAI-compatible
 * client, {@code ollama} → local Llama). The routing service decorates
 * that single model with per-agent options (temperature, optional model
 * override).
 *
 * <p>Per-agent model override is honoured but only if the active profile's
 * provider supports it — e.g. on the {@code local} profile, an override
 * of {@code "deepseek-reasoner"} routes to DeepSeek's reasoner endpoint
 * via the same OpenAI starter; an override of {@code "gpt-4.1"} would
 * not work on this profile (different base URL). Cross-provider routing
 * is a Phase 1 enhancement.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LlmRoutingService {

    private final ChatModel chatModel;

    /**
     * Returns a {@link ChatClient} configured with the agent's system
     * prompt, temperature, and optional model override.
     */
    public ChatClient clientFor(AgentProfile agent) {
        ChatOptions.Builder options = ChatOptions.builder()
            .temperature(agent.getTemperature().doubleValue());

        if (agent.getModelOverride() != null && !agent.getModelOverride().isBlank()) {
            options.model(agent.getModelOverride());
        }

        return ChatClient.builder(chatModel)
            .defaultSystem(agent.getSystemPrompt())
            .defaultOptions(options.build())
            .build();
    }
}
