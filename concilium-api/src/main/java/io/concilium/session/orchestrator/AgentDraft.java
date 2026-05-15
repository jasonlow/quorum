package io.concilium.session.orchestrator;

import java.time.Duration;

/**
 * Result of invoking a single agent against a topic. Includes token usage
 * and wall-clock latency for cost telemetry and bet B1 evidence.
 */
public record AgentDraft(
    String text,
    String modelUsed,
    int promptTokens,
    int completionTokens,
    Duration latency
) {
    public int totalTokens() {
        return promptTokens + completionTokens;
    }
}
