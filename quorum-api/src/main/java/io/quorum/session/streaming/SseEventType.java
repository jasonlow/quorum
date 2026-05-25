package io.quorum.session.streaming;

/**
 * Canonical event names emitted to SSE subscribers. Frontend pattern-matches
 * on these strings — keep them stable. Add new types here; never rename.
 */
public final class SseEventType {

    private SseEventType() {}

    public static final String HELLO              = "hello";
    public static final String HEARTBEAT          = "heartbeat";

    public static final String PHASE_CHANGED      = "phase.changed";

    public static final String AGENT_STATE        = "agent.state.changed";
    public static final String AGENT_DRAFT_TOKEN  = "agent.draft.token";
    public static final String AGENT_DRAFT_DONE   = "agent.draft.done";
    public static final String AGENT_FAILED       = "agent.failed";

    public static final String COS_REVIEW_PASSED  = "cos.review.passed";
    public static final String COS_REVISION_REQ   = "cos.revision_requested";
    public static final String COS_REVIEW_NOTED   = "cos.review.passed_with_note";

    public static final String BRIEF_READY        = "brief.ready";
    public static final String SESSION_COMPLETED  = "session.completed";
}
