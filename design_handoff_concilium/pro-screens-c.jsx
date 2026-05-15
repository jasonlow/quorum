/* global React, COMMITTEES, Icon, Avatar, AvatarStack, Btn, Pill, PageHeader, AGENT_ICON */
const { useState, Fragment } = React;

// ════════════════════════════════════════════════════════════════════
// SCREEN 5 — Q&A Discussion
// ════════════════════════════════════════════════════════════════════
function ScreenQA({ committee='risk', go }) {
  const uc = COMMITTEES[committee] || COMMITTEES.risk;
  const threads = [
    { id:'q1', live:true,  title:'Is the 15% collateral buffer adequate for ETH volatility?', turns:5, conv:'Convergent' },
    { id:'q2', live:false, title:'How does the September Fed rate outlook affect knock-in probability?', turns:3, conv:'In progress' },
    { id:'q3', live:false, title:'Are there MAS notices beyond SFA04-N12 §4.3 that apply?', turns:0, conv:'Queued' },
    { id:'q4', live:false, title:'Operational worst-case time-to-margin top-up?', turns:0, conv:'Queued' },
  ];
  const [active, setActive] = useState('q1');
  const posts = [
    { who:'Risk Manager',  ini:'RM', tone:'red',   pos:'opposes',  round:1, text:'Buffer needs to be 22%. Stress test (Mar 2020): −54% in 9 days. 15% gives ~6 days before margin call.' },
    { who:'Strategist',    ini:'IS', tone:'blue',  pos:'partial',  round:1, text:'Agree directionally with Risk. But: knock-in only triggers if spot < 70% at maturity. Path-independent. 15% is fine if we monitor weekly.' },
    { who:'Macro',         ini:'ME', tone:'red',   pos:'opposes',  round:1, text:'Fed cuts H2 = ETH rally — no problem. Fed pause = sideways — no problem. Fed hike (15% odds) = crash. 15% buffer blows up in that scenario.' },
    { who:'Treasury & Ops',ini:'TR', tone:'green', pos:'supports', round:1, text:'Operationally we can top up within 4 hours via Fireblocks. 15% works if Risk sets a 12% auto-call trigger.' },
    { who:'Risk Manager',  ini:'RM', tone:'red',   pos:'updated',  round:2, text:'Revised: 18% with 12% auto-call trigger. Accepting Treasury\'s ops backstop. Hard nope on 15%.' },
  ];
  const posPill = (p)=> p==='opposes' ? <Pill tone="red" square>Opposes</Pill>
                     : p==='supports'? <Pill tone="green" square>Supports</Pill>
                     : p==='partial' ? <Pill tone="amber" square>Partial</Pill>
                     :                  <Pill square>Updated</Pill>;

  return (
    <div className="col" style={{ height:'100%' }}>
      <PageHeader
        eyebrow={`${uc.short} · discussion`}
        title={<>Cross-functional <span className="serif-it">Q&amp;A</span>.</>}
        sub="After the first round of drafts, the Chief of Staff routes follow-up questions to the agents whose perspectives matter. Structured turn-taking — not a free-for-all chat."
        right={<>
          <Pill icon="clock"><span className="t-num">02:08</span></Pill>
          <Btn sm kind="ghost" icon="arrow-r" onClick={()=>go && go('brief')}>Proceed to brief</Btn>
        </>}
      />
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'280px minmax(0, 1fr)', overflow:'hidden' }}>
        {/* Question queue */}
        <div className="col hairline-r" style={{ background:'var(--surface)', padding:'14px 14px', gap:8, overflow:'auto' }}>
          <div className="t-tiny" style={{ padding:'2px 4px' }}>Question queue · 4</div>
          {threads.map(t=>(
            <div key={t.id} onClick={()=>setActive(t.id)}
                 className="card"
                 style={{ padding:'10px 12px', cursor:'pointer',
                          background: active===t.id ? 'var(--tint)' : 'var(--surface)',
                          borderColor: active===t.id ? 'var(--ink)' : 'var(--hairline)' }}>
              <div className="row gap-2" style={{ marginBottom:6 }}>
                <span className="t-mono muted">{t.id.toUpperCase()}</span>
                {t.live && <><span className="live-dot" /><span className="t-tiny" style={{ color:'var(--accent)' }}>Live</span></>}
                <div className="grow" />
                <span className="t-body-sm muted">{t.turns} turns</span>
              </div>
              <div className="t-body strong" style={{ lineHeight:1.35 }}>{t.title}</div>
              <div className="t-body-sm muted" style={{ marginTop:4 }}>{t.conv}</div>
            </div>
          ))}
          <div className="card" style={{ padding:'10px 12px', borderStyle:'dashed', cursor:'pointer', background:'transparent' }}>
            <div className="row gap-2" style={{ color:'var(--ink-3)' }}>
              <Icon name="plus" size={12} />
              <span className="t-body-sm">Chair: ask a follow-up</span>
            </div>
          </div>
        </div>

        {/* Thread */}
        <div className="col" style={{ overflow:'auto', padding:'18px 32px 24px' }}>
          <div className="col gap-1" style={{ marginBottom:16 }}>
            <div className="t-tiny">Q1 · live · moderated by CoS</div>
            <div className="t-h1" style={{ fontSize:26 }}>"Is the 15% collateral buffer adequate for ETH volatility?"</div>
          </div>

          <div style={{ position:'relative', paddingLeft:36 }}>
            <div style={{ position:'absolute', left:14, top:14, bottom:24, borderLeft:'1px dashed var(--hairline)' }} />
            {posts.map((p,i)=>(
              <div key={i} className="row gap-3" style={{ marginBottom:14, alignItems:'flex-start' }}>
                <Avatar initials={p.ini} rim={p.tone} style={{ marginLeft:-36, zIndex:1, background:'var(--surface)' }} />
                <div className="card-elev grow" style={{ padding:'10px 14px' }}>
                  <div className="row gap-2" style={{ marginBottom:4, alignItems:'baseline' }}>
                    <span className="t-h3">{p.who}</span>
                    <span className="t-tiny">Round {p.round}</span>
                    <div className="grow" />
                    {posPill(p.pos)}
                  </div>
                  <p className="t-body" style={{ margin:0, color:'var(--ink-2)' }}>{p.text}</p>
                </div>
              </div>
            ))}
            <div className="row gap-3" style={{ alignItems:'flex-start' }}>
              <span className="av" style={{ marginLeft:-36, zIndex:1, background:'var(--ink)', color:'var(--surface)', borderColor:'var(--ink)' }}><Icon name="sparkle" size={13} /></span>
              <div className="card-elev grow" style={{ padding:'12px 14px', background:'var(--ink)', color:'var(--surface)', borderColor:'var(--ink)' }}>
                <div className="t-tiny" style={{ color:'rgba(255,255,255,0.7)', marginBottom:4 }}>Chief of Staff · synthesis</div>
                <div className="t-quote" style={{ marginBottom:6, fontSize:15 }}>Convergence on 18% buffer with a 12% auto-call trigger. One dissent (Macro) — preserved on record.</div>
                <div className="row gap-2">
                  <Pill tone="green" square>4 of 5 aligned</Pill>
                  <Pill tone="red" square>Macro dissents</Pill>
                  <div className="grow" />
                  <Btn sm kind="ghost" iconRight="arrow-r" style={{ color:'var(--surface)', borderColor:'rgba(255,255,255,0.25)' }}>Next question</Btn>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding:'10px 12px', marginTop:18, background:'var(--surface)' }}>
            <div className="row gap-2">
              <input className="input" style={{ flex:1, border:'none' }} placeholder="Chair: type a follow-up — CoS will route it to the right agents…" />
              <Btn sm kind="ghost">@mention</Btn>
              <Btn sm kind="primary" icon="send">Send</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SCREEN 6 — Consolidated Brief + Decision
