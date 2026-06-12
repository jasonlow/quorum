# Story — Real-time order book on the trading UI

**Sprint:** Sprint 47 (starting 16 June 2026)
**Original requester:** Yuki Mori, Head of Trading
**Backlog rank:** #3
**Estimate (last grooming):** Unestimated — requesting team refinement

---

## User story (draft)

> As a trader monitoring the BTC/ETH spot book, I want the bid/ask ladder
> to update in real time without a page refresh, so that I can react to
> liquidity changes within seconds rather than minutes.

## Acceptance criteria (draft — sharpen during refinement)

1. The visible order book reflects the current state of the broker's
   book within 1 second of the broker publishing the update.
2. The view shows at minimum the top 10 bid levels and top 10 ask levels,
   with size and aggregate notional per level.
3. When the price changes, the affected row pulses briefly (subtle
   visual feedback) without shifting layout.
4. The "last update" timestamp is visible and ticks live.
5. If the live feed disconnects, the view shows a "stale data — last
   updated Xs ago" banner within 5 seconds of disconnection.
6. The feed pauses automatically when the tab is inactive and resumes
   on focus, to spare backend load.

## Current state

- The order book today is rendered from a REST endpoint
  (`/api/v1/trading/book/{symbol}`) polled every 15 seconds.
- The backend already has an SSE channel pattern in use elsewhere
  (`SseChannelManager`) — same shape could carry book updates.
- Book updates from the broker arrive on an authenticated WebSocket
  feed at ~5 messages/second/symbol in busy markets.

## Known constraints

- The backend cannot consume the broker WebSocket from a Cloud Run
  container instance reliably (idle connections close after 15 min).
  Persistence-layer decision needed: hold the WS connection in a
  dedicated worker, then fan out via SSE? Use a managed pub/sub?
- Frontend's design system has no "ladder" component yet — would be
  net-new in the design library.
- The trading UI already uses Zustand for active-trade state; book
  state could colocate or be its own store.

## Dependencies

- Story CR-2026-201 (broker WS auth refresh handling) — in progress this
  sprint, blocks this work from going live.
- ADR-0034 (real-time data architecture) — drafted last sprint, not
  yet ratified. This story would be a forcing function.

## Risks (initial)

- WebSocket reliability at the connection layer (handled by the broker
  team but our consumer needs reconnect/backoff logic).
- 5 msgs/sec/symbol × N symbols watched per trader = potentially
  noisy frontend updates. Render budget matters.
- Test fidelity: how do we simulate a realistic book update stream in CI?

## Question for the committee

Is this *one* sprint? Should it be split (backend feed, then frontend
component, then polish), and if so where do we draw the slices?
