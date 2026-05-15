package io.concilium.committee.domain;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Objects;
import java.util.UUID;

/**
 * Membership row binding an agent to a committee with a speaking order
 * and weight. Composite PK on (committee_id, agent_id).
 */
@Entity
@Table(name = "committee_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(CommitteeMember.PK.class)
public class CommitteeMember {

    @Id
    @Column(name = "committee_id", nullable = false)
    private UUID committeeId;

    @Id
    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "speaking_order", nullable = false)
    private int speakingOrder;

    @Column(nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal weight = BigDecimal.ONE;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PK implements Serializable {
        private UUID committeeId;
        private UUID agentId;

        @Override public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK pk)) return false;
            return Objects.equals(committeeId, pk.committeeId)
                && Objects.equals(agentId, pk.agentId);
        }
        @Override public int hashCode() { return Objects.hash(committeeId, agentId); }
    }
}
