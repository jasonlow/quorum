package io.quorum.session.domain;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Per-session, per-agent state machine snapshot. Streamed to the boardroom
 * UI as agents transition through states. PK is composite (session_id, agent_id).
 */
@Entity
@Table(name = "session_agent_states")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(SessionAgentState.PK.class)
public class SessionAgentState {

    @Id
    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Id
    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private AgentRunState state = AgentRunState.QUEUED;

    @Column(nullable = false)
    @Builder.Default
    private int progress = 0;

    @Column(name = "draft_text", columnDefinition = "TEXT")
    private String draftText;

    @Column(name = "last_updated", nullable = false)
    private OffsetDateTime lastUpdated;

    @PrePersist
    @PreUpdate
    void touch() {
        lastUpdated = OffsetDateTime.now();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PK implements Serializable {
        private UUID sessionId;
        private UUID agentId;

        @Override public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK pk)) return false;
            return Objects.equals(sessionId, pk.sessionId)
                && Objects.equals(agentId, pk.agentId);
        }
        @Override public int hashCode() { return Objects.hash(sessionId, agentId); }
    }
}
