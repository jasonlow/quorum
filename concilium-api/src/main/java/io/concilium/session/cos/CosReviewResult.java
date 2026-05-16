package io.concilium.session.cos;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * The structured result of one CoS review pass. JSON shape matches the
 * response contract in {@code prompts/cos-review.hbs}.
 *
 * <p>{@code @JsonIgnoreProperties(ignoreUnknown=true)} guards against the
 * LLM adding extra keys ("reasoning", etc.) — we tolerate, not crash.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record CosReviewResult(
    int specificity,
    int completeness,
    int evidence,
    int boundaries,
    int ideology,
    CosVerdict verdict,
    String challenge
) {
    /** Fallback used when LLM response is unparseable — pass with a flag. */
    public static CosReviewResult parseError(String raw) {
        return new CosReviewResult(3, 3, 3, 3, 3,
            CosVerdict.PASSED_WITH_NOTE,
            "(CoS response was not parseable; included as-is. Raw head: "
                + (raw == null ? "null" : raw.substring(0, Math.min(120, raw.length()))) + "…)");
    }
}
