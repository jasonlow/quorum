# concilium-web

React 18 + Vite + TypeScript frontend for the Concilium AI Committee PoC.
Consumes the Spring Boot backend at `concilium-api/` via the Vite dev
proxy (no CORS dance required in dev).

## Prerequisites

- Node 20+ (verify with `node -v`)
- pnpm (or npm/yarn). To get pnpm via Node's bundled corepack:
  ```bash
  corepack enable
  corepack prepare pnpm@latest --activate
  ```

## Quick start

```bash
# 1. Install deps
pnpm install              # or: npm install

# 2. Start the backend in another terminal (from project root)
cd ../concilium-api && ./mvnw spring-boot:run

# 3. Start the frontend
pnpm dev                  # or: npm run dev
open http://localhost:5173
```

## Demo flow in the browser

1. **Dashboard** — overview + the **Convene committee** button
2. **Convene** — topic + context (pre-filled with the ETH Accumulator memo)
3. **Boardroom** — live 5-tile grid; click **Start deliberation** and watch
   the agents move through Thinking → Submitted → CoS review → Passed /
   Passed-with-note in real time. CoS challenge text surfaces below the grid.
4. **View brief** — appears once `brief.ready` fires; consolidated
   recommendation + consensus + disagreements + per-agent breakdown.
5. **Decision panel** at the bottom of the brief — choose Approve / Approve
   with changes / Reject / Reconvene. Confirm seals an Ed25519-signed audit
   record and routes to the **Session Complete** page.
6. **Session Complete** — shows the full audit chain summary + the exact
   `make verify` command to validate from a terminal.

## Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | react-router-dom 6 |
| State | Zustand (live session); native fetch for one-shot REST |
| Streaming | Native `EventSource` consumer (`features/sessions/stream.ts`) |
| Icons | lucide-react |
| Styles | `pro-styles.css` lifted verbatim from `design_handoff_concilium/` |

The Vite dev server proxies `/api/*` and `/actuator/*` to
`http://localhost:8080` — see `vite.config.ts`.

## Notes

- This is **Chunk B.1** of the Week 3 frontend. Topbar nav, sidebar,
  audit log history, agent library admin UI, theme/density toggles, and
  token-streaming previews land in **Chunk B.2**.
- The visual design tokens are pixel-accurate to the hi-fi handoff;
  layout polish (per-screen spacing, sidebar, full topbar workspace
  switcher) is the next iteration.
