// Mirror of the backend DTOs and enums. Keep in sync with:
//   io.concilium.session.domain.{Phase, AgentRunState}
//   io.concilium.session.api.dto.{SessionView, AgentDraftView, ConveneRequest}
//   io.concilium.brief.api.BriefController.BriefView
//   io.concilium.decision.api.dto.{DecideRequest, DecideResponse}

export type Phase =
  | 'CONVENED'
  | 'DELIBERATING'
  | 'COS_GATE'
  | 'BRIEFED'
  | 'DECIDED'
  | 'ABORTED';

export type AgentRunState =
  | 'QUEUED'
  | 'THINKING'
  | 'DRAFTING'
  | 'SUBMITTED'
  | 'REVISING'
  | 'PASSED'
  | 'PASSED_WITH_NOTE'
  | 'DISSENTING'
  | 'FAILED'
  | 'RECUSED';

export type AgentEntry = {
  agentId: string;
  agentName: string;
  state: AgentRunState;
  progress: number;
  hasDraft: boolean;
};

export type SessionView = {
  id: string;
  committeeId: string;
  topic: string;
  phase: Phase;
  startedAt: string;
  agents: AgentEntry[];
};

export type Bias = {
  bias: string;
  strength: number;     // 0.0–1.0
};

export type Agent = {
  id: string;
  name: string;
  description?: string | null;
  skills?: string[];
  ideology?: string | null;
  biases?: Bias[];
  boundaries?: string[];
  speakingStyle?: string | null;
  systemPrompt?: string | null;
  modelOverride?: string | null;
  temperature?: number;
};

export type BriefView = {
  id: string;
  sessionId: string;
  recommendation?: string | null;
  confidence?: string | null;
  body: {
    headline?: string;
    consensus?: string[];
    disagreements?: Array<{
      topic: string;
      positions?: Array<{ agent: string; stance: string }>;
      chairSuggestion?: string;
    }>;
    agentBreakdown?: Array<{
      agent: string;
      summary?: string;
      verdict?: string;
    }>;
    parse_error?: string;
    raw_text?: string;
  };
  createdAt: string;
};

export type DecisionType =
  | 'APPROVE'
  | 'APPROVE_WITH_CHANGES'
  | 'REJECT'
  | 'RECONVENE';

export type DecideRequest = {
  decision: DecisionType;
  chairLabel?: string;
  overrides?: Record<string, unknown>;
  notes?: string;
};

export type DecideResponse = {
  decisionId: string;
  sessionId: string;
  decision: DecisionType;
  chairLabel: string;
  sealedAt: string;
  audit: {
    auditRecordId: string;
    prevHashHex: string;
    payloadHashHex: string;
    signatureBase64: string;
    signerKeyAlias: string;
    payloadPath: string;
  };
};

export type SessionListItem = {
  sessionId: string;
  topic: string;
  phase: Phase;
  startedAt: string;
  endedAt: string | null;
  decisionType: DecisionType | null;
  chairLabel: string | null;
  sealedAt: string | null;
};
