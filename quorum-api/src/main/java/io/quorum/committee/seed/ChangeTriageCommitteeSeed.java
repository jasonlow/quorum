package io.quorum.committee.seed;

import io.quorum.agent.store.AgentProfileRepository;
import io.quorum.committee.domain.Committee;
import io.quorum.committee.domain.CommitteeMember;
import io.quorum.committee.domain.OrchestrationPattern;
import io.quorum.committee.domain.QaIntensity;
import io.quorum.committee.store.CommitteeMemberRepository;
import io.quorum.committee.store.CommitteeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;

import java.util.List;
import java.util.UUID;

/**
 * Seeds the Change Triage Committee from BRD §6.3 (CTO, Security,
 * Product, DevOps, Regulatory Affairs). Runs after
 * {@code ChangeTriageAgentsSeed}.
 *
 * <p>BRD calls for a Parallel-Score pattern — each agent independently
 * scores the change on their domain criteria, results aggregated into a
 * priority tier. The PoC orchestrator implements ROUND_ROBIN only, so
 * we ship with ROUND_ROBIN and the personas still produce per-axis
 * scores in their drafts; the chair sees five scoring lenses across one
 * round of speaking.
 */
@Configuration
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class ChangeTriageCommitteeSeed {

    private static final String COMMITTEE_NAME = "Change Triage Committee";

    private static final List<String> SPEAKING_ORDER = List.of(
        "CTO / Architect",
        "Security Officer",
        "Product Manager",
        "DevOps Lead",
        "Regulatory Affairs Lead"
    );

    @Bean
    @Order(6)
    ApplicationRunner seedChangeTriageCommittee(
            CommitteeRepository committees,
            CommitteeMemberRepository members,
            AgentProfileRepository agents) {

        return args -> {
            Committee committee = committees.findByName(COMMITTEE_NAME).orElseGet(() -> {
                log.info("Creating {} ...", COMMITTEE_NAME);
                return committees.save(Committee.builder()
                    .name(COMMITTEE_NAME)
                    .description("Cross-functional prioritisation of engineering change requests across five lenses")
                    .orchestrationPattern(OrchestrationPattern.ROUND_ROBIN)
                    .qaIntensity(QaIntensity.NONE)
                    .decisionRule("CHAIR_DECIDES")
                    .maxRevisionRounds(1)
                    .build());
            });

            int addedCount = 0;
            for (int i = 0; i < SPEAKING_ORDER.size(); i++) {
                String agentName = SPEAKING_ORDER.get(i);
                int speakingOrder = i + 1;
                UUID agentId = agents.findByName(agentName)
                    .orElseThrow(() -> new IllegalStateException(
                        "Expected agent '" + agentName + "' to exist (seeder ordering issue?)"))
                    .getId();

                CommitteeMember.PK pk = new CommitteeMember.PK(committee.getId(), agentId);
                if (members.existsById(pk)) {
                    continue;
                }
                members.save(CommitteeMember.builder()
                    .committeeId(committee.getId())
                    .agentId(agentId)
                    .speakingOrder(speakingOrder)
                    .build());
                addedCount++;
                log.info("  + added member: {} (speaking order {})", agentName, speakingOrder);
            }

            int totalMembers = members.findByCommitteeIdOrderBySpeakingOrderAsc(committee.getId()).size();
            log.info("{} ready. Added: {}, total members: {}", COMMITTEE_NAME, addedCount, totalMembers);
        };
    }
}
