package io.quorum.session.store;

import io.quorum.session.domain.SessionDocument;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SessionDocumentRepository extends JpaRepository<SessionDocument, UUID> {

    List<SessionDocument> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    int countBySessionId(UUID sessionId);

    @Transactional
    void deleteBySessionIdAndId(UUID sessionId, UUID id);
}
