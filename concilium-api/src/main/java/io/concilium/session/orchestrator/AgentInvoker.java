package io.concilium.session.orchestrator;

import io.concilium.agent.domain.AgentProfile;
import io.concilium.session.llm.LlmRoutingService;
import io.concilium.session.llm.PromptTemplates;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Invokes a single agent against a topic + context and returns the draft.
 * Synchronous and blocking — fine on a Spring MVC thread because Boot 3.5
 * runs MVC on Java 21 virtual threads.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AgentInvoker {

    private final LlmRoutingService routing;
    private final PromptTemplates prompts;

    public AgentDraft invoke(AgentProfile agent, String committeeName,
                             String topic, String contextMd) {
        var client = routing.clientFor(agent);

        Map<String, Object> vars = new HashMap<>();
        vars.put("committeeName", committeeName);
        vars.put("topic", topic);
        vars.put("contextMd", contextMd);
        String userMessage = prompts.render("agent-user-prompt", vars);

        log.debug("Invoking agent '{}' (temp={}, modelOverride={})",
            agent.getName(), agent.getTemperature(), agent.getModelOverride());

        Instant t0 = Instant.now();
        ChatResponse response = client.prompt()
            .user(userMessage)
            .call()
            .chatResponse();
        Duration latency = Duration.between(t0, Instant.now());

        String text = response.getResult().getOutput().getText();
        var usage = response.getMetadata().getUsage();
        var modelUsed = response.getMetadata().getModel();

        int promptTokens = usage != null && usage.getPromptTokens() != null
            ? usage.getPromptTokens() : 0;
        int completionTokens = usage != null && usage.getCompletionTokens() != null
            ? usage.getCompletionTokens() : 0;

        log.info("agent={} model={} tokens(in/out)={}/{} latency={}ms",
            agent.getName(), modelUsed, promptTokens, completionTokens, latency.toMillis());

        return new AgentDraft(text, modelUsed, promptTokens, completionTokens, latency);
    }
}
