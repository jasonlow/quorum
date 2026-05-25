package io.concilium.session.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Body for {@code POST /api/v1/sessions/generate-agenda}.
 *
 * <p>{@code committeeId} is optional — if provided, the LLM gets the
 * committee's name as context so the generated topic/memo is pitched
 * appropriately (e.g. a financial product memo for an Investment Risk
 * Committee, a technical spec for an Engineering Change committee).
 */
public record GenerateAgendaRequest(
    UUID committeeId,
    @NotBlank @Size(max = 8000) String description
) {}
