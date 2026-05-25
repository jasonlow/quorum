package io.quorum.decision.api.dto;

import io.quorum.decision.domain.DecisionType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

/**
 * Body for {@code POST /api/v1/sessions/{id}/decide}.
 *
 * <p>For PoC, {@code chairLabel} defaults to "chair@local" when omitted —
 * real auth attaches an authenticated user later.
 */
public record DecideRequest(
    @NotNull DecisionType decision,
    String chairLabel,
    Map<String, Object> overrides,
    @Size(max = 4000) String notes
) {}
