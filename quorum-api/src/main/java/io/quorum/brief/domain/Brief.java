package io.quorum.brief.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * The consolidated brief — one per session. Body is a JSON object whose
 * shape matches the CoS consolidation prompt's output schema, with the
 * top-level fields (recommendation, confidence, headline, consensus,
 * disagreements, agentBreakdown) plus generation metadata.
 */
@Entity
@Table(name = "briefs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Brief {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "session_id", nullable = false, unique = true)
    private UUID sessionId;

    @Column(length = 60)
    private String recommendation;

    @Column(length = 20)
    private String confidence;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "body_json", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> bodyJson;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }
}
