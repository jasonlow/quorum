# Product Memo — ETH Accumulator Series 3

**Status:** Proposed
**Target audience:** Accredited investors only
**Tenor:** 12 months
**Notional:** USD 10M target, minimum subscription USD 250K

## Structure

- Daily accumulation of ETH against USD at the prevailing spot, with a knock-in barrier at **70% of strike**.
- Strike set at issuance based on T-1 VWAP.
- If spot trades through the knock-in barrier at any point during the tenor, the accumulation rate doubles for the remainder of the period.
- Coupon: **18% p.a.**, paid in stablecoin (USDC) monthly.

## Collateral

- Initial proposed collateral buffer: **15%** of notional, held in USD or USDC.
- Margin call triggered at 7% buffer utilisation.
- No automatic top-up; client receives 24h margin notice before forced liquidation.

## Pricing Reference

- ETH/USD spot at T-1: **USD 3,245** (vol 60-day = 58%, implied 1m ATM = 64%)
- Funding cost assumption: **5.25%** USD curve
- Internal model PnL break-even at spot down **22%**

## Market Context

- Fed: pause through Q2 expected; market pricing one cut in H2.
- ETH spot has retraced **17%** from the 90-day high.
- Stablecoin redemption flows: net outflows for the second consecutive month.
- Comparable accumulators from competitors are pricing 12–16% coupons at similar barriers.

## Operational Notes

- Custody arranged via Fireblocks workspace `atlas-prod-01`.
- Settlement: T+1 on USDC leg, T+0 on stablecoin coupon distribution.
- Existing accumulator book historical drawdown behaviour: of 47 client positions in the prior 24 months, 8 hit knock-in. Of those, 6 self-topped collateral within 12 hours of margin notice.

## Regulatory Posture

- Classified internally as a **specified investment product** (SIP) for accredited investors only.
- No retail distribution.
- Disclosure document drafted; pending Compliance review.

## Open Questions

1. Is a 15% collateral buffer appropriate, or should it be tiered (e.g., 10% base + 5% contingency)?
2. How does the H2 Fed rate uncertainty affect product attractiveness over the 12-month horizon?
3. What is the firm's exposure if multiple clients hit knock-in simultaneously?
