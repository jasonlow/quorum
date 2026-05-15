package io.concilium.session.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Session {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "committee_id", nullable = false)
    private UUID committeeId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String topic;

    @Column(name = "context_md", columnDefinition = "TEXT")
    private String contextMd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private Phase phase = Phase.CONVENED;

    @Column(name = "started_at", nullable = false)
    private OffsetDateTime startedAt;

    @Column(name = "ended_at")
    private OffsetDateTime endedAt;

    @PrePersist
    void onCreate() {
        if (startedAt == null) {
            startedAt = OffsetDateTime.now();
        }
    }
}
