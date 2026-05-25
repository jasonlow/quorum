package io.quorum.session.domain;

/** Per-agent state machine within a session. Streamed to the boardroom UI. */
public enum AgentRunState {
    QUEUED,
    THINKING,
    DRAFTING,
    SUBMITTED,
    REVISING,
    PASSED,
    PASSED_WITH_NOTE,
    DISSENTING,
    FAILED,
    RECUSED
}
