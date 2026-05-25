package io.quorum.decision.api;

import io.quorum.audit.domain.AuditRecord;
import io.quorum.audit.store.AuditRecordRepository;
import io.quorum.decision.api.dto.DecideRequest;
import io.quorum.decision.api.dto.DecideResponse;
import io.quorum.decision.domain.Decision;
import io.quorum.decision.service.DecisionSealer;
import io.quorum.decision.store.DecisionRepository;
import io.quorum.session.domain.Phase;
import io.quorum.session.domain.Session;
import io.quorum.session.store.SessionRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.*;

/**
 * Records the chair's binding decision and seals an audit record.
 *
 * <p>Idempotent: a session can have at most one decision (DB unique on
 * session_id, plus the no-update trigger). A second call with the same
 * session id returns the existing decision + audit summary with 200.
 */
@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
@Slf4j
public class DecisionController {

    private final SessionRepository sessions;
    private final DecisionRepository decisions;
    private final AuditRecordRepository auditRecords;
    private final DecisionSealer sealer;

    @PostMapping("/{id}/decide")
    public DecideResponse decide(@PathVariable UUID id,
                                 @Valid @RequestBody DecideRequest req) {
        Session session = sessions.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Session not found: " + id));

        // Idempotent on retry — return existing record if already sealed.
        var existing = decisions.findBySessionId(id);
        if (existing.isPresent()) {
            AuditRecord audit = auditRecords.findBySessionId(id).orElseThrow(
                () -> new IllegalStateException(
                    "Decision exists without audit record — inconsistent state"));
            return DecideResponse.of(existing.get(), audit);
        }

        if (session.getPhase() != Phase.BRIEFED && session.getPhase() != Phase.DECIDED) {
            throw new ResponseStatusException(CONFLICT,
                "Session not ready to decide; current phase is "
                    + session.getPhase() + " (expected BRIEFED)");
        }

        String chairLabel = (req.chairLabel() == null || req.chairLabel().isBlank())
            ? "chair@local" : req.chairLabel();

        Decision decision = Decision.builder()
            .sessionId(id)
            .chairLabel(chairLabel)
            .decisionType(req.decision())
            .overrides(req.overrides())
            .notes(req.notes())
            .build();
        decision = decisions.save(decision);

        AuditRecord audit = sealer.seal(decision);

        // Bump session phase to DECIDED. Don't fight the V001 trigger — only sessions is mutable.
        session.setPhase(Phase.DECIDED);
        session.setEndedAt(java.time.OffsetDateTime.now());
        sessions.save(session);

        log.info("Decision sealed: session={} decision={} chair={}",
            id, decision.getDecisionType(), chairLabel);
        return DecideResponse.of(decision, audit);
    }
}
