# Quorum

A small, legible multi-agent deliberation engine where every disagreement is preserved and every decision is cryptographically signed.

![Quorum boardroom](docs/boardroom.png)

Five agents deliberate in parallel on Java 21 virtual threads. A Chief-of-Staff agent quality-gates each draft on a 5-axis rubric. Drafts get revised or shipped depending on the QA intensity dial. The chair's final decision is hashed, chained to prior records, and signed with Ed25519. Tamper anywhere — agent text, brief, document, decision — and `quorum verify` rejects the chain.

---

## requirements

**hardware:** 8 GB RAM, ~4 GB disk. Linux, macOS, or Windows (WSL2). x86_64 or arm64. Backend uses ~1.5 GB heap, frontend dev server ~500 MB, Postgres ~200 MB.

**software:**

| | Version | Notes |
|---|---|---|
| Java | 21 LTS | Temurin, Corretto, Zulu all fine. `sdk install java 21-tem` if you use SDKMAN. |
| Maven | — | Use the bundled `./mvnw` wrapper. No system Maven needed. |
| Node | 20+ | For the frontend. |
| pnpm | latest | `corepack enable && corepack prepare pnpm@latest --activate`. |
| Docker | Desktop or Colima | Postgres is spun up via `docker compose`. Also required for Testcontainers (backend tests). |
| DEEPSEEK_API_KEY | env var | `export DEEPSEEK_API_KEY=sk-...` |

---

## quick start

```bash
export DEEPSEEK_API_KEY=sk-...
make up
open http://localhost:5173
```

`make help` lists every target. From the browser: **Convene committee** → pick a topic → optionally attach a PDF/DOCX → **Start deliberation** → watch the boardroom → read the brief → seal the decision.

Quorum was built and tested against DeepSeek V4, but the LLM is swappable — anything that speaks the OpenAI-compatible chat API works through Spring AI's `ChatClient`, and per-agent overrides are supported. You're welcome to point it at another frontier LLM or a self-hosted model and see how the deliberation changes.

---

## patterns

If you came to study how the multi-agent orchestration is done, these are the load-bearing files:

| Pattern | File |
|---|---|
| Parallel deliberation on virtual threads | [`RoundRobinOrchestrator.java`](quorum-api/src/main/java/io/quorum/session/orchestrator/RoundRobinOrchestrator.java) |
| Chief-of-Staff quality gate (5-axis rubric) | [`ChiefOfStaffService.java`](quorum-api/src/main/java/io/quorum/session/cos/ChiefOfStaffService.java) |
| QA intensity dial (`NONE` / `SINGLE` / `DEEP`) | [`QaIntensity.java`](quorum-api/src/main/java/io/quorum/committee/domain/QaIntensity.java) |
| Consolidation that preserves dissent | [`Consolidator.java`](quorum-api/src/main/java/io/quorum/brief/service/Consolidator.java) |
| Ed25519-signed hash chain | [`DecisionSealer.java`](quorum-api/src/main/java/io/quorum/decision/service/DecisionSealer.java) + [`CanonicalPayloadBuilder.java`](quorum-api/src/main/java/io/quorum/audit/service/CanonicalPayloadBuilder.java) |
| SSE streaming UX (no polling) | [`Boardroom.tsx`](quorum-web/src/pages/Boardroom.tsx) |
| Natural language → structured agent profile | [`AgentGenerationService.java`](quorum-api/src/main/java/io/quorum/agent/service/AgentGenerationService.java) |
| Document grounding (PDF/DOCX/XLSX/CSV/TXT via Tika) | [`DocumentExtractor.java`](quorum-api/src/main/java/io/quorum/session/documents/DocumentExtractor.java) |

Prompts are composed from versioned Handlebars templates under `quorum-api/src/main/resources/prompts/`.

---

## message flow

In the current Round Robin pattern, agents do not message each other directly. They each receive the same shared context — topic, attached documents, committee doctrine — at the same moment, deliberate in parallel on virtual threads, and produce independent drafts.

Two implicit messages flow during a deliberation:

1. **shared context → all agents** (broadcast, once) — every agent's prompt is composed from the same topic, document extracts, and committee-level doctrine. Agents don't see each other; they see the same world.
2. **CoS critique → agent** (revision loop) — when the 5-axis rubric fails, the Chief of Staff sends the agent a structured challenge naming the failed axes. The agent revises against the critique. This continues up to `max-revision-rounds`, controlled by the [`QaIntensity`](quorum-api/src/main/java/io/quorum/committee/domain/QaIntensity.java) dial.

