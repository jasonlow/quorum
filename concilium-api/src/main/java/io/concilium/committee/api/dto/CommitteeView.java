package io.concilium.committee.api.dto;

import io.concilium.committee.domain.Committee;
import io.concilium.committee.domain.CommitteeMember;
import io.concilium.committee.domain.CommitteeStatus;
import io.concilium.committee.domain.OrchestrationPattern;
import io.concilium.committee.domain.QaIntensity;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Client-facing view of a committee + its members. The {@code agentName}
 * is denormalised in by the controller so the FE doesn't need an extra
 * round-trip per row.
 */
public record CommitteeView(
    UUID id,
    String name,
    String description,
    OrchestrationPattern orchestrationPattern,
    QaIntensity qaIntensity,
    String decisionRule,
    int maxRevisionRounds,
    CommitteeStatus status,
    OffsetDateTime archivedAt,
    OffsetDateTime createdAt,
    List<MemberView> members
) {
    public record MemberView(
        UUID agentId,
        String agentName,
        int speakingOrder,
        BigDecimal weight
    ) {}

    public static CommitteeView of(Committee c, List<MemberView> members) {
        return new CommitteeView(
            c.getId(), c.getName(), c.getDescription(),
            c.getOrchestrationPattern(), c.getQaIntensity(),
            c.getDecisionRule(), c.getMaxRevisionRounds(),
            c.getStatus(), c.getArchivedAt(), c.getCreatedAt(),
            members
        );
    }
}
