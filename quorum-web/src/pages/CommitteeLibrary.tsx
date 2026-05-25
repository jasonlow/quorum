import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Pencil, Plus, RefreshCw, Trash2, Undo2 } from 'lucide-react';
import { Btn } from '@/ui/Btn';
import { Pill } from '@/ui/Pill';
import { Avatar } from '@/ui/Avatar';
import { PageHeader } from '@/ui/PageHeader';
import { committeesApi } from '@/features/sessions/api';
import type { CommitteeStatus, CommitteeView } from '@/features/sessions/types';

function patternTone(p: string): 'green' | 'amber' | 'blue' | 'accent' {
  if (p === 'ROUND_ROBIN') return 'accent';
  if (p === 'VOTE')        return 'blue';
  if (p === 'PARALLEL')    return 'amber';
  return 'green';
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

export function CommitteeLibrary() {
  const navigate = useNavigate();
  const [committees, setCommittees] = useState<CommitteeView[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<CommitteeStatus>('PUBLISHED');

  function load(status: CommitteeStatus = tab) {
    setErr(null);
    setCommittees(null);
    committeesApi.list(status)
      .then(setCommittees)
      .catch(e => setErr(e instanceof Error ? e.message : String(e)));
  }
  useEffect(() => { load(tab); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [tab]);

  async function archive(c: CommitteeView) {
    const ok = window.confirm(
      `Archive committee "${c.name}"?\n\n`
      + `Hidden from the library and from new convene flows. The row stays `
      + `in the DB so historical sessions still resolve to this committee. `
      + `You can restore it later from the Archived tab.`,
    );
    if (!ok) return;
    setBusyId(c.id);
    setErr(null);
    try {
      await committeesApi.remove(c.id);
      setCommittees(prev => (prev ? prev.filter(x => x.id !== c.id) : prev));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function restore(c: CommitteeView) {
    setBusyId(c.id);
    setErr(null);
    try {
      await committeesApi.restore(c.id);
      setCommittees(prev => (prev ? prev.filter(x => x.id !== c.id) : prev));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  const isArchived = tab === 'ARCHIVED';

  return (
    <>
      <PageHeader
        eyebrow="Manage"
        title="Committees"
        sub={isArchived
          ? 'Soft-deleted committees. Restore brings them back to the active library.'
          : 'A committee binds a roster of agents to a deliberation pattern. Convene uses the default Investment Risk Committee unless told otherwise.'}
        right={
          <div className="row gap-2">
            {!isArchived && (
              <Btn kind="accent" icon={Plus} onClick={() => navigate('/committees/new')}>
                New committee
              </Btn>
            )}
            <Btn icon={RefreshCw} onClick={() => load(tab)}>Refresh</Btn>
            <Btn icon={Home} onClick={() => navigate('/')}>Dashboard</Btn>
          </div>
        }
      />

      <div className="tab-row" style={{ marginBottom: 20 }}>
        <div className={`tab-item ${tab === 'PUBLISHED' ? 'is-active' : ''}`} onClick={() => setTab('PUBLISHED')}>
          Active
        </div>
        <div className={`tab-item ${tab === 'ARCHIVED' ? 'is-active' : ''}`} onClick={() => setTab('ARCHIVED')}>
          Archived
        </div>
      </div>

      {err && <div className="notice notice-err" style={{ marginBottom: 16 }}>{err}</div>}

      {committees === null && (
        <div className="t-body-sm muted" style={{ padding: 24 }}>Loading…</div>
      )}

      {committees !== null && committees.length === 0 && (
        <div className="empty-state">
          {isArchived ? 'No archived committees.' : 'No committees yet — click "New committee" to compose one.'}
        </div>
      )}

      {committees !== null && committees.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {committees.map(c => (
            <div key={c.id} className="card-elev" style={{ padding: 18 }}>
              <div className="row gap-3" style={{ alignItems: 'baseline' }}>
                <div className="t-h2" style={{ margin: 0 }}>{c.name}</div>
                <Pill tone={patternTone(c.orchestrationPattern)}>{c.orchestrationPattern.replace(/_/g, ' ').toLowerCase()}</Pill>
                <Pill tone="ink"><span className="t-mono">Q&A: {c.qaIntensity.toLowerCase()}</span></Pill>
                <Pill tone="ink"><span className="t-mono">{c.decisionRule.toLowerCase()}</span></Pill>
                {c.maxRevisionRounds > 0 && <Pill>max {c.maxRevisionRounds} revision{c.maxRevisionRounds === 1 ? '' : 's'}</Pill>}
                <div className="grow" />
                <span className="t-tiny">{c.members.length} member{c.members.length === 1 ? '' : 's'}</span>
                {isArchived && <Pill tone="red">archived</Pill>}
              </div>
              {c.description && (
                <div className="t-body-sm muted" style={{ marginTop: 6 }}>{c.description}</div>
              )}

              <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {c.members.map(m => (
                  <div key={m.agentId} className="row gap-2" style={{
                    padding: '6px 10px', background: 'var(--bg-2)',
                    border: '1px solid var(--hairline)', borderRadius: 'var(--radius)',
                  }}>
                    <span className="t-mono muted" style={{ width: 18, textAlign: 'right' }}>
                      {m.speakingOrder}.
                    </span>
                    <Avatar initials={initials(m.agentName)} size="sm" />
                    <span className="t-body-sm">{m.agentName}</span>
                    {m.weight !== 1 && <span className="t-tiny muted">×{m.weight.toFixed(2)}</span>}
                  </div>
                ))}
              </div>

              <div className="row gap-2" style={{ marginTop: 14, justifyContent: 'flex-end' }}>
                {isArchived ? (
                  <Btn size="sm" kind="accent" icon={Undo2} onClick={() => restore(c)} disabled={busyId === c.id}>
                    Restore
                  </Btn>
                ) : (
                  <>
                    <Btn size="sm" kind="ghost" icon={Pencil} onClick={() => navigate(`/committees/${c.id}/edit`)}>
                      Edit
                    </Btn>
                    <Btn size="sm" kind="ghost" icon={Trash2} onClick={() => archive(c)} disabled={busyId === c.id}>
                      Archive
                    </Btn>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
