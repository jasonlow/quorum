package io.quorum.committee.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A committee binds agents to an orchestration pattern + Q&A intensity +
 * decision rule. Members are loaded separately via {@code CommitteeMemberRepository}
 * rather than as a bidirectional collection — keeps the PoC mapping simple
 * and avoids the @IdClass / @JoinColumn duplication trap.
 */
@Entity
@Table(name = "committees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Committee {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "orchestration_pattern", nullable = false, length = 30)
    private OrchestrationPattern orchestrationPattern;

    @Enumerated(EnumType.STRING)
    @Column(name = "qa_intensity", nullable = false, length = 20)
    @Builder.Default
    private QaIntensity qaIntensity = QaIntensity.NONE;

    @Column(name = "decision_rule", nullable = false, length = 30)
    @Builder.Default
    private String decisionRule = "CHAIR_DECIDES";

    @Column(name = "max_revision_rounds", nullable = false)
    @Builder.Default
    private int maxRevisionRounds = 1;

    /** Standing doctrine prepended to every agent's prompt for this committee. */
    @Column(name = "knowledge_text", columnDefinition = "TEXT")
    private String knowledgeText;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private CommitteeStatus status = CommitteeStatus.PUBLISHED;

    @Column(name = "archived_at")
    private OffsetDateTime archivedAt;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
