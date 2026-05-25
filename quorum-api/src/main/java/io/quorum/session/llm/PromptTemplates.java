package io.quorum.session.llm;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Template;
import com.github.jknack.handlebars.io.ClassPathTemplateLoader;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Loads Handlebars templates from {@code classpath:/prompts/} and renders them.
 * Templates are compiled once and cached per JVM lifetime — template files are
 * immutable at runtime.
 *
 * <p>Naming: pass the template name <em>without</em> extension. The loader is
 * pre-configured with prefix {@code /prompts/} and suffix {@code .hbs}.
 */
@Component
@Slf4j
public class PromptTemplates {

    private final Handlebars handlebars;
    private final Map<String, Template> cache = new ConcurrentHashMap<>();

    public PromptTemplates() {
        var loader = new ClassPathTemplateLoader();
        loader.setPrefix("/prompts/");
        loader.setSuffix(".hbs");
        this.handlebars = new Handlebars(loader);
    }

    /**
     * Render a template by name with the given context.
     *
     * @param name template name without extension, e.g. {@code "agent-user-prompt"}
     * @param ctx  variable bindings — values may be {@code null}, missing keys
     *             render to empty strings via Handlebars' default semantics
     */
    public String render(String name, Map<String, ?> ctx) {
        var tpl = cache.computeIfAbsent(name, this::compile);
        try {
            return tpl.apply(ctx);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to render template: " + name, e);
        }
    }

    private Template compile(String name) {
        try {
            log.debug("Compiling Handlebars template: {}", name);
            return handlebars.compile(name);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to load template: " + name, e);
        }
    }
}
