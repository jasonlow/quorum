package io.concilium.agent.api;

import io.concilium.agent.domain.AgentProfile;
import io.concilium.agent.store.AgentProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Smoke endpoint to verify seed data after boot.
 * The full agent CRUD surface is Phase 1 work.
 */
@RestController
@RequestMapping("/api/v1/agents")
@RequiredArgsConstructor
public class AgentController {

    private final AgentProfileRepository agents;

    @GetMapping
    public List<AgentProfile> list() {
        return agents.findAll();
    }
}
