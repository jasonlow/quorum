package io.quorum.session.documents;

import io.quorum.session.domain.SessionDocument;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * UI-facing view of a session document. Excludes the full extracted text
 * (which can be 50 KB) and instead returns a short preview snippet —
 * keeps the list endpoint cheap and lets the upload UI show users what
 * Tika actually picked up.
 */
public record SessionDocumentView(
    UUID id,
    UUID sessionId,
    String filename,
    String contentType,
    int byteSize,
    int extractedChars,
    String previewSnippet,
    String sha256,
    OffsetDateTime createdAt
) {
    private static final int PREVIEW_CHARS = 240;

    public static SessionDocumentView of(SessionDocument d) {
        String t = d.getExtractedText();
        String preview = t.length() <= PREVIEW_CHARS
            ? t
            : t.substring(0, PREVIEW_CHARS) + "…";
        return new SessionDocumentView(
            d.getId(),
            d.getSessionId(),
            d.getFilename(),
            d.getContentType(),
            d.getByteSize(),
            t.length(),
            preview,
            d.getSha256(),
            d.getCreatedAt()
        );
    }
}
