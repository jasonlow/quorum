import { useState } from 'react';
import { Plus, Sparkles, X } from 'lucide-react';
import { Btn } from './Btn';
import type { AgentRequest } from '@/features/sessions/api';

type Props = {
  initial: AgentRequest;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (req: AgentRequest) => void;
  onCancel: () => void;
  onGenerateFromNL?: (description: string) => Promise<AgentRequest>;
};

const MODEL_OPTIONS: Array<{ label: string; value: string | null }> = [
  { label: 'Default (workspace chat model)', value: null },
  { label: 'deepseek-chat (explicit)',       value: 'deepseek-chat' },
  { label: 'deepseek-reasoner',              value: 'deepseek-reasoner' },
];

export function AgentForm({
  initial, submitLabel, submitting, onSubmit, onCancel, onGenerateFromNL,
}: Props) {
  const [form, setForm] = useState<AgentRequest>(initial);

  // NL generation state
  const [nlOpen, setNlOpen] = useState(false);
  const [nlText, setNlText] = useState('');
  const [nlBusy, setNlBusy] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

  function patch<K extends keyof AgentRequest>(key: K, val: AgentRequest[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function addBias() {
    patch('biases', [...form.biases, { bias: '', strength: 0.5 }]);
  }
  function updateBias(i: number, patchObj: Partial<{ bias: string; strength: number }>) {
    patch('biases', form.biases.map((b, idx) => (idx === i ? { ...b, ...patchObj } : b)));
  }
  function removeBias(i: number) {
    patch('biases', form.biases.filter((_, idx) => idx !== i));
  }

  function addChip(field: 'skills' | 'boundaries', value: string) {
    const v = value.trim();
    if (!v) return;
    patch(field, [...(form[field] ?? []), v]);
  }
  function removeChip(field: 'skills' | 'boundaries', i: number) {
    patch(field, (form[field] ?? []).filter((_, idx) => idx !== i));
  }

  async function runGenerate() {
    if (!onGenerateFromNL || !nlText.trim()) return;
    setNlBusy(true);
    setNlError(null);
    try {
      const draft = await onGenerateFromNL(nlText);
      setForm(draft);
      setNlOpen(false);
      setNlText('');
    } catch (e) {
      setNlError(e instanceof Error ? e.message : String(e));
    } finally {
      setNlBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
          style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 880 }}>

      {/* ─── NL generate panel ─────────────────────────────── */}
      {onGenerateFromNL && (
        <div className="card" style={{ padding: 16, background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}>
          <div className="row gap-3" style={{ alignItems: 'center' }}>
            <Sparkles size={16} strokeWidth={1.7} style={{ color: 'var(--accent)' }} />
            <div className="t-h3" style={{ margin: 0, color: 'var(--accent)' }}>
              Generate from description
            </div>
            <div className="grow" />
            {!nlOpen && (
              <Btn kind="accent" size="sm" onClick={() => setNlOpen(true)} type="button">
                Describe an agent
              </Btn>
            )}
          </div>
          {nlOpen && (
            <div style={{ marginTop: 12 }}>
              <textarea
                className="input"
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                placeholder="e.g. a senior MAS compliance officer with 20 years of experience, skeptical of crypto innovation, always asks about source of funds…"
                rows={4}
              />
              {nlError && <div className="notice notice-err" style={{ marginTop: 8 }}>{nlError}</div>}
              <div className="row gap-2" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                <Btn type="button" onClick={() => { setNlOpen(false); setNlText(''); setNlError(null); }} disabled={nlBusy}>
                  Cancel
                </Btn>
                <Btn kind="accent" icon={Sparkles} onClick={runGenerate} disabled={nlBusy || !nlText.trim()} type="button">
                  {nlBusy ? 'Generating…' : 'Generate draft'}
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Name + description ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="Name" required>
          <input
            className="input" required maxLength={100}
            value={form.name}
            onChange={(e) => patch('name', e.target.value)}
            placeholder="e.g. Regulatory Hawk"
          />
        </Field>
        <Field label="Ideology">
          <input
            className="input" maxLength={80}
            value={form.ideology ?? ''}
            onChange={(e) => patch('ideology', e.target.value)}
            placeholder="e.g. regulation-first"
          />
        </Field>
      </div>

      <Field label="Description">
        <input
          className="input" maxLength={200}
          value={form.description ?? ''}
          onChange={(e) => patch('description', e.target.value)}
          placeholder="One-sentence summary of who this agent is"
        />
      </Field>

      {/* ─── Skills (chips) ────────────────────────────────── */}
      <Field label="Skills" hint="Press Enter to add. Click ✕ to remove.">
        <ChipInput
          values={form.skills ?? []}
          onAdd={(v) => addChip('skills', v)}
          onRemove={(i) => removeChip('skills', i)}
          placeholder="Add a skill and press Enter"
        />
      </Field>

      {/* ─── Biases (text + strength slider) ───────────────── */}
      <Field label="Biases" hint="0.0 = subtle, 1.0 = strongly expressed">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {form.biases.map((b, i) => (
            <div key={i} className="row gap-2">
              <input
                className="input" style={{ flex: 1 }}
                value={b.bias}
                onChange={(e) => updateBias(i, { bias: e.target.value })}
                placeholder="e.g. distrusts upside-only narratives"
              />
              <input
                type="range" min={0} max={1} step={0.05}
                value={b.strength}
                onChange={(e) => updateBias(i, { strength: parseFloat(e.target.value) })}
                style={{ width: 120 }}
              />
              <span className="t-mono" style={{ width: 36, textAlign: 'right' }}>
                {b.strength.toFixed(2)}
              </span>
              <Btn type="button" size="sm" kind="ghost" icon={X} onClick={() => removeBias(i)} aria-label="Remove bias" />
            </div>
          ))}
          <Btn type="button" size="sm" icon={Plus} onClick={addBias}>Add bias</Btn>
        </div>
      </Field>

      {/* ─── Boundaries (chips) ────────────────────────────── */}
      <Field label="Boundaries" hint='Things this agent cannot do. e.g. "cannot opine on commercial pricing"'>
        <ChipInput
          values={form.boundaries ?? []}
          onAdd={(v) => addChip('boundaries', v)}
          onRemove={(i) => removeChip('boundaries', i)}
          placeholder="Add a boundary and press Enter"
        />
      </Field>

      {/* ─── Speaking style + temperature + model ──────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
        <Field label="Speaking style">
          <input
            className="input" maxLength={160}
            value={form.speakingStyle ?? ''}
            onChange={(e) => patch('speakingStyle', e.target.value)}
            placeholder="e.g. formal, cites specific MAS Notices, cautious"
          />
        </Field>
        <Field label={`Temperature: ${(form.temperature ?? 0).toFixed(2)}`}>
          <input
            type="range" min={0} max={2} step={0.05}
            value={form.temperature}
            onChange={(e) => patch('temperature', parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </Field>
        <Field label="Model">
          <select
            className="input"
            value={form.modelOverride ?? ''}
            onChange={(e) => patch('modelOverride', e.target.value === '' ? null : e.target.value)}
          >
            {MODEL_OPTIONS.map(opt => (
              <option key={String(opt.value)} value={opt.value ?? ''}>{opt.label}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* ─── System prompt ─────────────────────────────────── */}
      <Field label="System prompt" required hint="Written in second person. Defines posture, scoring conventions, lane discipline, output style. 200–400 words is the sweet spot.">
        <textarea
          className="input" required rows={14}
          value={form.systemPrompt}
          onChange={(e) => patch('systemPrompt', e.target.value)}
          style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.55 }}
        />
        <div className="t-tiny muted" style={{ marginTop: 4 }}>
          ~{form.systemPrompt?.length ?? 0} chars
        </div>
      </Field>

      {/* ─── Actions ───────────────────────────────────────── */}
      <div className="row gap-3">
        <Btn type="button" onClick={onCancel}>Cancel</Btn>
        <div className="grow" />
        <Btn type="submit" kind="accent" size="lg" disabled={submitting || !form.name.trim() || !form.systemPrompt.trim()}>
          {submitting ? 'Saving…' : submitLabel}
        </Btn>
      </div>
    </form>
  );
}

// ────────────────────────────────────────────────────────────────

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="t-tiny" style={{ display: 'block', marginBottom: 6 }}>
        {label}{required && <span style={{ color: 'var(--red)' }}> *</span>}
      </label>
      {children}
      {hint && <div className="t-tiny muted" style={{ marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function ChipInput({
  values, onAdd, onRemove, placeholder,
}: { values: string[]; onAdd: (v: string) => void; onRemove: (i: number) => void; placeholder: string }) {
  const [draft, setDraft] = useState('');
  function commit() {
    if (draft.trim()) {
      onAdd(draft);
      setDraft('');
    }
  }
  return (
    <div>
      <div className="row gap-2" style={{ flexWrap: 'wrap', marginBottom: values.length ? 8 : 0 }}>
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className="pill">
            {v}
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove ${v}`}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, marginLeft: 4, color: 'var(--ink-3)',
              }}
            ><X size={12} strokeWidth={1.7} /></button>
          </span>
        ))}
      </div>
      <input
        className="input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
      />
    </div>
  );
}
