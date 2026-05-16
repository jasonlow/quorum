package io.concilium.decision.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.concilium.audit.domain.AuditRecord;
import io.concilium.audit.service.CanonicalPayloadBuilder;
import io.concilium.audit.store.AuditRecordRepository;
import io.concilium.decision.domain.Decision;
import io.concilium.platform.audit.CanonicalSerializer;
import io.concilium.platform.audit.Signer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The one place the audit chain extends.
 *
 * <p>For each new sealed decision:
 * <ol>
 *   <li>Builds the canonical payload (session + agents + CoS + brief + decision)</li>
 *   <li>Looks up the previous record's payload_hash (or genesis if none)</li>
 *   <li>{@code inner    = SHA-256(canonical_payload_bytes)}</li>
 *   <li>{@code chained  = SHA-256(prev_hash || inner)}</li>
 *   <li>{@code sig      = Ed25519.sign(chained)}</li>
 *   <li>Inserts {@code audit_records} row (DB enforces append-only)</li>
 *   <li>Writes the envelope JSON to {@code <payloadDir>/session-<id>.json}</li>
 * </ol>
 *
 * <p>The envelope shape on disk:
 * <pre>
 * {
 *   "auditMetadata": {
 *     "prevHashHex":    "...",
 *     "payloadHashHex": "...",
 *     "signatureBase64":"...",
 *     "signerKeyAlias": "...",
 *     "signedAt":       "ISO"
 *   },
 *   "payload": { ... canonical payload ... }
 * }
 * </pre>
 *
 * The verifier reads the envelope, re-canonicalises {@code payload},
 * recomputes the chained hash, and verifies the signature.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DecisionSealer {

    private final CanonicalPayloadBuilder payloadBuilder;
    private final AuditRecordRepository auditRecords;
    private final Signer signer;
    private final ObjectMapper json;        // for pretty-writing the envelope file

    @Value("${concilium.audit.payload-dir}")
    private String payloadDir;

    /**
     * Seal a decision, writing both the DB row and the on-disk audit
     * envelope. Idempotent at the caller level — DecisionController
     * checks for an existing decision first.
     */
    @Transactional
    public AuditRecord seal(Decision decision) {
        Map<String, Object> payload = payloadBuilder.build(decision.getSessionId(), decision);
        byte[] canonicalBytes = CanonicalSerializer.toBytes(payload);
        byte[] innerHash      = CanonicalSerializer.sha256(canonicalBytes);

        byte[] prevHash = auditRecords.findTopByOrderBySealedAtDescIdDesc()
            .map(AuditRecord::getPayloadHash)
            .orElseGet(CanonicalSerializer::genesisHash);

        byte[] chainedHash = CanonicalSerializer.chain(prevHash, innerHash);
        byte[] signature   = signer.sign(chainedHash);

        AuditRecord record = AuditRecord.builder()
            .sessionId(decision.getSessionId())
            .prevHash(prevHash)
            .payloadHash(chainedHash)
            .signature(signature)
            .signerKeyAlias(signer.keyAlias())
            .payloadPath(envelopePath(decision.getSessionId()).toString())
            .build();
        record = auditRecords.save(record);

        writeEnvelope(decision.getSessionId(), prevHash, chainedHash, signature, payload);

        log.info("Audit record sealed: session={} prevHash={} payloadHash={}",
            decision.getSessionId(),
            shortHex(prevHash),
            shortHex(chainedHash));
        return record;
    }

    private void writeEnvelope(java.util.UUID sessionId, byte[] prevHash,
                               byte[] payloadHash, byte[] signature,
                               Map<String, Object> payload) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("prevHashHex",    toHex(prevHash));
        meta.put("payloadHashHex", toHex(payloadHash));
        meta.put("signatureBase64", Base64.getEncoder().encodeToString(signature));
        meta.put("signerKeyAlias", signer.keyAlias());
        meta.put("signedAt", OffsetDateTime.now(ZoneOffset.UTC).toString());
        envelope.put("auditMetadata", meta);
        envelope.put("payload", payload);

        try {
            Path path = envelopePath(sessionId);
            Files.createDirectories(path.getParent());
            // Pretty-print for human readability — verifier re-canonicalises
            // only the "payload" sub-object, so envelope formatting is irrelevant.
            json.writerWithDefaultPrettyPrinter().writeValue(path.toFile(), envelope);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to write audit envelope", e);
        }
    }

    private Path envelopePath(java.util.UUID sessionId) {
        return Path.of(payloadDir, "session-" + sessionId + ".json");
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private static String shortHex(byte[] bytes) {
        if (bytes == null) return "(null)";
        String h = toHex(bytes);
        return h.length() > 12 ? h.substring(0, 12) + "…" : h;
    }
}
