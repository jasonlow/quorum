package io.concilium.committee.domain;

/**
 * How aggressively the Chief of Staff gates each agent's draft.
 *
 * <ul>
 *   <li>{@code NONE}   — no CoS review; first draft is published as-is.</li>
 *   <li>{@code SINGLE} — one CoS review, plus up to one revision round
 *       (capped at {@code min(1, maxRevisionRounds)}).</li>
 *   <li>{@code DEEP}   — CoS reviews until verdict is PASSED/PASSED_WITH_NOTE
 *       or the committee's {@code maxRevisionRounds} budget is exhausted.</li>
 * </ul>
 */
public enum QaIntensity {
    NONE,
    SINGLE,
    DEEP
}
