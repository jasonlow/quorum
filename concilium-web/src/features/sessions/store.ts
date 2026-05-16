import { create } from 'zustand';
import type {
  AgentRunState, Phase, SessionView,
} from './types';
import type {
  AgentDraftDoneEvent, AgentDraftTokenEvent, AgentFailedEvent, AgentStateEvent,
  BriefReadyEvent, CosEvent, PhaseChangedEvent, SessionCompletedEvent,
} from './stream';

/**
 * Per-agent live state held in the Zustand store. Mirrors what the
 * backend pushes via SSE, plus per-agent telemetry from agent.draft.done
 * and CoS verdict / challenge surfaces.
 */
export type AgentTile = {
  agentId: string;
  agentName: string;
  state: AgentRunState;
  progress: number;
  modelUsed?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  cosVerdict?: string;
  cosChallenge?: string;
  failedReason?: string;
  /** Live text accumulated from agent.draft.token events. */
  streamingText?: string;
};

export type LiveSession = {
  id: string;
  topic: string;
  committeeName: string;
  phase: Phase;
  startedAt: number;          // ms since epoch
  endedAt?: number;
  wallClockMs?: number;
  deliberationMs?: number;
  briefReady?: {
    briefId: string;
    recommendation: string;
    confidence: string;
  };
  connected: boolean;
  agents: AgentTile[];
};

type State = {
  session: LiveSession | null;

  // Hydrate from a SessionView (e.g. after Convene or page refresh)
  hydrateFromView: (view: SessionView) => void;
  reset: () => void;

  // SSE event handlers
  markConnected: (v: boolean) => void;
  applyPhaseChange: (e: PhaseChangedEvent) => void;
  applyAgentState: (e: AgentStateEvent) => void;
  applyAgentToken: (e: AgentDraftTokenEvent) => void;
  applyAgentDraftDone: (e: AgentDraftDoneEvent) => void;
  applyAgentFailed: (e: AgentFailedEvent) => void;
  applyCosEvent: (e: CosEvent, kind: 'PASSED' | 'PASSED_WITH_NOTE' | 'REVISION_REQUESTED') => void;
  applyBriefReady: (e: BriefReadyEvent) => void;
  applySessionCompleted: (e: SessionCompletedEvent) => void;
};

function withAgent(agents: AgentTile[], agentId: string, update: (a: AgentTile) => AgentTile): AgentTile[] {
  const idx = agents.findIndex(a => a.agentId === agentId);
  if (idx < 0) return agents;
  const next = agents.slice();
  next[idx] = update(next[idx]);
  return next;
}

export const useSessionStore = create<State>((set) => ({
  session: null,

  hydrateFromView: (view) => set({
    session: {
      id: view.id,
      topic: view.topic,
      committeeName: view.committeeName,
      phase: view.phase,
      startedAt: Date.parse(view.startedAt),
      connected: false,
      agents: view.agents.map(a => ({
        agentId: a.agentId,
        agentName: a.agentName,
        state: a.state,
        progress: a.progress,
      })),
    },
  }),

  reset: () => set({ session: null }),

  markConnected: (v) => set((s) =>
    s.session ? { session: { ...s.session, connected: v } } : s),

  applyPhaseChange: (e) => set((s) => {
    if (!s.session || s.session.id !== e.sessionId) return s;
    return { session: { ...s.session, phase: e.to } };
  }),

  applyAgentState: (e) => set((s) => {
    if (!s.session || s.session.id !== e.sessionId) return s;
    return {
      session: {
        ...s.session,
        agents: withAgent(s.session.agents, e.agentId, (a) => ({
          ...a,
          state: e.state,
          progress: e.progress,
          // Reset the live preview when an agent enters REVISING so the
          // second-pass draft streams into a fresh box.
          streamingText: e.state === 'REVISING' ? '' : a.streamingText,
        })),
      },
    };
  }),

  applyAgentToken: (e) => set((s) => {
    if (!s.session || s.session.id !== e.sessionId) return s;
    return {
      session: {
        ...s.session,
        agents: withAgent(s.session.agents, e.agentId, (a) => ({
          ...a,
          streamingText: (a.streamingText ?? '') + e.delta,
        })),
      },
    };
  }),

  applyAgentDraftDone: (e) => set((s) => {
    if (!s.session || s.session.id !== e.sessionId) return s;
    return {
      session: {
        ...s.session,
        agents: withAgent(s.session.agents, e.agentId, (a) => ({
          ...a,
          modelUsed: e.modelUsed,
          promptTokens: e.promptTokens,
          completionTokens: e.completionTokens,
          latencyMs: e.latencyMs,
        })),
      },
    };
  }),

  applyAgentFailed: (e) => set((s) => {
    if (!s.session || s.session.id !== e.sessionId) return s;
    return {
      session: {
        ...s.session,
        agents: withAgent(s.session.agents, e.agentId, (a) => ({
          ...a,
          state: 'FAILED',
          failedReason: e.reason,
        })),
      },
    };
  }),

  applyCosEvent: (e, kind) => set((s) => {
    if (!s.session || s.session.id !== e.sessionId) return s;
    return {
      session: {
        ...s.session,
        agents: withAgent(s.session.agents, e.agentId, (a) => ({
          ...a,
          cosVerdict: kind,
          cosChallenge: e.challenge ?? e.note ?? a.cosChallenge,
        })),
      },
    };
  }),

  applyBriefReady: (e) => set((s) => {
    if (!s.session || s.session.id !== e.sessionId) return s;
    return {
      session: {
        ...s.session,
        briefReady: {
          briefId: e.briefId,
          recommendation: e.recommendation,
          confidence: e.confidence,
        },
      },
    };
  }),

  applySessionCompleted: (e) => set((s) => {
    if (!s.session || s.session.id !== e.sessionId) return s;
    return {
      session: {
        ...s.session,
        endedAt: Date.now(),
        wallClockMs: e.wallClockMs,
        deliberationMs: e.deliberationMs,
      },
    };
  }),
}));
