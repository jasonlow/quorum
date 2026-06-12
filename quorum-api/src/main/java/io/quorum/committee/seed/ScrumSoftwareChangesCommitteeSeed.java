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
 * Seeds the SCRUM Software Changes Committee — the delivery team that
 * deliberates on a single software change (story refinement / sprint
 * planning altitude), as distinct from the Change Triage Committee
 * which sits at the prioritisation-board altitude.
 *
 * <p>Ships with a {@code knowledgeText} block containing the team's
 * Definition of Done. Every agent on this committee sees this doctrine
 * as always-on context in their prompts — that's the standing-context
 * feature working end-to-end.
 */
@Configuration
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class ScrumSoftwareChangesCommitteeSeed {

    private static final String COMMITTEE_NAME = "SCRUM Software Changes Committee";

    private static final List<String> SPEAKING_ORDER = List.of(
        "Product Owner",
        "Scrum Master",
        "Tech Lead",
        "Backend Engineer",
        "Frontend Engineer",
        "QA Engineer"
    );

    /**
     * Definition of Done — the team's shared acceptance bar. Read once
     * per session and injected into every agent's prompt as standing
     * context. Tweak via the Committee Editor in the UI without
     * touching code.
     */
    private static final String DEFINITION_OF_DONE = """
        # Definition of Done — Scrum Team (Software Changes)

        Every story is *done* only when ALL of the following hold:

        1. **Acceptance criteria** — Each criterion is explicit, testable,
           and demonstrably met. No "we'll know it when we see it" criteria.
        2. **Tests** — Unit and integration tests added for new code paths;
           coverage delta is non-negative. Contract tests for any API shape
           change. At least one end-to-end test for user-visible flows.
        3. **Code review** — Reviewed by at least one other engineer; review
           comments resolved or explicitly deferred with a follow-up issue.
        4. **Observability** — At least one metric, structured log, or trace
           span added for any new code path. Errors surface to alerting.
        5. **Accessibility** — Frontend changes meet WCAG 2.1 AA: keyboard
           navigable, focus visible, sufficient contrast, screen-reader
           labelled.
        6. **Rollout** — User-visible changes deploy behind a feature flag
           that can be toggled without a re-deploy. Rollback path documented.
        7. **Docs** — README, changelog, and (if architectural) an ADR
           updated in the same PR.

        Stories that cannot meet this bar within the sprint are reshaped
        into smaller increments that can.
        """;

    @Bean
    @Order(8)
    ApplicationRunner seedScrumCommittee(
            CommitteeRepository committees,
            CommitteeMemberRepository members,
            AgentProfileRepository agents) {

        return args -> {
            Committee committee = committees.findByName(COMMITTEE_NAME).orElseGet(() -> {
                log.info("Creating {} ...", COMMITTEE_NAME);
                return committees.save(Committee.builder()
                    .name(COMMITTEE_NAME)
                    .description("Scrum delivery team — refines and qualifies a single software change against the team's Definition of Done")
                    .orchestrationPattern(OrchestrationPattern.ROUND_ROBIN)
                    .qaIntensity(QaIntensity.DEEP)
                    .decisionRule("CHAIR_DECIDES")
                    .maxRevisionRounds(1)
                    .knowledgeText(DEFINITION_OF_DONE)
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
