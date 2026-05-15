package io.concilium.agent.store;

import io.concilium.agent.domain.AgentProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgentProfileRepository extends JpaRepository<AgentProfile, UUID> {
    Optional<AgentProfile> findByName(String name);
}
