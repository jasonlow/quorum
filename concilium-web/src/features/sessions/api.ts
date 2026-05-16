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

export const sessionsApi = {
  convene: (body: ConveneBody) =>
    http<SessionView>('/api/v1/sessions', { method: 'POST', body }),

  list: (limit = 50) =>
    http<SessionListItem[]>(`/api/v1/sessions?limit=${limit}`),

  get: (id: string) => http<SessionView>(`/api/v1/sessions/${id}`),

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
};
