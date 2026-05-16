-- V004 — Soft delete for committees (mirrors V003 for agents).
--
-- Reasoning is the same: sessions.committee_id REFERENCES committees(id),
-- so removing a committee that has hosted any session would break the
-- audit chain's ability to resolve historical metadata. Archive instead.

ALTER TABLE committees
    ADD COLUMN status      VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    ADD COLUMN archived_at TIMESTAMPTZ;

ALTER TABLE committees DROP CONSTRAINT committees_name_key;

CREATE UNIQUE INDEX committees_name_published_uq
    ON committees (name)
    WHERE status = 'PUBLISHED';

CREATE INDEX idx_committees_status ON committees (status);
