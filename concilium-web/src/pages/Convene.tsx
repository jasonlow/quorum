import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Btn } from '@/ui/Btn';
import { PageHeader } from '@/ui/PageHeader';
import { sessionsApi } from '@/features/sessions/api';
import { useSessionStore } from '@/features/sessions/store';

const SAMPLE_TOPIC =
  'Review ETH Accumulator Series 3 — proposed structured product for accredited investors. ' +
  '12-month tenor, 70% knock-in barrier, 18% coupon p.a. paid in USDC.';

const SAMPLE_CONTEXT = `# Product Memo — ETH Accumulator Series 3

**Status:** Proposed
**Target audience:** Accredited investors only
**Tenor:** 12 months
**Notional:** USD 10M target, minimum subscription USD 250K

## Structure
- Daily accumulation of ETH/USD at prevailing spot; knock-in barrier at 70% of strike.
- If spot breaches the barrier, accumulation rate doubles for the remainder of the tenor.
- Coupon: 18% p.a., paid monthly in USDC.

## Collateral
- Initial buffer: 15% of notional. Margin call at 7% utilisation.

## Market context
- ETH spot 3,245; vol 60-day 58%, implied 1m ATM 64%.
- Fed: pause through Q2 expected, one cut priced for H2.
- 8 of 47 prior accumulator positions hit knock-in in 24m; 6/8 self-topped within 12h of margin notice.

## Regulatory
- Classified internally as Specified Investment Product (SIP), accredited-only.
`;

export function Convene() {
  const navigate = useNavigate();
  const hydrate = useSessionStore(s => s.hydrateFromView);

  const [topic, setTopic] = useState(SAMPLE_TOPIC);
  const [contextMd, setContextMd] = useState(SAMPLE_CONTEXT);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConvene() {
    setSubmitting(true);
    setError(null);
    try {
      const view = await sessionsApi.convene({ topic, contextMd });
      hydrate(view);
      navigate(`/sessions/${view.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="New session"
        title="Set the agenda"
        sub="Provide the topic + context. The Investment Risk Committee will deliberate in parallel and produce a consolidated brief."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 880 }}>
        <div>
          <label className="t-tiny" style={{ display: 'block', marginBottom: 6 }}>Topic</label>
          <input
            className="input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What should the committee deliberate on?"
          />
        </div>

        <div>
          <label className="t-tiny" style={{ display: 'block', marginBottom: 6 }}>Context (markdown)</label>
          <textarea
            className="input"
            value={contextMd}
            onChange={(e) => setContextMd(e.target.value)}
            rows={16}
            style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.55 }}
          />
          <div className="t-tiny muted" style={{ marginTop: 6 }}>
            ~{contextMd.length} chars · the same context is passed to all five agents.
          </div>
        </div>

        {error && <div className="notice notice-err">{error}</div>}

        <div className="row gap-3">
          <Btn onClick={() => navigate('/')}>Back</Btn>
          <div className="grow" />
          <Btn
            kind="accent"
            size="lg"
            iconRight={ArrowRight}
            onClick={onConvene}
            disabled={submitting || topic.trim().length === 0}
          >
            {submitting ? 'Convening…' : 'Convene committee'}
          </Btn>
        </div>
      </div>
    </>
  );
}
