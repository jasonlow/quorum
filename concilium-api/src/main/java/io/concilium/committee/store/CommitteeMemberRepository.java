package io.concilium.committee.store;

import io.concilium.committee.domain.CommitteeMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommitteeMemberRepository
        extends JpaRepository<CommitteeMember, CommitteeMember.PK> {

    List<CommitteeMember> findByCommitteeIdOrderBySpeakingOrderAsc(UUID committeeId);
}
