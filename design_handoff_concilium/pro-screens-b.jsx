/* global React, COMMITTEES, Icon, Avatar, AvatarStack, Btn, Pill, AgentTile, PageHeader, AGENT_ICON */
const { useState, useEffect, useMemo, Fragment } = React;

// ════════════════════════════════════════════════════════════════════
// SCREEN 3 — Boardroom (LIVE deliberation) — the hero
// ════════════════════════════════════════════════════════════════════
function ScreenBoardroom({ committee='risk', phase='mid', go }) {
  const uc = COMMITTEES[committee] || COMMITTEES.risk;
  // phase: early | mid | late
  const stateFor = (i)=>{
    if (phase==='early') return i<1 ? 'submitted' : i<2 ? 'drafting' : 'thinking';
    if (phase==='late')  return i===0 ? 'revising' : i===uc.agents.length-1 ? 'dissent' : 'passed';
    // mid
    if (i===0) return 'revising';
    if (i===uc.agents.length-1) return 'thinking';
    return 'submitted';
  };
  const cosProgress = phase==='early' ? 18 : phase==='late' ? 88 : 55;
  const submitted = uc.agents.map((_,i)=>stateFor(i)).filter(s=>s==='submitted'||s==='passed'||s==='revising'||s==='dissent').length;

  return (
    <div className="col" style={{ height:'100%' }}>
      {/* Top bar */}
      <div className="row gap-3 hairline" style={{ padding:'12px 24px', background:'var(--surface)' }}>
        <span className="live-dot" />
        <span className="t-tiny">Live deliberation</span>
        <span style={{ color:'var(--ink-4)' }}>·</span>
        <span className="t-body-sm muted">{uc.name}</span>
        <span style={{ color:'var(--ink-4)' }}>·</span>
        <span className="t-body strong">{uc.topic}</span>
        <div className="grow" />
        <Pill icon="clock" tone="ink"><span className="t-num">00:{phase==='early'?'18':phase==='late'?'2:14':'42'}</span> elapsed</Pill>
        <Pill icon="users">{uc.agents.length} agents · {uc.pattern.split(' →')[0]}</Pill>
        <Btn sm kind="ghost" icon="eye">Replay</Btn>
        <Btn sm kind="danger" icon="stop">Abort</Btn>
      </div>

      {/* Headline */}
      <div className="row gap-4" style={{ padding:'22px 32px 6px', alignItems:'flex-end' }}>
        <div className="col grow">
          <div className="t-tiny">Phase {phase==='early'?'1 of 3':phase==='late'?'3 of 3':'2 of 3'} · {phase==='early'?'Drafting':phase==='late'?'Final review':'Quality review'}</div>
          <div className="t-display" style={{ marginTop:6, maxWidth:840 }}>
            <em className="serif-it">"Should we launch ETH Accumulator Series 3</em> to accredited clients in Q3?<em className="serif-it">"</em>
          </div>
        </div>
        <div className="col gap-1" style={{ textAlign:'right' }}>
          <span className="t-tiny">Drafts received</span>
          <span className="t-num-big">{submitted} <span style={{ fontSize:18, color:'var(--ink-3)' }}>/ {uc.agents.length}</span></span>
        </div>
      </div>

      {/* Body — agent grid + CoS panel side by side */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:'minmax(0, 1fr) 340px', gap:0, overflow:'hidden' }}>

        {/* Agent grid */}
        <div className="col" style={{ padding:'18px 32px 18px', overflow:'auto' }}>
          <div className="row gap-2" style={{ alignItems:'baseline', marginBottom:14 }}>
            <span className="t-h3">Committee members</span>
            <span className="t-body-sm muted">drafting in parallel · click any card to expand</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(230px, 1fr))', gap:14 }}>
            {uc.agents.map((a,i)=>{
              const st = stateFor(i);
              const detail = st==='revising' ? 'round 2 of 3'
                          : st==='passed'   ? '1st round'
                          : st==='submitted'? `${(i*7+1.3).toFixed(1)}s draft`
                          : st==='dissent'  ? 'opposes'
                          : st==='drafting' ? '~12s'
                          : '~28s';
              return <AgentTile key={a.id} agent={a} state={st} detail={detail} />;
            })}
          </div>

          {/* Live transcript stream */}
          <div className="card-elev" style={{ marginTop:18, padding:'12px 16px' }}>
            <div className="row gap-2" style={{ alignItems:'baseline', marginBottom:10 }}>
              <div className="t-h3">Live stream</div>
              <span className="t-body-sm muted">key events — full transcript is recorded for audit</span>
              <div className="grow" />
              <Btn sm kind="ghost" icon="pause">Pause stream</Btn>
            </div>
            <div className="col gap-2">
              {[
                { t:'00:42', who:'CoS', body:'Sending Risk Manager back: quantify worst-case drawdown · address Strategy correlation flag.', tone:'amber' },
                { t:'00:38', who:'Treasury & Operations', body:'Submitted. 4-hour Fireblocks top-up confirmed. 12% auto-call trigger supported.', tone:'green' },
                { t:'00:31', who:'Compliance Officer', body:'Submitted. MAS SFA04-N12 §4.3 path-stress disclosure required. AI category only.', tone:'green' },
                { t:'00:24', who:'CoS', body:'Quality gate active. Reviewing drafts as they arrive.', tone:'ink' },
                { t:'00:11', who:'Macro Economist', body:'Drafting…', tone:'muted' },
              ].map((e,i)=>(
                <div key={i} className="row gap-3" style={{ padding:'4px 0', alignItems:'flex-start' }}>
                  <span className="t-mono muted" style={{ width:50, flex:'0 0 50px', paddingTop:1 }}>{e.t}</span>
                  <span className="t-h4" style={{ width:140, flex:'0 0 140px', color: e.tone==='muted'?'var(--ink-4)':'var(--ink)' }}>{e.who}</span>
                  <span className="t-body grow" style={{ color: e.tone==='muted'?'var(--ink-4)':'var(--ink-2)' }}>{e.body}</span>
                  {e.tone!=='muted' && e.tone!=='ink' && <Pill tone={e.tone} square>{e.tone==='green'?'✓':'↻'}</Pill>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CoS rail */}
        <div className="col hairline-r" style={{ background:'var(--surface)', borderLeft:'1px solid var(--hairline)', padding:'18px 20px', overflow:'auto', gap:14 }}>
          <div className="row gap-3">
            <div style={{ width:36, height:36, borderRadius:8, background:'var(--ink)', color:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="sparkle" size={16} />
            </div>
            <div className="col grow">
              <div className="t-h3">Chief of Staff</div>
              <div className="t-tiny">quality gate · editor · challenger</div>
            </div>
          </div>

          <div className="card" style={{ padding:'10px 12px', background:'var(--tint)' }}>
            <div className="row gap-2" style={{ marginBottom:6, alignItems:'baseline' }}>
              <span className="t-h4">Reviewing drafts</span>
              <div className="grow" />
              <span className="t-mono muted">{cosProgress}%</span>
            </div>
            <div className="bar bar-accent"><i style={{ width:`${cosProgress}%` }} /></div>
            <div className="row gap-3" style={{ marginTop:10, justifyContent:'space-between' }}>
              <div className="col"><span className="t-tiny">Received</span><span className="strong t-num">{submitted}/{uc.agents.length}</span></div>
              <div className="col"><span className="t-tiny">Passed QA</span><span className="strong t-num" style={{ color:'var(--green)' }}>{Math.max(0, submitted-1)}/{uc.agents.length}</span></div>
              <div className="col"><span className="t-tiny">Round</span><span className="strong t-num">2 / 3</span></div>
            </div>
          </div>

          {/* CoS message thread */}
          <div className="col gap-2">
            <div className="t-tiny">Active interventions</div>
            <div className="card" style={{ padding:'10px 12px', borderLeft:'3px solid var(--amber)' }}>
              <div className="row gap-2" style={{ marginBottom:4 }}>
                <Icon name="arrow-r" size={11} style={{ color:'var(--amber)' }} />
                <span className="t-h4">to Risk Manager</span>
                <div className="grow" />
                <Pill tone="amber" square>Revise</Pill>
              </div>
              <ol className="t-body-sm" style={{ margin:'4px 0 0 16px', padding:0, color:'var(--ink-2)' }}>
                <li>Quantify worst-case drawdown under stress (memo p.3).</li>
                <li>Address Strategy's correlation flag at +0.78.</li>
                <li>Give a specific buffer number, not a range.</li>
              </ol>
            </div>
            <div className="card" style={{ padding:'10px 12px', borderLeft:'3px solid var(--blue)' }}>
              <div className="row gap-2" style={{ marginBottom:4 }}>
                <Icon name="arrow-r" size={11} style={{ color:'var(--blue)' }} />
                <span className="t-h4">to Strategist</span>
                <div className="grow" />
                <Pill tone="blue" square>Reframe</Pill>
              </div>
              <p className="t-body-sm" style={{ margin:'4px 0 0', color:'var(--ink-2)' }}>
                Your horizon is 3 months — extend to 12. This is an accumulator.
                Macro flagged Fed H2 risk; does that move your conviction?
              </p>
            </div>
          </div>

          {/* Chair tools */}
          <div className="col gap-2 hairline-t" style={{ paddingTop:14, marginTop:'auto' }}>
            <div className="t-tiny">Chair controls</div>
            <Btn sm icon="hand">Intervene · ask a question</Btn>
            <Btn sm icon="plus">Add an agent on the fly</Btn>
            <Btn sm kind="ghost" iconRight="arrow-r" onClick={()=>go && go('cos')}>Open quality gate</Btn>
            <Btn kind="accent" iconRight="arrow-r" onClick={()=>go && go('brief')}>Skip to brief</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SCREEN 4 — CoS Quality Gate
// ════════════════════════════════════════════════════════════════════
function ScreenCoSGate({ committee='risk', go }) {
  const uc = COMMITTEES[committee] || COMMITTEES.risk;
  const checks = ['Specificity','Completeness','Evidence','Boundaries','Ideology fit'];
  const rows = uc.agents.map((a, i) => {
    if (i === 0) return { a, status:'revising', round:'round 2', grade:[3,4,2,4,3], note:'Quantify worst-case drawdown. Strategy flagged correlation. Buffer must be a number, not a range.' };
    if (i === 1) return { a, status:'passed',   round:'1st',     grade:[4,5,5,5,4], note:'Clean draft. Markets framing extended to 12mo on request.' };
    if (i === 2) return { a, status:'passed',   round:'1st',     grade:[5,5,4,5,5], note:'MAS Notice cited correctly. Investor eligibility narrowed to AI category.' };
    if (i === 3) return { a, status:'passed',   round:'1st',     grade:[4,4,5,5,4], note:'Operational path validated end-to-end.' };
    return            { a, status:'reviewing', round:'',         grade:[0,0,0,0,0], note:'Awaiting submission.' };
  });
  const dot = (n) => (
    <span style={{ display:'inline-flex', gap:2 }}>
      {[1,2,3,4,5].map(i=>(
        <span key={i} style={{ width:6, height:6, borderRadius:999, background: i<=n ? (n>=4?'var(--green)': n>=3?'var(--amber)':'var(--red)') : 'var(--hairline-2)' }} />
      ))}
    </span>
  );
  const statusPill = (s) => s==='revising' ? <Pill tone="amber" square icon="refresh">Revising</Pill>
                       : s==='passed'   ? <Pill tone="green" square icon="check">Passed</Pill>
                       : <Pill square>Pending</Pill>;
  return (
    <div className="col" style={{ height:'100%', overflow:'auto' }}>
      <PageHeader
        eyebrow={`${uc.short} · live`}
        title={<>Chief of Staff <span className="serif-it">— quality review</span></>}
        sub="CoS reviews each draft on five axes before it reaches the chair. Reports cycle privately until they pass. You see a refined brief — not raw drafts."
        right={<>
          <Pill icon="clock"><span className="t-num">01:23</span></Pill>
          <Pill>Round 2 of 3</Pill>
          <Btn sm kind="ghost" onClick={()=>go && go('boardroom')} icon="arrow-r">Back to boardroom</Btn>
        </>}
      />

      <div style={{ padding:'18px 32px', display:'grid', gridTemplateColumns:'minmax(0, 1.5fr) minmax(0, 1fr)', gap:24 }}>
        {/* Quality matrix */}
        <div className="card-elev" style={{ padding:0, overflow:'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Agent</th>
                <th style={{ width:130 }}>Status</th>
                {checks.map(c=><th key={c} style={{ width:90, textAlign:'center' }}>{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={r.a.id} style={{ background: i===0 ? 'var(--accent-bg)' : 'transparent' }}>
                  <td>
                    <div className="row gap-3">
                      <Avatar initials={r.a.initials} size="sm" rim={r.a.tone} />
                      <div className="col" style={{ minWidth:0 }}>
                        <span className="strong">{r.a.name}</span>
                        <span className="t-body-sm muted">{r.round || 'awaiting'}</span>
                      </div>
                    </div>
                  </td>
                  <td>{statusPill(r.status)}</td>
                  {r.grade.map((g, gi)=><td key={gi} style={{ textAlign:'center' }}>{r.status==='reviewing' ? <span className="dim">—</span> : dot(g)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stats card */}
        <div className="col gap-3">
          <div className="card-elev" style={{ padding:16 }}>
            <div className="t-tiny">Round budget</div>
            <div className="row gap-3" style={{ alignItems:'baseline', marginTop:4 }}>
              <span className="t-num-big">2 <span style={{ fontSize:18, color:'var(--ink-3)' }}>/ 3</span></span>
              <span className="t-body-sm muted">rounds used · one round left</span>
            </div>
            <div className="row gap-1" style={{ marginTop:10 }}>
              <span style={{ flex:1, height:8, background:'var(--ink)', borderRadius:3 }} />
              <span style={{ flex:1, height:8, background:'var(--accent)', borderRadius:3 }} />
              <span style={{ flex:1, height:8, background:'var(--hairline-2)', borderRadius:3 }} />
            </div>
          </div>
          <div className="card-elev" style={{ padding:16 }}>
            <div className="t-tiny">Average grade across passing drafts</div>
            <div className="row gap-3" style={{ alignItems:'baseline', marginTop:4 }}>
              <span className="t-num-big" style={{ color:'var(--green)' }}>4.4 <span style={{ fontSize:18, color:'var(--ink-3)' }}>/ 5</span></span>
            </div>
            <div className="col gap-1" style={{ marginTop:10 }}>
              {checks.map((c,i)=>{
                const avg = [4.5, 4.6, 4.7, 5.0, 4.3][i];
                return (
                  <div key={c} className="row gap-2" style={{ alignItems:'center' }}>
                    <span className="t-body-sm" style={{ width:110, color:'var(--ink-2)' }}>{c}</span>
                    <div className="bar grow" style={{ height:6 }}><i style={{ width:`${avg/5*100}%`, background:'var(--green)' }} /></div>
                    <span className="t-mono muted" style={{ width:36, textAlign:'right' }}>{avg.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CoS message panels */}
      <div style={{ padding:'4px 32px 32px', display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
        <div className="card-elev" style={{ padding:16, borderTop:'3px solid var(--amber)' }}>
          <div className="t-tiny" style={{ color:'var(--amber)' }}>Challenge · sent back to agent</div>
          <div className="t-h3" style={{ margin:'4px 0 8px' }}>Risk Manager — round 2</div>
          <p className="t-body" style={{ margin:0, color:'var(--ink-2)' }}>
            "Quantify worst-case drawdown under stress (memo p.3). Strategy flagged your correlation assumption at +0.78. The buffer must be a specific number, not a range."
          </p>
          <div className="row gap-2" style={{ marginTop:10 }}>
            <Pill tone="amber" square>3 actions</Pill>
            <Pill square icon="clock">awaiting 0:38</Pill>
          </div>
        </div>
        <div className="card-elev" style={{ padding:16, borderTop:'3px solid var(--blue)' }}>
          <div className="t-tiny" style={{ color:'var(--blue)' }}>Reframe · suggest different angle</div>
          <div className="t-h3" style={{ margin:'4px 0 8px' }}>Strategist — round 1</div>
          <p className="t-body" style={{ margin:0, color:'var(--ink-2)' }}>
            "Your view is 3-month. Extend to 12 — this is an accumulator. Also: Macro flagged Fed H2 risk; does that move your conviction?"
          </p>
          <div className="row gap-2" style={{ marginTop:10 }}>
            <Pill tone="green" square icon="check">Accepted</Pill>
          </div>
        </div>
        <div className="card-elev" style={{ padding:16, borderTop:'3px solid var(--green)' }}>
          <div className="t-tiny" style={{ color:'var(--green)' }}>Synthesis · cross-agent</div>
          <div className="t-h3" style={{ margin:'4px 0 8px' }}>Buffer sizing convergence</div>
          <p className="t-body" style={{ margin:0, color:'var(--ink-2)' }}>
            "Risk + Treasury agree on 18% buffer with 12% auto-call trigger. Macro maintains dissent. Recommend disclosing CVaR sensitivity to Fed-hike scenario."
          </p>
          <div className="row gap-2" style={{ marginTop:10 }}>
            <Pill tone="green" square>4 / 5 aligned</Pill>
            <Pill tone="red" square>1 dissent</Pill>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenBoardroom, ScreenCoSGate });