After deliberation, the [`Consolidator`](quorum-api/src/main/java/io/quorum/brief/service/Consolidator.java) reads all final drafts and produces one Brief, preserving dissent as a first-class section. Speak-in-turn semantics (where agent N sees the drafts of agents 1..N-1) and the Debate pattern (turn-by-turn exchange between agents) are documented in the [`RoundRobinOrchestrator`](quorum-api/src/main/java/io/quorum/session/orchestrator/RoundRobinOrchestrator.java) docstring as a Phase 2 evolution.

---

## running the stack manually

`make up` runs both in one shell. If you want them in separate terminals:

```bash
# terminal 1 — backend (auto-starts Postgres via docker compose)
cd quorum-api && ./mvnw spring-boot:run

# terminal 2 — frontend
cd quorum-web && pnpm install && pnpm dev
```

---

## sample output

A single deliberation produces an agent draft, a CoS rubric, a consolidated brief, and a sealed audit envelope. Excerpts:

**agent draft (Compliance Officer, partial):**

```
MAS 626 paragraph 4.3 requires that any third-party processor handling
customer-identifying data either reside in Singapore or be covered by an
outsourcing risk assessment approved by the Board. The proposed Frankfurt
processor would trigger the latter…
```

**chief-of-staff rubric (one axis of five):**

```json
{
  "axis": "evidence",
  "score": 3,
  "verdict": "PASSED_WITH_NOTE",
  "note": "MAS 626 §4.3 cited correctly; recommend adding the §6.2 reporting timeline for completeness."
}
```

**sealed audit envelope (truncated):**

```json
{
  "sessionId": "f7e0…3c1b",
  "sequence": 12,
  "previousHash": "9c4a…71e0",
  "payloadHash": "2b88…f4d6",
  "signature": "MEUCIQDk…RAo=",
  "publicKeyFingerprint": "SHA256:7d:21:…:af:90"
}
```

**verifying the chain:**

```bash
$ make verify SESSION=./data/audit/session-f7e0...json
✓ chain length: 12 records
✓ all previousHash links match
✓ Ed25519 signature valid (key fingerprint SHA256:7d:21:…:af:90)
```

Modify any field of any record by one byte and the verifier rejects it.

---

## verifying the audit chain

The verifier is a separate CLI from the running app — it only reads the envelope file and the public key.

```bash
make verify SESSION=./data/audit/session-<id>.json
```

The Ed25519 keypair lives in `quorum-api/data/keys/` as PEM. Swap this for KMS-backed signing in production — `LocalKeystoreSigner.java` is the swap point.

---

## document grounding

Convene's Stage 2 accepts up to 5 supporting documents (PDF / DOCX / XLSX / CSV / TXT, 50 KB extracted per doc, 200 KB total). Apache Tika extracts the text; the extract is injected into every agent's prompt and the CoS review. Each document's SHA-256 is folded into the audit envelope, so the verifier rejects the chain if any source document changes after sealing.

---

## tech stack

- **Backend:** Java 21, Spring Boot 3.5, Spring AI 1.0, Spring Data JPA, Flyway, PostgreSQL 16, Apache Tika 3.2, Ed25519 (java.security)
- **Frontend:** React 18, Vite 5, TypeScript 5.6, zustand, react-router-dom
- **LLM:** DeepSeek V4 via Spring AI's OpenAI-compatible client. Per-agent model override supported.
- **Tooling:** Maven wrapper, pnpm, Docker Compose, Testcontainers

---

## repo layout

```
quorum-api/   spring boot backend
quorum-web/   react frontend
docs/         readme assets
```

---

## acknowledgements

Built on [Spring AI](https://docs.spring.io/spring-ai/reference/), [DeepSeek](https://platform.deepseek.com/), [Apache Tika](https://tika.apache.org/), and the React ecosystem. The architectural idea owes a debt to multi-agent research from the last two years; the audit-chain idea owes everything to standard transparency-log designs.

---

## contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: small focused PRs, backend tests preferred over manual verification, please open an issue before adding orchestration patterns beyond Round Robin.

---

## license

[MIT](LICENSE).

---

Jason Low · [github.com/jasonlow](https://github.com/jasonlow)
