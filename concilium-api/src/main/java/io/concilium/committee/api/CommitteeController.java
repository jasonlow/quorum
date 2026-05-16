package io.concilium.committee.api;

import io.concilium.agent.domain.AgentProfile;
import io.concilium.agent.store.AgentProfileRepository;
import io.concilium.committee.api.dto.CommitteeRequest;
import io.concilium.committee.api.dto.CommitteeView;
import io.concilium.committee.domain.Committee;
import io.concilium.committee.domain.CommitteeMember;
import io.concilium.committee.domain.CommitteeStatus;
import io.concilium.committee.store.CommitteeMemberRepository;
import io.concilium.committee.store.CommitteeRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/v1/committees")
@RequiredArgsConstructor
@Slf4j
public class CommitteeController {

    private final CommitteeRepository committees;
    private final CommitteeMemberRepository members;
    private final AgentProfileRepository agents;

    /** List committees, filtered by status. Default PUBLISHED. */
    @GetMapping
    public List<CommitteeView> list(
            @RequestParam(name = "status", defaultValue = "PUBLISHED") CommitteeStatus status) {
        return committees.findAllByStatusOrderByNameAsc(status).stream()
            .map(this::toView)
            .toList();
    }

    /** Fetch a single committee (regardless of status) with member rows. */
    @GetMapping("/{id}")
    public CommitteeView get(@PathVariable UUID id) {
        Committee c = committees.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Committee not found: " + id));
        return toView(c);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public CommitteeView create(@Valid @RequestBody CommitteeRequest req) {
        committees.findByNameAndStatus(req.name(), CommitteeStatus.PUBLISHED).ifPresent(existing -> {
            throw new ResponseStatusException(CONFLICT,
                "Another committee with name '" + req.name() + "' is already published (id="
                + existing.getId() + ")");
        });
        validateAllAgentsExist(req);

        Committee saved = committees.save(Committee.builder()
            .name(req.name())
            .description(req.description())
            .orchestrationPattern(req.orchestrationPattern())
            .qaIntensity(req.qaIntensity())
            .decisionRule(req.decisionRule())
            .maxRevisionRounds(req.maxRevisionRounds() == null ? 1 : req.maxRevisionRounds())
            .build());

        saveMembers(saved.getId(), req.members());
        log.info("Created committee: name='{}' id={} members={}",
            saved.getName(), saved.getId(), req.members().size());
        return toView(saved);
    }

    @PutMapping("/{id}")
    @Transactional
    public CommitteeView update(@PathVariable UUID id, @Valid @RequestBody CommitteeRequest req) {
        Committee existing = committees.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Committee not found: " + id));

        committees.findByNameAndStatus(req.name(), CommitteeStatus.PUBLISHED).ifPresent(other -> {
            if (!other.getId().equals(id)) {
                throw new ResponseStatusException(CONFLICT,
                    "Another published committee with name '" + req.name() + "' already exists");
            }
        });
        validateAllAgentsExist(req);

        existing.setName(req.name());
        existing.setDescription(req.description());
        existing.setOrchestrationPattern(req.orchestrationPattern());
        existing.setQaIntensity(req.qaIntensity());
        existing.setDecisionRule(req.decisionRule());
        existing.setMaxRevisionRounds(req.maxRevisionRounds() == null ? 1 : req.maxRevisionRounds());
        Committee saved = committees.save(existing);

        // Wipe + replace the membership list — committees with active sessions
        // are unaffected because session_agent_states + audit_records hold the
        // historical roster (member tables only describe current composition).
        List<CommitteeMember> oldMembers = members.findByCommitteeIdOrderBySpeakingOrderAsc(id);
        members.deleteAll(oldMembers);
        saveMembers(saved.getId(), req.members());

        log.info("Updated committee: name='{}' id={} members={}",
            saved.getName(), saved.getId(), req.members().size());
        return toView(saved);
    }

    /** Soft-delete (archive) a committee. Idempotent. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void archive(@PathVariable UUID id) {
        Committee existing = committees.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Committee not found: " + id));
        if (existing.getStatus() == CommitteeStatus.ARCHIVED) {
            log.info("Committee already archived: name='{}' id={} (no-op)", existing.getName(), id);
            return;
        }
        existing.setStatus(CommitteeStatus.ARCHIVED);
        existing.setArchivedAt(OffsetDateTime.now());
        committees.save(existing);
        log.info("Archived committee: name='{}' id={}", existing.getName(), id);
    }

    /** Un-archive. 409 if another PUBLISHED committee already uses the name. */
    @PostMapping("/{id}/restore")
    @Transactional
    public CommitteeView restore(@PathVariable UUID id) {
        Committee existing = committees.findById(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND, "Committee not found: " + id));
        if (existing.getStatus() == CommitteeStatus.PUBLISHED) {
            return toView(existing);
        }
        committees.findByNameAndStatus(existing.getName(), CommitteeStatus.PUBLISHED).ifPresent(other -> {
            throw new ResponseStatusException(CONFLICT,
                "Cannot restore '" + existing.getName()
                + "' — another published committee already uses this name (id=" + other.getId() + ").");
        });
        existing.setStatus(CommitteeStatus.PUBLISHED);
        existing.setArchivedAt(null);
        Committee saved = committees.save(existing);
        log.info("Restored committee: name='{}' id={}", saved.getName(), id);
        return toView(saved);
    }

    // ------------------------------------------------------------------

    private void validateAllAgentsExist(CommitteeRequest req) {
        List<UUID> ids = req.members().stream().map(CommitteeRequest.MemberRequest::agentId).toList();
        Map<UUID, AgentProfile> found = agents.findAllById(ids).stream()
            .collect(Collectors.toMap(AgentProfile::getId, a -> a));
        for (UUID id : ids) {
            if (!found.containsKey(id)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown agent id in members[]: " + id);
            }
        }
    }

    private void saveMembers(UUID committeeId, List<CommitteeRequest.MemberRequest> reqMembers) {
        for (int i = 0; i < reqMembers.size(); i++) {
            CommitteeRequest.MemberRequest m = reqMembers.get(i);
            members.save(CommitteeMember.builder()
                .committeeId(committeeId)
                .agentId(m.agentId())
                .speakingOrder(i + 1)
                .weight(m.weight() == null ? BigDecimal.ONE : m.weight())
                .build());
        }
    }

    private CommitteeView toView(Committee c) {
        List<CommitteeMember> ms = members.findByCommitteeIdOrderBySpeakingOrderAsc(c.getId());
        Map<UUID, AgentProfile> byId = agents.findAllById(
                ms.stream().map(CommitteeMember::getAgentId).toList()).stream()
            .collect(Collectors.toMap(AgentProfile::getId, a -> a));

        List<CommitteeView.MemberView> mv = ms.stream()
            .map(m -> new CommitteeView.MemberView(
                m.getAgentId(),
                byId.getOrDefault(m.getAgentId(),
                    AgentProfile.builder().name("(missing)").build()).getName(),
                m.getSpeakingOrder(),
                m.getWeight()))
            .toList();
        return CommitteeView.of(c, mv);
    }
}
