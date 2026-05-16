package io.concilium.session.orchestrator;

import io.concilium.agent.domain.AgentProfile;
import io.concilium.session.llm.LlmRoutingService;
import io.concilium.session.llm.PromptTemplates;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Consumer;

/**
 * Invokes a single agent against a topic + context and returns the draft.
 * Synchronous and blocking — fine on a Spring MVC thread because Boot 3.5
 * runs MVC on Java 21 virtual threads. When an {@code onToken} callback is
 * supplied, the LLM is streamed and the callback fires per chunk; the
 * blocking semantics are preserved by collecting via {@code blockLast()}.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AgentInvoker {

    private final LlmRoutingService routing;
    private final PromptTemplates prompts;

    /** Blocking, non-streaming. Used by the W1 single-agent dev path. */
    public AgentDraft invoke(AgentProfile agent, String committeeName,
                             String topic, String contextMd) {
        return invokeInternal(agent, committeeName, topic, contextMd, null, null, null);
    }

    /**
     * Blocking but streaming-capable. Invoke an agent and call
     * {@code onToken} for each chunk that arrives from the LLM.
     * The callback is invoked on the virtual thread that calls this method —
     * it should be cheap (e.g. push to SSE).
     */
    public AgentDraft invokeStreaming(AgentProfile agent, String committeeName,
                                      String topic, String contextMd,
                                      Consumer<String> onToken) {
        return invokeInternal(agent, committeeName, topic, contextMd, null, null, onToken);
    }

    /** Re-invoke after a CoS revision request. Non-streaming. */
    public AgentDraft invokeRevision(AgentProfile agent, String committeeName,
                                     String topic, String contextMd,
                                     String previousDraft, String revisionInstruction) {
        return invokeInternal(agent, committeeName, topic, contextMd,
            previousDraft, revisionInstruction, null);
    }

    /** Re-invoke after a CoS revision request, with token streaming. */
    public AgentDraft invokeRevisionStreaming(AgentProfile agent, String committeeName,
                                              String topic, String contextMd,
                                              String previousDraft, String revisionInstruction,
                                              Consumer<String> onToken) {
        return invokeInternal(agent, committeeName, topic, contextMd,
            previousDraft, revisionInstruction, onToken);
    }

    // ------------------------------------------------------------------

    private AgentDraft invokeInternal(AgentProfile agent, String committeeName,
                                      String topic, String contextMd,
                                      String previousDraft, String revisionInstruction,
                                      Consumer<String> onToken) {
        var client = routing.clientFor(agent);

        Map<String, Object> vars = new HashMap<>();
        vars.put("committeeName", committeeName);
        vars.put("topic", topic);
        vars.put("contextMd", contextMd);
        if (revisionInstruction != null && !revisionInstruction.isBlank()) {
            vars.put("revisionInstruction", revisionInstruction);
            vars.put("previousDraft", previousDraft == null ? "" : previousDraft);
        }
        String userMessage = prompts.render("agent-user-prompt", vars);

        log.debug("Invoking agent '{}' (temp={}, modelOverride={}, revision={}, streaming={})",
            agent.getName(), agent.getTemperature(), agent.getModelOverride(),
            revisionInstruction != null, onToken != null);

        Instant t0 = Instant.now();
        return onToken != null
            ? invokeWithStreaming(client, userMessage, agent, onToken, t0)
            : invokeBlocking(client, userMessage, agent, t0);
    }

    private AgentDraft invokeBlocking(ChatClient client, String userMessage,
                                      AgentProfile agent, Instant t0) {
        ChatResponse response = client.prompt().user(userMessage).call().chatResponse();
        return summarise(response, response.getResult().getOutput().getText(), agent, t0);
    }

    private AgentDraft invokeWithStreaming(ChatClient client, String userMessage,
                                           AgentProfile agent, Consumer<String> onToken,
                                           Instant t0) {
        StringBuilder accumulated = new StringBuilder();
        AtomicReference<ChatResponse> lastResponse = new AtomicReference<>();

        client.prompt()
            .user(userMessage)
            .stream()
            .chatResponse()
            .doOnNext(cr -> {
                lastResponse.set(cr);
                var result = cr.getResult();
                if (result != null && result.getOutput() != null) {
                    String delta = result.getOutput().getText();
                    if (delta != null && !delta.isEmpty()) {
                        accumulated.append(delta);
                        try {
                            onToken.accept(delta);
                        } catch (RuntimeException e) {
                            log.warn("onToken callback failed for agent {}: {}",
                                agent.getName(), e.toString());
                        }
                    }
                }
            })
            .blockLast();

        return summarise(lastResponse.get(), accumulated.toString(), agent, t0);
    }

    private AgentDraft summarise(ChatResponse last, String text,
                                 AgentProfile agent, Instant t0) {
        Duration latency = Duration.between(t0, Instant.now());

        var usage = last != null && last.getMetadata() != null
            ? last.getMetadata().getUsage() : null;
        var modelUsed = last != null && last.getMetadata() != null
            ? last.getMetadata().getModel() : null;

        int promptTokens = usage != null && usage.getPromptTokens() != null
            ? usage.getPromptTokens() : 0;
        int completionTokens = usage != null && usage.getCompletionTokens() != null
            ? usage.getCompletionTokens() : 0;

        log.info("agent={} model={} tokens(in/out)={}/{} latency={}ms",
            agent.getName(), modelUsed, promptTokens, completionTokens, latency.toMillis());

        return new AgentDraft(text, modelUsed, promptTokens, completionTokens, latency);
    }
}
