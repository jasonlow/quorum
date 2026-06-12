import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Btn } from '@/ui/Btn';
import { Pill } from '@/ui/Pill';
import { PageHeader } from '@/ui/PageHeader';
import { AgentTile } from '@/ui/AgentTile';
import { CosRail } from '@/ui/CosRail';
import { sessionsApi } from '@/features/sessions/api';
import { connectSessionStream } from '@/features/sessions/stream';
import { useSessionStore } from '@/features/sessions/store';
import { formatDuration, formatPhase } from '@/lib/format';

export function Boardroom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = useSessionStore(s => s.session);
  const hydrate = useSessionStore(s => s.hydrateFromView);
  const reset = useSessionStore(s => s.reset);

  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deliberating, setDeliberating] = useState(false);

  // 1. Hydrate from REST (fresh page) if we don't already have this session in the store
  useEffect(() => {
    if (!id) return;
    if (session && session.id === id) return;
    sessionsApi.get(id)
      .then(hydrate)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // intentionally not cleaning up — store survives page lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 2. Open the SSE channel for this session
  useEffect(() => {
    if (!id) return;
    const cleanup = connectSessionStream(id);
    return cleanup;
  }, [id]);

  // 3. Elapsed-time tick (1Hz) while deliberating
  useEffect(() => {
    if (!session || session.endedAt) return;
    const h = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(h);
  }, [session?.id, session?.endedAt]);

  useEffect(() => () => { /* reset on unmount left to user via Dashboard nav */ }, []);

  async function onDeliberate() {
    if (!id) return;
    setError(null);
    setDeliberating(true);
    try {
      await sessionsApi.deliberate(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeliberating(false);
    }
  }

  if (!session) {
    return (
      <PageHeader eyebrow="Boardroom" title="Loading…" sub={error ?? 'Fetching session state.'} />
    );
  }

  const elapsedMs = session.endedAt
    ? (session.endedAt - session.startedAt)
    : (Date.now() - session.startedAt);

  const allTerminal = session.agents.length > 0 && session.agents.every(a =>
    a.state === 'PASSED' || a.state === 'PASSED_WITH_NOTE'
    || a.state === 'DISSENTING' || a.state === 'FAILED' || a.state === 'RECUSED');

  const briefAvailable = session.phase === 'BRIEFED' || session.phase === 'DECIDED' || !!session.briefReady;

  return (
    <>
      <PageHeader
        eyebrow="Boardroom"
        title={session.topic.length > 90 ? session.topic.slice(0, 90) + '…' : session.topic}
        sub={`Session ${session.id.slice(0, 8)} · ${session.committeeName}`}
        right={
          <div className="row gap-3">
            <Pill tone="accent" withDot>{formatPhase(session.phase)}</Pill>
            <span className="t-mono" style={{ color: 'var(--ink-2)' }}>
              {formatDuration(elapsedMs)}
            </span>
            <span style={{ display: 'none' }}>{tick}</span>
            {!deliberating && session.phase === 'CONVENED' && (
              <Btn kind="accent" icon={Sparkles} onClick={onDeliberate}>
                Start deliberation
              </Btn>
            )}
            {briefAvailable && (
              <Btn kind="primary" iconRight={ArrowRight} onClick={() => navigate(`/sessions/${id}/brief`)}>
                View brief
              </Btn>
            )}
          </div>
        }
      />

      {error && <div className="notice notice-err" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="boardroom-layout">
        <div className="boardroom-main">
          <div className="board-grid">
            {session.agents.map(a => (
              <AgentTile
                key={a.agentId}
                sessionId={session.id}
                agentId={a.agentId}
                name={a.agentName}
                ideology={null}
                state={a.state}
                progress={a.progress}
                detail={
                  a.latencyMs != null
                    ? `${formatDuration(a.latencyMs)} · ${a.promptTokens}/${a.completionTokens} tok`
                    : null
                }
                modelUsed={a.modelUsed}
                streamingText={a.streamingText}
                cosVerdict={a.cosVerdict}
                cosChallenge={a.cosChallenge}
                cosScores={a.cosScores}
                failedReason={a.failedReason}
              />
            ))}
          </div>

          {(allTerminal || session.briefReady) && (
            <div className="cos-card">
              <div className="row gap-3" style={{ alignItems: 'baseline' }}>
                <div className="t-h2">Brief consolidation</div>
                <div className="t-tiny">final synthesis</div>
                <div className="grow" />
                {session.briefReady ? (
                  <Pill tone="green" withDot>
                    {session.briefReady.recommendation} · {session.briefReady.confidence}
                  </Pill>
                ) : (
                  <Pill tone="amber" withDot>Consolidating…</Pill>
                )}
              </div>
              {session.wallClockMs != null && (
                <div className="t-body-sm muted" style={{ marginTop: 8 }}>
                  Wall clock {formatDuration(session.wallClockMs)}
                  {session.deliberationMs != null && (
                    <> · deliberation {formatDuration(session.deliberationMs)}</>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* CoS rail — live activity feed alongside the agent grid. Hidden
            while still on CONVENED so the roster preview isn't crowded. */}
        {session.phase !== 'CONVENED' && <CosRail session={session} />}
      </div>

      <div style={{ marginTop: 28 }}>
        <Btn onClick={() => { reset(); navigate('/'); }}>← Dashboard</Btn>
      </div>
    </>
  );
}
