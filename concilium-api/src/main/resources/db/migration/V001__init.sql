-- V001 — Initial schema for the PoC.
-- Subset of the production schema in ai-committee-solution-architecture.md §10.1.
-- Multi-tenant / RBAC tables are deferred to Phase 1.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- =========================================================================
-- Agents
-- =========================================================================
CREATE TABLE agent_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    skills          JSONB NOT NULL DEFAULT '[]'::jsonb,
    ideology        VARCHAR(80),
    biases          JSONB NOT NULL DEFAULT '[]'::jsonb,
    boundaries      JSONB NOT NULL DEFAULT '[]'::jsonb,
    speaking_style  VARCHAR(50),
    system_prompt   TEXT NOT NULL,
    model_override  VARCHAR(80),
    temperature     NUMERIC(3,2) NOT NULL DEFAULT 0.7,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- Committees
-- =========================================================================
CREATE TABLE committees (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                   VARCHAR(200) NOT NULL UNIQUE,
    description            TEXT,
    orchestration_pattern  VARCHAR(30) NOT NULL,   -- ROUND_ROBIN | VOTE | PARALLEL
    qa_intensity           VARCHAR(20) NOT NULL DEFAULT 'NONE', -- NONE | SINGLE | DEEP
    decision_rule          VARCHAR(30) NOT NULL DEFAULT 'CHAIR_DECIDES',
    max_revision_rounds    INT NOT NULL DEFAULT 1,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE committee_members (
    committee_id    UUID NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
    agent_id        UUID NOT NULL REFERENCES agent_profiles(id),
    speaking_order  INT NOT NULL,
    weight          NUMERIC(3,2) NOT NULL DEFAULT 1.0,
    PRIMARY KEY (committee_id, agent_id)
);

-- =========================================================================
-- Sessions
-- =========================================================================
CREATE TABLE sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    committee_id  UUID NOT NULL REFERENCES committees(id),
    topic         TEXT NOT NULL,
    context_md    TEXT,                   -- inline markdown context for PoC
    phase         VARCHAR(30) NOT NULL DEFAULT 'CONVENED',
                  -- CONVENED | DELIBERATING | COS_GATE | BRIEFED | DECIDED | ABORTED
    started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at      TIMESTAMPTZ
);

CREATE INDEX idx_sessions_phase ON sessions (phase);

-- Per-session agent state machine snapshot.
CREATE TABLE session_agent_states (
    session_id    UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agent_id      UUID NOT NULL REFERENCES agent_profiles(id),
    state         VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
                  -- QUEUED | THINKING | DRAFTING | SUBMITTED | REVISING
                  -- | PASSED | PASSED_WITH_NOTE | DISSENTING | FAILED | RECUSED
    progress      INT NOT NULL DEFAULT 0,
    draft_text    TEXT,
    last_updated  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_id, agent_id)
);

-- CoS quality reviews (one row per agent per revision round).
CREATE TABLE cos_reviews (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agent_id            UUID NOT NULL REFERENCES agent_profiles(id),
    round_no            INT NOT NULL,
    specificity_score   SMALLINT,
    completeness_score  SMALLINT,
    evidence_score      SMALLINT,
    boundaries_score    SMALLINT,
    ideology_score      SMALLINT,
    verdict             VARCHAR(30) NOT NULL,
                        -- PASSED | REVISION_REQUESTED | PASSED_WITH_NOTE | FAILED
    challenge_text      TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cos_reviews_session ON cos_reviews (session_id);

-- =========================================================================
-- Brief (one per session)
-- =========================================================================
CREATE TABLE briefs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    recommendation  VARCHAR(60),         -- APPROVE | APPROVE_WITH_CONDITIONS | REJECT | ESCALATE
    confidence      VARCHAR(20),         -- HIGH | MEDIUM | LOW
    body_json       JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- Decision (immutable; INSERT only)
-- =========================================================================
CREATE TABLE decisions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    chair_label     VARCHAR(120) NOT NULL DEFAULT 'chair@local',  -- stub user for PoC
    decision_type   VARCHAR(40) NOT NULL,
                    -- APPROVE | APPROVE_WITH_CHANGES | REJECT | RECONVENE
    overrides_json  JSONB,
    notes           TEXT,
    sealed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent UPDATE/DELETE on decisions (BRULE-02 / append-only).
CREATE OR REPLACE FUNCTION decisions_immutable() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'decisions table is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER decisions_no_update
    BEFORE UPDATE OR DELETE ON decisions
    FOR EACH ROW EXECUTE FUNCTION decisions_immutable();

-- =========================================================================
-- Audit chain (hash-linked, append-only)
-- =========================================================================
CREATE TABLE audit_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL UNIQUE REFERENCES sessions(id),
    prev_hash           BYTEA,                       -- 32 bytes; NULL for genesis
    payload_hash        BYTEA NOT NULL,              -- 32 bytes
    signature           BYTEA NOT NULL,
    signer_key_alias    VARCHAR(120) NOT NULL,
    payload_path        TEXT NOT NULL,               -- path to signed JSON on disk
    sealed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_records_sealed_at ON audit_records (sealed_at);

CREATE TRIGGER audit_records_no_update
    BEFORE UPDATE OR DELETE ON audit_records
    FOR EACH ROW EXECUTE FUNCTION decisions_immutable();
