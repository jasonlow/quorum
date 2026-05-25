package io.quorum.decision.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Immutable record of the chair's binding decision. The DB enforces
 * append-only via the {@code decisions_no_update} trigger (V001) — UPDATE
 * or DELETE against this table raises an exception. Application code
 * never mutates a saved row.
 */
@Entity
@Table(name = "decisions")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Decision {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "session_id", nullable = false, unique = true, updatable = false)
    private UUID sessionId;

    @Column(name = "chair_label", nullable = false, length = 120, updatable = false)
    private String chairLabel;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision_type", nullable = false, length = 40, updatable = false)
    private DecisionType decisionType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "overrides_json", columnDefinition = "jsonb", updatable = false)
    private Map<String, Object> overrides;

    @Column(columnDefinition = "TEXT", updatable = false)
    private String notes;

    @Column(name = "sealed_at", nullable = false, updatable = false)
    private OffsetDateTime sealedAt;

    @PrePersist
    void onCreate() {
        if (sealedAt == null) {
            sealedAt = OffsetDateTime.now();
        }
    }
}
