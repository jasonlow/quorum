package io.quorum.decision.api.dto;

import io.quorum.audit.domain.AuditRecord;
import io.quorum.decision.domain.Decision;
import io.quorum.decision.domain.DecisionType;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DecideResponse(
    UUID decisionId,
    UUID sessionId,
    DecisionType decision,
    String chairLabel,
    OffsetDateTime sealedAt,
    AuditView audit
) {
    public record AuditView(
        UUID auditRecordId,
        String prevHashHex,
        String payloadHashHex,
        String signatureBase64,
        String signerKeyAlias,
        String payloadPath
    ) {}

    public static DecideResponse of(Decision d, AuditRecord a) {
        return new DecideResponse(
            d.getId(),
            d.getSessionId(),
            d.getDecisionType(),
            d.getChairLabel(),
            d.getSealedAt(),
            new AuditView(
                a.getId(),
                toHex(a.getPrevHash()),
                toHex(a.getPayloadHash()),
                java.util.Base64.getEncoder().encodeToString(a.getSignature()),
                a.getSignerKeyAlias(),
                a.getPayloadPath()
            )
        );
    }

    private static String toHex(byte[] bytes) {
        if (bytes == null) return null;
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
