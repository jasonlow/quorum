package io.quorum.session.documents;

import io.quorum.session.domain.Phase;
import io.quorum.session.domain.SessionDocument;
import io.quorum.session.service.SessionService;
import io.quorum.session.store.SessionDocumentRepository;
import io.quorum.session.store.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Upload / list / delete supporting documents for a session.
 *
 * <p>Documents can only be modified while the session is still in
 * {@code CONVENED} phase — once the orchestrator has started (or the
 * session is BRIEFED / DECIDED), the doc set is locked so the audit chain
 * has a stable reference.
 */
@RestController
@RequestMapping("/api/v1/sessions/{sessionId}/documents")
@RequiredArgsConstructor
@Slf4j
public class SessionDocumentController {

    /** Per-session caps. Total extracted text across all docs is capped too. */
    public static final int MAX_DOCS_PER_SESSION = 5;
    public static final int MAX_TOTAL_CHARS = 200_000;

    private final SessionRepository sessions;
    private final SessionDocumentRepository documents;
    private final DocumentExtractor extractor;
    private final SessionService sessionService;

    @GetMapping
    public List<SessionDocumentView> list(@PathVariable UUID sessionId) {
        sessionService.get(sessionId); // 404s if missing
        return documents.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
            .map(SessionDocumentView::of)
            .toList();
    }

    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionDocumentView upload(@PathVariable UUID sessionId,
                                      @RequestParam("file") MultipartFile file) {
        var session = sessions.findById(sessionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        if (session.getPhase() != Phase.CONVENED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Documents can only be attached before deliberation starts (current phase: "
                    + session.getPhase() + ")");
        }
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        if (documents.countBySessionId(sessionId) >= MAX_DOCS_PER_SESSION) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Limit reached: max " + MAX_DOCS_PER_SESSION + " documents per session");
        }

        DocumentExtractor.Extracted result;
        try (var in = file.getInputStream()) {
            result = extractor.extract(in, file.getOriginalFilename());
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Could not read uploaded file: " + e.getMessage(), e);
        } catch (DocumentExtractionException e) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, e.getMessage(), e);
        }

        // Total-text budget check
        int existingTotal = documents.findBySessionIdOrderByCreatedAtAsc(sessionId).stream()
            .mapToInt(d -> d.getExtractedText().length())
            .sum();
        if (existingTotal + result.text().length() > MAX_TOTAL_CHARS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Total extracted text across all documents would exceed "
                    + MAX_TOTAL_CHARS + " characters");
        }

        SessionDocument doc = SessionDocument.builder()
            .sessionId(sessionId)
            .filename(file.getOriginalFilename() == null ? "untitled" : file.getOriginalFilename())
            .contentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType())
            .byteSize((int) Math.min(Integer.MAX_VALUE, file.getSize()))
            .extractedText(result.text())
            .sha256(result.sha256())
            .build();
        SessionDocument saved = documents.save(doc);
        log.info("Document attached to session {}: {} ({}B raw, {}c extracted, sha256={})",
            sessionId, doc.getFilename(), doc.getByteSize(),
            result.text().length(), result.sha256().substring(0, 8));
        return SessionDocumentView.of(saved);
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> delete(@PathVariable UUID sessionId,
                                       @PathVariable UUID documentId) {
        var session = sessions.findById(sessionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        if (session.getPhase() != Phase.CONVENED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Documents are locked once deliberation has started");
        }
        documents.deleteBySessionIdAndId(sessionId, documentId);
        return ResponseEntity.noContent().build();
    }
}
