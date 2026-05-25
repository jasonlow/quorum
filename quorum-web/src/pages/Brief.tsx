import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Gavel } from 'lucide-react';
import { Btn } from '@/ui/Btn';
import { Pill, type PillTone } from '@/ui/Pill';
import { PageHeader } from '@/ui/PageHeader';
import { sessionsApi } from '@/features/sessions/api';
import type { BriefView, DecideRequest, DecisionType } from '@/features/sessions/types';

const DECISION_OPTIONS: Array<{ value: DecisionType; label: string; description: string }> = [
  { value: 'APPROVE',              label: 'Approve as recommended',
    description: 'Accept the committee\'s recommendation exactly.' },
  { value: 'APPROVE_WITH_CHANGES', label: 'Approve with changes',
    description: 'Adjust parameters (e.g. buffer size, review period) before sealing.' },
  { value: 'REJECT',               label: 'Reject',
    description: 'Send back to the product team; no audit-grade approval recorded.' },
  { value: 'RECONVENE',            label: 'Reconvene',
    description: 'Clone the parameters and run again — e.g. with an additional agent.' },
];

function recommendationTone(rec?: string | null): PillTone {
  switch (rec) {
    case 'APPROVE':                return 'green';
    case 'APPROVE_WITH_CONDITIONS': return 'amber';
    case 'REJECT':                 return 'red';
    case 'ESCALATE':               return 'blue';
    default:                       return 'ink';
  }
}

export function BriefPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [brief, setBrief] = useState<BriefView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [decision, setDecision] = useState<DecisionType>('APPROVE');
  const [notes, setNotes] = useState('');
  const [overridesText, setOverridesText] = useState('{\n  "collateralBufferPct": 12.5,\n  "reviewAfterDays": 90\n}');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    sessionsApi.brief(id)
      .then(setBrief)
      .catch(e => setLoadError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  async function onConfirm() {
    if (!id) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      let overrides: Record<string, unknown> | undefined;
      if (decision === 'APPROVE_WITH_CHANGES' && overridesText.trim()) {
        try { overrides = JSON.parse(overridesText); }
        catch { throw new Error('Overrides must be valid JSON.'); }
      }
      const body: DecideRequest = {
        decision,
        chairLabel: 'chair@local',
        notes: notes.trim() || undefined,
        overrides,
      };
      const resp = await sessionsApi.decide(id, body);
      navigate(`/sessions/${id}/complete`, { state: resp });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <PageHeader
        eyebrow="Brief"
        title="Brief not available"
        sub={loadError + ' — has the orchestrator finished?'}
        right={<Btn onClick={() => navigate(`/sessions/${id}`)}>← Boardroom</Btn>}
      />
    );
  }
  if (!brief) {
    return <PageHeader eyebrow="Brief" title="Loading…" />;
  }

  const body = brief.body || {};

  return (
    <>
      <PageHeader
        eyebrow="Consolidated brief"
        title={body.headline || 'Committee recommendation'}
        sub={`Session ${brief.sessionId.slice(0, 8)}`}
        right={<Btn onClick={() => navigate(`/sessions/${id}`)}>← Boardroom</Btn>}
      />

      <article className="brief">
        <div className="banner">
          <div className="row gap-3" style={{ alignItems: 'baseline' }}>
            <Pill tone={recommendationTone(brief.recommendation)}>
              {brief.recommendation ?? '—'}
            </Pill>
            <span className="t-tiny">confidence</span>
            <span className="strong">{brief.confidence ?? '—'}</span>
          </div>
          {body.headline && (
            <div className="t-quote" style={{ marginTop: 10 }}>{body.headline}</div>
          )}
        </div>

        {body.parse_error ? (
          <div className="notice notice-err">
            Brief response was not parseable JSON. Raw response below.
            <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{body.raw_text}</pre>
          </div>
        ) : (
          <>
            {body.consensus && body.consensus.length > 0 && (
              <>
                <h3>Consensus</h3>
                <ul>
                  {body.consensus.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </>
            )}

            {body.disagreements && body.disagreements.length > 0 && (
              <>
                <h3>Disagreements</h3>
                {body.disagreements.map((d, i) => (
                  <div key={i} className="disagreement">
                    <div className="strong" style={{ marginBottom: 6 }}>{d.topic}</div>
                    {(d.positions || []).map((p, j) => (
                      <div key={j} className="t-body-sm" style={{ marginLeft: 10 }}>
                        <span className="strong">{p.agent}:</span> {p.stance}
                      </div>
                    ))}
                    {d.chairSuggestion && (
                      <div className="t-body-sm" style={{ marginTop: 8, color: 'var(--accent)' }}>
                        → Chair suggestion: {d.chairSuggestion}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {body.agentBreakdown && body.agentBreakdown.length > 0 && (
              <>
                <h3>Agent breakdown</h3>
                <table className="tbl">
                  <thead>
                    <tr><th>Agent</th><th>Verdict</th><th>Summary</th></tr>
                  </thead>
                  <tbody>
                    {body.agentBreakdown.map((a, i) => (
                      <tr key={i}>
                        <td className="strong">{a.agent}</td>
                        <td><Pill tone={recommendationTone(a.verdict)}>{a.verdict ?? '—'}</Pill></td>
                        <td>{a.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </article>

      <section className="decision-panel">
        <div className="t-h2" style={{ marginBottom: 4 }}>
          <Gavel size={18} strokeWidth={1.7} style={{ verticalAlign: '-3px', marginRight: 6, color: 'var(--accent)' }} />
          You decide
        </div>
        <div className="t-body-sm muted">
          The committee proposes — you decide. Confirmation seals an Ed25519-signed audit record.
        </div>

        <div className="options">
          {DECISION_OPTIONS.map(opt => (
            <label key={opt.value} className={decision === opt.value ? 'is-selected' : ''}>
              <input
                type="radio"
                name="decision"
                value={opt.value}
                checked={decision === opt.value}
                onChange={() => setDecision(opt.value)}
              />
              <div>
                <div className="strong">{opt.label}</div>
                <div className="t-body-sm muted">{opt.description}</div>
              </div>
            </label>
          ))}
        </div>

        {decision === 'APPROVE_WITH_CHANGES' && (
          <div style={{ marginTop: 12 }}>
            <label className="t-tiny" style={{ display: 'block', marginBottom: 6 }}>
              Overrides (JSON)
            </label>
            <textarea
              className="input"
              value={overridesText}
              onChange={(e) => setOverridesText(e.target.value)}
              rows={6}
              style={{ fontFamily: 'var(--mono)', fontSize: 12 }}
            />
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <label className="t-tiny" style={{ display: 'block', marginBottom: 6 }}>Notes (optional)</label>
          <textarea
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any context the chair wants on the record…"
          />
        </div>

        {submitError && <div className="notice notice-err" style={{ marginTop: 12 }}>{submitError}</div>}

        <div className="row gap-3" style={{ marginTop: 16 }}>
          <div className="grow" />
          <Btn
            kind="accent"
            size="lg"
            iconRight={ArrowRight}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? 'Sealing…' : 'Confirm decision'}
          </Btn>
        </div>
      </section>
    </>
  );
}
