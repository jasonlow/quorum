import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Avatar } from './Avatar';
import { Btn } from './Btn';
import type { AgentRunState } from '../features/sessions/types';
import type { CosRubricScores } from '../features/sessions/store';
import { sessionsApi, type AgentDetailsView } from '../features/sessions/api';

type AgentTileProps = {
  sessionId?: string;        // needed for expansion fetch
  agentId?: string;          // needed for expansion fetch
  name: string;
  ideology?: string | null;
  state: AgentRunState;
  progress: number;
  detail?: string | null;
  modelUsed?: string | null;
  streamingText?: string | null;
  cosVerdict?: string | null;
  cosChallenge?: string | null;
  cosScores?: CosRubricScores;
  failedReason?: string | null;
};

const STATE_LABEL: Record<AgentRunState, string> = {
  QUEUED:           'Queued',
  THINKING:         'Thinking',
  DRAFTING:         'Drafting',
  SUBMITTED:        'Submitted',
  REVISING:         'Revising',
  PASSED:           'Passed QA',
  PASSED_WITH_NOTE: 'Passed (note)',
  DISSENTING:       'Dissenting',
  FAILED:           'Failed',
  RECUSED:          'Recused',
};

const STATE_PILL: Record<AgentRunState, string> = {
  QUEUED:           '',
  THINKING:         '',
  DRAFTING:         '',
  SUBMITTED:        'pill-amber',
  REVISING:         'pill-amber',
  PASSED:           'pill-green',
  PASSED_WITH_NOTE: 'pill-amber',
  DISSENTING:       'pill-red',
  FAILED:           'pill-red',
  RECUSED:          '',
};

const TERMINAL_STATES: AgentRunState[] = [
  'PASSED', 'PASSED_WITH_NOTE', 'DISSENTING', 'FAILED',
];

function pulsing(state: AgentRunState) {
  return state === 'THINKING' || state === 'DRAFTING' || state === 'REVISING';
}

function barClass(state: AgentRunState) {
  if (state === 'REVISING') return 'bar bar-striped bar-amber';
  if (state === 'PASSED' || state === 'PASSED_WITH_NOTE') return 'bar bar-green';
  if (state === 'FAILED' || state === 'DISSENTING') return 'bar';
  return 'bar';
}

function rim(state: AgentRunState) {
  if (state === 'PASSED') return 'green';
  if (state === 'PASSED_WITH_NOTE' || state === 'REVISING' || state === 'SUBMITTED') return 'amber';
  if (state === 'DISSENTING' || state === 'FAILED') return 'red';
  return undefined;
}

function scoreColor(score?: number): string {
  if (score == null) return 'var(--ink-4)';
  if (score >= 4) return 'var(--green)';
  if (score >= 3) return 'var(--amber)';
  return 'var(--red)';
}

