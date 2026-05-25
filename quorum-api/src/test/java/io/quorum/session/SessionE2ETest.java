package io.quorum.session;

import com.github.tomakehurst.wiremock.junit5.WireMockExtension;
import io.quorum.TestcontainersConfiguration;
import io.quorum.session.api.dto.AgentDraftView;
import io.quorum.session.api.dto.ConveneRequest;
import io.quorum.session.api.dto.SessionView;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.net.URI;
import java.net.http.HttpClient;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end test of the Week 1 vertical slice:
 *   POST /sessions  →  POST /sessions/{id}/run-one-agent  →  draft stored
 *
 * <p>The LLM HTTP layer is stubbed by WireMock, returning a deterministic
 * "agent draft". Tests stay hermetic — no real API key required, no spend.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import({TestcontainersConfiguration.class, SessionE2ETest.Http1Config.class})
class SessionE2ETest {

    @RegisterExtension
    static WireMockExtension wm = WireMockExtension.newInstance()
        .options(wireMockConfig().dynamicPort())
        .build();

    /**
     * The JDK {@link HttpClient} defaults to HTTP/2 on localhost. WireMock
     * serves HTTP/1.1, so the ALPN negotiation hangs up with EOF. Force
     * HTTP/1.1 on the {@code RestClient.Builder} that Spring AI uses.
     */
    @TestConfiguration
    static class Http1Config {
        @Bean
        RestClientCustomizer http1Customizer() {
            return builder -> {
                HttpClient http1 = HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .build();
                builder.requestFactory(new JdkClientHttpRequestFactory(http1));
            };
        }
    }

    private static final String CANNED_DRAFT_TEXT =
        "Recommend APPROVE WITH CONDITIONS. Worst-case drawdown -32% under "
        + "stress; 15% collateral buffer adequate but tier as 10% base + 5% "
        + "contingency. Flag Fed H2 rate path as upside risk to product.";

    @DynamicPropertySource
    static void llmProperties(DynamicPropertyRegistry registry) {
        // Point Spring AI's OpenAI client at our WireMock server
        registry.add("spring.ai.model.chat", () -> "openai");
        registry.add("spring.ai.openai.base-url", wm::baseUrl);
        registry.add("spring.ai.openai.api-key", () -> "test-key");
        registry.add("spring.ai.openai.chat.options.model", () -> "deepseek-chat");
    }

    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;

    @Test
    void singleAgentHappyPath() {
        stubChatCompletion(CANNED_DRAFT_TEXT, 412, 87);

        // 1. Convene (default committee = Investment Risk Committee, seeded on startup)
        ConveneRequest convene = new ConveneRequest(
            null,
            "Review ETH Accumulator Series 3 — 12-month tenor, 70% knock-in, 18% coupon.",
            "Notional USD 10M; spot 3245; vol 60d=58%."
        );
        ResponseEntity<SessionView> convened = rest.postForEntity(
            url("/api/v1/sessions"), convene, SessionView.class);

        assertThat(convened.getStatusCode().value()).isEqualTo(201);
        SessionView session = convened.getBody();
        assertThat(session).isNotNull();
        assertThat(session.id()).isNotNull();
        assertThat(session.agents()).hasSize(5);
        assertThat(session.agents()).allSatisfy(e ->
            assertThat(e.state().name()).isEqualTo("QUEUED"));

        // 2. Pick one agent to run (Risk Manager — speaking order 1)
        UUID riskManagerId = session.agents().stream()
            .filter(e -> "Risk Manager".equals(e.agentName()))
            .findFirst().orElseThrow().agentId();

        // 3. Run one agent
        ResponseEntity<AgentDraftView> ran = rest.exchange(
            URI.create(url("/api/v1/sessions/" + session.id()
                + "/run-one-agent?agentId=" + riskManagerId)),
            HttpMethod.POST,
            new HttpEntity<>(jsonHeaders()),
            AgentDraftView.class);

        assertThat(ran.getStatusCode().value()).isEqualTo(200);
        AgentDraftView draft = ran.getBody();
        assertThat(draft).isNotNull();
        assertThat(draft.draft()).contains("APPROVE WITH CONDITIONS");
        assertThat(draft.state().name()).isEqualTo("SUBMITTED");
        assertThat(draft.promptTokens()).isEqualTo(412);
        assertThat(draft.completionTokens()).isEqualTo(87);
        assertThat(draft.latencyMs()).isGreaterThanOrEqualTo(0);

        // 4. Re-fetch the session — that agent should be SUBMITTED, others QUEUED
        ResponseEntity<SessionView> refetched = rest.getForEntity(
            url("/api/v1/sessions/" + session.id()), SessionView.class);
        SessionView after = refetched.getBody();
        assertThat(after).isNotNull();
        assertThat(after.agents()).anySatisfy(e -> {
            if (e.agentId().equals(riskManagerId)) {
                assertThat(e.state().name()).isEqualTo("SUBMITTED");
                assertThat(e.hasDraft()).isTrue();
            }
        });
        long stillQueued = after.agents().stream()
            .filter(e -> e.state().name().equals("QUEUED"))
            .count();
        assertThat(stillQueued).isEqualTo(4);
    }

    // ---------------------------------------------------------------------

    private void stubChatCompletion(String content, int promptTokens, int completionTokens) {
        String body = """
            {
              "id": "chatcmpl-test",
              "object": "chat.completion",
              "created": 0,
              "model": "deepseek-chat",
              "choices": [{
                "index": 0,
                "message": { "role": "assistant", "content": %s },
                "finish_reason": "stop"
              }],
              "usage": {
                "prompt_tokens": %d,
                "completion_tokens": %d,
                "total_tokens": %d
              }
            }
            """.formatted(
                jsonString(content),
                promptTokens, completionTokens,
                promptTokens + completionTokens);

        wm.stubFor(post(urlPathEqualTo("/v1/chat/completions"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBody(body)));
    }

    private static String jsonString(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private static HttpHeaders jsonHeaders() {
        var h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        return h;
    }

    private String url(String path) {
        return "http://localhost:" + port + path;
    }
}
