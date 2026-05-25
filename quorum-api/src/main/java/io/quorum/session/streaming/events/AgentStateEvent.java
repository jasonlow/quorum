package io.quorum.session.streaming.events;

import io.quorum.session.domain.AgentRunState;

import java.time.Instant;
import java.util.UUID;

/** SSE payload for {@code agent.state.changed}. */
public record AgentStateEvent(
    UUID sessionId,
    UUID agentId,
    String agentName,
    AgentRunState state,
    int progress,
    Instant at
) {
    public static AgentStateEvent of(UUID sessionId, UUID agentId, String agentName,
                                     AgentRunState state, int progress) {
        return new AgentStateEvent(sessionId, agentId, agentName, state, progress, Instant.now());
    }
}
