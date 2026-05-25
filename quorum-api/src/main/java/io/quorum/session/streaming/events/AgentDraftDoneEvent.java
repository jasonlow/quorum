package io.quorum.session.streaming.events;

import java.time.Instant;
import java.util.UUID;

/** SSE payload for {@code agent.draft.done}. Carries usage telemetry. */
public record AgentDraftDoneEvent(
    UUID sessionId,
    UUID agentId,
    String agentName,
    String modelUsed,
    int promptTokens,
    int completionTokens,
    long latencyMs,
    Instant at
) {}
