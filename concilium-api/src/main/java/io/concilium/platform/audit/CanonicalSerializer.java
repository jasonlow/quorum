package io.concilium.platform.audit;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.databind.module.SimpleModule;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.ser.OffsetDateTimeSerializer;
import lombok.extern.slf4j.Slf4j;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Deterministic JSON serialiser used for hashing + signing audit
 * payloads. The same input value must always produce byte-identical
 * output so that the verifier can recompute the hash and match it
 * against the stored signature.
 *
 * <p>Determinism rules:
 * <ul>
 *   <li>Map entries sorted alphabetically by key</li>
 *   <li>Field names in POJOs/records sorted alphabetically</li>
 *   <li>No pretty-printing</li>
 *   <li>UTF-8 byte output</li>
 *   <li>All timestamps normalised to UTC, ISO-8601 with a fixed
 *       precision (millis)</li>
 *   <li>Null fields omitted</li>
 * </ul>
 */
@Slf4j
public final class CanonicalSerializer {

    private static final DateTimeFormatter ISO_UTC_MS =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

    private static final ObjectMapper MAPPER = build();

    private CanonicalSerializer() {}

    public static ObjectMapper mapper() {
        return MAPPER;
    }

    /** Serialise to canonical UTF-8 bytes. */
    public static byte[] toBytes(Object value) {
        try {
            return MAPPER.writeValueAsBytes(value);
        } catch (Exception e) {
            throw new IllegalStateException("Canonical JSON serialisation failed", e);
        }
    }

    /** Compute SHA-256 of the bytes of the canonical serialisation. */
    public static byte[] sha256(Object value) {
        return sha256(toBytes(value));
    }

    public static byte[] sha256(byte[] data) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(data);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    /** Concatenate (prev || inner) and SHA-256 the result. The chained hash. */
    public static byte[] chain(byte[] prevHash, byte[] innerHash) {
        byte[] combined = new byte[prevHash.length + innerHash.length];
        System.arraycopy(prevHash, 0, combined, 0, prevHash.length);
        System.arraycopy(innerHash, 0, combined, prevHash.length, innerHash.length);
        return sha256(combined);
    }

    /** Genesis-marker prev_hash: 32 zero bytes. */
    public static byte[] genesisHash() {
        return new byte[32];
    }

    private static ObjectMapper build() {
        JavaTimeModule timeModule = new JavaTimeModule();
        timeModule.addSerializer(OffsetDateTime.class,
            new com.fasterxml.jackson.databind.JsonSerializer<>() {
                @Override
                public void serialize(OffsetDateTime value,
                                      com.fasterxml.jackson.core.JsonGenerator gen,
                                      com.fasterxml.jackson.databind.SerializerProvider provider) throws java.io.IOException {
                    gen.writeString(ISO_UTC_MS.format(value));
                }
            });

        return JsonMapper.builder()
            .addModule(timeModule)
            .enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
            .enable(MapperFeature.SORT_PROPERTIES_ALPHABETICALLY)
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .disable(SerializationFeature.INDENT_OUTPUT)
            .serializationInclusion(JsonInclude.Include.NON_NULL)
            .defaultLocale(java.util.Locale.ROOT)
            .build();
    }

    /** UTF-8 helper for debug printing. */
    public static String toUtf8(byte[] bytes) {
        return new String(bytes, StandardCharsets.UTF_8);
    }
}
