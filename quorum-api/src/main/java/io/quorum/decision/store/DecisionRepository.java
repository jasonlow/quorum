package io.quorum.decision.store;

import io.quorum.decision.domain.Decision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DecisionRepository extends JpaRepository<Decision, UUID> {
    Optional<Decision> findBySessionId(UUID sessionId);
}
