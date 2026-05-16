import { useEffect, useRef } from 'react';
import { Avatar } from './Avatar';
import type { AgentRunState } from '../features/sessions/types';

type AgentTileProps = {
  name: string;
  ideology?: string | null;
  state: AgentRunState;
  progress: number;
  detail?: string | null;
  modelUsed?: string | null;
  streamingText?: string | null;
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

export function AgentTile({
  name, ideology, state, progress, detail, modelUsed, streamingText,
}: AgentTileProps) {
  const initials = name.split(/\s+/).filter(Boolean).map(p => p[0]).join('');
  const pillCls = ['pill', STATE_PILL[state]].filter(Boolean).join(' ');
  const showPreview = !!streamingText && state !== 'PASSED' && state !== 'PASSED_WITH_NOTE'
    && state !== 'DISSENTING' && state !== 'FAILED';
  const cursorActive = state === 'DRAFTING' || state === 'REVISING';

  // Auto-scroll the preview box to the latest text as it streams in
  const previewRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [streamingText]);

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
        >
          {streamingText}
          {cursorActive && <span className="stream-cursor" aria-hidden>▍</span>}
        </div>
      )}

      {modelUsed && (
        <div className="t-mono" style={{ color: 'var(--ink-4)', fontSize: 10.5 }}>
          {modelUsed}
        </div>
      )}
    </div>
  );
}
