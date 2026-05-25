package io.quorum.platform.audit;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Ed25519 signer backed by PEM files on local disk.
 *
 * <p>On first boot, generates a fresh keypair and writes:
 * <ul>
 *   <li>{@code <keysDir>/quorum-private.pem} — PKCS8, unencrypted (PoC only)</li>
 *   <li>{@code <keysDir>/quorum-public.pem}  — X.509 SubjectPublicKeyInfo</li>
 * </ul>
 *
 * <p>On subsequent boots, reads both files and reconstructs the keys.
 *
 * <p>The {@code VerifyCli} reads only the public PEM, never the private
 * one — so the verifier never needs filesystem access to anything secret.
 *
 * <p>This is the PoC implementation of {@link Signer}. The production
 * swap target is a {@code KmsSigner} (Cloud KMS) — same interface,
 * different bean wired in the prod profile.
 */
@Component
@Slf4j
public class LocalKeystoreSigner implements Signer {

    private static final String KEY_ALGORITHM   = "Ed25519";
    private static final String KEY_ALIAS       = "quorum-audit-key";

    private static final String PRIVATE_FILE    = "quorum-private.pem";
    private static final String PUBLIC_FILE     = "quorum-public.pem";

    @Value("${quorum.audit.keys-dir}")
    private String keysDir;

    private PrivateKey privateKey;
    private PublicKey  publicKey;

    @Override
    public String keyAlias() {
        return KEY_ALIAS;
    }

    @PostConstruct
    void init() {
        try {
            Path dir = Path.of(keysDir);
            Files.createDirectories(dir);
            Path priv = dir.resolve(PRIVATE_FILE);
            Path pub  = dir.resolve(PUBLIC_FILE);

            if (Files.exists(priv) && Files.exists(pub)) {
                privateKey = readPrivatePem(priv);
                publicKey  = readPublicPem(pub);
                log.info("Loaded Ed25519 keypair from {}", dir);
            } else {
                log.info("No keypair found — generating new Ed25519 keys in {}", dir);
                KeyPair kp = KeyPairGenerator.getInstance(KEY_ALGORITHM).generateKeyPair();
                privateKey = kp.getPrivate();
                publicKey  = kp.getPublic();
                writePem(priv, "PRIVATE KEY", privateKey.getEncoded());
                writePem(pub,  "PUBLIC KEY",  publicKey.getEncoded());
                log.info("Wrote new keypair: {}, {}", priv, pub);
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to initialise audit signing keys", e);
        }
    }

    @Override
    public byte[] sign(byte[] data) {
        try {
            Signature sig = Signature.getInstance(KEY_ALGORITHM);
            sig.initSign(privateKey);
            sig.update(data);
            return sig.sign();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Sign failed", e);
        }
    }

    @Override
    public boolean verify(byte[] data, byte[] signature) {
        try {
            Signature sig = Signature.getInstance(KEY_ALGORITHM);
            sig.initVerify(publicKey);
            sig.update(data);
            return sig.verify(signature);
        } catch (GeneralSecurityException e) {
            log.debug("verify failed", e);
            return false;
        }
    }

    /** Returns the X.509 SubjectPublicKeyInfo encoded bytes — same payload as the public PEM. */
    public byte[] publicKeyEncoded() {
        return publicKey.getEncoded();
    }

    // ---------------------------------------------------------------------

    private static PrivateKey readPrivatePem(Path file) throws IOException, GeneralSecurityException {
        byte[] der = decodePem(Files.readString(file), "PRIVATE KEY");
        return KeyFactory.getInstance(KEY_ALGORITHM)
            .generatePrivate(new PKCS8EncodedKeySpec(der));
    }

    private static PublicKey readPublicPem(Path file) throws IOException, GeneralSecurityException {
        byte[] der = decodePem(Files.readString(file), "PUBLIC KEY");
        return KeyFactory.getInstance(KEY_ALGORITHM)
            .generatePublic(new X509EncodedKeySpec(der));
    }

    private static byte[] decodePem(String pem, String label) {
        String begin = "-----BEGIN " + label + "-----";
        String end   = "-----END " + label + "-----";
        int b = pem.indexOf(begin);
        int e = pem.indexOf(end);
        if (b < 0 || e < 0) {
            throw new IllegalArgumentException("PEM file missing " + begin + " / " + end);
        }
        String base64 = pem.substring(b + begin.length(), e)
            .replaceAll("\\s+", "");
        return Base64.getDecoder().decode(base64);
    }

    private static void writePem(Path file, String label, byte[] der) throws IOException {
        String base64 = Base64.getEncoder().encodeToString(der);
        StringBuilder body = new StringBuilder();
        body.append("-----BEGIN ").append(label).append("-----\n");
        for (int i = 0; i < base64.length(); i += 64) {
            body.append(base64, i, Math.min(i + 64, base64.length())).append('\n');
        }
        body.append("-----END ").append(label).append("-----\n");
        Files.writeString(file, body.toString());
    }
}
