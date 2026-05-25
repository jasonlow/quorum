package io.quorum.session.store;

import io.quorum.session.api.dto.SessionListItem;
import io.quorum.session.domain.Session;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    /**
     * Sessions listed newest-first with the optional decision summary joined in.
     * LEFT JOIN so sessions that haven't been decided yet still appear.
     */
    @Query("""
        SELECT new io.quorum.session.api.dto.SessionListItem(
            s.id, s.topic, s.phase, s.startedAt, s.endedAt,
            d.decisionType, d.chairLabel, d.sealedAt
        )
        FROM Session s
        LEFT JOIN io.quorum.decision.domain.Decision d ON d.sessionId = s.id
        ORDER BY s.startedAt DESC
        """)
    List<SessionListItem> listRecent(Pageable pageable);
}
