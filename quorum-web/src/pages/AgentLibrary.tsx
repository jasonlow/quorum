import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Pencil, Plus, RefreshCw, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import { Btn } from '@/ui/Btn';
import { Pill } from '@/ui/Pill';
import { Avatar } from '@/ui/Avatar';
import { PageHeader } from '@/ui/PageHeader';
import { agentsApi, type AgentStatus } from '@/features/sessions/api';
import type { Agent } from '@/features/sessions/types';

// DeepSeek naming (May 2026):
//   - chat-tier:      "deepseek-chat" (alias; auto-routes to v4-flash)
//                     or explicit "deepseek-v4-flash"
//   - reasoning-tier: "deepseek-v4-pro" (canonical) / "deepseek-reasoner" (alias)
// The chip below sends the canonical names so per-agent overrides keep
// working when DeepSeek deprecates the legacy aliases.
const CHAT_TIER       = 'deepseek-v4-flash';
const REASONING_TIER  = 'deepseek-v4-pro';
// Considered "this is chat-tier" for the chip-active comparison — covers
// both aliases that DeepSeek's API currently honours.
const CHAT_TIER_NAMES = new Set([CHAT_TIER, 'deepseek-chat']);
const REASONING_TIER_NAMES = new Set([REASONING_TIER, 'deepseek-reasoner']);

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function ideologyTone(ideology?: string | null): 'green' | 'amber' | 'red' | 'blue' | 'accent' {
  if (!ideology) return 'accent';
  if (ideology.includes('risk') || ideology.includes('regulation')) return 'red';
  if (ideology.includes('opportunity'))                              return 'green';
  if (ideology.includes('operational'))                              return 'blue';
  return 'accent';
}

