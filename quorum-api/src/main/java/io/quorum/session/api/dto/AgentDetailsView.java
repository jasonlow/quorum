package io.quorum.session.api.dto;

import io.quorum.session.cos.CosVerdict;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Per-agent expanded view for the Boardroom click-to-expand panel.
 *
 * <p>Returns the full per-round history: each round contains the draft
 * the agent produced and the CoS review that followed (verdict, 5-axis
 * scores, challenge text). The drafts and reviews are joined by round
 * number — a "round" is one (draft, review) pair.
 */
public record AgentDetailsView(
    UUID sessionId,
    UUID agentId,
    String agentName,
    List<Round> rounds
) {
    public record Round(
        int roundNo,
        DraftSnapshot draft,
        ReviewSnapshot review
    ) {}

    public record DraftSnapshot(
        String text,
        String modelUsed,
        Integer promptTokens,
        Integer completionTokens,
        Integer latencyMs,
        OffsetDateTime createdAt
    ) {}

    public record ReviewSnapshot(
        CosVerdict verdict,
        Scores scores,
        String challenge,
        OffsetDateTime createdAt
    ) {}

    public record Scores(
        Short specificity,
        Short completeness,
        Short evidence,
        Short boundaries,
        Short ideology
    ) {}
}
