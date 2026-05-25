import { Link } from 'react-router-dom';
import { Pill, type PillTone } from './Pill';
import { formatPhase } from '@/lib/format';
import type { Phase, SessionListItem } from '@/features/sessions/types';

type Props = { row: SessionListItem };

function phaseTone(phase: Phase): PillTone {
  if (phase === 'DECIDED')      return 'green';
  if (phase === 'BRIEFED')      return 'amber';
  if (phase === 'ABORTED')      return 'red';
  if (phase === 'DELIBERATING') return 'blue';
  return 'ink';
}

function decisionTone(d: string | null): PillTone {
  switch (d) {
    case 'APPROVE':              return 'green';
    case 'APPROVE_WITH_CHANGES': return 'amber';
    case 'REJECT':               return 'red';
    case 'RECONVENE':            return 'blue';
    default:                     return 'ink';
  }
}

export function SessionRow({ row }: Props) {
  const target = row.phase === 'DECIDED' || row.phase === 'BRIEFED'
    ? `/sessions/${row.sessionId}/brief`
    : `/sessions/${row.sessionId}`;
  const ts = new Date(row.startedAt);
  const dateStr = ts.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
    + ' · ' + ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <tr>
      <td>
        <Link to={target} style={{ color: 'var(--ink)', textDecoration: 'none' }}>
          <div className="strong" style={{
            overflow: 'hidden', textOverflow: 'ellipsis',
            whiteSpace: 'nowrap', maxWidth: 480,
          }}>
            {row.topic}
          </div>
          <div className="t-mono" style={{ color: 'var(--ink-4)', fontSize: 10.5 }}>
            {row.sessionId.slice(0, 8)}
          </div>
        </Link>
      </td>
      <td><Pill tone={phaseTone(row.phase)}>{formatPhase(row.phase)}</Pill></td>
      <td>
        {row.decisionType
          ? <Pill tone={decisionTone(row.decisionType)}>{row.decisionType.replace(/_/g, ' ')}</Pill>
          : <span className="dim">—</span>}
      </td>
      <td className="t-mono muted" style={{ fontSize: 11 }}>{row.chairLabel ?? '—'}</td>
      <td className="t-mono muted" style={{ fontSize: 11 }}>{dateStr}</td>
    </tr>
  );
}
