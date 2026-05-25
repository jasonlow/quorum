package io.quorum.session.store;

import io.quorum.session.domain.SessionAgentState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SessionAgentStateRepository
        extends JpaRepository<SessionAgentState, SessionAgentState.PK> {

    List<SessionAgentState> findBySessionId(UUID sessionId);
}
