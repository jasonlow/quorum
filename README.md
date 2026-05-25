# Concilium — AI Committee Platform

Local-first Proof of Concept of an **AI Committee orchestrator**. Multiple
purpose-built agents deliberate on a topic in parallel, a Chief-of-Staff
agent quality-gates their output on a 5-axis rubric, and the human chair
makes the final, **auditably-signed** decision.

> **Why this exists.** Most multi-agent systems hide deliberation behind a
> single synthesized answer. Concilium makes the *disagreement* legible:
> every agent's draft, every CoS challenge, every revision, and the chair's
> final call are preserved in an Ed25519-signed hash chain you can verify
> from the command line.

## The patterns inside

If you came here to study how multi-agent orchestration is done, these are
the load-bearing files:

| Pattern | File | Note |
|---|---|---|
| **Parallel deliberation** | [`RoundRobinOrchestrator.java`](concilium-api/src/main/java/io/concilium/session/orchestrator/RoundRobinOrchestrator.java) | Java 21 virtual threads fan out N agents; phase machine drives CONVENED → DELIBERATING → BRIEFED → DECIDED. |
| **Chief-of-Staff quality gate** | [`ChiefOfStaffService.java`](concilium-api/src/main/java/io/concilium/session/cos/ChiefOfStaffService.java) | Critic agent scores each draft on specificity / completeness / evidence / boundaries / ideology fit, returns PASSED / PASSED_WITH_NOTE / REVISION_REQUESTED / FAILED. |
| **QA intensity dial** | [`QaIntensity.java`](concilium-api/src/main/java/io/concilium/committee/domain/QaIntensity.java) | NONE = ship first draft, SINGLE = one revision, DEEP = revise until passed or budget exhausted. |
| **Consolidation** | [`Consolidator.java`](concilium-api/src/main/java/io/concilium/brief/service/Consolidator.java) | Reduces N agent drafts to one Brief, preserves dissent as a first-class section. |
| **Audit hash chain** | [`DecisionSealer.java`](concilium-api/src/main/java/io/concilium/decision/service/DecisionSealer.java) + [`CanonicalPayloadBuilder.java`](concilium-api/src/main/java/io/concilium/audit/service/CanonicalPayloadBuilder.java) | Canonical payload → SHA-256 → chained to previous record → Ed25519 signed. Tamper anywhere and `concilium verify` rejects it. |
| **Streaming UX** | [`Boardroom.tsx`](concilium-web/src/pages/Boardroom.tsx) | SSE channel pushes phase + per-agent state + token deltas to the browser; no polling. |
| **NL → agent profile** | [`AgentGenerationService.java`](concilium-api/src/main/java/io/concilium/agent/service/AgentGenerationService.java) | Type a one-line description ("skeptical MAS compliance officer"), get a structured agent with skills, ideology, biases, boundaries. |
| **Document grounding** | [`DocumentExtractor.java`](concilium-api/src/main/java/io/concilium/session/documents/DocumentExtractor.java) | Tika extracts text from attached PDF / DOCX / XLSX / CSV / TXT; SHA-256 of extracted text is folded into the audit chain. |

For the field-by-field guide to creating agents and committees, see
[**Creating agents & committees**](ai-committee-user-guide.md).

## Repo layout

| Doc / Module | Purpose |
|---|---|
| `ai-committee-proposal.md` | Original product proposal |
| `ai-committee-ux-requirements.md` | UX specification |
| `ai-committee-business-requirements.md` | BRD with BR/FR/NFR/UCs |
| `ai-committee-solution-architecture.md` | Target architecture (cloud) |
| `ai-committee-poc-plan.md` | This PoC's plan, schedule, and DoD |
| `ai-committee-user-guide.md` | How to create agents & committees |
| `concilium-api/` | Spring Boot 3.5 backend (Java 21, Maven) |
| `concilium-web/` | React 18 + Vite frontend |
| `concilium-postman/` | Postman collection + environment for API testing |
| `design_handoff_concilium/` | Hi-fi design tokens & components (reference) |

## Quick start

There are two LLM paths — pick one.

**Option A — Ollama (no API key, fully offline):**

