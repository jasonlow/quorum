import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Btn } from '@/ui/Btn';
import { PageHeader } from '@/ui/PageHeader';
import { AgentForm } from '@/ui/AgentForm';
import { agentsApi, type AgentRequest } from '@/features/sessions/api';
import type { Agent } from '@/features/sessions/types';

const EMPTY_AGENT: AgentRequest = {
  name: '',
  description: '',
  skills: [],
  ideology: '',
  biases: [],
  boundaries: [],
  speakingStyle: '',
  systemPrompt: 'You are a senior … (write 200–400 words. First person posture, scoring conventions, boundaries, style.)',
  modelOverride: null,
  temperature: 0.7,
  knowledgeText: null,
};

// Whitelist of model strings the form's dropdown can represent. Anything
// outside this set (e.g. a value hallucinated by an earlier LLM call and
// silently persisted) gets normalised to null at load time so the form
// can't silently re-submit the bad value back to the server.
//
// Both the legacy aliases (deepseek-chat, deepseek-reasoner) and the
// current canonical names (deepseek-v4-flash, deepseek-v4-pro) are
// accepted so existing per-agent overrides don't get reset on the next
// Edit even if they were saved before the rename.
const KNOWN_MODEL_OVERRIDES = new Set([
  'deepseek-chat',          // legacy alias → currently routes to v4-flash
  'deepseek-v4-flash',      // canonical chat-tier
  'deepseek-reasoner',      // legacy alias → currently routes to v4-pro
  'deepseek-v4-pro',        // canonical reasoning-tier
]);

function normaliseModelOverride(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (KNOWN_MODEL_OVERRIDES.has(raw)) return raw;
  console.warn(
    `[AgentEditor] Unknown modelOverride "${raw}" on loaded agent — `
    + 'resetting to default. Use the Agents library chips to set an explicit override.',
  );
  return null;
}

function fromAgent(a: Agent): AgentRequest {
  return {
    name: a.name,
    description: a.description ?? '',
    skills: a.skills ?? [],
    ideology: a.ideology ?? '',
    biases: a.biases ?? [],
    boundaries: a.boundaries ?? [],
    speakingStyle: a.speakingStyle ?? '',
    systemPrompt: a.systemPrompt ?? '',
    modelOverride: normaliseModelOverride(a.modelOverride),
    temperature: typeof a.temperature === 'number' ? a.temperature : 0.7,
    knowledgeText: a.knowledgeText ?? null,
  };
}

export function AgentEditor() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [initial, setInitial] = useState<AgentRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEdit) {
      setInitial(EMPTY_AGENT);
      return;
    }
    agentsApi.get(id!)
      .then(a => setInitial(fromAgent(a)))
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, [id, isEdit]);

  const title = useMemo(
    () => (isEdit ? `Edit agent` : 'Create agent'),
    [isEdit],
  );

  async function handleSubmit(req: AgentRequest) {
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit) {
        await agentsApi.update(id!, req);
      } else {
        await agentsApi.create(req);
      }
      navigate('/agents');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (initial === null && !error) {
    return <PageHeader eyebrow="Agent" title="Loading…" />;
  }

  return (
    <>
      <PageHeader
        eyebrow={isEdit ? 'Edit' : 'New'}
        title={title}
        sub={isEdit
          ? 'Full replace of the agent profile. The system prompt is what the LLM actually sees as the persona.'
          : 'Create a new agent for the library. You can describe in natural language to pre-fill the form, or write the profile directly.'}
        right={<Btn onClick={() => navigate('/agents')}>← Library</Btn>}
      />

      {error && <div className="notice notice-err" style={{ marginBottom: 16 }}>{error}</div>}

      {initial && (
        <AgentForm
          initial={initial}
          submitLabel={isEdit ? 'Save changes' : 'Create agent'}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/agents')}
          onGenerateFromNL={(desc) => agentsApi.generate(desc)}
        />
      )}
    </>
  );
}
