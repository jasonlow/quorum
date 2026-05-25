package io.quorum.platform.telemetry;

import org.slf4j.MDC;

import java.util.Map;
import java.util.function.Supplier;

/**
 * MDC propagation across virtual-thread / async boundaries.
 *
 * <p>Usage:
 * <pre>
 *   var snapshot = CorrelationContext.snapshot();
 *   Thread.ofVirtual().start(() -> CorrelationContext.runWith(snapshot, () -> {
 *       // ... orchestrator work
 *   }));
 * </pre>
 */
public final class CorrelationContext {

    private CorrelationContext() {}

    /** Capture current MDC. */
    public static Map<String, String> snapshot() {
        Map<String, String> ctx = MDC.getCopyOfContextMap();
        return ctx == null ? Map.of() : Map.copyOf(ctx);
    }

    /** Run {@code task} with the supplied MDC, restoring previous values on exit. */
    public static void runWith(Map<String, String> ctx, Runnable task) {
        Map<String, String> prev = MDC.getCopyOfContextMap();
        try {
            if (ctx != null && !ctx.isEmpty()) {
                MDC.setContextMap(ctx);
            }
            task.run();
        } finally {
            if (prev == null) {
                MDC.clear();
            } else {
                MDC.setContextMap(prev);
            }
        }
    }

    /** Same as {@link #runWith(Map, Runnable)} but for value-returning suppliers. */
    public static <T> T callWith(Map<String, String> ctx, Supplier<T> task) {
        Map<String, String> prev = MDC.getCopyOfContextMap();
        try {
            if (ctx != null && !ctx.isEmpty()) {
                MDC.setContextMap(ctx);
            }
            return task.get();
        } finally {
            if (prev == null) {
                MDC.clear();
            } else {
                MDC.setContextMap(prev);
            }
        }
    }
}
