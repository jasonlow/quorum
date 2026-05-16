// EventSource wrapper that bridges backend SSE events to the Zustand store.
// Backend event names are stable strings (see SseEventType.java).

import { useSessionStore } from './store';
import type { AgentRunState, Phase } from './types';

export type AgentStateEvent = {
  sessionId: string;
  agentId: string;
  agentName: string;
  state: AgentRunState;
  progress: number;
  at: string;
};

export type AgentDraftDoneEvent = {
  sessionId: string;
  agentId: string;
  agentName: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  at: string;
};

export type AgentFailedEvent = {
  sessionId: string;
  agentId: string;
  agentName: string;
  reason: string;
  at: string;
};

export type PhaseChangedEvent = {
  sessionId: string;
  from: Phase;
  to: Phase;
  at: string;
};

export type SessionCompletedEvent = {
  sessionId: string;
  wallClockMs: number;
  deliberationMs?: number;
};

export type BriefReadyEvent = {
  sessionId: string;
  briefId: string;
  recommendation: string;
  confidence: string;
};

export type CosEvent = {
  sessionId: string;
  agentId: string;
  agentName: string;
  verdict?: string;
  challenge?: string;
  scores?: Record<string, number>;
  note?: string;
};

/**
 * Connect to /api/v1/sessions/:id/stream and pipe events into the store.
 * Returns a cleanup function the caller should run on unmount.
 */
export function connectSessionStream(sessionId: string): () => void {
  const url = `/api/v1/sessions/${sessionId}/stream`;
  const es = new EventSource(url);
  const set = useSessionStore.getState();

  es.addEventListener('hello', () => {
    set.markConnected(true);
  });

  es.addEventListener('phase.changed', (e) => {
    const data: PhaseChangedEvent = JSON.parse((e as MessageEvent).data);
    set.applyPhaseChange(data);
  });

  es.addEventListener('agent.state.changed', (e) => {
    const data: AgentStateEvent = JSON.parse((e as MessageEvent).data);
    set.applyAgentState(data);
  });

  es.addEventListener('agent.draft.done', (e) => {
    const data: AgentDraftDoneEvent = JSON.parse((e as MessageEvent).data);
    set.applyAgentDraftDone(data);
  });

  es.addEventListener('agent.failed', (e) => {
    const data: AgentFailedEvent = JSON.parse((e as MessageEvent).data);
    set.applyAgentFailed(data);
  });

  es.addEventListener('cos.review.passed', (e) => {
    const data: CosEvent = JSON.parse((e as MessageEvent).data);
    set.applyCosEvent(data, 'PASSED');
  });

  es.addEventListener('cos.review.passed_with_note', (e) => {
    const data: CosEvent = JSON.parse((e as MessageEvent).data);
    set.applyCosEvent(data, 'PASSED_WITH_NOTE');
  });

  es.addEventListener('cos.revision_requested', (e) => {
    const data: CosEvent = JSON.parse((e as MessageEvent).data);
    set.applyCosEvent(data, 'REVISION_REQUESTED');
  });

  es.addEventListener('brief.ready', (e) => {
    const data: BriefReadyEvent = JSON.parse((e as MessageEvent).data);
    set.applyBriefReady(data);
  });

  es.addEventListener('session.completed', (e) => {
    const data: SessionCompletedEvent = JSON.parse((e as MessageEvent).data);
    set.applySessionCompleted(data);
    es.close();
  });

  es.addEventListener('error', () => {
    set.markConnected(false);
    // EventSource auto-reconnects on transient errors; on session close
    // the server completes the stream and we'll see the close above.
  });

  return () => {
    es.close();
    set.markConnected(false);
  };
}
