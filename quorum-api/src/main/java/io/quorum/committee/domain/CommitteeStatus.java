package io.quorum.committee.domain;

/**
 * Lifecycle state of a committee. Same semantics as
 * {@code AgentStatus}: PUBLISHED is visible/usable, ARCHIVED is hidden
 * from the library and from new session composition but preserves the
 * row so historical sessions still resolve their committee_id FK.
 */
public enum CommitteeStatus {
    PUBLISHED,
    ARCHIVED;
}
