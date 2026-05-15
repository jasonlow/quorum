# Concilium — AI Committee Platform

Local-first Proof of Concept of an AI Committee orchestrator. Multiple
purpose-built agents deliberate on a topic in parallel, a Chief-of-Staff
agent quality-gates their output, and the human chair makes the final,
auditably-signed decision.

This repo holds:

| Doc / Module | Purpose |
|---|---|
| `ai-committee-proposal.md` | Original product proposal |
| `ai-committee-ux-requirements.md` | UX specification |
| `ai-committee-business-requirements.md` | BRD with BR/FR/NFR/UCs |
| `ai-committee-solution-architecture.md` | Target architecture (cloud) |
| `ai-committee-poc-plan.md` | This PoC's plan, schedule, and DoD |
| `concilium-api/` | Spring Boot 3.5 backend (Java 21, Maven) |
| `concilium-web/` | React 18 + Vite frontend (Week 3) |
| `design_handoff_concilium/` | Hi-fi design tokens & components |

## Quick start

```bash
# 1. Install prerequisites (one-time)
sdk install java 21-tem && sdk use java 21-tem    # Java 21 LTS
brew install --cask docker                         # or Colima
corepack enable && corepack prepare pnpm@latest --activate

# 2. Set the DeepSeek key (or activate the ollama profile)
export DEEPSEEK_API_KEY=sk-...

# 3. Bring it all up
make up                                            # postgres + api + web
open http://localhost:5173                         # Week 3
open http://localhost:8080/swagger-ui.html         # API docs
```

Run `make help` to see all targets.

## Status

| Phase | What works |
|---|---|
| ✅ Week 1, Days 1–2 (T01–T07) | Project scaffold, Maven + Spring Boot 3.5, Spring AI, JPA entities, Flyway schema, Investment Risk Committee seeded with 5 personas, smoke endpoint `GET /api/v1/agents` |
| ⏳ Week 1, Days 3–5 (T08–T17) | Spring AI ChatClient wiring, prompt templates, single-agent invocation, frontend skeleton |
| ⏳ Week 2 (T01–T12) | Parallel orchestrator, SSE streaming, CoS quality gate, brief consolidator |
| ⏳ Week 3 (T01–T15) | Boardroom UI, decision panel, local audit chain (Ed25519), verifier CLI |

## LLM provider

Default profile (`local`): **DeepSeek V4 (`deepseek-chat`)** via Spring AI's
OpenAI-compatible client.

Offline fallback (`ollama`): **Ollama** with `llama3.1:8b` running locally.

Switch with `SPRING_PROFILES_ACTIVE=ollama`.

## Next step

Install Java 21, then from the `concilium-api/` directory:

```bash
./mvnw spring-boot:run
# In another terminal:
curl -s http://localhost:8080/api/v1/agents | jq
```

That should return 5 seeded agents — the Investment Risk Committee.
