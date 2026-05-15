-- V002 — Widen speaking_style column.
--
-- The seeded personas use descriptive style phrases like
--   "wide-lens, comparative across regimes, references named central banks"
-- which exceed the original VARCHAR(50) limit and failed to insert.
ALTER TABLE agent_profiles ALTER COLUMN speaking_style TYPE VARCHAR(160);
