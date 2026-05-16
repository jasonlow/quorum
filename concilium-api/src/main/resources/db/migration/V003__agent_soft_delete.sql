-- V003 — Soft delete for agent profiles.
--
-- DELETE on an agent now sets status='ARCHIVED' instead of removing the row.
-- This preserves FK integrity for committee_members and session_agent_states
-- (so historical sessions keep referencing the agent they actually ran with)
-- and the audit provenance promised by the BRD.
--
-- The original global UNIQUE on (name) is replaced by a partial unique index
-- that only applies to PUBLISHED rows. This means:
--   - Names remain unique among ACTIVE agents (PUBLISHED).
--   - An archived agent can have its name reused for a fresh PUBLISHED one.
--   - Multiple archived agents may share a name (e.g. an agent named, archived,
--     recreated, archived again, recreated — all coexist).

ALTER TABLE agent_profiles
    ADD COLUMN status      VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    ADD COLUMN archived_at TIMESTAMPTZ;

ALTER TABLE agent_profiles DROP CONSTRAINT agent_profiles_name_key;

CREATE UNIQUE INDEX agent_profiles_name_published_uq
    ON agent_profiles (name)
    WHERE status = 'PUBLISHED';

CREATE INDEX idx_agent_profiles_status ON agent_profiles (status);
