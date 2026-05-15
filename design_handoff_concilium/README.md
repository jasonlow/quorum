# Handoff: Concilium — AI Committee

## Overview

**Concilium** is an enterprise web app for running AI "committees" — structured deliberations among purpose-built AI agents that produce auditable group decisions. The demo workspace is **Atlas Capital (Singapore)**, an institutional investment firm using Concilium to run three committees:

1. **Investment Risk Committee** — reviews structured products, position concentration, tail-risk
2. **Client Onboarding Committee** — KYC packs, AML screening, commercial fit
3. **Change Triage Committee** — scores product change requests for engineering / risk / commercial impact

A session takes a chair-defined topic + docs, runs agents through a deliberation pattern (Round Robin → Vote, Parallel → Vote, etc.), passes drafts through a Chief-of-Staff quality gate, lets the chair ask follow-up questions, and emits a consolidated brief with a recorded decision and any dissent.

## About the Design Files

The files in this bundle are **design references created in HTML/React** — clickable prototypes showing intended look, structure, and behavior. They are **not production code to copy directly**.

Your task is to **recreate these designs in the target codebase's existing environment** (React, Vue, SwiftUI, native, etc.) using its established patterns, components, and design system. If no environment exists yet, pick the most appropriate framework for the project (likely React + TypeScript given the structure) and implement there.

The HTML prototype uses inline Babel-transpiled JSX with shared globals; **do not replicate that pattern in production**. Use proper modules, typed components, and your codebase's state management.

## Fidelity

**High-fidelity (hifi).** The mocks are pixel-accurate with final colors, typography, spacing, density, and interaction states. Recreate the UI faithfully. Specific values are documented under **Design Tokens** below; lift them exactly.

The only intentional placeholders are:
- Avatar imagery (initials are used by design — keep that)
- Document thumbnails (rendered as iconographic cards)

## Information Architecture

```
Auth (full-bleed, no chrome)
├─ Login
├─ Register (request access)
├─ Verify (email + MFA setup)
└─ Forgot password

App shell (top bar + sidebar + stage)
├─ Workspace
│  ├─ Dashboard          ← landing; KPIs, recent sessions, pinned committees
│  └─ Convene            ← set up a new session (topic, committee, docs, pattern)
├─ Live Session
│  ├─ Boardroom          ← HERO screen. Live agent deliberation grid.
│  ├─ Chief of Staff     ← Quality gate between draft and Q&A
│  ├─ Discussion (Q&A)   ← Chair-driven follow-up threads
│  └─ Brief              ← Consolidated output + decision record
└─ Manage
   ├─ Agent library      ← Roster of available agents
   └─ Committees         ← Committee definitions
```

The top bar shows: workspace switcher (Atlas Capital · Singapore), breadcrumb, live-session pill, inbox/search icons, **Convene** primary button, user avatar.

The sidebar is fixed-width (≈220px), shows nav items grouped by section, with the active item filled in **ink** (dark) and an item count chip when relevant.

## Screens

### 1. Dashboard (`ScreenDashboard`)

**Purpose:** Landing page for the workspace; quick view of recent sessions, KPIs, and committees.

**Layout:**
- `PageHeader` with eyebrow + serif H1 title + sub + right-aligned actions
- KPI grid — 4 cells in a single horizontal row, divider lines between, no borders top/bottom
- Two-column body: **Recent sessions** table (~2/3 width) and right rail with **Committees** cards + **Activity** feed (~1/3)

**Key components:**
- `kpi-grid` — auto-fit minmax(180px, 1fr); each cell has small label, large serif number (`t-num-big`, 28px), delta pill (green = good, red = bad)
- Sessions table (`tbl`) — sticky uppercase header (10.5px, letter-spacing 0.04em); rows: ID (mono) · topic · committee · decision pill · chair · timestamp · duration · agent count

### 2. Convene (`ScreenConvene`)

**Purpose:** Configure a new session.

