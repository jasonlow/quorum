import { http } from '@/lib/http';
import type {
  Agent, BriefView, CommitteeStatus, CommitteeView,
  DecideRequest, DecideResponse, OrchestrationPattern, QaIntensity,
  SessionListItem, SessionView,
} from './types';

/**
 * Shape sent to {@code POST /api/v1/agents} and {@code PUT /api/v1/agents/:id}.
 * Mirrors {@code AgentRequest.java}.
 */
export type AgentRequest = {
  name: string;
  description?: string;
  skills: string[];
  ideology?: string;
  biases: { bias: string; strength: number }[];
  boundaries: string[];
  speakingStyle?: string;
  systemPrompt: string;
  modelOverride?: string | null;
  temperature: number;
  knowledgeText?: string | null;
};

export type AgentStatus = 'PUBLISHED' | 'ARCHIVED';

export const agentsApi = {
  list: (status: AgentStatus = 'PUBLISHED') =>
    http<Agent[]>(`/api/v1/agents?status=${status}`),

  get:  (id: string) => http<Agent>(`/api/v1/agents/${id}`),

  create: (body: AgentRequest) =>
    http<Agent>('/api/v1/agents', { method: 'POST', body }),

  update: (id: string, body: AgentRequest) =>
    http<Agent>(`/api/v1/agents/${id}`, { method: 'PUT', body }),

  remove: (id: string) =>
    http<void>(`/api/v1/agents/${id}`, { method: 'DELETE' }),

  restore: (id: string) =>
    http<Agent>(`/api/v1/agents/${id}/restore`, { method: 'POST' }),

  /** NL → structured draft profile. Returns a draft (NOT saved). */
  generate: (description: string) =>
    http<AgentRequest>('/api/v1/agents/generate', {
      method: 'POST',
      body: { description },
    }),

  setModelOverride: (id: string, model: string | null) =>
    http<Agent>(`/api/v1/agents/${id}/model-override`, {
      method: 'PUT',
      body: { model },
    }),
};

export type ConveneBody = {
  committeeId?: string;
  topic: string;
  contextMd?: string;
};

// ───────────────────────────────────────────────────────────────
// Committees
// ───────────────────────────────────────────────────────────────

export type CommitteeMemberRequest = {
  agentId: string;
  weight?: number | null;
};

export type CommitteeRequest = {
  name: string;
  description?: string;
  orchestrationPattern: OrchestrationPattern;
  qaIntensity: QaIntensity;
  decisionRule: string;
  maxRevisionRounds?: number;
  knowledgeText?: string | null;
  members: CommitteeMemberRequest[];
};

export const committeesApi = {
  list: (status: CommitteeStatus = 'PUBLISHED') =>
    http<CommitteeView[]>(`/api/v1/committees?status=${status}`),

  get: (id: string) => http<CommitteeView>(`/api/v1/committees/${id}`),

  create: (body: CommitteeRequest) =>
    http<CommitteeView>('/api/v1/committees', { method: 'POST', body }),

  update: (id: string, body: CommitteeRequest) =>
    http<CommitteeView>(`/api/v1/committees/${id}`, { method: 'PUT', body }),

  remove: (id: string) =>
    http<void>(`/api/v1/committees/${id}`, { method: 'DELETE' }),

  restore: (id: string) =>
    http<CommitteeView>(`/api/v1/committees/${id}/restore`, { method: 'POST' }),
};

/** Draft returned by POST /sessions/generate-agenda — not yet persisted. */
export type AgendaDraft = {
  topic: string;
  contextMd: string;
};

export const sessionsApi = {
  convene: (body: ConveneBody) =>
    http<SessionView>('/api/v1/sessions', { method: 'POST', body }),

  list: (limit = 50) =>
    http<SessionListItem[]>(`/api/v1/sessions?limit=${limit}`),

  get: (id: string) => http<SessionView>(`/api/v1/sessions/${id}`),

  /** NL → {topic, contextMd}. Pre-fills the Convene form. */
  generateAgenda: (committeeId: string | null, description: string) =>
    http<AgendaDraft>('/api/v1/sessions/generate-agenda', {
      method: 'POST',
      body: { committeeId, description },
    }),

  deliberate: (id: string) =>
    http<{ sessionId: string; streamUrl: string; message: string }>(
      `/api/v1/sessions/${id}/deliberate`,
      { method: 'POST' },
    ),

  brief: (id: string) => http<BriefView>(`/api/v1/sessions/${id}/brief`),

  decide: (id: string, body: DecideRequest) =>
    http<DecideResponse>(`/api/v1/sessions/${id}/decide`, {
      method: 'POST',
      body,
    }),

  /** Per-agent expanded view (round history + CoS scores). */
  agentDetails: (sessionId: string, agentId: string) =>
    http<AgentDetailsView>(`/api/v1/sessions/${sessionId}/agents/${agentId}/details`),

  /** Assembled user prompt for one agent — debug view. Returns text/plain. */
  agentPrompt: async (sessionId: string, agentId: string): Promise<string> => {
    const res = await fetch(`${API_BASE_FOR_PROMPT}/api/v1/sessions/${sessionId}/agents/${agentId}/prompt`);
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try { const t = await res.text(); if (t) msg += ` — ${t}`; } catch { /* ignore */ }
      throw new Error(msg);
    }
    return await res.text();
  },
};

export type AgentDetailsView = {
  sessionId: string;
  agentId: string;
  agentName: string;
  rounds: Array<{
    roundNo: number;
    draft?: {
      text: string;
      modelUsed?: string;
      promptTokens?: number;
      completionTokens?: number;
      latencyMs?: number;
      createdAt: string;
    };
    review?: {
      verdict: 'PASSED' | 'PASSED_WITH_NOTE' | 'REVISION_REQUESTED' | 'FAILED';
      scores: {
        specificity: number;
        completeness: number;
        evidence: number;
        boundaries: number;
        ideology: number;
      };
      challenge?: string;
      createdAt: string;
    };
  }>;
};

const API_BASE_FOR_PROMPT = (import.meta as any).env?.VITE_API_BASE ?? '';

// ───────────────────────────────────────────────────────────────
// Supporting documents (uploaded against a session while it's still
// in CONVENED phase, before the orchestrator runs).
// ───────────────────────────────────────────────────────────────

export type SessionDocumentView = {
  id: string;
  sessionId: string;
  filename: string;
  contentType: string;
  byteSize: number;
  extractedChars: number;
  previewSnippet: string;
  sha256: string;
  createdAt: string;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? '';

export const documentsApi = {
  list: (sessionId: string) =>
    http<SessionDocumentView[]>(`/api/v1/sessions/${sessionId}/documents`),

  /** Multipart upload — bypasses the JSON http() helper. */
  async upload(sessionId: string, file: File): Promise<SessionDocumentView> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    const res = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/documents`, {
      method: 'POST',
      body: fd,
    });
    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try { const t = await res.text(); if (t) msg += ` — ${t}`; } catch { /* ignore */ }
      throw new Error(msg);
    }
    return (await res.json()) as SessionDocumentView;
  },

  remove: (sessionId: string, documentId: string) =>
    http<void>(`/api/v1/sessions/${sessionId}/documents/${documentId}`, {
      method: 'DELETE',
    }),
};
