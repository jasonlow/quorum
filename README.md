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
| `concilium-postman/` | Postman collection + environment for API testing |
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
| ✅ Week 1 — backend foundation | Spring Boot 3.5, Spring AI, JPA entities, Flyway, Investment Risk Committee with 5 personas, single-agent invocation, integration test |
| ✅ Week 2 — orchestration | Parallel virtual-thread orchestrator, SSE streaming, Chief of Staff quality gate (deepseek-reasoner), brief consolidator |
| ✅ Week 3 — backend audit (Chunk A) | LocalKeystoreSigner (Ed25519 PEM), DecisionSealer with hash chain, POST /decide, verify CLI, per-agent model override |
| ✅ Week 3 — frontend (Chunk B.1) | React 18 + Vite + TS: Dashboard, Convene, Boardroom (live SSE), Brief + decision panel, Session Complete with audit chain |
| ⏳ Week 3 — frontend polish (Chunk B.2) | Sidebar nav, audit log history view, agent library admin UI, token-streaming previews, theme/density toggle |

## LLM provider

Default profile (`local`): **DeepSeek V4 (`deepseek-chat`)** via Spring AI's
OpenAI-compatible client.

Offline fallback (`ollama`): **Ollama** with `llama3.1:8b` running locally.

Switch with `SPRING_PROFILES_ACTIVE=ollama`.

## Running the full stack

```bash
# Terminal 1 — backend (auto-starts Postgres via docker compose)
cd concilium-api && ./mvnw spring-boot:run

# Terminal 2 — frontend (first time: pnpm install)
cd concilium-web && pnpm install && pnpm dev

# Open http://localhost:5173 in a browser
```

Then click **Convene committee** → **Start deliberation** → watch the
boardroom light up → read the brief → seal a decision.

For the audit-chain verification (Bet B5):

```bash
make verify SESSION=./data/audit/session-<id>.json
```

## Testing with Postman

A curated Postman collection lives at [`concilium-postman/`](concilium-postman/).
Import both `.json` files into Postman, select the **Concilium Local**
environment, and run the `Sessions` folder to drive the full ETH
Accumulator demo through the backend. See
[concilium-postman/README.md](concilium-postman/README.md) for details.
