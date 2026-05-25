package io.quorum.session.streaming.events;

import io.quorum.session.domain.Phase;

import java.time.Instant;
import java.util.UUID;

/** SSE payload for {@code phase.changed}. */
public record PhaseChangedEvent(
    UUID sessionId,
    Phase from,
    Phase to,
    Instant at
) {
    public static PhaseChangedEvent of(UUID sessionId, Phase from, Phase to) {
        return new PhaseChangedEvent(sessionId, from, to, Instant.now());
    }
}
