package io.quorum.session.api.dto;

import io.quorum.session.domain.AgentRunState;

import java.util.UUID;

/** Result of running one agent on a session. */
public record AgentDraftView(
    UUID sessionId,
    UUID agentId,
    String agentName,
    AgentRunState state,
    String draft,
    String modelUsed,
    int promptTokens,
    int completionTokens,
    long latencyMs
) {
}
