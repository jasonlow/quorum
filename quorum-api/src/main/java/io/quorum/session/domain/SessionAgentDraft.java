package io.quorum.session.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One draft produced by one agent in one CoS round.
 *
 * <p>Round 1 is the initial draft. Round 2+ are revisions issued after a
 * {@code REVISION_REQUESTED} verdict from the CoS. Aligns with the
 * {@code round_no} on {@code cos_reviews}.
 */
@Entity
@Table(name = "session_agent_drafts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SessionAgentDraft {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "round_no", nullable = false)
    private int roundNo;

    @Column(name = "draft_text", nullable = false, columnDefinition = "TEXT")
    private String draftText;

    @Column(name = "model_used", length = 80)
    private String modelUsed;

    @Column(name = "prompt_tokens")
    private Integer promptTokens;

    @Column(name = "completion_tokens")
    private Integer completionTokens;

    @Column(name = "latency_ms")
    private Integer latencyMs;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
