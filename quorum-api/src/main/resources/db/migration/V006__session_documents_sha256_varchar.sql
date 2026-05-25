-- V006 — Fix session_documents.sha256 column type.
--
-- V005 declared it as CHAR(64), which Postgres stores as bpchar. The JPA
-- entity's @Column(length = 64) maps to VARCHAR(64), so Hibernate's schema
-- validator refused to boot. SHA-256 hex is always exactly 64 chars so
-- this is a no-op at the value level.

ALTER TABLE session_documents
    ALTER COLUMN sha256 TYPE VARCHAR(64);
