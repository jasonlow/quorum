import { http } from '@/lib/http';
import type {
  Agent, BriefView, DecideRequest, DecideResponse,
  SessionListItem, SessionView,
} from './types';

export const agentsApi = {
  list: () => http<Agent[]>('/api/v1/agents'),
  get:  (id: string) => http<Agent>(`/api/v1/agents/${id}`),
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
