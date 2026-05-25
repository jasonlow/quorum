package io.quorum.session.streaming;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Per-session registry of {@link SseEmitter} channels and typed event dispatch.
 *
 * <p>A session can have multiple concurrent subscribers (a chair watching from
 * two browser tabs, etc.). Events fan out to all subscribers; a failure on
 * one does not block the others.
 *
 * <p>Emitters self-clean on completion / timeout / error via the registered
 * callbacks. Anything else (auto-close on terminal phase) is the caller's
 * responsibility — call {@link #closeSession(UUID)} when a session reaches
 * a terminal state.
 */
@Component
@Slf4j
public class SseChannelManager {

    /** Defaults — caller can override per registration if needed. */
    public static final Duration DEFAULT_TIMEOUT = Duration.ofMinutes(15);

    private final ConcurrentHashMap<UUID, List<SseEmitter>> bySession = new ConcurrentHashMap<>();

    public SseEmitter register(UUID sessionId) {
        return register(sessionId, DEFAULT_TIMEOUT);
    }

    public SseEmitter register(UUID sessionId, Duration timeout) {
        SseEmitter emitter = new SseEmitter(timeout.toMillis());
        bySession.computeIfAbsent(sessionId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        Runnable removeFn = () -> {
            List<SseEmitter> list = bySession.get(sessionId);
            if (list != null) {
                list.remove(emitter);
                if (list.isEmpty()) {
                    bySession.remove(sessionId, list);
                }
            }
        };
        emitter.onCompletion(removeFn);
        emitter.onTimeout(() -> {
            log.debug("SSE timed out for session {}", sessionId);
            emitter.complete();
            removeFn.run();
        });
        emitter.onError(ex -> {
            log.debug("SSE error for session {}: {}", sessionId, ex.toString());
            removeFn.run();
        });

        log.debug("SSE subscribed: session={} (total subscribers: {})",
            sessionId, subscriberCount(sessionId));
        return emitter;
    }

    /**
     * Send an event to all subscribers of a session. Silently no-ops if the
     * session has no subscribers (events for unwatched sessions are dropped
     * — we don't queue offline). Returns the number of subscribers that
     * received the event.
     */
    public int send(UUID sessionId, String eventType, Object payload) {
        List<SseEmitter> list = bySession.get(sessionId);
        if (list == null || list.isEmpty()) {
            return 0;
        }
        int delivered = 0;
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event()
                    .name(eventType)
                    .data(payload));
                delivered++;
            } catch (IOException | IllegalStateException e) {
                log.debug("SSE send failed for session {} ({}), removing subscriber",
                    sessionId, e.getMessage());
                emitter.completeWithError(e);
            }
        }
        return delivered;
    }

    /** Close all subscribers for a session (call on terminal phase). */
    public void closeSession(UUID sessionId) {
        List<SseEmitter> list = bySession.remove(sessionId);
        if (list == null) return;
        for (SseEmitter emitter : list) {
            try {
                emitter.complete();
            } catch (Exception ignore) { /* already closed */ }
        }
    }

    public int subscriberCount(UUID sessionId) {
        List<SseEmitter> list = bySession.get(sessionId);
        return list == null ? 0 : list.size();
    }
}
