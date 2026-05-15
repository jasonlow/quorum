package io.concilium.session.domain;

/**
 * Top-level lifecycle phase for a session. State within DELIBERATING /
 * COS_GATE is tracked at the per-agent level (see AgentRunState).
 */
public enum Phase {
    CONVENED,
    DELIBERATING,
    COS_GATE,
    BRIEFED,
    DECIDED,
    ABORTED
}
