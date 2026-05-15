package io.concilium.session.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Body for {@code POST /api/v1/sessions}. {@code committeeId} is optional —
 * defaults to the Investment Risk Committee for PoC simplicity.
 */
public record ConveneRequest(
    UUID committeeId,
    @NotBlank @Size(max = 4000) String topic,
    @Size(max = 50_000) String contextMd
) {
}