```bash
sdk install java 21-tem && sdk use java 21-tem
brew install --cask docker                         # or Colima
corepack enable && corepack prepare pnpm@latest --activate

brew install ollama && ollama pull llama3.1:8b
export SPRING_PROFILES_ACTIVE=ollama

make up                                            # postgres + api + web
open http://localhost:5173
```

**Option B — DeepSeek (cloud, ~$0.27 / $1.10 per M tokens):**

```bash
# same prereqs as above, then:
export DEEPSEEK_API_KEY=sk-...
make up
```

Either way, `make help` lists every target. Once the stack is up, click
**Convene committee** → pick a topic → optionally attach a PDF/DOCX →
**Start deliberation** → watch the boardroom light up → read the brief →
seal a decision.

## Status

| Phase | What works |
|---|---|
| ✅ W1 — backend foundation | Spring Boot 3.5, Spring AI, JPA + Flyway, Investment Risk Committee with 5 personas, single-agent invocation, integration test |
| ✅ W2 — orchestration | Parallel virtual-thread orchestrator, SSE streaming, Chief-of-Staff quality gate, brief consolidator |
| ✅ W3 — backend audit (Chunk A) | `LocalKeystoreSigner` (Ed25519 PEM), `DecisionSealer` with hash chain, `POST /decide`, `concilium verify` CLI, per-agent model override |
| ✅ W3 — frontend (Chunk B.1) | React 18 + Vite + TS: Dashboard, Convene, Boardroom (live SSE), Brief + decision panel, Session Complete with audit chain |
| ✅ W3 — frontend polish (Chunk B.2) | Sidebar nav + theme toggle, agent library with NL-generated drafts, committee builder with NL-generated agendas, soft-delete + restore for agents and committees, token-streaming previews |
| ✅ W4 — session context layer | Two-stage Convene (agenda + attached documents), Tika-based document extraction folded into the audit chain, committee/agent knowledge text ("standing doctrine"), per-round agent draft history with rubric-score expansion panel, QA intensity dial (NONE / SINGLE / DEEP) |

## LLM provider

Default profile (`local`): **DeepSeek V4** via Spring AI's OpenAI-compatible
client.

| Role | Model | Override env var |
|---|---|---|
| Default agents + brief consolidator | `deepseek-chat` (auto-routes to `deepseek-v4-flash`) | per-agent `modelOverride` |
| Chief of Staff (reasoning-tier critique) | `deepseek-v4-pro` (legacy alias: `deepseek-reasoner`) | `CONCILIUM_COS_MODEL` |

Per-agent overrides accept `deepseek-v4-flash` / `deepseek-v4-pro` (canonical)
or `deepseek-chat` / `deepseek-reasoner` (legacy aliases). Reasoning-tier
models skip the `temperature` parameter automatically.

Offline fallback (`ollama`): **Ollama** with `llama3.1:8b` running locally.
Switch with `SPRING_PROFILES_ACTIVE=ollama`. Latency is higher and outputs
are noticeably less crisp than DeepSeek, but no API key is required and
nothing leaves the box.

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

## Trying the document-grounded flow

The W4 Convene rewrite has a Stage 2 that accepts up to 5 supporting documents
(PDF / DOCX / XLSX / CSV / TXT, 50 KB extracted per doc, 200 KB total). The
extracted text is injected into every agent's prompt and the CoS review, and
each document's SHA-256 is recorded in the audit chain alongside the brief.

To try it: complete Stage 1 (committee + topic), then on Stage 2 drop in any
document you have lying around — a product spec, a regulatory PDF, an audit
report. The agents will reference it in their deliberation. After sealing the
decision, run the verify command above and confirm the document hashes appear
in the envelope.

## Testing with Postman

A curated Postman collection lives at [`concilium-postman/`](concilium-postman/).
Import both `.json` files into Postman, select the **Concilium Local**
environment, and run the `Sessions` folder to drive the full demo through the
backend. See [concilium-postman/README.md](concilium-postman/README.md) for
details.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: small focused PRs,
backend tests preferred over manual verification, and please discuss before
adding orchestration patterns beyond Round Robin (the BRD has Vote, Parallel,
Debate, and Hierarchical sketched out — they're on the roadmap).

## License

[MIT](LICENSE). Use it, modify it, ship it.

---

**Built by Jason Low** · [GitHub](https://github.com/jasonlow)

<!-- TODO: add LinkedIn / personal site / X once decided -->

