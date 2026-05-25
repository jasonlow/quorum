package io.quorum.audit;

import io.quorum.TestcontainersConfiguration;
import io.quorum.agent.store.AgentProfileRepository;
import io.quorum.audit.domain.AuditRecord;
import io.quorum.audit.verify.VerifyCli;
import io.quorum.brief.domain.Brief;
import io.quorum.brief.store.BriefRepository;
import io.quorum.committee.domain.Committee;
import io.quorum.committee.store.CommitteeMemberRepository;
import io.quorum.committee.store.CommitteeRepository;
import io.quorum.decision.domain.Decision;
import io.quorum.decision.domain.DecisionType;
import io.quorum.decision.service.DecisionSealer;
import io.quorum.decision.store.DecisionRepository;
import io.quorum.session.domain.AgentRunState;
import io.quorum.session.domain.Phase;
import io.quorum.session.domain.Session;
import io.quorum.session.domain.SessionAgentState;
import io.quorum.session.store.SessionAgentStateRepository;
import io.quorum.session.store.SessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Files;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end seal → verify round-trip test.
 *
 * <p>Regression guard for the canonicalisation bug discovered during PoC
 * Week 3 testing: if the sealer ever writes the envelope with a mapper
 * whose serialisation rules differ from the canonical one
 * (timestamp format, key order, NON_NULL handling, etc.), the
 * untampered envelope will fail to verify. This test seals a real
 * session and runs the verifier against the produced envelope —
 * asserting exit-code 0 (verified) on a fresh, untampered file, and
 * exit-code 1 after a single-byte tamper.
 *
 * <p>The keystore + payload directories are redirected to a JUnit
 * {@code @TempDir} so the test does not touch the real {@code ./data/}.
 */
@SpringBootTest
@Import(TestcontainersConfiguration.class)
class SealVerifyRoundTripTest {

    @TempDir
    static Path tempDir;

    @DynamicPropertySource
    static void overrideAuditPaths(DynamicPropertyRegistry registry) {
        registry.add("quorum.audit.keys-dir",    () -> tempDir.resolve("keys").toString());
        registry.add("quorum.audit.payload-dir", () -> tempDir.resolve("audit").toString());
        // Required to construct the OpenAI chat model bean even though we
        // never make a real LLM call in this test.
        registry.add("spring.ai.model.chat", () -> "openai");
        registry.add("spring.ai.openai.api-key", () -> "test-key");
    }

    @Autowired SessionRepository sessions;
    @Autowired SessionAgentStateRepository agentStates;
    @Autowired CommitteeRepository committees;
    @Autowired CommitteeMemberRepository members;
    @Autowired AgentProfileRepository agents;
    @Autowired BriefRepository briefs;
    @Autowired DecisionRepository decisions;
    @Autowired DecisionSealer sealer;

    @Test
    void sealsAndVerifiesUntampered_thenDetectsTamper() throws Exception {
        // ---- Seed a minimal session in BRIEFED phase, ready to seal ----
        Committee committee = committees.findByName("Investment Risk Committee").orElseThrow();
        Session session = sessions.save(Session.builder()
            .committeeId(committee.getId())
            .topic("Round-trip test topic")
            .contextMd("# context\n- bullet")
            .phase(Phase.BRIEFED)
            .build());

        // Mark each committee member's agent state as PASSED with a tiny draft
        for (var m : members.findByCommitteeIdOrderBySpeakingOrderAsc(committee.getId())) {
            agentStates.save(SessionAgentState.builder()
                .sessionId(session.getId())
                .agentId(m.getAgentId())
                .state(AgentRunState.PASSED)
                .progress(100)
                .draftText("Draft text from " + m.getAgentId())
                .build());
        }

        // Persist a minimal brief
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("headline",       "Test recommendation");
        body.put("consensus",      List.of("All agreed", "On all points"));
        body.put("disagreements",  List.of());
        briefs.save(Brief.builder()
            .sessionId(session.getId())
            .recommendation("APPROVE")
            .confidence("HIGH")
            .bodyJson(body)
            .build());

        // Persist the chair's decision
        Map<String, Object> overrides = new LinkedHashMap<>();
        overrides.put("collateralBufferPct", 12.5);
        overrides.put("reviewAfterDays",     90);
        Decision decision = decisions.save(Decision.builder()
            .sessionId(session.getId())
            .chairLabel("test-chair@local")
            .decisionType(DecisionType.APPROVE_WITH_CHANGES)
            .overrides(overrides)
            .notes("Round-trip test")
            .build());

        // ---- Seal ----
        AuditRecord record = sealer.seal(decision);
        Path envelopePath  = Path.of(record.getPayloadPath());
        Path publicKeyPath = tempDir.resolve("keys").resolve("quorum-public.pem");

        assertThat(envelopePath).exists();
        assertThat(publicKeyPath).exists();

        // ---- Verify untampered → expect 0 (OK) ----
        int okCode = VerifyCli.verify(envelopePath, publicKeyPath);
        assertThat(okCode)
            .as("Fresh untampered envelope must verify cleanly — guards against canonicalisation drift")
            .isEqualTo(0);

        // ---- Tamper a single byte inside payload → expect 1 (FAIL) ----
        String original = Files.readString(envelopePath);
        // Flip "headline" value's first letter. Tiny, byte-precise edit.
        String tampered = original.replace("\"Test recommendation\"", "\"Xest recommendation\"");
        assertThat(tampered).isNotEqualTo(original);
        Files.writeString(envelopePath, tampered);

        int failCode = VerifyCli.verify(envelopePath, publicKeyPath);
        assertThat(failCode)
            .as("Single-byte tamper inside payload must trip tamper detection")
            .isEqualTo(1);
    }
}
