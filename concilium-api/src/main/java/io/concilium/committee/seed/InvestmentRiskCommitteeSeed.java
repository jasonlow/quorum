package io.concilium.committee.seed;

import io.concilium.agent.store.AgentProfileRepository;
import io.concilium.committee.domain.Committee;
import io.concilium.committee.domain.CommitteeMember;
import io.concilium.committee.domain.OrchestrationPattern;
import io.concilium.committee.domain.QaIntensity;
import io.concilium.committee.store.CommitteeMemberRepository;
import io.concilium.committee.store.CommitteeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;

import java.util.List;

/**
 * Seeds the Investment Risk Committee binding the 5 hardcoded agents in
 * speaking order. Runs AFTER InvestmentRiskAgentsSeed so the agents exist.
 */
@Configuration
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class InvestmentRiskCommitteeSeed {

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
            if (committees.findByName("Investment Risk Committee").isPresent()) {
                log.info("Investment Risk Committee already seeded — skipping");
                return;
            }

            var committee = committees.save(Committee.builder()
                .name("Investment Risk Committee")
                .description("Multi-angle risk review of structured products")
                .orchestrationPattern(OrchestrationPattern.ROUND_ROBIN)
                .qaIntensity(QaIntensity.NONE)
                .decisionRule("CHAIR_DECIDES")
                .maxRevisionRounds(1)
                .build());

            for (int i = 0; i < SPEAKING_ORDER.size(); i++) {
                var agentName = SPEAKING_ORDER.get(i);
                var agent = agents.findByName(agentName).orElseThrow(
                    () -> new IllegalStateException(
                        "Expected agent '" + agentName + "' to exist; check seeder order."));
                members.save(CommitteeMember.builder()
                    .committeeId(committee.getId())
                    .agentId(agent.getId())
                    .speakingOrder(i + 1)
                    .build());
            }

            log.info("Seeded Investment Risk Committee with {} members",
                members.findByCommitteeIdOrderBySpeakingOrderAsc(committee.getId()).size());
        };
    }
}
