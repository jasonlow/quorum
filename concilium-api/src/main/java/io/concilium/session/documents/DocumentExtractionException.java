package io.concilium.session.documents;

/** Thrown when Tika cannot extract usable text from an uploaded file. */
public class DocumentExtractionException extends RuntimeException {
    public DocumentExtractionException(String message) {
        super(message);
    }
    public DocumentExtractionException(String message, Throwable cause) {
        super(message, cause);
    }
}
