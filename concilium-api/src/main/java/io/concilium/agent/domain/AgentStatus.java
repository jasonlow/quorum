package io.concilium.agent.domain;

/**
 * Lifecycle state of an agent profile.
 *
 * <p>PUBLISHED: visible in the library, eligible for committee membership,
 *               eligible for new sessions.
 * <p>ARCHIVED:  soft-deleted; hidden from the library list but the row
 *               persists so committee_members and session_agent_states
 *               foreign keys remain valid. Historical sessions therefore
 *               keep their full agent profile in the audit chain.
 */
public enum AgentStatus {
    PUBLISHED,
    ARCHIVED;
}
