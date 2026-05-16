import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Gavel, Scroll } from 'lucide-react';
import { Btn } from '@/ui/Btn';
import { Pill } from '@/ui/Pill';
import { PageHeader } from '@/ui/PageHeader';
import { SessionRow } from '@/ui/SessionRow';
import { sessionsApi } from '@/features/sessions/api';
import type { SessionListItem } from '@/features/sessions/types';

const RECENT_LIMIT = 6;

export function Dashboard() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<SessionListItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    sessionsApi.list(RECENT_LIMIT)
      .then(setRecent)
      .catch(e => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Investment Risk Committee"
        sub="Convene a parallel deliberation across five specialist agents. The Chief of Staff quality-gates every draft; you make the call."
        right={
          <Btn
            kind="accent"
            size="lg"
            icon={Gavel}
            iconRight={ArrowRight}
            onClick={() => navigate('/convene')}
          >
            Convene committee
          </Btn>
        }
      />

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="card-elev" style={{ padding: 18 }}>
          <div className="t-tiny">Active committees</div>
          <div className="t-num-big" style={{ marginTop: 8 }}>1</div>
          <div className="t-body-sm muted" style={{ marginTop: 4 }}>
            Investment Risk · 5 agents · Round Robin
          </div>
        </div>
        <div className="card-elev" style={{ padding: 18 }}>
          <div className="t-tiny">Default model</div>
          <div className="t-num-big" style={{ marginTop: 8 }}>deepseek-chat</div>
          <div className="t-body-sm muted" style={{ marginTop: 4 }}>
            CoS routes to <span className="t-mono">deepseek-reasoner</span>
          </div>
        </div>
        <div className="card-elev" style={{ padding: 18 }}>
          <div className="t-tiny">Audit chain</div>
          <div className="row gap-2" style={{ marginTop: 12 }}>
            <Pill tone="green" withDot>Ed25519 active</Pill>
          </div>
          <div className="t-body-sm muted" style={{ marginTop: 8 }}>
            Local PEM keystore · tamper-evident
          </div>
        </div>
      </section>

      <section style={{ marginTop: 32 }}>
        <div className="row gap-3" style={{ alignItems: 'baseline', marginBottom: 12 }}>
          <div className="t-h2">Recent sessions</div>
          <div className="grow" />
          <Link to="/audit" style={{ textDecoration: 'none' }}>
            <Btn kind="ghost" icon={Scroll}>Audit log</Btn>
          </Link>
        </div>

        {err && <div className="notice notice-err">{err}</div>}

        {!err && recent === null && (
          <div className="t-body-sm muted" style={{ padding: 24 }}>Loading…</div>
        )}

        {!err && recent !== null && recent.length === 0 && (
          <div className="empty-state">
            No history yet. Convene a session to see it here.
          </div>
        )}

        {!err && recent !== null && recent.length > 0 && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Phase</th>
                  <th>Decision</th>
                  <th>Chair</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(r => <SessionRow key={r.sessionId} row={r} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
