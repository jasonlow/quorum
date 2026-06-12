import { Sparkles, ArrowRight } from 'lucide-react';
import { Pill } from './Pill';
import type { LiveSession } from '../features/sessions/store';

/**
 * Sidebar showing the Chief of Staff's live activity alongside the agent
 * grid. Three sections:
 *   1. Progress card — how many drafts reviewed / passed
 *   2. Active interventions — agents currently revising, with the
 *      CoS challenge they're answering
 *   3. Recent activity — chronological feed of CoS verdicts
 *
 * Hidden until deliberation actually starts (CONVENED phase shows just
 * the agent roster, no rail).
 */
export function CosRail({ session }: { session: LiveSession }) {
  const total = session.agents.length;
  const reviewed = session.agents.filter((a) => !!a.cosVerdict).length;
  const passed = session.agents.filter(
    (a) => a.cosVerdict === 'PASSED' || a.cosVerdict === 'PASSED_WITH_NOTE',
  ).length;
  const progressPct = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  // Active interventions: agents that the CoS asked to revise, where the
  // agent hasn't yet shipped a passing draft.
  const interventions = session.agents.filter(
    (a) => a.state === 'REVISING' || (a.cosVerdict === 'REVISION_REQUESTED' && !!a.cosChallenge),
  );

  // Recent activity: last 6 entries, newest first.
  const recent = [...session.cosTimeline].reverse().slice(0, 6);

  return (
    <aside className="cos-rail">
      <div className="cos-rail-header">
        <div className="cos-rail-icon">
          <Sparkles size={16} />
        </div>
        <div className="col">
          <div className="t-h3">Chief of Staff</div>
          <div className="t-tiny">quality gate · editor · challenger</div>
        </div>
      </div>

      <div className="cos-progress-card">
        <div className="row" style={{ alignItems: 'baseline', marginBottom: 6 }}>
          <span className="t-h4">Reviewing drafts</span>
          <span className="grow" />
          <span className="t-mono muted">{progressPct}%</span>
        </div>
        <div className="cos-progress-bar">
          <i style={{ width: `${progressPct}%` }} />
        </div>
        <div className="cos-progress-counters">
          <div>
            <span className="t-tiny">Received</span>
            <span className="strong t-num">
              {reviewed}/{total}
            </span>
          </div>
          <div>
            <span className="t-tiny">Passed QA</span>
            <span className="strong t-num" style={{ color: 'var(--green)' }}>
              {passed}/{total}
            </span>
          </div>
        </div>
      </div>

      {interventions.length > 0 && (
        <div className="cos-section">
          <div className="t-tiny">Active interventions</div>
          {interventions.map((a) => (
            <div key={a.agentId} className="cos-intervention">
              <div className="row" style={{ alignItems: 'center', marginBottom: 4 }}>
                <ArrowRight size={11} style={{ color: 'var(--amber)' }} />
                <span className="t-h4">to {a.agentName}</span>
                <span className="grow" />
                <Pill tone="amber" square>
                  Revise
                </Pill>
              </div>
              {a.cosChallenge && (
                <p className="t-body-sm" style={{ margin: '4px 0 0', color: 'var(--ink-2)' }}>
                  {a.cosChallenge}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="cos-section">
          <div className="t-tiny">Recent activity</div>
          <div className="cos-timeline">
            {recent.map((e) => (
              <div key={e.id} className="cos-timeline-entry">
                <span className="t-mono muted" style={{ width: 50, flex: '0 0 50px' }}>
                  {formatRelTime(e.at - session.startedAt)}
                </span>
                <span className="t-h4 grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.agentName}
                </span>
                <Pill tone={toneFor(e.kind)} square>
                  {labelFor(e.kind)}
                </Pill>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviewed === 0 && interventions.length === 0 && (
        <div className="cos-empty t-body-sm muted">
          Waiting for agents to submit drafts. The CoS reviews each one on
          five axes (specificity, completeness, evidence, boundaries, ideology
          fit) before it counts toward the brief.
        </div>
      )}
    </aside>
  );
}

function toneFor(kind: 'PASSED' | 'PASSED_WITH_NOTE' | 'REVISION_REQUESTED') {
  switch (kind) {
    case 'PASSED':
      return 'green';
    case 'PASSED_WITH_NOTE':
      return 'blue';
    case 'REVISION_REQUESTED':
      return 'amber';
  }
}

function labelFor(kind: 'PASSED' | 'PASSED_WITH_NOTE' | 'REVISION_REQUESTED') {
  switch (kind) {
    case 'PASSED':
      return 'Passed';
    case 'PASSED_WITH_NOTE':
      return 'Noted';
    case 'REVISION_REQUESTED':
      return 'Revise';
  }
}

function formatRelTime(deltaMs: number): string {
  if (deltaMs < 0) return '00:00';
  const totalSec = Math.floor(deltaMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
