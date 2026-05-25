package io.quorum.agent.api;

import io.quorum.agent.api.dto.AgentGenerateRequest;
import io.quorum.agent.api.dto.AgentRequest;
import io.quorum.agent.api.dto.ModelOverrideRequest;
import io.quorum.agent.domain.AgentProfile;
import io.quorum.agent.domain.AgentStatus;
import io.quorum.agent.domain.Bias;
import io.quorum.agent.service.AgentGenerationService;
import io.quorum.agent.store.AgentProfileRepository;
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

    /**
     * Lists agents filtered by {@code status}. Defaults to PUBLISHED for
     * the library; the "Show archived" tab passes {@code ARCHIVED}.
     */
    @GetMapping
    public List<AgentProfile> list(
            @RequestParam(name = "status", defaultValue = "PUBLISHED") AgentStatus status) {
        return agents.findAllByStatusOrderByNameAsc(status);
    }

    /**
     * Fetch a single agent regardless of status. Archived rows are still
     * readable by id — useful when an audit JSON references one historically.
     */
    @GetMapping("/{id}")
    public AgentProfile get(@PathVariable UUID id) {
        return agents.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Agent not found: " + id));
    }

    /**
     * Create a new agent profile. 409 if another PUBLISHED agent already
     * uses this name. Archived agents may share the name with the new one.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public AgentProfile create(@Valid @RequestBody AgentRequest req) {
        agents.findByNameAndStatus(req.name(), AgentStatus.PUBLISHED).ifPresent(existing -> {
            throw new ResponseStatusException(CONFLICT,
                "Another agent with name '" + req.name() + "' is already published (id=" + existing.getId() + ")");
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

        // Prevent renaming onto another PUBLISHED agent
        agents.findByNameAndStatus(req.name(), AgentStatus.PUBLISHED).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new ResponseStatusException(CONFLICT,
                    "Another published agent with name '" + req.name() + "' already exists");
            }
        });

        AgentProfile saved = agents.save(toEntity(existing, req));
        log.info("Updated agent: name='{}' id={}", saved.getName(), saved.getId());
        return saved;
    }

    /**
     * Soft-delete: mark the agent ARCHIVED and stamp {@code archived_at}.
     *
     * <p>The row remains in the DB so that {@code committee_members} and
     * {@code session_agent_states} foreign keys stay valid — historical
     * sessions continue to reference the exact agent profile they ran with.
     * Library listings + new committee composition skip ARCHIVED rows.
     *
     * <p>An archived agent's name becomes available again to a brand-new
     * PUBLISHED agent (partial unique index on {@code name} where status =
     * 'PUBLISHED'). Multiple archived rows may share a name.
     *
     * <p>Idempotent — archiving an already-archived agent is a no-op (204).
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable UUID id) {
        AgentProfile existing = agents.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Agent not found: " + id));
        if (existing.getStatus() == AgentStatus.ARCHIVED) {
            log.info("Agent already archived: name='{}' id={} (no-op)", existing.getName(), id);
            return;
        }
        existing.setStatus(AgentStatus.ARCHIVED);
        existing.setArchivedAt(java.time.OffsetDateTime.now());
        agents.save(existing);
        log.info("Archived agent: name='{}' id={}", existing.getName(), id);
    }

    /**
     * Un-archive an agent. Returns 409 if another PUBLISHED agent already
     * uses its name — caller must rename or archive the conflict first.
     * Idempotent: restoring an already-published agent is a no-op.
     */
    @PostMapping("/{id}/restore")
    @Transactional
    public AgentProfile restore(@PathVariable UUID id) {
        AgentProfile existing = agents.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Agent not found: " + id));
        if (existing.getStatus() == AgentStatus.PUBLISHED) {
            return existing;
        }
        agents.findByNameAndStatus(existing.getName(), AgentStatus.PUBLISHED).ifPresent(other -> {
            throw new ResponseStatusException(CONFLICT,
                "Cannot restore '" + existing.getName()
                + "' — another published agent already uses this name "
                + "(id=" + other.getId() + "). Rename or archive the conflict first.");
        });
        existing.setStatus(AgentStatus.PUBLISHED);
        existing.setArchivedAt(null);
        AgentProfile saved = agents.save(existing);
        log.info("Restored agent: name='{}' id={}", saved.getName(), id);
        return saved;
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
        String kt = req.knowledgeText();
        target.setKnowledgeText(kt == null || kt.isBlank() ? null : kt);
        return target;
    }
}
