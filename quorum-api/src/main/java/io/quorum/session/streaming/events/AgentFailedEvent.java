package io.quorum.session.streaming.events;

import java.time.Instant;
import java.util.UUID;

/** SSE payload for {@code agent.failed}. */
public record AgentFailedEvent(
    UUID sessionId,
    UUID agentId,
    String agentName,
    String reason,
    Instant at
) {
    public static AgentFailedEvent of(UUID sessionId, UUID agentId, String agentName, String reason) {
        return new AgentFailedEvent(sessionId, agentId, agentName, reason, Instant.now());
    }
}
