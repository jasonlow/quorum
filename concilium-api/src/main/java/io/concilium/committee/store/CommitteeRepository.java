package io.concilium.committee.store;

import io.concilium.committee.domain.Committee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommitteeRepository extends JpaRepository<Committee, UUID> {
    Optional<Committee> findByName(String name);
}