export function AgentLibrary() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busyAgentId, setBusyAgentId] = useState<string | null>(null);
  const [resettingAll, setResettingAll] = useState(false);
  const [tab, setTab] = useState<AgentStatus>('PUBLISHED');

  function load(status: AgentStatus = tab) {
    setErr(null);
    setAgents(null);
    agentsApi.list(status)
      .then(setAgents)
      .catch(e => setErr(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => { load(tab); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [tab]);

  async function setOverride(agent: Agent, model: string | null) {
    setBusyAgentId(agent.id);
    setErr(null);
    try {
      const updated = await agentsApi.setModelOverride(agent.id, model);
      // Patch in place — no need to refetch the whole list
      setAgents(prev =>
        prev ? prev.map(a => (a.id === updated.id ? updated : a)) : prev,
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyAgentId(null);
    }
  }

  async function resetAll() {
    if (!agents) return;
    setResettingAll(true);
    setErr(null);
    try {
      await Promise.all(
        agents
          .filter(a => a.modelOverride)
          .map(a => agentsApi.setModelOverride(a.id, null)),
      );
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setResettingAll(false);
    }
  }

  async function archiveAgent(a: Agent) {
    const ok = window.confirm(
      `Archive agent "${a.name}"?\n\n`
      + `The row stays in the database (so past sessions still resolve `
      + `to this exact persona for audit) but it disappears from the `
      + `library and from new committee composition. You can restore it `
      + `later from the Archived tab.`,
    );
    if (!ok) return;
    setBusyAgentId(a.id);
    setErr(null);
    try {
      await agentsApi.remove(a.id);
      setAgents(prev => (prev ? prev.filter(x => x.id !== a.id) : prev));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyAgentId(null);
    }
  }

  async function restoreAgent(a: Agent) {
    setBusyAgentId(a.id);
    setErr(null);
    try {
      await agentsApi.restore(a.id);
      setAgents(prev => (prev ? prev.filter(x => x.id !== a.id) : prev));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyAgentId(null);
    }
  }

  const anyOverridden = (agents ?? []).some(a => !!a.modelOverride);
  const isArchivedView = tab === 'ARCHIVED';

  return (
    <>
      <PageHeader
        eyebrow="Manage"
        title="Agent library"
        sub={isArchivedView
          ? 'Soft-deleted agents. Restore brings them back to the active library. Historical sessions still reference these rows for audit provenance.'
          : 'Create new committee members, tune existing personas, or route them to a different model. High-stakes agents (Compliance, Risk) benefit from reasoner rigour.'}
        right={
          <div className="row gap-2">
            {!isArchivedView && (
              <>
                <Btn kind="accent" icon={Plus} onClick={() => navigate('/agents/new')}>
                  New agent
                </Btn>
                <Btn icon={RotateCcw} onClick={resetAll} disabled={!anyOverridden || resettingAll}>
                  {resettingAll ? 'Resetting…' : 'Reset all overrides'}
                </Btn>
              </>
            )}
            <Btn icon={RefreshCw} onClick={() => load(tab)}>Refresh</Btn>
            <Btn icon={Home} onClick={() => navigate('/')}>Dashboard</Btn>
          </div>
        }
      />

      <div className="tab-row" style={{ marginBottom: 20 }}>
        <div
          className={`tab-item ${tab === 'PUBLISHED' ? 'is-active' : ''}`}
          onClick={() => setTab('PUBLISHED')}
        >
          Active
        </div>
        <div
          className={`tab-item ${tab === 'ARCHIVED' ? 'is-active' : ''}`}
          onClick={() => setTab('ARCHIVED')}
        >
          Archived
        </div>
      </div>

      {err && <div className="notice notice-err" style={{ marginBottom: 16 }}>{err}</div>}

      {agents === null && (
        <div className="t-body-sm muted" style={{ padding: 24 }}>Loading…</div>
      )}

      {agents !== null && agents.length === 0 && (
        <div className="empty-state">
          {isArchivedView
            ? 'No archived agents.'
            : 'No agents yet — click "New agent" to add one.'}
        </div>
      )}

      {agents !== null && agents.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {agents.map(a => (
            <AgentCard
              key={a.id}
              agent={a}
              busy={busyAgentId === a.id}
              archived={isArchivedView}
              onSetModel={(model) => setOverride(a, model)}
              onEdit={() => navigate(`/agents/${a.id}/edit`)}
              onArchive={() => archiveAgent(a)}
              onRestore={() => restoreAgent(a)}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────

type CardProps = {
  agent: Agent;
  busy: boolean;
  archived: boolean;
  onSetModel: (model: string | null) => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
};

function AgentCard({
  agent, busy, archived, onSetModel, onEdit, onArchive, onRestore,
}: CardProps) {
  const current = agent.modelOverride ?? CHAT_TIER;
  const isOverridden = !!agent.modelOverride;
  const isReasoner = REASONING_TIER_NAMES.has(current);
  const isChat     = CHAT_TIER_NAMES.has(current);

  return (
    <div className="card-elev" style={{ padding: 18 }}>
      <div className="row gap-3" style={{ alignItems: 'flex-start' }}>
        <Avatar initials={initials(agent.name)} size="lg" rim={isReasoner ? 'accent' : undefined} />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row gap-3" style={{ alignItems: 'baseline' }}>
            <div className="t-h2" style={{ margin: 0 }}>{agent.name}</div>
            {agent.ideology && (
              <Pill tone={ideologyTone(agent.ideology)}>{agent.ideology}</Pill>
            )}
            <div className="grow" />
            <div className="t-tiny">Temperature</div>
            <span className="t-mono">{agent.temperature?.toFixed(2) ?? '—'}</span>
          </div>
          {agent.description && (
            <div className="t-body-sm muted" style={{ marginTop: 4 }}>{agent.description}</div>
          )}
        </div>
      </div>

      {(agent.skills?.length || 0) > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="t-tiny" style={{ marginBottom: 6 }}>Skills</div>
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            {agent.skills!.map(s => <Pill key={s}>{s}</Pill>)}
          </div>
        </div>
      )}

      {(agent.biases?.length || 0) > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="t-tiny" style={{ marginBottom: 6 }}>Biases</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {agent.biases!.map(b => (
              <div key={b.bias} className="t-body-sm" style={{
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 56, height: 4, background: 'var(--hairline-2)',
                  borderRadius: 999, overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${Math.round(b.strength * 100)}%`,
                    height: '100%',
                    background: 'var(--accent)',
                  }} />
                </div>
                <span>{b.bias}</span>
                <span className="t-mono muted">×{b.strength.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(agent.boundaries?.length || 0) > 0 && (
        <div style={{ marginTop: 12 }}>
          <div className="t-tiny" style={{ marginBottom: 6 }}>Boundaries</div>
          <div className="row gap-2" style={{ flexWrap: 'wrap' }}>
            {agent.boundaries!.map(b => (
              <Pill key={b} tone="red">🚫 {b}</Pill>
            ))}
          </div>
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '1px solid var(--hairline)', margin: '16px 0' }} />

      <div className="row gap-3" style={{ alignItems: 'center' }}>
        <div className="t-tiny">Current model</div>
        <Pill tone={isReasoner ? 'accent' : 'ink'}>
          <span className="t-mono">{current}</span>
        </Pill>
        {isOverridden && <span className="t-tiny muted">(override)</span>}
        {archived && <Pill tone="red">archived</Pill>}
        <div className="grow" />

        {!archived && (
          <div className="row gap-2">
            <button
              className={`chip ${isChat && !isOverridden ? 'chip-on' : ''}`}
              style={{ cursor: busy ? 'wait' : 'pointer' }}
              disabled={busy || (isChat && !isOverridden)}
              onClick={() => onSetModel(null)}
              title="Use the workspace default chat model"
            >
              Default
            </button>
            <button
              className={`chip ${isOverridden && isChat ? 'chip-on' : ''}`}
              style={{ cursor: busy ? 'wait' : 'pointer' }}
              disabled={busy || (isOverridden && isChat)}
              onClick={() => onSetModel(CHAT_TIER)}
              title={`Pin to ${CHAT_TIER} explicitly`}
            >
              <span className="t-mono">flash</span>
            </button>
            <button
              className={`chip ${isReasoner ? 'chip-on' : ''}`}
              style={{ cursor: busy ? 'wait' : 'pointer' }}
              disabled={busy || isReasoner}
              onClick={() => onSetModel(REASONING_TIER)}
              title={`Route to ${REASONING_TIER} — slower, more rigorous reasoning tier`}
            >
              <span className="t-mono">pro</span>
            </button>
          </div>
        )}
      </div>

      <div className="row gap-2" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
        {archived ? (
          <Btn size="sm" kind="accent" icon={Undo2} onClick={onRestore} disabled={busy}>
            Restore
          </Btn>
        ) : (
          <>
            <Btn size="sm" kind="ghost" icon={Pencil} onClick={onEdit}>Edit</Btn>
            <Btn size="sm" kind="ghost" icon={Trash2} onClick={onArchive} disabled={busy}>
              Archive
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
