package io.concilium.session.documents;

import io.concilium.platform.audit.Hashing;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.exception.TikaException;
import org.apache.tika.exception.WriteLimitReachedException;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.metadata.TikaCoreProperties;
import org.apache.tika.parser.AutoDetectParser;
import org.apache.tika.parser.ParseContext;
import org.apache.tika.sax.BodyContentHandler;
import org.springframework.stereotype.Service;
import org.xml.sax.SAXException;

import java.io.IOException;
import java.io.InputStream;

/**
 * Wraps Apache Tika to extract plain text from PDF / DOCX / XLSX / CSV / TXT
 * uploads. The PoC caps extracted output at 50 KB per document — anything
 * larger is truncated with a trailing marker so the agents can see they
 * were given a partial view.
 */
@Service
@Slf4j
public class DocumentExtractor {

    /** Max characters of extracted text persisted per document. */
    public static final int MAX_CHARS_PER_DOC = 50_000;

    /** Trailing marker appended when extraction is truncated. */
    private static final String TRUNCATION_MARKER =
        "\n\n[…truncated — original document exceeds " + MAX_CHARS_PER_DOC + " characters]";

    public record Extracted(String text, String sha256) {}

    /**
     * Extracts text from {@code in}. Caller is responsible for closing the
     * stream; this method only reads.
     *
     * @throws DocumentExtractionException if Tika cannot parse the content
     *         (e.g. scanned-image PDF with no embedded text, corrupt file)
     */
    public Extracted extract(InputStream in, String filenameHint) {
        BodyContentHandler handler = new BodyContentHandler(MAX_CHARS_PER_DOC + TRUNCATION_MARKER.length());
        Metadata metadata = new Metadata();
        if (filenameHint != null) {
            metadata.set(TikaCoreProperties.RESOURCE_NAME_KEY, filenameHint);
        }
        AutoDetectParser parser = new AutoDetectParser();
        ParseContext ctx = new ParseContext();

        try {
            parser.parse(in, handler, metadata, ctx);
        } catch (WriteLimitReachedException limit) {
            log.info("Tika hit char limit for '{}'", filenameHint);
        } catch (SAXException | IOException | TikaException e) {
            // SAXException's cause can also be a WriteLimitReachedException
            if (e.getCause() instanceof WriteLimitReachedException) {
                log.info("Tika hit char limit for '{}' (via SAXException)", filenameHint);
            } else {
                throw new DocumentExtractionException(
                    "Could not extract text from '" + filenameHint + "': " + e.getMessage(), e);
            }
        }

        String text = handler.toString().trim();
        if (text.isEmpty()) {
            throw new DocumentExtractionException(
                "No text could be extracted from '" + filenameHint + "'. " +
                "Scanned-image PDFs are not supported in the PoC — please paste the text manually.");
        }

        boolean truncated = text.length() >= MAX_CHARS_PER_DOC;
        if (truncated) {
            text = text.substring(0, MAX_CHARS_PER_DOC) + TRUNCATION_MARKER;
        }

        return new Extracted(text, Hashing.sha256Hex(text));
    }
}
