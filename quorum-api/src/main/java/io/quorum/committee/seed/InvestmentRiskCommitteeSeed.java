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
 * Seeds the Investment Risk Committee and its 5 members from the
 * agent library. Runs AFTER InvestmentRiskAgentsSeed.
 *
 * <p>Idempotent: get-or-create the committee, then get-or-create each
 * membership row. Surviving a partial previous boot is safe — the next
 * boot tops up missing memberships without duplicating existing ones.
 */
@Configuration
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class InvestmentRiskCommitteeSeed {

    private static final String COMMITTEE_NAME = "Investment Risk Committee";

    private static final List<String> SPEAKING_ORDER = List.of(
        "Risk Manager",
        "Investment Strategist",
        "Compliance Officer",
        "Treasury / Ops",
        "Macro Economist"
    );

    @Bean
    @Order(2)
    ApplicationRunner seedInvestmentRiskCommittee(
            CommitteeRepository committees,
            CommitteeMemberRepository members,
            AgentProfileRepository agents) {

        return args -> {
            // Step 1: get-or-create the committee
            Committee committee = committees.findByName(COMMITTEE_NAME).orElseGet(() -> {
                log.info("Creating {} ...", COMMITTEE_NAME);
                return committees.save(Committee.builder()
                    .name(COMMITTEE_NAME)
                    .description("Multi-angle risk review of structured products")
                    .orchestrationPattern(OrchestrationPattern.ROUND_ROBIN)
                    .qaIntensity(QaIntensity.NONE)
                    .decisionRule("CHAIR_DECIDES")
                    .maxRevisionRounds(1)
                    .build());
            });

            // Step 2: top up missing memberships, in speaking order
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
