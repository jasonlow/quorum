# Concilium — Postman Workspace

Curated Postman collection for testing the Concilium PoC backend.
Pre-wired with the ETH Accumulator Series 3 demo scenario, automatic
request chaining (sessionId + per-agent IDs flow between calls), and
basic assertion scripts.

## Files

| File | What it is |
|---|---|
| `Concilium-PoC.postman_collection.json` | The collection — 3 folders, 9 requests, with embedded JS test scripts |
| `Concilium-Local.postman_environment.json` | Environment with `baseUrl = http://localhost:8080` |

Both files are Postman Collection v2.1.0 format — import into Postman
Desktop, the web app, or Bruno (Bruno can import Postman v2.1).

## One-time setup

1. **Install Postman.** Either the desktop app (`brew install --cask postman`)
   or sign in at https://web.postman.co/.
2. **Import both files.** Click **Import** in Postman, drop in both
   `.json` files from this directory.
3. **Select the environment.** Top-right environment dropdown → choose
   **Concilium Local**.
4. **Start the backend.**
   ```bash
   cd ../concilium-api
   ./mvnw spring-boot:run
   ```
   Make sure `DEEPSEEK_API_KEY` is exported in the shell that runs
   `mvnw`, otherwise the LLM calls will fail with 401.

## Daily flow

Run requests **in order** the first time so the collection variables get
populated. After that you can re-run individual `Run — <persona>`
requests freely.

```
0. Health
   └─ GET /actuator/health           → expect 200 UP

1. Agents
   └─ List agents & populate IDs    → saves 5 agent UUIDs to vars

2. Sessions
   ├─ Convene (ETH Accumulator…)    → saves sessionId
   ├─ Get session state             → see all 5 agents in QUEUED
   ├─ Run — Risk Manager            → expect SUBMITTED, draft in console
   ├─ Run — Investment Strategist
   ├─ Run — Compliance Officer
   ├─ Run — Treasury / Ops
   └─ Run — Macro Economist
```

## Reading agent drafts in Postman

Each `Run — <persona>` request logs the full draft to the **Postman
Console** (View → Show Postman Console, or `Cmd+Opt+C`). The raw JSON
response in the body panel also contains the draft, but the console
keeps history across calls — great for side-by-side **Bet B2** comparison.

You'll also see per-call cost telemetry:
```
model=deepseek-chat in/out=412/187 latency=8421ms
```

## Running the full demo in one shot

Right-click the `2. Sessions` folder → **Run folder** (Collection Runner).
- Order: as listed
- Iterations: 1
- Delay: 500ms (optional, gives DeepSeek breathing room)

The Runner shows green checks for each request's assertions and gives
you a single screen with all 5 agent drafts.

## Variables reference

| Variable | Set by | Used by |
|---|---|---|
| `baseUrl` | environment | every request |
| `sessionId` | `Convene` test script | every `/sessions/:id/*` request |
| `riskManagerId` | `List agents` test script | `Run — Risk Manager` |
| `strategistId` | `List agents` test script | `Run — Investment Strategist` |
| `complianceOfficerId` | `List agents` test script | `Run — Compliance Officer` |
| `treasuryOpsId` | `List agents` test script | `Run — Treasury / Ops` |
| `macroEconomistId` | `List agents` test script | `Run — Macro Economist` |

## Optional — also import the live OpenAPI spec

`springdoc-openapi` exposes the live spec at `http://localhost:8080/v3/api-docs`
and a Swagger UI at `http://localhost:8080/swagger-ui.html`. You can
import the spec into Postman (Import → Link → that URL) to get an
auto-generated collection covering every endpoint as the backend grows
(handy in Week 2+ as we add SSE streaming, brief, decide, etc.).

The hand-curated collection in this directory stays the demo path; the
OpenAPI import is the exhaustive reference.
