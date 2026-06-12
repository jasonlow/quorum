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
 * Seeds the Client Onboarding Committee from BRD §6.1 (KYC/AML, Risk,
 * Legal, RM). Runs after {@code ClientOnboardingAgentsSeed}.
 *
 * <p>The BRD describes this committee as a Vote (Approve / Reject /
 * Escalate). PoC orchestrator implements ROUND_ROBIN only, so we ship
 * with ROUND_ROBIN and the chair-decides rule — the personas already
 * conclude with a vote-shaped verdict in their system prompts, so the
 * pattern degrades sensibly.
 */
@Configuration
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class ClientOnboardingCommitteeSeed {

    private static final String COMMITTEE_NAME = "Client Onboarding Committee";

    private static final List<String> SPEAKING_ORDER = List.of(
        "KYC/AML Officer",
        "Onboarding Risk Officer",
        "Legal Counsel",
        "Relationship Manager"
    );

    @Bean
    @Order(4)
    ApplicationRunner seedClientOnboardingCommittee(
            CommitteeRepository committees,
            CommitteeMemberRepository members,
            AgentProfileRepository agents) {

        return args -> {
            Committee committee = committees.findByName(COMMITTEE_NAME).orElseGet(() -> {
                log.info("Creating {} ...", COMMITTEE_NAME);
                return committees.save(Committee.builder()
                    .name(COMMITTEE_NAME)
                    .description("Multi-perspective KYC/AML and onboarding review for new clients")
                    .orchestrationPattern(OrchestrationPattern.ROUND_ROBIN)
                    .qaIntensity(QaIntensity.DEEP)
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
