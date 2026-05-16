package io.concilium.agent.store;

import io.concilium.agent.domain.AgentProfile;
import io.concilium.agent.domain.AgentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentProfileRepository extends JpaRepository<AgentProfile, UUID> {

    /**
     * Find by name regardless of status. Useful for:
     *   - seeders (skip if any row exists with that name, even archived)
     *   - any caller that needs to look up the historical record
     */
    Optional<AgentProfile> findByName(String name);

    /** Find a PUBLISHED agent by name — the active row currently carrying that label. */
    Optional<AgentProfile> findByNameAndStatus(String name, AgentStatus status);

    /** List by status — controller passes PUBLISHED to hide archived rows. */
    List<AgentProfile> findAllByStatusOrderByNameAsc(AgentStatus status);
}
