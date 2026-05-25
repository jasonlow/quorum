-- V007 — Per-agent and committee-level knowledge base ("Wiki" mode).
--
-- Each agent and each committee gets a nullable curated text field that
-- is always prepended to the agent's user prompt (and to the CoS review
-- prompt + brief consolidator). Section order in the final prompt:
--   1. Committee doctrine  (committees.knowledge_text)
--   2. Agent reference     (agent_profiles.knowledge_text)
--   3. Topic
--   4. Context (session.context_md)
--   5. Supporting documents (session_documents)
--   6. Task / revision
--
-- Phase 1 RAG layers vector tables alongside these columns; the columns
-- become "always-on doctrine" in the hybrid model.

ALTER TABLE committees     ADD COLUMN knowledge_text TEXT;
ALTER TABLE agent_profiles ADD COLUMN knowledge_text TEXT;
