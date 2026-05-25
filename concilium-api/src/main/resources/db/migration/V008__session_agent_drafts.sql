-- V008 — Per-round drafts for the Boardroom round-history view.
--
-- session_agent_states.draft_text only holds the FINAL draft (it's
-- overwritten on every revision). This table preserves every draft the
-- agent produced, in order, so the chair can see how a draft evolved
-- across CoS revision rounds.
--
-- Round numbering aligns with cos_reviews.round_no:
--   round 1  = initial draft + first CoS review
--   round 2+ = each subsequent revise + review pair

CREATE TABLE session_agent_drafts (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id         UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agent_id           UUID NOT NULL,
    round_no           INT NOT NULL,
    draft_text         TEXT NOT NULL,
    model_used         VARCHAR(80),
    prompt_tokens      INT,
    completion_tokens  INT,
    latency_ms         INT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_agent_drafts_agent
    ON session_agent_drafts (session_id, agent_id, round_no);
