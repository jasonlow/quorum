package io.concilium.agent.api;

import io.concilium.agent.api.dto.AgentGenerateRequest;
import io.concilium.agent.api.dto.AgentRequest;
import io.concilium.agent.api.dto.ModelOverrideRequest;
import io.concilium.agent.domain.AgentProfile;
import io.concilium.agent.domain.Bias;
import io.concilium.agent.service.AgentGenerationService;
import io.concilium.agent.store.AgentProfileRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
@Slf4j
public class AgentController {

    private final AgentProfileRepository agents;
    private final AgentGenerationService generator;

    @GetMapping
    public List<AgentProfile> list() {
        return agents.findAll();
    }

    @GetMapping("/{id}")
    public AgentProfile get(@PathVariable UUID id) {
        return agents.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Agent not found: " + id));
    }

    /** Create a new agent profile. 409 if a row with the same name exists. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public AgentProfile create(@Valid @RequestBody AgentRequest req) {
        agents.findByName(req.name()).ifPresent(existing -> {
            throw new ResponseStatusException(CONFLICT,
                "Agent with name '" + req.name() + "' already exists (id=" + existing.getId() + ")");
        });
        AgentProfile saved = agents.save(toEntity(new AgentProfile(), req));
        log.info("Created agent: name='{}' id={}", saved.getName(), saved.getId());
        return saved;
    }

    /** Full replace of an agent profile. */
    @PutMapping("/{id}")
    @Transactional
    public AgentProfile update(@PathVariable UUID id, @Valid @RequestBody AgentRequest req) {
        AgentProfile existing = agents.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Agent not found: " + id));

        // Prevent renaming onto an existing agent (other than self)
        agents.findByName(req.name()).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new ResponseStatusException(CONFLICT,
                    "Another agent with name '" + req.name() + "' already exists");
            }
        });

        AgentProfile saved = agents.save(toEntity(existing, req));
        log.info("Updated agent: name='{}' id={}", saved.getName(), saved.getId());
        return saved;
    }

    /**
     * Delete an agent. Returns 409 if the agent is currently a member of
     * any committee or has any session_agent_states rows — protects audit
     * provenance for past sessions.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable UUID id) {
        AgentProfile existing = agents.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Agent not found: " + id));
        if (agents.isReferenced(id)) {
            throw new ResponseStatusException(CONFLICT,
                "Agent '" + existing.getName()
                + "' is referenced by at least one committee or session "
                + "and cannot be deleted. Remove from committees first, or "
                + "archive support is a Phase 1 feature.");
        }
        agents.delete(existing);
        log.info("Deleted agent: name='{}' id={}", existing.getName(), id);
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

    /**
     * Natural-language → structured draft profile.
     * Does NOT save. The frontend pre-fills the create form with the
     * returned draft and the chair confirms/tweaks before POST /agents.
     */
    @PostMapping("/generate")
    public AgentRequest generate(@Valid @RequestBody AgentGenerateRequest req) {
        try {
            return generator.generate(req.description());
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, e.getMessage(), e);
        }
    }

    // ---------------------------------------------------------------------

    private AgentProfile toEntity(AgentProfile target, AgentRequest req) {
        target.setName(req.name());
        target.setDescription(req.description());
        target.setSkills(req.skills() == null ? new ArrayList<>() : new ArrayList<>(req.skills()));
        target.setIdeology(req.ideology());
        target.setBiases(req.biases() == null ? new ArrayList<Bias>() : new ArrayList<>(req.biases()));
        target.setBoundaries(req.boundaries() == null ? new ArrayList<>() : new ArrayList<>(req.boundaries()));
        target.setSpeakingStyle(req.speakingStyle());
        target.setSystemPrompt(req.systemPrompt());
        String mo = req.modelOverride();
        target.setModelOverride(mo == null || mo.isBlank() ? null : mo);
        target.setTemperature(req.temperature() == null ? new BigDecimal("0.70") : req.temperature());
        return target;
    }
}