**Layout:** Two-column stage.
- **Left (form):** Topic input (large), Committee selector (3 cards with mark + name + description), Documents drop zone (`dotgrid` pattern), Deliberation pattern radio cards, Q&A intensity selector
- **Right (preview/sticky):** Live preview of the committee makeup with agent roster, pattern, expected duration; primary CTA **"Convene committee"**

### 3. Boardroom (`ScreenBoardroom`) — **HERO**

**Purpose:** Live deliberation visualization. Shows each agent's state in real time.

**Layout:**
- Header strip with topic, phase indicator (Early / Mid / Late), live timer, pause/stop controls
- Grid of `AgentTile` cards (one per agent) — each with avatar (color-rimmed by tone), name, role, progress bar, state pill (Queued / Thinking / Drafting / Submitted / Revising / Passed QA / Dissenting), live shimmer/pulse on active states
- Bottom strip: Chair transcript / interjection input

**State variations:**
- Early phase: most agents Queued or Thinking
- Mid phase: mix of Drafting / Submitted
- Late phase: mostly Passed QA, possibly one Dissenting

### 4. Chief of Staff Gate (`ScreenCoSGate`)

**Purpose:** Quality-gate review of drafts before they're shown to the chair.

**Layout:**
- Vertical stack of agent submissions
- Each shows: agent header, draft excerpt (`t-quote`), 5-axis quality check (Specificity / Completeness / Evidence / Boundaries / Ideology fit) with pass/warn/fail glyphs, send-back action

### 5. Discussion / Q&A (`ScreenQA`)

**Purpose:** Chair-led follow-up. Threaded questions to specific agents.

**Layout:**
- Question composer at top (input + agent target chips + send)
- Thread list — each thread = chair question + agent responses
- Sidebar: agents available to question; questions-remaining counter (e.g. "3 of 5 used")

### 6. Brief (`ScreenBrief`)

**Purpose:** Final deliverable. Consolidated decision document.

**Layout:**
- Magazine-style serif H1 title + meta strip
- **Decision banner** — large accent pill (Approved · conditions / Approved / Rejected / Escalated / Priority score)
- Body: Executive summary (`t-quote`), Key findings list, Conditions, Dissents recorded, Voting record
- Action bar: Export PDF · Share · Re-open · Archive

### 7. Agent Profile (`ScreenAgent`)

**Purpose:** View / edit an agent's persona and parameters.

**Layout:** Header with avatar + name + role + tone color · Tabs: Persona / Inputs / Voice / History · Stats sidebar

### 8–11. Auth screens

`ScreenLogin`, `ScreenRegister`, `ScreenVerify`, `ScreenForgot` — all use `AuthShell` (full-bleed, centered card on tinted bg, left rail with editorial copy).

## Design Tokens

All tokens live in `pro-styles.css` as CSS custom properties on `:root`. Lift them exactly.

### Colors — Paper theme (default)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#f7f7f5` | App background (warm paper) |
| `--bg-2` | `#f1f1ee` | Secondary background |
| `--surface` | `#ffffff` | Cards, top bar, primary surfaces |
| `--surface-2` | `#ffffff` | Elevated surface |
| `--tint` | `#f4f4f1` | Pill bg, hover states |
| `--ink` | `#15171a` | Primary text, primary button |
| `--ink-2` | `#3b3f45` | Secondary text |
| `--ink-3` | `#6c7079` | Tertiary / labels |
| `--ink-4` | `#a3a7af` | Quaternary / disabled |
| `--hairline` | `#e6e6e2` | Borders |
| `--hairline-2` | `#efefec` | Inner / subtle borders |
| `--accent` | `#8c5a2f` | Single accent (umber/rust) — chair, decision, active tab |
| `--accent-2` | `#6c4422` | Accent hover |
| `--accent-bg` | `#f1ead8` | Accent pill bg |
| `--green` / `--green-bg` | `#2f6a4a` / `#e3ede6` | Approved, passing |
| `--amber` / `--amber-bg` | `#876419` / `#f1e9d2` | Conditions, warn |
| `--red` / `--red-bg` | `#a13a23` / `#f1dcd4` | Rejected, dissent |
| `--blue` / `--blue-bg` | `#2e537d` / `#e0e6ee` | Informational |

