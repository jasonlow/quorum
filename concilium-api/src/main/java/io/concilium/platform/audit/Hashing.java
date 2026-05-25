package io.concilium.platform.audit;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Small SHA-256 hex helper shared by document extraction and audit payload assembly. */
public final class Hashing {

    private Hashing() {}

    /** Returns the lowercase hex SHA-256 of {@code s}, or null if {@code s} is null. */
    public static String sha256Hex(String s) {
        if (s == null) return null;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(s.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
