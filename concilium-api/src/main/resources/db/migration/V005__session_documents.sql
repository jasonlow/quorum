-- V005 — Supporting documents uploaded against a session.
--
-- A session can carry up to N documents (PDF / DOCX / XLSX / CSV / TXT).
-- The extracted text is appended to every agent's user prompt under a
-- "## Supporting documents" section. Only the extracted text is needed by
-- the orchestrator; the raw bytes are kept on the row for audit / re-download.

CREATE TABLE session_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    filename        VARCHAR(255) NOT NULL,
    content_type    VARCHAR(120) NOT NULL,
    byte_size       INT NOT NULL,
    extracted_text  TEXT NOT NULL,         -- Tika output, capped at 50KB
    sha256          CHAR(64) NOT NULL,     -- of extracted_text, for audit chain
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_session_documents_session ON session_documents (session_id, created_at);
