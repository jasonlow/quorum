# Example agendas

Paste-ready agenda content for every seeded committee. Each example is one
realistic, paste-able artifact — a product memo, a client file, a change
request, a sprint-planning story — so you can exercise the agenda-setting
flow end-to-end without inventing inputs.

Each file in this directory is dual-purpose:

1. **Read the file as docs** to see what good context looks like for that
   committee.
2. **Upload the file in Convene Stage 2** as a supporting document — the
   agents will reference it, and its SHA-256 ends up in the audit chain.

## How to use one

1. Open the app and click **Convene**.
2. Stage 1: pick the committee, then either —
   - Click **Describe the topic** (Sparkles icon) and paste the
     "NL one-liner" below for that committee, or
   - Paste the "Topic" and "Context" fields by hand for full control.
3. Stage 2: upload the corresponding `.md` file from this directory as a
   supporting document, then **Start deliberation**.

## The examples

### 1. Investment Risk Committee

- **Example:** [`investment-risk--eth-accumulator-s3.md`](investment-risk--eth-accumulator-s3.md)
- **What it is:** Product memo for a 12-month ETH accumulator structured
  note targeting accredited investors.
- **NL one-liner for the Agenda Generator:**
  > Review the ETH Accumulator Series 3 product memo — accredited-only,
  > 12-month tenor, 70% knock-in, 18% coupon — for risk, compliance, and
  > operational readiness before launch.
- **Pre-baked Topic:** *"ETH Accumulator Series 3 — risk and launch review"*
- **What you'll see:** Risk Manager quantifies worst-case; Compliance
  cites MAS Notice SFA04-N12 §4.3; Treasury flags settlement friction;
  Strategist defends the alpha case; Macro Economist overlays a Fed-pause
  regime view.

### 2. Client Onboarding Committee

- **Example:** [`client-onboarding--cloudpine-capital.md`](client-onboarding--cloudpine-capital.md)
- **What it is:** Application file for a Singapore-licensed crypto fund
  manager seeking institutional custody + execution. Includes a borderline
  PEP-adjacent declaration and a BVI-trust ownership layer.
- **NL one-liner for the Agenda Generator:**
  > Review the CloudPine Capital onboarding application: a Singapore
  > CMS-licensed crypto fund manager, USD 5M initial deposit, BVI-trust
  > ownership layer, one ambiguous PEP hit on a beneficial owner's father.
- **Pre-baked Topic:** *"CloudPine Capital Pte Ltd — institutional onboarding decision"*
- **What you'll see:** KYC/AML Officer walks PEP/sanctions/source-of-funds;
  Risk Officer tiers the client; Legal Counsel examines the BVI trust
  structure; RM presents the commercial case.

### 3. Change Triage Committee

- **Example:** [`change-triage--whale-alert.md`](change-triage--whale-alert.md)
- **What it is:** A multi-stakeholder change request for real-time
  wallet-balance alerts on the trading UI. Touches backend pipelines,
  frontend surfaces, security, infra, and audit.
- **NL one-liner for the Agenda Generator:**
  > Triage the Whale Alert change request: real-time wallet notifications
  > requested by trading, risk, and compliance. Backend, frontend,
  > security, devops, regulatory all in scope. Q3 ship target.
- **Pre-baked Topic:** *"CR-2026-184 — Whale Alert notifications · priority triage"*
- **What you'll see:** CTO scores strategic and architectural fit; Security
  Officer threat-models the surface; Product weighs revenue/UX impact;
  DevOps prices the infra; Regulatory Affairs assesses Notice SFA04-N09
  implications.

### 4. SCRUM Software Changes Committee

- **Example:** [`scrum-changes--realtime-orderbook.md`](scrum-changes--realtime-orderbook.md)
- **What it is:** A sprint-planning story for adding real-time order book
  updates to the trading UI. Includes draft acceptance criteria and a
  question to the team about scope splitting.
- **NL one-liner for the Agenda Generator:**
  > Refine the "real-time order book" story for Sprint 47: SSE-driven
  > updates on the trading UI, broker WebSocket on the backend, design
  > system needs a ladder component. Question: one sprint or split?
- **Pre-baked Topic:** *"Sprint 47 refinement — real-time order book story"*
- **What you'll see:** Product Owner sharpens the user story; Scrum Master
  walks readiness vs the Definition of Done; Tech Lead names the
  architectural seams; Backend and Frontend Engineers cost the
  implementation; QA enumerates regression scenarios.

## Maintaining these examples

If you change a committee's roster, persona, or `knowledge_text`, refresh
the corresponding example here so the inputs still exercise the new shape:

| If you change… | Refresh… |
|---|---|
| A persona's system prompt or boundaries | The `What you'll see` line above for that committee |
| The committee's roster (add/remove agents) | The NL one-liner so it cues the new agents |
| The committee's `knowledge_text` (e.g. Scrum DoD) | This README's `What you'll see` plus the example file if it now contradicts the doctrine |
| Add a new committee | Add a new example here + update the seed in `quorum-api/src/main/java/io/quorum/committee/seed/` |

The example files are deliberately self-contained markdown — no code
references, no template variables — so they survive any backend or
frontend refactor.
