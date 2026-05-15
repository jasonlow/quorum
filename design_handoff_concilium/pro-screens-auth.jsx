/* global React, Icon, Avatar, Btn, Pill */
const { useState } = React;

// ════════════════════════════════════════════════════════════════════
// Shared auth shell — split editorial layout
// ════════════════════════════════════════════════════════════════════
function AuthShell({ children, mode='light' }) {
  return (
    <div style={{
      position:'fixed', inset:0,
      display:'grid', gridTemplateColumns:'minmax(0, 1fr) minmax(0, 1.05fr)',
      background:'var(--bg)',
      overflow:'hidden',
    }}>
      <AuthEditorial />
      <div style={{
        background:'var(--surface)',
        borderLeft:'1px solid var(--hairline)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'40px 56px',
        overflow:'auto',
      }}>
        <div style={{ width:'100%', maxWidth:400 }}>{children}</div>
      </div>
    </div>
  );
}

// Editorial pane — marketing / brand side
function AuthEditorial() {
  return (
    <div className="grain" style={{
      position:'relative',
      background: 'linear-gradient(155deg, var(--bg-2) 0%, var(--bg) 55%, var(--tint) 100%)',
      padding:'40px 48px',
      display:'flex', flexDirection:'column',
      overflow:'hidden',
    }}>
      {/* Top — wordmark */}
      <div className="row gap-3" style={{ marginBottom:'auto' }}>
        <div style={{ width:34, height:34, borderRadius:8, background:'var(--ink)', color:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontFamily:'var(--serif)', fontSize:20, lineHeight:1 }}>C</span>
        </div>
        <div className="col" style={{ lineHeight:1.1 }}>
          <span style={{ fontFamily:'var(--serif)', fontSize:20, letterSpacing:'-0.01em' }}>Concilium</span>
          <span className="t-tiny" style={{ textTransform:'none', letterSpacing:0, fontSize:11 }}>The AI committee platform</span>
        </div>
      </div>

      {/* Center — pull-quote */}
      <div style={{ maxWidth:480, marginBottom:32 }}>
        <div className="t-tiny" style={{ marginBottom:14, color:'var(--accent)' }}>
          Vol. iv · A note from the office
        </div>
        <p className="t-display" style={{ fontSize:38, lineHeight:1.08, margin:'0 0 22px' }}>
          A committee that meets <em className="serif-it">in two minutes</em> can be consulted before every decision &mdash; not after.
        </p>
        <div className="row gap-3" style={{ marginTop:14 }}>
          <Avatar initials="PA" rim="accent" size="lg" />
          <div className="col" style={{ lineHeight:1.2 }}>
            <span className="t-body strong">Priya Anand</span>
            <span className="t-body-sm muted">Chief Risk Officer · Atlas Capital</span>
          </div>
        </div>
      </div>

      {/* Bottom — three-tile proof */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14, borderTop:'1px solid var(--hairline)', paddingTop:18 }}>
        {[
          { stat:'3m 41s', label:'Median time to decision', sub:'down from 4–5 days' },
          { stat:'94k',    label:'Tokens per session',     sub:'budgeted, signed' },
          { stat:'14',     label:'Specialist agents',      sub:'each first-class' },
        ].map((k,i)=>(
          <div key={i} className="col">
            <span className="t-num-big" style={{ fontSize:24, lineHeight:1 }}>{k.stat}</span>
            <span className="t-h4" style={{ marginTop:6, color:'var(--ink-2)' }}>{k.label}</span>
            <span className="t-body-sm muted" style={{ marginTop:1 }}>{k.sub}</span>
          </div>
        ))}
      </div>

      {/* Decorative grain seal in corner */}
      <svg style={{ position:'absolute', right:-90, top:'42%', width:340, height:340, opacity:0.05, pointerEvents:'none' }} viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="1" />
        <path d="M100 20 a80 80 0 0 1 0 160 a80 80 0 0 1 0 -160" fill="none" stroke="currentColor" strokeWidth="0.5" />
        <text x="100" y="50" textAnchor="middle" fontSize="9" fontFamily="var(--serif)" fill="currentColor" letterSpacing="3">CONCILIUM · MMXXVI</text>
        <text x="100" y="160" textAnchor="middle" fontSize="9" fontFamily="var(--serif)" fill="currentColor" letterSpacing="3">DELIBERAT · SIGNAT · ARCHIVAT</text>
        <text x="100" y="115" textAnchor="middle" fontSize="42" fontFamily="var(--serif)" fill="currentColor">C</text>
      </svg>
    </div>
  );
}

