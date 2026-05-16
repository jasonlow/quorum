package io.concilium.agent.api.dto;

import jakarta.validation.constraints.Size;

/**
 * Body for {@code PUT /api/v1/agents/{id}/model-override}. A null or
 * blank {@code model} clears the override (the agent falls back to the
 * profile-default chat model).
 *
 * <p>For DeepSeek (the {@code local} profile), valid values include
 * {@code "deepseek-chat"} and {@code "deepseek-reasoner"}. Cross-provider
 * overrides (e.g. {@code "gpt-4.1"}) are not supported until Phase 1
 * adds per-provider routing.
 */
public record ModelOverrideRequest(
    @Size(max = 80) String model
) {}
