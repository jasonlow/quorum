package io.concilium.committee.domain;

/**
 * How the committee deliberates. PoC supports ROUND_ROBIN only;
 * VOTE and PARALLEL come in Phase 2.
 */
public enum OrchestrationPattern {
    ROUND_ROBIN,
    VOTE,
    PARALLEL
}
