package io.concilium.audit.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Tamper-evident audit row, one per sealed decision. Append-only via
 * the {@code audit_records_no_update} trigger (V001). Each row carries
 * the SHA-256 hash of the canonical payload chained from the previous
 * record's hash, plus an Ed25519 signature over the chained hash.
 *
 * <p>The signed payload itself sits on disk at {@code payloadPath} —
 * keeping bulky text out of the DB while preserving the hash anchor.
 */
@Entity
@Table(name = "audit_records")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditRecord {

    @Id
    @GeneratedValue
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "session_id", nullable = false, unique = true, updatable = false)
    private UUID sessionId;

    /** SHA-256 of the previous record. Null only for the genesis record. */
    @Column(name = "prev_hash", updatable = false)
    private byte[] prevHash;

    @Column(name = "payload_hash", nullable = false, updatable = false)
    private byte[] payloadHash;

    @Column(nullable = false, updatable = false)
    private byte[] signature;

    @Column(name = "signer_key_alias", nullable = false, length = 120, updatable = false)
    private String signerKeyAlias;

    @Column(name = "payload_path", nullable = false, columnDefinition = "TEXT", updatable = false)
    private String payloadPath;

    @Column(name = "sealed_at", nullable = false, updatable = false)
    private OffsetDateTime sealedAt;

    @PrePersist
    void onCreate() {
        if (sealedAt == null) {
            sealedAt = OffsetDateTime.now();
        }
    }
}
