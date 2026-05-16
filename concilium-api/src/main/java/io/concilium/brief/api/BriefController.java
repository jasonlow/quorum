package io.concilium.brief.api;

import io.concilium.brief.domain.Brief;
import io.concilium.brief.service.Consolidator;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
public class BriefController {

    private final Consolidator consolidator;

    /** Returns the consolidated brief for a completed session. */
    @GetMapping("/{id}/brief")
    public BriefView get(@PathVariable UUID id) {
        Brief b = consolidator.get(id).orElseThrow(
            () -> new ResponseStatusException(NOT_FOUND,
                "No brief for session " + id + " (deliberation not complete?)"));
        return BriefView.from(b);
    }

    public record BriefView(
        UUID id,
        UUID sessionId,
        String recommendation,
        String confidence,
        Map<String, Object> body,
        OffsetDateTime createdAt
    ) {
        static BriefView from(Brief b) {
            return new BriefView(
                b.getId(), b.getSessionId(),
                b.getRecommendation(), b.getConfidence(),
                b.getBodyJson(), b.getCreatedAt());
        }
    }
}
