package io.quorum.session.streaming.events;

import java.time.Instant;
import java.util.UUID;

/**
 * SSE payload for {@code agent.draft.token}. Sent once per streaming
 * chunk from the LLM. The frontend accumulates {@code delta} per agent
 * into a live "typing" preview in the boardroom tile.
 *
 * <p>The payload carries only the new chunk, not the cumulative text —
 * keeps every event small even for long drafts.
 */
public record AgentDraftTokenEvent(
    UUID sessionId,
    UUID agentId,
    String agentName,
    String delta,
    Instant at
) {
    public static AgentDraftTokenEvent of(UUID sessionId, UUID agentId,
                                          String agentName, String delta) {
        return new AgentDraftTokenEvent(sessionId, agentId, agentName, delta, Instant.now());
    }
}
