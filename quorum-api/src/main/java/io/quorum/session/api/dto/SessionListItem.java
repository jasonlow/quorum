package io.quorum.session.api.dto;

import io.quorum.decision.domain.DecisionType;
import io.quorum.session.domain.Phase;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Lightweight row for the audit-log / recent-sessions list.
 * Avoids returning the full agents array (returned by {@link SessionView})
 * for every row.
 */
public record SessionListItem(
    UUID sessionId,
    String topic,
    Phase phase,
    OffsetDateTime startedAt,
    OffsetDateTime endedAt,
    DecisionType decisionType,    // null if not yet decided
    String chairLabel,            // null if not yet decided
    OffsetDateTime sealedAt       // null if not yet decided
) {}
