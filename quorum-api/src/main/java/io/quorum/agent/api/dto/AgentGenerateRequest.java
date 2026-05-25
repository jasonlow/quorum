package io.quorum.agent.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body for {@code POST /api/v1/agents/generate}. The chair describes
 * the agent in natural language; the LLM parses it into a structured
 * draft profile that the chair can review and tweak before saving.
 */
public record AgentGenerateRequest(
    @NotBlank @Size(max = 2000) String description
) {}
