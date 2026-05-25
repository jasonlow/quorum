import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { Btn } from '@/ui/Btn';
import { Avatar } from '@/ui/Avatar';
import { PageHeader } from '@/ui/PageHeader';
import { agentsApi, committeesApi, type CommitteeRequest } from '@/features/sessions/api';
import type {
  Agent, CommitteeView, OrchestrationPattern, QaIntensity,
} from '@/features/sessions/types';

const EMPTY: CommitteeRequest = {
  name: '',
  description: '',
  orchestrationPattern: 'ROUND_ROBIN',
  qaIntensity: 'NONE',
  decisionRule: 'CHAIR_DECIDES',
  maxRevisionRounds: 1,
  knowledgeText: null,
  members: [],
};

function fromView(c: CommitteeView): CommitteeRequest {
  return {
    name: c.name,
    description: c.description ?? '',
    orchestrationPattern: c.orchestrationPattern,
    qaIntensity: c.qaIntensity,
    decisionRule: c.decisionRule,
    maxRevisionRounds: c.maxRevisionRounds,
    knowledgeText: c.knowledgeText ?? null,
    members: c.members.map(m => ({ agentId: m.agentId, weight: m.weight })),
  };
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

const PATTERNS: OrchestrationPattern[] = ['ROUND_ROBIN', 'VOTE', 'PARALLEL'];
const QA: QaIntensity[]                = ['NONE', 'SINGLE', 'DEEP'];
const DECISION_RULES = ['CHAIR_DECIDES', 'MAJORITY', 'CONSENSUS'];

export function CommitteeEditor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [form, setForm] = useState<CommitteeRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    agentsApi.list('PUBLISHED')
      .then(setAgents)
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    if (!isEdit) {
      setForm(EMPTY);
      return;
    }
    committeesApi.get(id!)
      .then(c => setForm(fromView(c)))
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, [id, isEdit]);

  const agentsById = useMemo(() => {
    const m = new Map<string, Agent>();
    (agents ?? []).forEach(a => m.set(a.id, a));
    return m;
  }, [agents]);

  if (form === null || agents === null) {
    return (
      <PageHeader
        eyebrow="Committee"
        title={error ?? 'Loading…'}
        right={<Btn onClick={() => navigate('/committees')}>← Library</Btn>}
      />
    );
  }

  function patch<K extends keyof CommitteeRequest>(k: K, v: CommitteeRequest[K]) {
    setForm(prev => (prev ? { ...prev, [k]: v } : prev));
  }
  function addMember(agentId: string) {
    if (!form) return;
    if (form.members.some(m => m.agentId === agentId)) return;
    patch('members', [...form.members, { agentId, weight: 1.0 }]);
  }
  function removeMember(i: number) {
    if (!form) return;
    patch('members', form.members.filter((_, idx) => idx !== i));
  }
  function moveMember(i: number, dir: -1 | 1) {
    if (!form) return;
    const next = form.members.slice();
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    patch('members', next);
  }
  function setWeight(i: number, w: number) {
    if (!form) return;
    patch('members', form.members.map((m, idx) => (idx === i ? { ...m, weight: w } : m)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (form.members.length === 0) {
      setError('Add at least one agent to the committee.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit) {
        await committeesApi.update(id!, form);
      } else {
        await committeesApi.create(form);
      }
      navigate('/committees');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
  }

  const availableAgents = (agents ?? []).filter(
    a => !form.members.some(m => m.agentId === a.id),
  );

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? 'Edit' : 'New'}
        title={isEdit ? 'Edit committee' : 'Compose committee'}
        sub="Pick the deliberation pattern, the QA intensity, and the agent roster. Speaking order matters for Round Robin; weight matters for Parallel-Score."
        right={<Btn onClick={() => navigate('/committees')}>← Library</Btn>}
      />

      {error && <div className="notice notice-err" style={{ marginBottom: 16 }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 980 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <Field label="Name" required>
            <input
              className="input" required maxLength={200}
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
              placeholder="e.g. Cross-Border Onboarding Review"
            />
          </Field>
          <Field label="Decision rule">
            <select
              className="input"
              value={form.decisionRule}
              onChange={(e) => patch('decisionRule', e.target.value)}
            >
              {DECISION_RULES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <input
            className="input" maxLength={2000}
            value={form.description ?? ''}
            onChange={(e) => patch('description', e.target.value)}
            placeholder="What this committee deliberates on"
          />
        </Field>

        <div>
          <label className="t-tiny" style={{ display: 'block', marginBottom: 6 }}>
            Committee doctrine
          </label>
          <textarea
            className="input" rows={10} maxLength={40000}
            value={form.knowledgeText ?? ''}
            onChange={(e) => patch('knowledgeText', e.target.value)}
            placeholder={`# Firm risk appetite\n- Max unsecured exposure to any single counterparty: 5% of NAV\n- Concentration cap on top-3 custodians: 60% combined\n\n# Decision precedents\n...`}
            style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.55 }}
          />
          <div className="t-tiny" style={{
            marginTop: 4,
            color: (form.knowledgeText?.length ?? 0) > 30000 ? 'var(--amber)' : 'var(--ink-3)',
          }}>
            ~{form.knowledgeText?.length ?? 0} chars
            {(form.knowledgeText?.length ?? 0) > 30000 && ' · approaching 40 KB cap'}
            {' · '}
            Standing rules of the road every member of this committee operates under.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <Field label="Orchestration pattern">
            <select
              className="input"
              value={form.orchestrationPattern}
              onChange={(e) => patch('orchestrationPattern', e.target.value as OrchestrationPattern)}
            >
              {PATTERNS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ').toLowerCase()}</option>)}
            </select>
          </Field>
          <Field label="Q&A intensity">
            <select
              className="input"
              value={form.qaIntensity}
              onChange={(e) => patch('qaIntensity', e.target.value as QaIntensity)}
            >
              {QA.map(q => <option key={q} value={q}>{q.toLowerCase()}</option>)}
            </select>
          </Field>
          <Field label={`Max revision rounds: ${form.maxRevisionRounds ?? 0}`}>
            <input
              type="range" min={0} max={3} step={1}
              value={form.maxRevisionRounds ?? 0}
              onChange={(e) => patch('maxRevisionRounds', parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* ─── Member roster (selected, ordered) ───────────────── */}
          <div>
            <div className="t-tiny" style={{ marginBottom: 6 }}>
              Roster <span className="muted">({form.members.length} {form.members.length === 1 ? 'member' : 'members'})</span>
            </div>
            {form.members.length === 0 && (
              <div className="empty-state" style={{ padding: 16 }}>
                No agents yet. Pick from the library on the right.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.members.map((m, i) => {
                const agent = agentsById.get(m.agentId);
                return (
                  <div key={m.agentId} className="card" style={{
                    padding: 10, display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span className="t-mono muted" style={{ width: 22, textAlign: 'right' }}>
                      {i + 1}.
                    </span>
                    <Avatar initials={initials(agent?.name ?? '?')} size="sm" />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="t-body" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {agent?.name ?? '(unknown)'}
                      </div>
                      <div className="t-tiny muted">{agent?.ideology ?? '—'}</div>
                    </div>
                    <input
                      type="range" min={0} max={2} step={0.1}
                      value={m.weight ?? 1}
                      onChange={(e) => setWeight(i, parseFloat(e.target.value))}
                      style={{ width: 80 }}
                      title="Weight (used by Parallel-Score aggregation)"
                    />
                    <span className="t-mono" style={{ width: 30, textAlign: 'right' }}>
                      ×{(m.weight ?? 1).toFixed(1)}
                    </span>
                    <Btn type="button" size="sm" kind="ghost" icon={ArrowUp}
                         onClick={() => moveMember(i, -1)} disabled={i === 0} aria-label="Move up" />
                    <Btn type="button" size="sm" kind="ghost" icon={ArrowDown}
                         onClick={() => moveMember(i, 1)} disabled={i === form.members.length - 1} aria-label="Move down" />
                    <Btn type="button" size="sm" kind="ghost" icon={X}
                         onClick={() => removeMember(i)} aria-label="Remove" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Available pool ────────────────────────────────── */}
          <div>
            <div className="t-tiny" style={{ marginBottom: 6 }}>
              Available agents <span className="muted">({availableAgents.length})</span>
            </div>
            {availableAgents.length === 0 ? (
              <div className="empty-state" style={{ padding: 16 }}>
                All agents are already in the roster.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {availableAgents.map(a => (
                  <div key={a.id} className="card" style={{
                    padding: 10, display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <Avatar initials={initials(a.name)} size="sm" />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="t-body">{a.name}</div>
                      <div className="t-tiny muted">{a.ideology ?? '—'}</div>
                    </div>
                    <Btn type="button" size="sm" icon={Plus} onClick={() => addMember(a.id)}>
                      Add
                    </Btn>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="row gap-3">
          <Btn type="button" onClick={() => navigate('/committees')}>Cancel</Btn>
          <div className="grow" />
          <Btn type="submit" kind="accent" size="lg"
               disabled={submitting || !form.name.trim() || form.members.length === 0}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create committee'}
          </Btn>
        </div>
      </form>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="t-tiny" style={{ display: 'block', marginBottom: 6 }}>
        {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {children}
    </div>
  );
}
