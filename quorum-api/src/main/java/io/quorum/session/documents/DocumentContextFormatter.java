package io.quorum.session.documents;

import io.quorum.session.domain.SessionDocument;

import java.util.List;

/**
 * Renders a list of session documents as a single Markdown block that can
 * be injected into both the agent user-prompt and the CoS review-prompt.
 * Returns {@code null} when there are no documents — callers should treat
 * null as "render no section at all" rather than emitting an empty header.
 */
public final class DocumentContextFormatter {

    private DocumentContextFormatter() {}

    public static String render(List<SessionDocument> docs) {
        if (docs == null || docs.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();
        sb.append("The chair has attached the following supporting documents for this session. ");
        sb.append("Treat them as primary source material — quote, cite, or challenge them as relevant.\n\n");
        for (int i = 0; i < docs.size(); i++) {
            SessionDocument d = docs.get(i);
            sb.append("---\n");
            sb.append("### Document ").append(i + 1).append(": ").append(d.getFilename()).append('\n');
            sb.append("(").append(d.getContentType()).append(", ")
              .append(d.getExtractedText().length()).append(" chars extracted)\n\n");
            sb.append(d.getExtractedText());
            sb.append("\n\n");
        }
        return sb.toString();
    }
}
