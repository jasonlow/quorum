import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, RefreshCw } from 'lucide-react';
import { Btn } from '@/ui/Btn';
import { PageHeader } from '@/ui/PageHeader';
import { SessionRow } from '@/ui/SessionRow';
import { sessionsApi } from '@/features/sessions/api';
import type { Phase, SessionListItem } from '@/features/sessions/types';

const PHASE_FILTERS: Array<Phase | 'ALL'> = [
  'ALL', 'CONVENED', 'DELIBERATING', 'BRIEFED', 'DECIDED', 'ABORTED',
];

export function AuditLog() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SessionListItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<Phase | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  function load() {
    setErr(null);
    setRows(null);
    sessionsApi.list(200)
      .then(setRows)
      .catch(e => setErr(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter(r => {
      if (phaseFilter !== 'ALL' && r.phase !== phaseFilter) return false;
      if (search.trim() && !r.topic.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, phaseFilter, search]);

  return (
    <>
      <PageHeader
        eyebrow="Read-only history"
        title="Audit log"
        sub="Every sealed decision and every in-flight session, newest first. Click any row to drill in."
        right={
          <div className="row gap-2">
            <Btn icon={RefreshCw} onClick={load}>Refresh</Btn>
            <Btn icon={Home} onClick={() => navigate('/')}>Dashboard</Btn>
          </div>
        }
      />

      <div className="row gap-3" style={{ marginBottom: 16, alignItems: 'baseline' }}>
        <input
          className="input"
          style={{ maxWidth: 360 }}
          placeholder="Search topic…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
          {PHASE_FILTERS.map(p => (
            <button
              key={p}
              className={`chip ${phaseFilter === p ? 'chip-on' : ''}`}
              onClick={() => setPhaseFilter(p)}
              style={{ cursor: 'pointer' }}
            >
              {p === 'ALL' ? 'All phases' : p.toLowerCase()}
            </button>
          ))}
        </div>
        <div className="grow" />
        <div className="t-tiny">
          {rows ? `${filtered.length} / ${rows.length} sessions` : '—'}
        </div>
      </div>

      {err && <div className="notice notice-err">{err}</div>}
      {!err && rows === null && (
        <div className="t-body-sm muted" style={{ padding: 24 }}>Loading…</div>
      )}
      {!err && rows !== null && filtered.length === 0 && (
        <div className="empty-state">
          {rows.length === 0
            ? 'No sessions yet. Convene one from the Dashboard.'
            : 'No sessions match the current filters.'}
        </div>
      )}
      {!err && rows !== null && filtered.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Phase</th>
                <th>Decision</th>
                <th>Chair</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => <SessionRow key={r.sessionId} row={r} />)}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
