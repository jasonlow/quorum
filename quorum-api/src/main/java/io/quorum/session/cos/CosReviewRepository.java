package io.quorum.session.cos;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CosReviewRepository extends JpaRepository<CosReview, UUID> {

    List<CosReview> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    List<CosReview> findBySessionIdAndAgentIdOrderByRoundNoAsc(UUID sessionId, UUID agentId);
}