### Colors — Dusk theme (dark)

Overrides defined in the root HTML's `body.theme-dusk` block. Lift exactly. Same palette structure, warm-dark instead of warm-light.

### Typography

| Class | Family | Size | Weight | Line | Letter |
|---|---|---|---|---|---|
| `t-display` | Instrument Serif | 44 | 400 | 1.02 | -0.02em |
| `t-h1` | Instrument Serif | 32 | 400 | 1.08 | -0.015em |
| `t-h2` | Instrument Serif | 24 | 400 | 1.15 | -0.01em |
| `t-h3` | Inter | 14 | 600 | 1.3 | -0.005em |
| `t-h4` | Inter | 12 | 600 | 1.3 | — |
| `t-body` | Inter | 13 | 400 | 1.55 | — |
| `t-body-sm` | Inter | 12 | 400 | 1.5 | — |
| `t-tiny` | Inter | 10.5 | 500 | 1.35 | 0.04em UPPER |
| `t-mono` | JetBrains Mono | 11.5 | 400 | — | — |
| `t-quote` | Instrument Serif italic | 16 | — | 1.4 | — |
| `t-num-big` | Instrument Serif | 28 | 400 | 1 | -0.01em |

Font features: `'ss01', 'cv11'` on body; `'tnum', 'lnum'` for numerics.

Fonts (Google): **Instrument Serif** (display), **Inter** 400/500/600/700 (UI), **JetBrains Mono** 400/500 (mono).

### Radii

- `--radius: 6px` — buttons, cards, inputs
- `--radius-lg: 10px` — large surfaces, modals, tweaks panel

### Shadows

- `--shadow-1: 0 1px 0 rgba(20,17,13,0.04), 0 1px 2px rgba(20,17,13,0.06)` — subtle elevation
- `--shadow-2: 0 1px 0 rgba(20,17,13,0.04), 0 6px 16px -8px rgba(20,17,13,0.18)` — floating panels

### Spacing

The gap utility scale: `gap-1: 4px`, `gap-2: 8px`, `gap-3: 12px`, `gap-4: 16px`, `gap-5: 20px`, `gap-6: 24px`. Padding on cards typically `14–18px`; page padding `24–32px`.

### Density modes

`body.density-compact` → 12.5px base · `density-default` → 13px · `density-roomy` → 13.5px. Implement as a body-class toggle that scales the base font size.

## Components

Defined in `pro-ui.jsx`. Recreate as typed components in your framework:

- **`Icon`** — line-art SVG set, 16×16 viewBox, 1.6 stroke. Full list: `home, inbox, gavel, users, archive, gear, plus, search, doc, chart, shield, coin, globe, lock, check, x, warn, arrow-r, arrow-dr, arrow-u, arrow-d, dot-3, clock, paperclip, send, sparkle, play, pause, stop, refresh, down, eye, hand, thumb, down-thumb, flag, pencil, pin, star, expand, spinner`. SVG paths are inline in `pro-ui.jsx`.
- **`Avatar`** — circular initials, sizes `sm | md | lg | xl`, optional `rim` color (`amber | green | red | accent`).
- **`AvatarStack`** — overlapping avatars with -8px margin.
- **`Btn`** — kinds: `default | primary | accent | ghost | danger`; sizes: `sm | md | lg`; optional left/right icon.
- **`Pill`** — small status chip; tones: `green | amber | red | blue | accent | ink`; `square` variant.
- **`AgentTile`** — agent card with avatar, name, role, progress bar, state pill. States: `queued | thinking | drafting | submitted | revising | passed | dissent`. Active states pulse / shimmer.
- **`PageHeader`** — page top: eyebrow (uppercase tiny) + serif H1 + sub + right actions, hairline divider below.
- **`Sidebar`** — fixed left nav with sections, active state, count chips.

## Static Data (replace with API)

Sample data is in `pro-ui.jsx`:

