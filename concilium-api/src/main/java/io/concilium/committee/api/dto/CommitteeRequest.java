package io.concilium.committee.api.dto;

import io.concilium.committee.domain.OrchestrationPattern;
import io.concilium.committee.domain.QaIntensity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Body for {@code POST /api/v1/committees} and {@code PUT /api/v1/committees/:id}.
 * Members are expected in their final speaking order; weights default to 1.0.
 */
public record CommitteeRequest(
    @NotBlank @Size(max = 200) String name,
    @Size(max = 2000) String description,
    @NotNull OrchestrationPattern orchestrationPattern,
    @NotNull QaIntensity qaIntensity,
    @NotBlank @Size(max = 30) String decisionRule,
    @Min(0) @Max(5) Integer maxRevisionRounds,
    @NotNull @Size(min = 1, max = 20) List<@Valid MemberRequest> members
) {
    /**
     * One row in the member ordering. Position in the list determines
     * speaking_order (1-based); weight defaults to 1.0 if null.
     */
    public record MemberRequest(
        @NotNull UUID agentId,
        BigDecimal weight
    ) {}
}