export function AgentTile({
  sessionId, agentId,
  name, ideology, state, progress, detail, modelUsed, streamingText,
  cosVerdict, cosChallenge, cosScores, failedReason,
}: AgentTileProps) {
  const initials = name.split(/\s+/).filter(Boolean).map(p => p[0]).join('');
  const pillCls = ['pill', STATE_PILL[state]].filter(Boolean).join(' ');
  const cursorActive = state === 'DRAFTING' || state === 'REVISING';
  const isTerminal = TERMINAL_STATES.includes(state);
  const expandable = isTerminal && sessionId && agentId;

  // Show the streamed draft preview live while the agent is working, and
  // keep it visible after the agent reaches a terminal state so the chair
  // can read the final draft right in the tile (previously hidden).
  const showPreview = !!streamingText;

  // Auto-scroll the preview box to the latest text as it streams in
  const previewRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (previewRef.current && cursorActive) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [streamingText, cursorActive]);

  // Expansion state
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState<AgentDetailsView | null>(null);
  const [detailsErr, setDetailsErr] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState<string | null>(null);
  const [promptErr, setPromptErr] = useState<string | null>(null);

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !details && sessionId && agentId) {
      try {
        const d = await sessionsApi.agentDetails(sessionId, agentId);
        setDetails(d);
      } catch (e) {
        setDetailsErr(e instanceof Error ? e.message : String(e));
      }
    }
  }

  async function openPrompt() {
    if (!sessionId || !agentId) return;
    setPromptOpen(true);
    if (!promptText) {
      try {
        const text = await sessionsApi.agentPrompt(sessionId, agentId);
        setPromptText(text);
      } catch (e) {
        setPromptErr(e instanceof Error ? e.message : String(e));
      }
    }
  }

  return (
    <div className="card-elev" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      <div className="row gap-3" style={{ minWidth: 0 }}>
        <Avatar initials={initials} rim={rim(state)} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="t-h3" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div className="t-tiny" style={{ marginTop: 1 }}>{ideology || '—'}</div>
        </div>
      </div>

      <div className={barClass(state)}>
        <i style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
      </div>

      <div className="row gap-2" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={pillCls}>
          {pulsing(state) && (
            <span
              className="live-dot"
              style={{ background: state === 'REVISING' ? 'var(--amber)' : 'var(--accent)' }}
            />
          )}
          {STATE_LABEL[state]}
        </span>
        {detail && (
          <span className="t-tiny" style={{ textTransform: 'none', letterSpacing: 0 }}>
            {detail}
          </span>
        )}
      </div>

      {showPreview && (
        <div
          ref={previewRef}
          className="agent-stream"
          aria-live="polite"
          style={isTerminal ? { maxHeight: 200 } : undefined}
        >
          {streamingText}
          {cursorActive && <span className="stream-cursor" aria-hidden>▍</span>}
        </div>
      )}

      {cosScores && (
        <RubricBar scores={cosScores} verdict={cosVerdict} />
      )}

      {cosChallenge && (
        <div className="t-tiny" style={{
          padding: 8,
          borderLeft: '2px solid var(--amber)',
          background: 'var(--amber-bg)',
          color: 'var(--ink)',
          borderRadius: 4,
          whiteSpace: 'pre-wrap',
        }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>CoS challenge</strong>
          {cosChallenge}
        </div>
      )}

      {failedReason && (
        <div className="t-tiny" style={{
          padding: 8,
          borderLeft: '2px solid var(--red)',
          background: 'var(--red-bg)',
          color: 'var(--ink)',
          borderRadius: 4,
          whiteSpace: 'pre-wrap',
        }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>Failed</strong>
          {failedReason}
        </div>
      )}

      {modelUsed && (
        <div className="t-mono" style={{ color: 'var(--ink-4)', fontSize: 10.5 }}>
          {modelUsed}
        </div>
      )}

      {expandable && (
        <div className="row gap-2" style={{ marginTop: 4, justifyContent: 'flex-end' }}>
          <Btn size="sm" kind="ghost" type="button" onClick={openPrompt}
               icon={FileText} aria-label="Show assembled prompt">
            Show prompt
          </Btn>
          <Btn size="sm" kind="ghost" type="button" onClick={toggleExpand}
               icon={expanded ? ChevronUp : ChevronDown}>
            {expanded ? 'Less' : 'Round history'}
          </Btn>
        </div>
      )}

      {expandable && expanded && (
        <RoundHistory details={details} error={detailsErr} />
      )}

      {promptOpen && (
        <PromptModal
          text={promptText}
          error={promptErr}
          onClose={() => setPromptOpen(false)}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────

function RubricBar({ scores, verdict }: { scores: CosRubricScores; verdict?: string | null }) {
  const axes: Array<[string, keyof CosRubricScores]> = [
    ['Spec',  'specificity'],
    ['Comp',  'completeness'],
    ['Evid',  'evidence'],
    ['Bound', 'boundaries'],
    ['Ideo',  'ideology'],
  ];
  return (
    <div style={{
      padding: 8,
      background: 'var(--surface-2)',
      border: '1px solid var(--hairline)',
      borderRadius: 4,
    }}>
      <div className="t-tiny muted" style={{ marginBottom: 6 }}>
        CoS rubric {verdict && `· ${verdict.replace(/_/g, ' ').toLowerCase()}`}
      </div>
      <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
        {axes.map(([label, key]) => {
          const v = scores[key];
          return (
            <div key={key} style={{
              flex: '1 1 auto',
              minWidth: 50,
              textAlign: 'center',
              padding: '4px 6px',
              background: 'var(--surface)',
              border: '1px solid var(--hairline)',
              borderRadius: 4,
            }}>
              <div className="t-tiny muted" style={{ fontSize: 9.5 }}>{label}</div>
              <div className="t-mono" style={{
                fontSize: 14, fontWeight: 600, color: scoreColor(v),
              }}>
                {v ?? '—'}{v != null && '/5'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoundHistory({ details, error }: { details: AgentDetailsView | null; error: string | null }) {
  if (error) {
    return <div className="notice notice-err" style={{ marginTop: 8 }}>{error}</div>;
  }
  if (!details) {
    return <div className="t-tiny muted" style={{ marginTop: 8 }}>Loading…</div>;
  }
  if (details.rounds.length === 0) {
    return <div className="t-tiny muted" style={{ marginTop: 8 }}>No round history recorded.</div>;
  }
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {details.rounds.map(r => (
        <div key={r.roundNo} className="card" style={{ padding: 12 }}>
          <div className="row gap-2" style={{ alignItems: 'baseline', marginBottom: 6 }}>
            <div className="t-h3" style={{ fontSize: 13 }}>Round {r.roundNo}</div>
            {r.review && (
              <span className={`pill ${r.review.verdict === 'PASSED' ? 'pill-green' : 'pill-amber'}`}>
                {r.review.verdict.replace(/_/g, ' ').toLowerCase()}
              </span>
            )}
            {r.draft?.latencyMs != null && (
              <span className="t-tiny muted" style={{ marginLeft: 'auto' }}>
                {(r.draft.latencyMs / 1000).toFixed(1)}s
                {r.draft.completionTokens != null && ` · ${r.draft.completionTokens} tok`}
                {r.draft.modelUsed && ` · ${r.draft.modelUsed}`}
              </span>
            )}
          </div>
          {r.draft?.text && (
            <details>
              <summary className="t-tiny muted" style={{ cursor: 'pointer', marginBottom: 4 }}>
                Draft ({r.draft.text.length.toLocaleString()} chars)
              </summary>
              <div style={{
                maxHeight: 240, overflow: 'auto',
                padding: 8, background: 'var(--surface-2)',
                border: '1px solid var(--hairline)', borderRadius: 4,
                fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap',
              }}>
                {r.draft.text}
              </div>
            </details>
          )}
          {r.review && (
            <div style={{ marginTop: 8 }}>
              <RubricBar
                scores={r.review.scores}
                verdict={r.review.verdict}
              />
              {r.review.challenge && (
                <div className="t-tiny" style={{
                  marginTop: 6, padding: 8,
                  borderLeft: '2px solid var(--amber)',
                  background: 'var(--amber-bg)',
                  color: 'var(--ink)',
                  borderRadius: 4, whiteSpace: 'pre-wrap',
                }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>CoS challenge</strong>
                  {r.review.challenge}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PromptModal({ text, error, onClose }: {
  text: string | null; error: string | null; onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-elev"
        style={{
          padding: 16,
          maxWidth: 900, width: '100%',
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <div className="row gap-3" style={{ alignItems: 'baseline', marginBottom: 12 }}>
          <div className="t-h2" style={{ margin: 0 }}>Assembled prompt</div>
          <div className="grow" />
          <Btn size="sm" kind="ghost" onClick={onClose}>Close</Btn>
        </div>
        {error && <div className="notice notice-err" style={{ marginBottom: 12 }}>{error}</div>}
        {text == null && !error && (
          <div className="t-body-sm muted">Loading prompt…</div>
        )}
        {text != null && (
          <pre style={{
            margin: 0, flex: 1, overflow: 'auto',
            padding: 12, background: 'var(--surface-2)',
            border: '1px solid var(--hairline)', borderRadius: 4,
            fontFamily: 'var(--mono)', fontSize: 11.5, lineHeight: 1.55,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>{text}</pre>
        )}
      </div>
    </div>
  );
}
