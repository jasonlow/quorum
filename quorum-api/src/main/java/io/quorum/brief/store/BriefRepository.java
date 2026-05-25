package io.quorum.brief.store;

import io.quorum.brief.domain.Brief;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BriefRepository extends JpaRepository<Brief, UUID> {
    Optional<Brief> findBySessionId(UUID sessionId);
}