// ── Helpers shared across forms ─────────────────────────────
function Field({ label, hint, error, children, right }) {
  return (
    <div className="col gap-1" style={{ marginBottom:14 }}>
      <div className="row gap-2" style={{ justifyContent:'space-between' }}>
        <span className="t-h4">{label}</span>
        {right}
      </div>
      {children}
      {error && <span className="t-body-sm" style={{ color:'var(--red)' }}>{error}</span>}
      {hint && !error && <span className="t-body-sm muted">{hint}</span>}
    </div>
  );
}

function SSORow() {
  return (
    <div className="row gap-2" style={{ marginBottom:14 }}>
      {[
        { k:'ms',     label:'Microsoft' },
        { k:'google', label:'Google' },
        { k:'okta',   label:'Okta SSO' },
      ].map(p => (
        <button key={p.k} className="btn"
          style={{ flex:1, justifyContent:'center', height:38 }}>
          <SSOIcon kind={p.k} />
          <span>{p.label}</span>
        </button>
      ))}
    </div>
  );
}

function SSOIcon({ kind }) {
  const s = 14;
  if (kind==='ms') return (
    <svg width={s} height={s} viewBox="0 0 16 16">
      <rect x="1" y="1" width="6.5" height="6.5" fill="#F25022"/>
      <rect x="8.5" y="1" width="6.5" height="6.5" fill="#7FBA00"/>
      <rect x="1" y="8.5" width="6.5" height="6.5" fill="#00A4EF"/>
      <rect x="8.5" y="8.5" width="6.5" height="6.5" fill="#FFB900"/>
    </svg>
  );
  if (kind==='google') return (
    <svg width={s} height={s} viewBox="0 0 16 16">
      <path fill="#4285F4" d="M15.7 8.2c0-.6-.05-1.05-.15-1.55H8v2.9h4.4c-.1.75-.55 1.85-1.6 2.6l-.02.1 2.3 1.8.16.02c1.45-1.35 2.3-3.3 2.3-5.87z"/>
      <path fill="#34A853" d="M8 16c2.1 0 3.85-.7 5.13-1.9l-2.45-1.9c-.65.45-1.55.78-2.68.78-2.05 0-3.78-1.35-4.4-3.22l-.1.01-2.4 1.85-.03.1C2.35 14.2 4.95 16 8 16z"/>
      <path fill="#FBBC05" d="M3.6 9.76c-.18-.5-.28-1.05-.28-1.6 0-.55.1-1.1.27-1.6l-.005-.1L1.16 4.55l-.08.04C.4 5.65 0 6.8 0 8s.4 2.35 1.08 3.4L3.6 9.76z"/>
      <path fill="#EA4335" d="M8 3.18c1.45 0 2.43.62 2.99 1.15l2.18-2.13C11.85.8 10.1 0 8 0 4.95 0 2.35 1.8 1.08 4.4L3.6 6.24C4.22 4.37 5.95 3.18 8 3.18z"/>
    </svg>
  );
  // okta — wordmark dot
  return (
    <svg width={s} height={s} viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" fill="none" stroke="#007DC1" strokeWidth="2.5"/>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════
// SCREEN — Login
// ════════════════════════════════════════════════════════════════════
function ScreenLogin({ go }) {
  const [showPwd, setShowPwd] = useState(false);
  return (
    <AuthShell>
      <div className="t-tiny" style={{ marginBottom:8 }}>Welcome back</div>
      <h1 className="t-h1" style={{ margin:'0 0 6px', fontSize:30 }}>
        Sign in to <span className="serif-it">Concilium</span>
      </h1>
      <p className="t-body muted" style={{ margin:'0 0 24px' }}>
        Use your work email. Single-sign-on is enabled for your organization.
      </p>

      <SSORow />

      <div className="row gap-3" style={{ margin:'18px 0', color:'var(--ink-4)' }}>
        <span style={{ flex:1, borderTop:'1px solid var(--hairline)' }} />
        <span className="t-tiny" style={{ letterSpacing:'0.08em' }}>or with email</span>
        <span style={{ flex:1, borderTop:'1px solid var(--hairline)' }} />
      </div>

      <Field label="Work email">
        <input className="input" type="email" defaultValue="priya.anand@atlascapital.sg" placeholder="you@firm.com" />
      </Field>

      <Field label="Password" right={<a href="#" className="t-body-sm" style={{ color:'var(--accent)', textDecoration:'none' }} onClick={(e)=>{e.preventDefault(); go && go('forgot');}}>Forgot?</a>}>
        <div style={{ position:'relative' }}>
          <input className="input" type={showPwd?'text':'password'} defaultValue="••••••••••••" style={{ paddingRight:64 }} />
          <button onClick={()=>setShowPwd(s=>!s)} className="btn btn-sm btn-ghost"
            style={{ position:'absolute', right:6, top:4, height:24, padding:'0 8px', fontSize:11 }}>
            {showPwd ? 'Hide' : 'Show'}
          </button>
        </div>
      </Field>

      <div className="row gap-2" style={{ margin:'4px 0 22px', justifyContent:'space-between' }}>
        <label className="row gap-2" style={{ cursor:'pointer' }}>
          <input type="checkbox" defaultChecked />
          <span className="t-body-sm">Keep me signed in on this device</span>
        </label>
        <Pill icon="lock" square>MFA required</Pill>
      </div>

      <Btn kind="accent" lg style={{ width:'100%', justifyContent:'center', marginBottom:18 }}
        onClick={()=>go && go('dashboard')}>
        Sign in
        <Icon name="arrow-r" size={14} />
      </Btn>

      <div className="t-body-sm muted" style={{ textAlign:'center' }}>
        New to your organization?
        {' '}<a href="#" style={{ color:'var(--accent)' }} onClick={(e)=>{e.preventDefault(); go && go('register');}}>Request access</a>
      </div>

      <div className="hairline-t" style={{ marginTop:28, paddingTop:14, display:'flex', justifyContent:'space-between' }}>
        <span className="t-tiny muted">Atlas Capital · Singapore</span>
        <div className="row gap-3 t-tiny muted">
          <a href="#" style={{ color:'inherit' }}>Status</a>
          <a href="#" style={{ color:'inherit' }}>Trust</a>
          <a href="#" style={{ color:'inherit' }}>Support</a>
        </div>
      </div>
    </AuthShell>
  );
}

// ════════════════════════════════════════════════════════════════════
// SCREEN — Register (request access)
// ════════════════════════════════════════════════════════════════════
function ScreenRegister({ go }) {
  const [role, setRole] = useState('chair');
  const roles = [
    { v:'chair',    label:'Chair · committee owner',     hint:'Convene committees, decide.' },
    { v:'observer', label:'Observer · reviewer',         hint:'Read briefs, comment.' },
    { v:'admin',    label:'Workspace administrator',     hint:'Manage agents, billing, audit log.' },
  ];
  return (
    <AuthShell>
      <div className="t-tiny" style={{ marginBottom:8 }}>Step 1 of 2 · Account</div>
      <h1 className="t-h1" style={{ margin:'0 0 6px', fontSize:30 }}>
        Request <span className="serif-it">access</span>.
      </h1>
      <p className="t-body muted" style={{ margin:'0 0 22px' }}>
        Your workspace administrator reviews requests within one business day. Provisioning is automatic once approved.
      </p>

      <SSORow />

      <div className="row gap-3" style={{ margin:'14px 0', color:'var(--ink-4)' }}>
        <span style={{ flex:1, borderTop:'1px solid var(--hairline)' }} />
        <span className="t-tiny" style={{ letterSpacing:'0.08em' }}>or fill in manually</span>
        <span style={{ flex:1, borderTop:'1px solid var(--hairline)' }} />
      </div>

      <div className="row gap-2" style={{ marginBottom:0 }}>
        <Field label="First name"><input className="input" defaultValue="Cheryl" /></Field>
        <Field label="Last name"><input className="input" defaultValue="Goh" /></Field>
      </div>

      <Field label="Work email" hint="Must match your organization's domain.">
        <input className="input" type="email" defaultValue="cheryl.goh@atlascapital.sg" />
      </Field>

      <Field label="Role at the firm">
        <input className="input" defaultValue="Head of Client Onboarding" />
      </Field>

      <Field label="Workspace role" hint="Administrators can change this later.">
        <div className="col gap-2">
          {roles.map(r=>(
            <label key={r.v} className="row gap-3" style={{
              padding:'10px 12px',
              border:'1px solid var(--hairline)',
              borderColor: role===r.v ? 'var(--ink)' : 'var(--hairline)',
              borderRadius:6,
              background: role===r.v ? 'var(--tint)' : 'var(--surface-2)',
              cursor:'pointer',
            }}>
              <input type="radio" name="role" checked={role===r.v} onChange={()=>setRole(r.v)} style={{ accentColor:'var(--accent)' }}/>
              <div className="col">
                <span className="t-body strong">{r.label}</span>
                <span className="t-body-sm muted">{r.hint}</span>
              </div>
            </label>
          ))}
        </div>
      </Field>

      <Field label="Reason for access" hint="Briefly — your administrator will see this.">
        <textarea className="input" rows={3}
          defaultValue="Lead onboarding committee meetings; need to convene and sign decisions for new client files."
          style={{ resize:'vertical', minHeight:60 }}/>
      </Field>

      <div className="row gap-2" style={{ marginBottom:18 }}>
        <input type="checkbox" defaultChecked id="tos" style={{ accentColor:'var(--accent)' }}/>
        <label htmlFor="tos" className="t-body-sm muted">
          I agree to the <a href="#" style={{ color:'var(--accent)' }}>terms of service</a> and acknowledge the <a href="#" style={{ color:'var(--accent)' }}>data-handling policy</a>.
        </label>
      </div>

      <div className="row gap-2">
        <Btn kind="ghost" lg style={{ flex:1, justifyContent:'center' }}
          onClick={()=>go && go('login')}>← Back to sign in</Btn>
        <Btn kind="accent" lg style={{ flex:1.5, justifyContent:'center' }}
          onClick={()=>go && go('verify')}>
          Send request
          <Icon name="arrow-r" size={14} />
        </Btn>
      </div>

      <div className="t-tiny muted" style={{ textAlign:'center', marginTop:22 }}>
        Already approved? <a href="#" style={{ color:'var(--accent)' }} onClick={(e)=>{e.preventDefault(); go && go('login');}}>Sign in instead</a>
      </div>
    </AuthShell>
  );
}

// ════════════════════════════════════════════════════════════════════
// SCREEN — Verify (email + MFA setup)
// ════════════════════════════════════════════════════════════════════
function ScreenVerify({ go }) {
  const [code, setCode] = useState(['1','7','','','','']);
  return (
    <AuthShell>
      <div className="t-tiny" style={{ marginBottom:8 }}>Step 2 of 2 · Verify</div>
      <h1 className="t-h1" style={{ margin:'0 0 6px', fontSize:30 }}>
        Check your <span className="serif-it">inbox</span>.
      </h1>
      <p className="t-body muted" style={{ margin:'0 0 22px' }}>
        We sent a six-digit code to <strong className="strong">cheryl.goh@atlascapital.sg</strong>. It expires in 10 minutes.
      </p>

      <Field label="Verification code">
        <div className="row gap-2">
          {code.map((d,i)=>(
            <input key={i} className="input"
              value={d}
              onChange={(e)=>{
                const v = e.target.value.replace(/\D/g,'').slice(0,1);
                const next = [...code]; next[i] = v; setCode(next);
              }}
              style={{
                width:48, height:54,
                textAlign:'center',
                fontFamily:'var(--serif)', fontSize:24,
                fontVariantNumeric:'tabular-nums',
              }} maxLength={1}/>
          ))}
        </div>
      </Field>

      <div className="card" style={{ padding:'12px 14px', marginBottom:18, background:'var(--tint)' }}>
        <div className="row gap-2" style={{ marginBottom:6, alignItems:'center' }}>
          <Icon name="lock" size={13} style={{ color:'var(--accent)' }} />
          <span className="t-h4">Set up multi-factor authentication</span>
          <Pill tone="amber" square>Required</Pill>
        </div>
        <p className="t-body-sm muted" style={{ margin:'0 0 8px' }}>
          Your organization requires hardware-token or authenticator-app MFA for governance-level access.
        </p>
        <div className="row gap-2">
          <Btn sm style={{ flex:1, justifyContent:'center' }}>Authenticator app</Btn>
          <Btn sm style={{ flex:1, justifyContent:'center' }}>YubiKey / FIDO2</Btn>
          <Btn sm style={{ flex:1, justifyContent:'center' }} kind="ghost">Configure later</Btn>
        </div>
      </div>

      <Btn kind="accent" lg style={{ width:'100%', justifyContent:'center', marginBottom:12 }}
        onClick={()=>go && go('dashboard')}>
        Verify and continue
        <Icon name="arrow-r" size={14} />
      </Btn>

      <div className="row gap-3" style={{ justifyContent:'center', marginTop:10 }}>
        <span className="t-body-sm muted">Didn't get the code?</span>
        <a href="#" className="t-body-sm" style={{ color:'var(--accent)' }}>Resend</a>
        <span className="t-body-sm muted">·</span>
        <a href="#" className="t-body-sm" style={{ color:'var(--accent)' }} onClick={(e)=>{e.preventDefault(); go && go('register');}}>Change email</a>
      </div>
    </AuthShell>
  );
}

// ════════════════════════════════════════════════════════════════════
// SCREEN — Forgot password
// ════════════════════════════════════════════════════════════════════
function ScreenForgot({ go }) {
  return (
    <AuthShell>
      <a href="#" className="t-body-sm" style={{ color:'var(--ink-3)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6, marginBottom:18 }}
        onClick={(e)=>{e.preventDefault(); go && go('login');}}>
        <Icon name="arrow-r" size={11} style={{ transform:'rotate(180deg)' }} />
        Back to sign in
      </a>

      <div className="t-tiny" style={{ marginBottom:8 }}>Account recovery</div>
      <h1 className="t-h1" style={{ margin:'0 0 6px', fontSize:30 }}>
        Forgot your <span className="serif-it">password</span>?
      </h1>
      <p className="t-body muted" style={{ margin:'0 0 24px' }}>
        Enter the email associated with your account. We'll send a one-time recovery link.
      </p>

      <Field label="Work email" hint="If your firm uses single-sign-on, contact your administrator instead.">
        <input className="input" type="email" placeholder="you@firm.com" defaultValue="priya.anand@atlascapital.sg" />
      </Field>

      <Btn kind="accent" lg style={{ width:'100%', justifyContent:'center', marginBottom:14 }}
        onClick={()=>go && go('login')}>
        Send recovery link
        <Icon name="send" size={13} />
      </Btn>

      <div className="card" style={{ padding:'12px 14px', background:'var(--tint)' }}>
        <div className="row gap-2" style={{ marginBottom:4, alignItems:'center' }}>
          <Icon name="warn" size={13} style={{ color:'var(--amber)' }} />
          <span className="t-h4">Locked out?</span>
        </div>
        <p className="t-body-sm muted" style={{ margin:0 }}>
          After three failed sign-ins, your account locks for one hour for security. Contact your workspace administrator at <a href="#" style={{ color:'var(--accent)' }}>admin@atlascapital.sg</a> to unlock immediately.
        </p>
      </div>
    </AuthShell>
  );
}

Object.assign(window, { ScreenLogin, ScreenRegister, ScreenVerify, ScreenForgot });
