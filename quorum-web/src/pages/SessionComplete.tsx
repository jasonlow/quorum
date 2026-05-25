import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, Home, ShieldCheck } from 'lucide-react';
import { Btn } from '@/ui/Btn';
import { Pill } from '@/ui/Pill';
import { PageHeader } from '@/ui/PageHeader';
import type { DecideResponse } from '@/features/sessions/types';

export function SessionComplete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const data = location.state as DecideResponse | null;

  if (!data) {
    return (
      <PageHeader
        eyebrow="Decision"
        title="No decision data"
        sub="This page expects to be navigated to from the Brief screen after sealing."
        right={<Btn icon={Home} onClick={() => navigate('/')}>Dashboard</Btn>}
      />
    );
  }

  const verifyCmd = `make verify SESSION=${data.audit.payloadPath}`;

  return (
    <>
      <PageHeader
        eyebrow="Decision sealed"
        title={
          <span>
            <Check size={26} strokeWidth={2} style={{ verticalAlign: '-3px', marginRight: 8, color: 'var(--green)' }} />
            {data.decision.replace(/_/g, ' ')}
          </span>
        }
        sub={`Session ${data.sessionId.slice(0, 8)} · Chair: ${data.chairLabel} · Sealed ${new Date(data.sealedAt).toLocaleString()}`}
        right={<Btn icon={Home} onClick={() => navigate('/')}>Dashboard</Btn>}
      />

      <section className="card-elev" style={{ padding: 24 }}>
        <div className="row gap-3" style={{ marginBottom: 12 }}>
          <ShieldCheck size={18} strokeWidth={1.7} style={{ color: 'var(--accent)' }} />
          <div className="t-h2" style={{ margin: 0 }}>Audit chain</div>
          <div className="grow" />
          <Pill tone="green" withDot>Ed25519 signed</Pill>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '10px 16px', alignItems: 'baseline' }}>
          <div className="t-tiny">Signer alias</div>
          <div className="t-mono">{data.audit.signerKeyAlias}</div>

          <div className="t-tiny">Prev hash</div>
          <div className="t-mono" style={{ wordBreak: 'break-all' }}>{data.audit.prevHashHex || '(genesis)'}</div>

          <div className="t-tiny">Payload hash</div>
          <div className="t-mono" style={{ wordBreak: 'break-all' }}>{data.audit.payloadHashHex}</div>

          <div className="t-tiny">Signature</div>
          <div className="t-mono" style={{ wordBreak: 'break-all', maxHeight: 60, overflow: 'auto' }}>
            {data.audit.signatureBase64}
          </div>

          <div className="t-tiny">Payload path</div>
          <div className="t-mono">{data.audit.payloadPath}</div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--hairline)', margin: '20px 0' }} />

        <div className="t-h3" style={{ marginBottom: 8 }}>Verify from terminal</div>
        <div className="t-body-sm muted" style={{ marginBottom: 8 }}>
          The verifier reads only the public PEM at <span className="t-mono">data/keys/quorum-public.pem</span> — never the private key.
        </div>
        <pre style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius)',
          padding: '12px 14px',
          fontFamily: 'var(--mono)',
          fontSize: 12,
          margin: 0,
          overflowX: 'auto',
        }}>
{verifyCmd}
        </pre>
        <div className="t-body-sm muted" style={{ marginTop: 10 }}>
          Expected: <span className="strong">✓ AUDIT RECORD VERIFIED</span>.
          Edit any character inside the payload and re-run — expect <span className="strong">✗ TAMPERING DETECTED</span>.
        </div>
      </section>

      <div className="row gap-3" style={{ marginTop: 24 }}>
        <Btn onClick={() => navigate(`/sessions/${id}/brief`)}>← Back to brief</Btn>
        <div className="grow" />
        <Btn kind="primary" icon={Home} onClick={() => navigate('/')}>Dashboard</Btn>
      </div>
    </>
  );
}
