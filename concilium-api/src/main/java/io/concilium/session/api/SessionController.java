package io.concilium.session.api;

import io.concilium.session.api.dto.AgentDraftView;
import io.concilium.session.api.dto.ConveneRequest;
import io.concilium.session.api.dto.SessionView;
import io.concilium.session.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService service;

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
     * <p>Week 1 task path. The Week 2 orchestrator will replace this with a
     * fan-out across all agents over SSE.
     */
    @PostMapping("/{id}/run-one-agent")
    public AgentDraftView runOneAgent(@PathVariable UUID id, @RequestParam UUID agentId) {
        return service.runOneAgent(id, agentId);
    }
}
