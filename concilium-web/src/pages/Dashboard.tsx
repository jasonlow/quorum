import { useNavigate } from 'react-router-dom';
import { ArrowRight, Gavel } from 'lucide-react';
import { Btn } from '@/ui/Btn';
import { Pill } from '@/ui/Pill';
import { PageHeader } from '@/ui/PageHeader';

export function Dashboard() {
  const navigate = useNavigate();

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
        <div className="t-h2" style={{ marginBottom: 12 }}>Recent sessions</div>
        <div className="empty-state">
          No history yet. Convene a session to see it here.
        </div>
      </section>
    </>
  );
}
