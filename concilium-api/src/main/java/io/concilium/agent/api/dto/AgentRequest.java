package io.concilium.agent.api.dto;

import io.concilium.agent.domain.Bias;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Body for {@code POST /api/v1/agents} and {@code PUT /api/v1/agents/{id}}.
 *
 * <p>For create: all required fields must be set.
 * For update: all fields are required too — this is a full replace, not a
 * PATCH. Use {@code PUT /agents/{id}/model-override} for the narrow model
 * change.
 */
public record AgentRequest(
    @NotBlank @Size(max = 100) String name,
    @Size(max = 1000) String description,
    List<@Size(max = 80) String> skills,
    @Size(max = 80) String ideology,
    List<Bias> biases,
    List<@Size(max = 200) String> boundaries,
    @Size(max = 160) String speakingStyle,
    @NotBlank @Size(max = 16000) String systemPrompt,
    @Size(max = 80) String modelOverride,
    @DecimalMin("0.0") @DecimalMax("2.0") BigDecimal temperature,
    @Size(max = 40000) String knowledgeText
) {}
