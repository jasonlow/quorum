package io.concilium.session.api;

import io.concilium.session.api.dto.AgentDraftView;
import io.concilium.session.api.dto.ConveneRequest;
import io.concilium.session.api.dto.SessionView;
import io.concilium.session.orchestrator.RoundRobinOrchestrator;
import io.concilium.session.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService service;
    private final RoundRobinOrchestrator orchestrator;

    /** Convene a new session. PoC: defaults to Investment Risk Committee. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SessionView convene(@Valid @RequestBody ConveneRequest req) {
        return service.convene(req);
    }

    /** Read a session's current state (phase + agent states). */
    @GetMapping("/{id}")
    public SessionView get(@PathVariable UUID id) {
        return service.get(id);
    }

    /**
     * Run a single agent synchronously and store the draft.
     *
     * <p>Week 1 dev path. The full orchestrator now runs via
     * {@code POST /sessions/{id}/deliberate} but this single-agent path
     * is preserved for fast iteration / smoke testing.
     */
    @PostMapping("/{id}/run-one-agent")
    public AgentDraftView runOneAgent(@PathVariable UUID id, @RequestParam UUID agentId) {
        return service.runOneAgent(id, agentId);
    }

    /**
     * Kick off the full parallel deliberation. Returns 202 immediately;
     * subscribe to {@code GET /sessions/{id}/stream} to watch progress.
     */
    @PostMapping("/{id}/deliberate")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ResponseEntity<Map<String, Object>> deliberate(@PathVariable UUID id) {
        // Ensure session exists (404 otherwise) before kicking off the VT
        service.get(id);
        orchestrator.startAsync(id);
        return ResponseEntity.accepted().body(Map.of(
            "sessionId", id,
            "streamUrl", "/api/v1/sessions/" + id + "/stream",
            "message", "Deliberation started. Subscribe to streamUrl for live updates."
        ));
    }
}
