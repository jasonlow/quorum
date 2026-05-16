package io.concilium.agent.api;

import io.concilium.agent.api.dto.ModelOverrideRequest;
import io.concilium.agent.domain.AgentProfile;
import io.concilium.agent.store.AgentProfileRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
@Slf4j
public class AgentController {

    private final AgentProfileRepository agents;

    @GetMapping
    public List<AgentProfile> list() {
        return agents.findAll();
    }

    @GetMapping("/{id}")
    public AgentProfile get(@PathVariable UUID id) {
        return agents.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Agent not found: " + id));
    }

    /**
     * Set or clear an agent's per-call model override.
     *
     * <p>Examples (active in the {@code local} profile):
     * <pre>
     *   PUT /api/v1/agents/{id}/model-override   {"model":"deepseek-reasoner"}
     *   PUT /api/v1/agents/{id}/model-override   {"model":"deepseek-chat"}
     *   PUT /api/v1/agents/{id}/model-override   {"model":null}    ← clears it
     *   PUT /api/v1/agents/{id}/model-override   {}                ← also clears
     * </pre>
     *
     * Affects all <em>subsequent</em> agent invocations. In-flight sessions
     * are unaffected because each agent invocation reads the override
     * fresh from the DB when {@code LlmRoutingService.clientFor} is called.
     */
    @PutMapping("/{id}/model-override")
    @Transactional
    public AgentProfile setModelOverride(@PathVariable UUID id,
                                         @Valid @RequestBody ModelOverrideRequest body) {
        AgentProfile agent = agents.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Agent not found: " + id));

        String newValue = (body.model() == null || body.model().isBlank()) ? null : body.model();
        String oldValue = agent.getModelOverride();
        agent.setModelOverride(newValue);
        AgentProfile saved = agents.save(agent);

        log.info("Agent model override updated: agent={} {} -> {}",
            agent.getName(),
            oldValue == null ? "(default)" : oldValue,
            newValue == null ? "(default)" : newValue);
        return saved;
    }
}
