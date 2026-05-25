package io.quorum.session.store;

import io.quorum.session.domain.SessionAgentDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SessionAgentDraftRepository extends JpaRepository<SessionAgentDraft, UUID> {

    List<SessionAgentDraft> findBySessionIdAndAgentIdOrderByRoundNoAsc(UUID sessionId, UUID agentId);
}
