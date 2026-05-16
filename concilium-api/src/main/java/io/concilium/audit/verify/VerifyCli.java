package io.concilium.audit.verify;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.concilium.platform.audit.CanonicalSerializer;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Standalone CLI: verify a sealed audit envelope.
 *
 * <p>Usage:
 * <pre>
 *   ./mvnw -q exec:java \
 *     -Dexec.mainClass=io.concilium.audit.verify.VerifyCli \
 *     -Dexec.args="./data/audit/session-XXX.json [public-key.pem]"
 * </pre>
 *
 * <p>If the public key path is omitted, defaults to
 * {@code ./data/keys/concilium-public.pem}.
 *
 * <p>Exit code:
 * <ul>
 *   <li>0 — verified OK</li>
 *   <li>1 — verification FAILED (tampered, wrong key, etc.)</li>
 *   <li>2 — usage error (missing file, malformed envelope)</li>
 * </ul>
 */
public final class VerifyCli {

    private static final String DEFAULT_PUBLIC_KEY = "./data/keys/concilium-public.pem";

    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: VerifyCli <envelope.json> [public-key.pem]");
            System.exit(2);
        }
        Path envelopePath  = Path.of(args[0]);
        Path publicKeyPath = Path.of(args.length >= 2 ? args[1] : DEFAULT_PUBLIC_KEY);

        try {
            int code = verify(envelopePath, publicKeyPath);
            System.exit(code);
        } catch (Exception e) {
            System.err.println("ERROR: " + e.getMessage());
            e.printStackTrace(System.err);
            System.exit(2);
        }
    }

    static int verify(Path envelopePath, Path publicKeyPath) throws Exception {
        if (!Files.exists(envelopePath)) {
            System.err.println("✗ Envelope file not found: " + envelopePath);
            return 2;
        }
        if (!Files.exists(publicKeyPath)) {
            System.err.println("✗ Public key file not found: " + publicKeyPath);
            return 2;
        }

        ObjectMapper mapper = CanonicalSerializer.mapper();
        JsonNode envelope = mapper.readTree(envelopePath.toFile());
        JsonNode meta     = envelope.path("auditMetadata");
        JsonNode payload  = envelope.path("payload");
        if (meta.isMissingNode() || payload.isMissingNode()) {
            System.err.println("✗ Envelope is missing auditMetadata or payload");
            return 2;
        }

        byte[] prevHash    = HexFormat.of().parseHex(meta.path("prevHashHex").asText());
        byte[] storedHash  = HexFormat.of().parseHex(meta.path("payloadHashHex").asText());
        byte[] signature   = Base64.getDecoder().decode(meta.path("signatureBase64").asText());
        String keyAlias    = meta.path("signerKeyAlias").asText();

        // Re-canonicalise the payload using the exact same rules as the sealer.
        // payload was deserialised into a JsonNode tree above — convert through
        // a typed Map so map-key sorting + null-omission kicks in identically.
        Object canonicalPayload = mapper.convertValue(payload, java.util.Map.class);
        byte[] canonicalBytes   = CanonicalSerializer.toBytes(canonicalPayload);
        byte[] innerHash        = CanonicalSerializer.sha256(canonicalBytes);
        byte[] recomputedHash   = CanonicalSerializer.chain(prevHash, innerHash);

        boolean hashOk = constantTimeEquals(recomputedHash, storedHash);
        boolean sigOk  = verifySignature(publicKeyPath, recomputedHash, signature);

        System.out.println("Envelope:     " + envelopePath);
        System.out.println("Public key:   " + publicKeyPath);
        System.out.println("Signer alias: " + keyAlias);
        System.out.println("Prev hash:    " + HexFormat.of().formatHex(prevHash));
        System.out.println("Stored hash:  " + HexFormat.of().formatHex(storedHash));
        System.out.println("Recomputed:   " + HexFormat.of().formatHex(recomputedHash));
        System.out.println();
        System.out.println("Hash match:    " + (hashOk ? "✓" : "✗"));
        System.out.println("Signature:     " + (sigOk  ? "✓" : "✗"));
        System.out.println();

        if (hashOk && sigOk) {
            System.out.println("✓✓✓ AUDIT RECORD VERIFIED");
            return 0;
        }
        if (!hashOk) {
            System.out.println("✗✗✗ TAMPERING DETECTED — canonical payload hash does not match stored hash");
            System.out.println("    The payload has been modified since it was sealed.");
        } else {
            System.out.println("✗✗✗ SIGNATURE INVALID — hash matches, but signature is not from the expected key");
            System.out.println("    The envelope may have been re-signed by an unauthorised party.");
        }
        return 1;
    }

    private static boolean verifySignature(Path publicKeyPath, byte[] data, byte[] sig) throws Exception {
        String pem = Files.readString(publicKeyPath);
        int b = pem.indexOf("-----BEGIN PUBLIC KEY-----");
        int e = pem.indexOf("-----END PUBLIC KEY-----");
        if (b < 0 || e < 0) {
            throw new IllegalArgumentException("Public key PEM is missing BEGIN/END markers");
        }
        String base64 = pem.substring(b + "-----BEGIN PUBLIC KEY-----".length(), e)
            .replaceAll("\\s+", "");
        byte[] der = Base64.getDecoder().decode(base64);
        PublicKey pub = KeyFactory.getInstance("Ed25519")
            .generatePublic(new X509EncodedKeySpec(der));

        Signature s = Signature.getInstance("Ed25519");
        s.initVerify(pub);
        s.update(data);
        return s.verify(sig);
    }

    private static boolean constantTimeEquals(byte[] a, byte[] b) {
        if (a == null || b == null || a.length != b.length) return false;
        int diff = 0;
        for (int i = 0; i < a.length; i++) {
            diff |= a[i] ^ b[i];
        }
        return diff == 0;
    }
}
