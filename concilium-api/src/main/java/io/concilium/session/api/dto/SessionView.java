package io.concilium.session.api.dto;

import io.concilium.session.domain.AgentRunState;
import io.concilium.session.domain.Phase;
import io.concilium.session.domain.Session;
import io.concilium.session.domain.SessionAgentState;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Client-facing summary of a session and its agent states. */
public record SessionView(
    UUID id,
    UUID committeeId,
    String topic,
    Phase phase,
    OffsetDateTime startedAt,
    List<AgentEntry> agents
) {
    public record AgentEntry(
        UUID agentId,
        String agentName,
        AgentRunState state,
        int progress,
        boolean hasDraft
    ) {}

    public static SessionView from(Session s, List<AgentEntry> agents) {
        return new SessionView(
            s.getId(), s.getCommitteeId(), s.getTopic(),
            s.getPhase(), s.getStartedAt(), agents);
    }
}
