package io.concilium.session.api;

import io.concilium.session.store.SessionRepository;
import io.concilium.session.streaming.SseChannelManager;
import io.concilium.session.streaming.SseEventType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Live SSE stream of deliberation events for a session.
 *
 * <p>Event catalogue (see {@link SseEventType}):
 * <ul>
 *   <li>{@code hello} — sent once on connect, carries server time</li>
 *   <li>{@code phase.changed}</li>
 *   <li>{@code agent.state.changed}</li>
 *   <li>{@code agent.draft.done}</li>
 *   <li>{@code agent.failed}</li>
 *   <li>{@code cos.review.passed} / {@code cos.revision_requested} (W2-T07)</li>
 *   <li>{@code brief.ready} (W2-T10)</li>
 *   <li>{@code session.completed} — orchestrator-driven close</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
@Slf4j
public class SessionStreamController {

    private final SessionRepository sessions;
    private final SseChannelManager channels;

    @GetMapping(value = "/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable UUID id) {
        if (sessions.findById(id).isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Session not found: " + id);
        }
        SseEmitter emitter = channels.register(id);

        // Welcome the subscriber so the client knows the channel is up.
        try {
            emitter.send(SseEmitter.event()
                .name(SseEventType.HELLO)
                .data(Map.of(
                    "sessionId", id.toString(),
                    "serverTime", Instant.now().toString(),
                    "subscribers", channels.subscriberCount(id))));
        } catch (IOException e) {
            log.debug("Hello event failed for session {}: {}", id, e.toString());
        }
        log.info("SSE stream opened: session={} subscribers={}", id, channels.subscriberCount(id));
        return emitter;
    }
}