- `COMMITTEES` — keyed by `risk | onboard | change`. Each has name, short name, accent hex, description, deliberation pattern, Q&A mode, chair persona, current topic, sub-line, attached docs (name/size/pages), agent roster.
- `SESSIONS` — sample session history rows for the dashboard table.
- `KPIS` — 4 dashboard KPIs.

In production, replace with API responses. Recommended types live in `Types (suggested).md` (see Notes).

## Interactions & Behavior

- **Navigation:** sidebar item click → switch stage screen. Auth screens render full-bleed without the app shell.
- **Phase progression (Boardroom):** agents move through states over time. Early/Mid/Late are phase snapshots; real implementation should drive these from session events (websocket / SSE).
- **Live indicators:** `live-dot` pulses (1.6s ease-out). `shimmer` overlays 1.6s linear. `bar-striped` is a striped progress bar with `barStripe` keyframe (1.2s linear).
- **Theme:** `body.theme-paper` (default) / `body.theme-dusk` (dark). Toggle via body class.
- **Density:** body class swap, scales base font.
- **Auth flow:** Login → Verify (MFA) → Dashboard. Register → Verify → Forgot is a side path.

## State Management

Minimum viable state per session:

```ts
type SessionState = {
  id: string;
  committeeKey: 'risk' | 'onboard' | 'change';
  topic: string;
  docs: Doc[];
  pattern: 'round-robin-vote' | 'parallel-vote' | 'parallel-score';
  phase: 'queued' | 'early' | 'mid' | 'late' | 'cos-gate' | 'qa' | 'briefed';
  agents: AgentState[];
  qaThreads: QAThread[];
  decision: Decision | null;
  startedAt: ISO; endedAt?: ISO;
};
type AgentState = {
  agentId: string;
  state: 'queued'|'thinking'|'drafting'|'submitted'|'revising'|'passed'|'dissent';
  progress: number; // 0–100
  draftId?: string;
};
```

Live phase updates should stream via websocket or SSE. Static screens read snapshots.

## Assets

- **Fonts:** Google Fonts (Instrument Serif, Inter, JetBrains Mono) — already imported in `pro-styles.css`.
- **Icons:** all inline SVG paths in `pro-ui.jsx` `Icon` component. No icon font / external icon library used.
- **Imagery:** none. Avatars are initials. Document tiles are iconographic.

If your codebase uses a different icon library (Lucide / Phosphor / Heroicons), map the names rather than reusing inline SVGs.

## Files in this bundle

| File | Purpose |
|---|---|
| `Concilium - AI Committee.html` | Root HTML — app shell, Tweaks panel, screen routing |
| `pro-styles.css` | All design tokens + utility classes — **source of truth for visual design** |
| `pro-ui.jsx` | Shared primitives (Icon, Avatar, Btn, Pill, AgentTile, PageHeader) + sample data |
| `pro-screens-a.jsx` | Dashboard + Convene screens |
| `pro-screens-b.jsx` | Boardroom (hero) + Chief of Staff gate |
| `pro-screens-c.jsx` | Q&A Discussion + Brief + Agent profile |
| `pro-screens-auth.jsx` | Login, Register, Verify, Forgot |
| `AI Committee Wireframes.html` | Earlier lo-fi wireframes — use for storyboard reference only |

## Notes for the implementing developer

1. **Don't ship the HTML.** This bundle is reference material. Build native components in the target stack.
2. **The accent color is sacred** — single rust/umber `#8c5a2f` accent across the whole UI. Resist adding more accent hues; semantic colors (green/amber/red/blue) carry the rest.
3. **Serif for moments, sans for system.** Instrument Serif is used for titles, decision banners, numbers in KPIs, and pull-quotes only. Everything else is Inter.
4. **Tabular numerals everywhere numbers stack** — KPI values, table cells, durations, timestamps.
5. **The Boardroom screen is the hero.** Spend the most fidelity budget there. Live state, smooth transitions, no jank.
6. **Density modes are not cosmetic.** Power users will live in Compact; default for new users. Make sure the layout reflows cleanly.
7. **Dusk theme is a real product surface** — not an afterthought. Validate every screen in both themes.
