package io.quorum.agent.domain;

/**
 * A named cognitive lean with a strength (0.0–1.0) that the agent applies
 * when forming opinions. Strength is a multiplier, not a weight — higher
 * means the bias is more aggressively expressed in outputs.
 */
public record Bias(String bias, double strength) {
}
