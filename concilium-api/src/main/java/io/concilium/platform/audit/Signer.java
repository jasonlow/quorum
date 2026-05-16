package io.concilium.platform.audit;

/**
 * Pluggable signing primitive. PoC implementation is
 * {@link LocalKeystoreSigner}; the Phase 4 production swap targets
 * a {@code KmsSigner} backed by GCP Cloud KMS.
 *
 * <p>Sign + verify always operate on raw bytes — callers handle their
 * own canonicalisation and hashing upstream.
 */
public interface Signer {

    /** Stable identifier for the key version that produced a signature. */
    String keyAlias();

    /** Sign raw bytes. */
    byte[] sign(byte[] data);

    /** Verify a signature against raw bytes. {@code false} on any failure. */
    boolean verify(byte[] data, byte[] signature);
}
