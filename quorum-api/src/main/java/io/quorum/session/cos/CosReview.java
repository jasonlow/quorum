package io.quorum.session.cos;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Persistent record of one CoS review pass on one agent's draft.
 * Multiple rows per (session, agent) when revisions happen — distinguish
 * by {@code roundNo} (1 = first review, 2 = post-revision review, …).
 */
@Entity
@Table(name = "cos_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CosReview {

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

    @Column(name = "specificity_score")
    private Short specificityScore;

    @Column(name = "completeness_score")
    private Short completenessScore;

    @Column(name = "evidence_score")
    private Short evidenceScore;

    @Column(name = "boundaries_score")
    private Short boundariesScore;

    @Column(name = "ideology_score")
    private Short ideologyScore;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CosVerdict verdict;

    @Column(name = "challenge_text", columnDefinition = "TEXT")
    private String challengeText;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
