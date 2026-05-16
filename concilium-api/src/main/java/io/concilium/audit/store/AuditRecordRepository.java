package io.concilium.audit.store;

import io.concilium.audit.domain.AuditRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuditRecordRepository extends JpaRepository<AuditRecord, UUID> {

    Optional<AuditRecord> findBySessionId(UUID sessionId);

    /** Returns the most recently sealed record — the tail of the hash chain. */
    Optional<AuditRecord> findTopByOrderBySealedAtDescIdDesc();
}
