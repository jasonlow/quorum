# Change Request — Whale Alert Notifications

**Ticket:** CR-2026-184
**Requested by:** Yuki Mori, Head of Trading
**Submitted:** 10 June 2026
**Requested ship target:** End of Q3 2026
**Estimated effort (initial T-shirt):** Large

---

## What

A real-time alerting capability on the trading UI that notifies traders when
a designated wallet of interest (held by us or a counterparty) moves more
than a configurable threshold (default: 5% of its 24h-trailing balance, or
USD 1M absolute, whichever is smaller).

Traders configure watchlists per desk. Alerts arrive within 30 seconds of
the on-chain transaction confirming, and surface in three places: a banner
in the trading UI, a row in the alerts panel, and (optionally) a Slack
direct message to the trader.

## Why

Three independent asks have stacked up:

1. **Risk Manager (Asia desk)** — needs visibility on USD-stable
   counterparty flows that telegraph stress before it shows up in pricing.
2. **Head of Trading (Yuki)** — believes whale-flow signal in BTC/ETH
   gives the desk a 30-60 second informational edge during low-liquidity
   sessions.
3. **Compliance Officer** — separately requested an audit trail of "who
   saw what whale movement, when" for any post-trade investigation, since
   the wallets traders watch can become a regulatory inquiry surface.

A bundled solution covers all three asks; doing them independently
duplicates the underlying event-pipeline work.

## What we already have

- A scheduled job (every 5 minutes) that pulls top-200 wallet balances
  from an on-chain provider and writes them to a snapshot table. Used by
  end-of-day reporting only.
- An in-app notification framework (toasts only, no persistence).
- An audit-log table (`audit_records`) already used for trade decisions.

## What we don't have

- A streaming on-chain event consumer (the snapshot job is batch).
- A user-configurable watchlist data model (trader wallets are hard-coded
  to a per-desk allowlist today).
- A delivery channel beyond in-app toasts (no email, no Slack integration
  exists).
- Any persisted "who-saw-what" record for notifications.

## Cross-functional impact (initial scoping)

- **Backend:** event-pipeline rewrite to a streaming consumer; new
  watchlist tables; alert-event recording.
- **Frontend:** alerts panel UI; per-trader watchlist config screen;
  banner/notification surface.
- **Security:** Slack integration involves issuing a bot token; auth and
  scope decisions needed.
- **DevOps:** the new streaming pipeline introduces a Kafka topic or
  equivalent — net-new infra.
- **Regulatory:** "who saw what" record needs to live alongside the audit
  log; possible MAS Notice SFA04-N09 implications around market-conduct
  monitoring.

## Open questions

1. Is 30-second latency tight enough, or do we need sub-10s?
2. Slack integration vs in-app only for v1?
3. How configurable should thresholds be per-wallet vs per-watchlist?
4. Do we capture this work as one initiative or split into three?
