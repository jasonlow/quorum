package io.concilium.session.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Returned by {@code POST /api/v1/sessions/generate-agenda}. Not
 * persisted — the frontend pre-fills the Convene form with these
 * values and the chair confirms / tweaks before convening.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record AgendaDraft(
    String topic,
    String contextMd
) {}