// ════════════════════════════════════════════════════════════════════
function ScreenBrief({ committee='risk', go }) {
  const uc = COMMITTEES[committee] || COMMITTEES.risk;
  return (
    <div className="col" style={{ height:'100%' }}>
      <div className="row gap-3 hairline" style={{ padding:'10px 24px', background:'var(--surface)' }}>
        <span className="t-tiny">Session S-2147</span>
        <span style={{ color:'var(--ink-4)' }}>·</span>
        <span className="t-body-sm muted">{uc.name}</span>
        <span style={{ color:'var(--ink-4)' }}>·</span>
        <Pill icon="clock" tone="ink"><span className="t-num">3m 41s</span> total</Pill>
        <div className="grow" />
        <Btn sm kind="ghost" icon="eye">Replay deliberation</Btn>
        <Btn sm kind="ghost" icon="doc">Export PDF</Btn>
        <Btn sm kind="ghost">Export JSON</Btn>
      </div>

      <div style={{ flex:1, display:'grid', gridTemplateColumns:'minmax(0, 1fr) 340px', overflow:'hidden' }}>
        {/* Left — the brief itself */}
        <div className="col" style={{ overflow:'auto', padding:'28px 40px 40px' }}>
          <div className="t-tiny" style={{ marginBottom:8 }}>Consolidated brief · for the chair</div>
          <div className="t-display" style={{ marginBottom:8 }}>{uc.topic}</div>
          <div className="t-body" style={{ color:'var(--ink-2)', maxWidth:760, marginBottom:18 }}>
            ETH Accumulator Series 3 is a viable Q3 product for accredited Singapore clients, subject to three risk-parameter and disclosure adjustments. One agent (Macro) maintains a dissent on Fed tail-risk, preserved on record.
          </div>

          {/* Recommendation */}
          <div className="card-elev grain" style={{ padding:20, marginBottom:22, background:'var(--surface-2)', borderColor:'var(--accent)', borderLeft:'4px solid var(--accent)' }}>
            <div className="row gap-3" style={{ alignItems:'baseline' }}>
              <span className="t-tiny" style={{ color:'var(--accent)' }}>Recommendation</span>
              <Pill tone="green" icon="check">4 of 5 agree</Pill>
            </div>
            <div className="t-h1" style={{ margin:'6px 0', fontSize:28 }}>Approve — with three conditions.</div>
            <p className="t-body" style={{ margin:0, color:'var(--ink-2)' }}>
              The committee recommends approving ETH Accumulator Series 3 for the accredited investor channel, conditional on tightening the collateral buffer, restricting eligibility, and disclosing the Fed-scenario CVaR sensitivity.
            </p>
          </div>

          {/* Conditions */}
          <div className="t-h2 serif-it" style={{ marginBottom:10 }}>Conditions</div>
          <div className="col gap-3" style={{ marginBottom:24 }}>
            {[
              {n:1, t:'Tighten buffer to 18% with 12% auto-call trigger', who:'Risk Manager, Treasury & Ops', body:'Increase the collateral buffer from 15% to 18%. Add a 12% spot auto-call trigger. Treasury confirms a 4-hour operational top-up via Fireblocks.'},
              {n:2, t:'Restrict eligibility to MAS Accredited Investors', who:'Compliance Officer', body:'No retail offer. Apply the MAS AI category per SFA04-N12 §4.3. Add a cooling-off clause and explicit suitability sign-off in the term sheet.'},
              {n:3, t:'Disclose CVaR sensitivity to Fed scenarios', who:'Risk Manager, Strategist', body:'Add Fed-hike CVaR scenario ($3.4M) and 22% downside path-stress to the term sheet, p.7. Distribute prior to first allocation.'},
            ].map(c=>(
              <div key={c.n} className="card-elev" style={{ padding:16 }}>
                <div className="row gap-3" style={{ alignItems:'baseline', marginBottom:6 }}>
                  <span className="t-num-big" style={{ fontSize:22, color:'var(--accent)', width:34 }}>{c.n}.</span>
                  <div className="grow">
                    <div className="t-h3" style={{ fontSize:15 }}>{c.t}</div>
                    <div className="t-body-sm muted" style={{ marginTop:1 }}>From: {c.who}</div>
                  </div>
                </div>
                <p className="t-body" style={{ margin:'4px 0 0 38px', color:'var(--ink-2)' }}>{c.body}</p>
              </div>
            ))}
          </div>

          {/* Dissent */}
          <div className="card-elev" style={{ padding:18, marginBottom:24, borderLeft:'4px solid var(--red)', background:'var(--surface)' }}>
            <div className="row gap-2" style={{ marginBottom:6, alignItems:'baseline' }}>
              <Icon name="flag" size={13} style={{ color:'var(--red)' }} />
              <span className="t-tiny" style={{ color:'var(--red)' }}>Dissent · preserved on record</span>
              <div className="grow" />
              <Avatar initials="ME" size="sm" rim="red" />
              <span className="t-body-sm strong">Macro Economist</span>
            </div>
            <p className="t-quote" style={{ margin:'4px 0 8px' }}>
              "A Fed hike scenario, while only 15% probability, creates outsized tail-risk. Even with the 18% buffer, a 30%+ ETH drawdown in 60 days exhausts margin coverage. I recommend deferring to Q4 once the September FOMC has cleared."
            </p>
            <div className="t-body-sm muted">Chair must explicitly acknowledge the dissent in the signed decision.</div>
          </div>

          {/* Provenance */}
          <div className="t-h3" style={{ marginBottom:8 }}>How the committee got here</div>
          <div className="card-elev" style={{ padding:'2px 0' }}>
            {[
              { t:'00:42', e:'Five agents submitted drafts in parallel.', who:'Committee' },
              { t:'01:23', e:'CoS sent Risk Manager back: quantify drawdown · address correlation flag.', who:'Chief of Staff' },
              { t:'01:55', e:'Risk re-submitted (round 2). Passed all five quality checks.', who:'Risk Manager' },
              { t:'02:08', e:'Q&A on buffer sizing — convergence on 18% + 12% auto-call.', who:'Discussion' },
              { t:'02:34', e:'Q&A on Fed scenario — Macro maintained dissent.', who:'Discussion' },
              { t:'03:18', e:'CoS synthesized brief; weighted recommendations by domain authority.', who:'Chief of Staff' },
              { t:'03:41', e:'Ready for chair decision.', who:'System' },
            ].map((r,i,arr)=>(
              <div key={i} className="row gap-3" style={{ padding:'9px 16px', borderBottom: i<arr.length-1?'1px solid var(--hairline-2)':'none' }}>
                <span className="t-mono muted" style={{ width:50 }}>{r.t}</span>
                <span className="t-body grow">{r.e}</span>
                <span className="t-body-sm muted">{r.who}</span>
                <Icon name="arrow-r" size={11} style={{ color:'var(--ink-4)' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Right rail — decision */}
        <div className="col" style={{ background:'var(--surface)', borderLeft:'1px solid var(--hairline)', padding:'22px 22px 22px', gap:16, overflow:'auto' }}>
          <div className="col gap-1">
            <div className="t-tiny">The chair decides</div>
            <div className="t-h2" style={{ fontSize:22 }}><em className="serif-it">Your call.</em></div>
            <div className="t-body-sm muted">Committee advises. You sign.</div>
          </div>

          <div className="row gap-3" style={{ padding:'10px 12px', background:'var(--tint)', borderRadius:6 }}>
            <Avatar initials={uc.persona.initials} rim="accent" />
            <div className="col">
              <span className="t-body strong">{uc.persona.name}</span>
              <span className="t-tiny">{uc.persona.role}</span>
            </div>
          </div>

          <div className="col gap-2">
            <Btn kind="accent" lg icon="check" style={{ justifyContent:'flex-start' }}>Approve with conditions</Btn>
            <Btn lg icon="x" kind="danger" style={{ justifyContent:'flex-start' }}>Reject &amp; defer to Q4</Btn>
            <Btn lg icon="refresh" style={{ justifyContent:'flex-start' }}>Send back to committee</Btn>
            <Btn lg icon="arrow-u" style={{ justifyContent:'flex-start' }}>Escalate to IC</Btn>
          </div>

          <div className="col gap-2">
            <div className="t-tiny">Override controls</div>
            <div className="row gap-2" style={{ alignItems:'center' }}>
              <input type="checkbox" defaultChecked /><span className="t-body-sm">Acknowledge Macro's dissent in signed text</span>
            </div>
            <div className="row gap-2" style={{ alignItems:'center' }}>
              <input type="checkbox" defaultChecked /><span className="t-body-sm">Copy to Investment Committee minutes</span>
            </div>
          </div>

          <div className="card" style={{ padding:'10px 12px', background:'var(--bg)' }}>
            <div className="t-tiny" style={{ marginBottom:4 }}>Audit footprint</div>
            <div className="t-body-sm" style={{ color:'var(--ink-2)' }}>Signed by chair → archived → exportable as PDF + JSON. Every prompt, draft, and CoS intervention is preserved for replay.</div>
            <div className="row gap-2" style={{ marginTop:8 }}>
              <Pill tone="green" square icon="check">Traceable</Pill>
              <Pill tone="green" square icon="check">Replayable</Pill>
            </div>
          </div>

          <div className="t-tiny muted" style={{ marginTop:'auto' }}>
            6 agents · 94k tokens · $0.14 · session S-2147 · 4m 08s
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SCREEN 7 — Agent profile / Library detail
// ════════════════════════════════════════════════════════════════════
function ScreenAgent({ go }) {
  return (
    <div className="col" style={{ height:'100%', overflow:'auto' }}>
      <PageHeader
        eyebrow="Agent library · profile"
        title={<>Regulatory Hawk <span className="serif-it muted" style={{ fontSize:22 }}>· MAS / SEC / FINMA</span></>}
        sub="Agents are first-class. Each has a persona, a domain authority, an ideology, explicit boundaries, and a measurable quality record."
        right={<>
          <Btn sm kind="ghost" icon="eye">Test-drive</Btn>
          <Btn sm kind="ghost">Duplicate</Btn>
          <Btn sm kind="primary" icon="check">Publish</Btn>
        </>}
      />

      <div style={{ padding:'24px 32px', display:'grid', gridTemplateColumns:'minmax(0, 1.4fr) minmax(0, 1fr)', gap:24 }}>
        <div className="col gap-4">
          {/* Identity */}
          <div className="card-elev" style={{ padding:18 }}>
            <div className="row gap-4">
              <Avatar initials="RH" size="xl" rim="accent" />
              <div className="col grow">
                <div className="t-h2" style={{ fontSize:22 }}>Regulatory Hawk</div>
                <div className="t-body-sm muted">15 years across MAS, SEC, and FINMA. Cites chapter and verse. Defaults to stricter interpretation when statute is ambiguous.</div>
                <div className="row gap-2" style={{ marginTop:10 }}>
                  <Pill tone="green" square icon="check">Production</Pill>
                  <Pill square>14 sessions</Pill>
                  <Pill square>4.7 ★ avg quality</Pill>
                </div>
              </div>
            </div>
          </div>

          {/* Persona */}
          <div className="card-elev" style={{ padding:18 }}>
            <div className="t-h3" style={{ marginBottom:8 }}>Persona prompt</div>
            <div className="card" style={{ padding:'10px 12px', background:'var(--bg)', fontFamily:'var(--mono)', fontSize:11.5, color:'var(--ink-2)', lineHeight:1.6 }}>
              You are a regulatory affairs specialist with 15 years across MAS, SEC, and FINMA.<br/>
              You think in deadlines, exemptions, and disclosure obligations.<br/>
              You cite specific notices and section numbers when flagging risk.<br/>
              You defer to in-house Legal on contract language.<br/>
              You never opine on investment merit or pricing.
            </div>
            <div className="row gap-2" style={{ marginTop:8 }}>
              <span className="t-body-sm muted">312 tokens</span>
              <div className="grow" />
              <Btn sm kind="ghost" icon="pencil">Edit</Btn>
            </div>
          </div>

          {/* Authority + ideology */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div className="card-elev" style={{ padding:16 }}>
              <div className="t-h3" style={{ marginBottom:10 }}>Domain authority</div>
              <div className="col gap-2">
                {[
                  ['Regulatory deadlines', 5],
                  ['Investor classification', 5],
                  ['Cross-border issues', 4],
                  ['Operational risk', 3],
                  ['Market timing', 1],
                  ['Tax', 1],
                ].map(([k,v])=>(
                  <div key={k} className="row gap-2">
                    <span className="t-body-sm" style={{ width:160, color:'var(--ink-2)' }}>{k}</span>
                    <div className="bar grow" style={{ height:6 }}><i style={{ width:`${v*20}%`, background:'var(--accent)' }} /></div>
                    <span className="t-mono muted" style={{ width:24, textAlign:'right' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-elev" style={{ padding:16 }}>
              <div className="t-h3" style={{ marginBottom:10 }}>Ideology</div>
              <div className="row gap-2" style={{ alignItems:'center', marginBottom:14 }}>
                <span className="t-body-sm muted">Aggressive</span>
                <div className="bar grow" style={{ height:8 }}>
                  <i style={{ width:'22%', background:'var(--accent)' }} />
                </div>
                <span className="t-body-sm strong">Conservative</span>
              </div>
              <div className="t-body" style={{ color:'var(--ink-2)' }}>
                Defaults to <strong>more</strong> disclosure, <strong>narrower</strong> eligibility, and <strong>stricter</strong> interpretation when statute is ambiguous.
              </div>
              <div className="hairline-t" style={{ marginTop:12, paddingTop:10 }}>
                <div className="t-h4" style={{ marginBottom:6 }}>Boundaries</div>
                <ul className="t-body-sm" style={{ margin:0, paddingLeft:18, color:'var(--ink-2)' }}>
                  <li>Cite specific notice and section when flagging risk.</li>
                  <li>Defer to in-house Legal on contract language.</li>
                  <li>Never opine on investment merit or pricing.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right — tools, test, model */}
        <div className="col gap-4">
          <div className="card-elev" style={{ padding:16 }}>
            <div className="t-h3" style={{ marginBottom:10 }}>Tools &amp; data sources</div>
            <div className="row gap-2" style={{ flexWrap:'wrap' }}>
              {[
                {n:'MAS RegLib',  on:true},
                {n:'SEC EDGAR',   on:true},
                {n:'Internal Policy Wiki', on:true},
                {n:'FINMA Circulars', on:true},
                {n:'Bloomberg Terminal', on:false},
                {n:'Web search', on:false},
              ].map((t,i)=>(
                <span key={i} className={`chip ${t.on?'chip-on':''}`}>{t.on?'✓ ':''}{t.n}</span>
              ))}
              <span className="chip chip-dim">+ add tool</span>
            </div>
          </div>

          <div className="card-elev" style={{ padding:16 }}>
            <div className="t-h3" style={{ marginBottom:10 }}>Test-drive</div>
            <div className="card" style={{ padding:'10px 12px', marginBottom:10, background:'var(--bg)' }}>
              <div className="t-tiny">Question</div>
              <div className="t-body" style={{ marginTop:2 }}>"Can we offer this to retail clients in Singapore?"</div>
            </div>
            <div className="row gap-2" style={{ alignItems:'flex-start' }}>
              <Avatar initials="RH" size="sm" rim="accent" />
              <div className="card grow" style={{ padding:'10px 12px' }}>
                <p className="t-body" style={{ margin:0, color:'var(--ink-2)' }}>
                  <strong>No.</strong> Structured products with knock-in features fall under MAS Notice SFA04-N12 §4.3 — accredited investors only. Retail offer requires a prospectus per SFA s.240, and ETH-linked instruments further fall under PSA risk-disclosure rules. <em>Defer to Legal on prospectus drafting.</em>
                </p>
                <div className="row gap-2" style={{ marginTop:6 }}>
                  <Pill square>2 citations</Pill>
                  <Pill tone="green" square>High confidence</Pill>
                  <span className="t-body-sm muted t-num" style={{ marginLeft:'auto' }}>1.4s</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card-elev" style={{ padding:16 }}>
            <div className="t-h3" style={{ marginBottom:10 }}>Model &amp; runtime</div>
            <div className="row gap-2" style={{ flexWrap:'wrap' }}>
              <Pill tone="ink">Claude Sonnet 4.5</Pill>
              <Pill>temp 0.3</Pill>
              <Pill>max 3 revision rounds</Pill>
              <Pill>cost ~$0.018 / draft</Pill>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenQA, ScreenBrief, ScreenAgent });
