/* global React, COMMITTEES, SESSIONS, KPIS, Icon, Avatar, AvatarStack, Btn, Pill, AgentTile, PageHeader, AGENT_ICON */
const { useState, useEffect, useMemo, Fragment } = React;

// ════════════════════════════════════════════════════════════════════
// Sidebar — shared across all screens
// ════════════════════════════════════════════════════════════════════
function Sidebar({ active, onNav, committeeKey }) {
  const items = [
    { id:'dashboard', icon:'home',    label:'Dashboard',      section:'workspace' },
    { id:'sessions',  icon:'inbox',   label:'Sessions',       section:'workspace', count:47 },
    { id:'convene',   icon:'plus',    label:'New convening',  section:'workspace' },
    { id:'boardroom', icon:'gavel',   label:'Boardroom',      section:'live', pulse:true, sublabel:'Risk · live' },
    { id:'cos',       icon:'sparkle', label:'CoS quality gate', section:'live' },
    { id:'qa',        icon:'dot-3',   label:'Discussion',     section:'live' },
    { id:'brief',     icon:'doc',     label:'Brief',          section:'live' },
    { id:'agents',    icon:'users',   label:'Agent library',  section:'manage', count:14 },
    { id:'committees',icon:'gavel',   label:'Committees',     section:'manage', count:6 },
    { id:'archive',   icon:'archive', label:'Archive',        section:'manage' },
    { id:'settings',  icon:'gear',    label:'Settings',       section:'manage' },
  ];
  const sections = [
    ['workspace','Workspace'],
    ['live','Live session'],
    ['manage','Manage'],
  ];
  return (
    <div className="col" style={{ width:230, flex:'0 0 230px', background:'var(--bg-2)', borderRight:'1px solid var(--hairline)', height:'100%' }}>
      <div className="row gap-3" style={{ padding:'18px 16px 14px' }}>
        <div style={{ width:30, height:30, borderRadius:7, background:'var(--ink)', color:'var(--surface)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontFamily:'var(--serif)', fontSize:18, lineHeight:1 }}>C</span>
        </div>
        <div className="col" style={{ lineHeight:1.1 }}>
          <span style={{ fontFamily:'var(--serif)', fontSize:17, letterSpacing:'-0.01em' }}>Concilium</span>
          <span className="t-tiny" style={{ textTransform:'none', letterSpacing:0, fontSize:10.5 }}>Atlas Capital · Singapore</span>
        </div>
      </div>

      <div style={{ padding:'4px 12px 8px' }}>
        <div className="row gap-2 input" style={{ padding:'6px 8px', background:'var(--surface)' }}>
          <Icon name="search" size={12} style={{ color:'var(--ink-4)' }}/>
          <input placeholder="Quick find…" style={{ border:'none', background:'transparent', outline:'none', flex:1, font:'inherit', fontSize:12, color:'var(--ink)' }} />
          <span className="kbd">⌘K</span>
        </div>
      </div>

      <div className="col" style={{ padding:'4px 8px', overflow:'auto', flex:1 }}>
        {sections.map(([key, label])=>(
          <div key={key}>
            <div className="nav-section">{label}</div>
            {items.filter(i=>i.section===key).map(i=>(
              <div key={i.id}
                   className={`nav-item ${active===i.id?'is-active':''}`}
                   onClick={()=>onNav && onNav(i.id)}>
                <Icon name={i.icon} size={14} />
                <span className="grow" style={{ minWidth:0 }}>
                  <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{i.label}</span>
                  {i.sublabel && <span className="t-tiny" style={{ textTransform:'none', letterSpacing:0, fontSize:10, color:'inherit', opacity:0.7 }}>{i.sublabel}</span>}
                </span>
                {i.pulse && <span className="live-dot" />}
                {i.count != null && <span className="nav-count t-num">{i.count}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="row gap-3" style={{ padding:'12px 14px', borderTop:'1px solid var(--hairline)' }}>
        <Avatar initials={COMMITTEES.risk.persona.initials} rim="accent" />
        <div className="col grow" style={{ lineHeight:1.15, minWidth:0 }}>
          <span className="t-h4" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{COMMITTEES.risk.persona.name}</span>
          <span className="t-tiny" style={{ textTransform:'none', letterSpacing:0, fontSize:10.5 }}>{COMMITTEES.risk.persona.role}</span>
        </div>
        <Icon name="gear" size={14} style={{ color:'var(--ink-4)' }} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SCREEN 1 — Dashboard
// ════════════════════════════════════════════════════════════════════
function ScreenDashboard({ go }) {
  return (
    <div className="col" style={{ height:'100%', overflow:'auto' }}>
      <PageHeader
        eyebrow="Workspace · this week"
        title="Where your committees decide."
        sub="Convene a committee, review its deliberation, sign the decision. Every session is signed, replayable, and auditable."
        right={<>
          <Btn icon="search" sm>Find a session</Btn>
          <Btn kind="primary" icon="plus">New convening</Btn>
        </>}
      />

      {/* KPI strip */}
      <div className="kpi-grid hairline">
        {KPIS.map((k,i)=>(
          <div key={i} className="col gap-1">
            <div className="t-tiny">{k.label}</div>
            <div className="row gap-2" style={{ alignItems:'baseline' }}>
              <span className="t-num-big">{k.val}</span>
              <span className="t-body-sm" style={{ color: k.good ? 'var(--green)' : 'var(--amber)', fontWeight:500 }}>{k.delta}</span>
            </div>
            <div className="t-body-sm muted">{k.hint}</div>
          </div>
        ))}
      </div>

      <div style={{ padding:'24px 32px 32px', display:'grid', gridTemplateColumns:'minmax(0, 1fr) 320px', gap:24 }}>
        <div className="col gap-5">
          {/* Templates */}
          <div className="col gap-3">
            <div className="row gap-3" style={{ alignItems:'baseline' }}>
              <div className="t-h2 serif-it">Templates</div>
              <span className="t-body-sm muted">Standing committees — convene with one click.</span>
              <div className="grow" />
              <Btn sm kind="ghost" iconRight="arrow-r">Manage committees</Btn>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:14 }}>
              {Object.values(COMMITTEES).map(c=>(
                <div key={c.key} className="card-elev" style={{ padding:'16px 16px 14px', cursor:'pointer' }} onClick={()=>go && go('convene')}>
                  <div className="row gap-2" style={{ marginBottom:10 }}>
                    <span style={{ width:8, height:8, borderRadius:2, background:c.accent }} />
                    <span className="t-tiny">{c.short}</span>
                    <div className="grow" />
                    <span className="t-body-sm muted t-num">{c.agents.length}</span>
                  </div>
                  <div className="t-h2" style={{ fontSize:20, marginBottom:6 }}>{c.name.replace(' Committee','')}</div>
                  <div className="t-body-sm muted" style={{ marginBottom:14, minHeight:38 }}>{c.description}</div>
                  <div className="row gap-2" style={{ alignItems:'center', justifyContent:'space-between' }}>
                    <AvatarStack items={c.agents.slice(0,5)} size="sm" />
                    <Btn sm kind="ghost" iconRight="arrow-r">Convene</Btn>
                  </div>
                </div>
              ))}
              <div className="card" style={{ padding:'16px', borderStyle:'dashed', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-start', gap:6, gridColumn:'span 3', background:'transparent' }}>
                <div className="row gap-2" style={{ color:'var(--ink-3)' }}>
                  <Icon name="plus" size={14} />
                  <span className="t-h3" style={{ color:'inherit' }}>Build a custom committee</span>
                </div>
                <div className="t-body-sm muted">Pick agents from the library · choose a pattern (parallel · round-robin · debate) · save as a template.</div>
              </div>
            </div>
          </div>

          {/* Recent sessions */}
          <div className="col gap-3">
            <div className="row gap-3" style={{ alignItems:'baseline' }}>
              <div className="t-h2 serif-it">Recent sessions</div>
              <div className="grow" />
              <div className="tab-row" style={{ border:'none' }}>
                <span className="tab-item is-active">All</span>
                <span className="tab-item">Mine</span>
                <span className="tab-item">Approved</span>
                <span className="tab-item">Dissent</span>
                <span className="tab-item">Escalated</span>
              </div>
            </div>
            <div className="card-elev" style={{ padding:0, overflow:'hidden' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width:80 }}>Session</th>
                    <th>Topic</th>
                    <th style={{ width:160 }}>Committee</th>
                    <th style={{ width:80 }}>Agents</th>
                    <th style={{ width:170 }}>Decision</th>
                    <th style={{ width:110 }}>Chair</th>
                    <th style={{ width:90, textAlign:'right' }}>Time</th>
                    <th style={{ width:30 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {SESSIONS.map(s=>(
                    <tr key={s.id} style={{ cursor:'pointer' }} onClick={()=>go && go('brief')}>
                      <td className="t-mono muted">{s.id}</td>
                      <td><span className="strong">{s.t}</span></td>
                      <td className="muted">{s.committee}</td>
                      <td><span className="t-num muted">{s.agents}</span></td>
                      <td><Pill tone={s.tone} square>{s.dec}</Pill></td>
                      <td className="muted">{s.chair}</td>
                      <td className="t-mono muted" style={{ textAlign:'right' }}>{s.ts}<br/><span style={{ fontSize:10 }}>{s.dur}</span></td>
                      <td><Icon name="arrow-r" size={12} style={{ color:'var(--ink-4)' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="col gap-4">
          {/* Live session callout */}
          <div className="card-elev grain" style={{ padding:'16px', background:'var(--ink)', color:'var(--surface)', borderColor:'var(--ink)' }}>
            <div className="row gap-2" style={{ marginBottom:8 }}>
              <span className="live-dot" />
              <span className="t-tiny" style={{ color:'rgba(255,255,255,0.7)' }}>Live · 1 session</span>
              <div className="grow" />
              <span className="t-mono" style={{ color:'rgba(255,255,255,0.6)' }}>00:42</span>
            </div>
            <div className="t-h2" style={{ color:'var(--surface)', fontSize:20, marginBottom:4 }}>ETH Accumulator Series 3</div>
            <div className="t-body-sm" style={{ color:'rgba(255,255,255,0.7)', marginBottom:12 }}>Investment Risk committee · 5 agents in parallel · CoS reviewing 3/5 drafts.</div>
            <div className="row gap-2">
              <AvatarStack items={COMMITTEES.risk.agents} size="sm" />
              <div className="grow" />
              <Btn sm onClick={()=>go && go('boardroom')} style={{ background:'rgba(255,255,255,0.1)', borderColor:'rgba(255,255,255,0.2)', color:'var(--surface)' }} iconRight="arrow-r">Join</Btn>
            </div>
          </div>

          {/* Agent library snippet */}
          <div className="card-elev" style={{ padding:'14px 16px' }}>
            <div className="row gap-2" style={{ marginBottom:10, alignItems:'baseline' }}>
              <span className="t-h3">Agent library</span>
              <div className="grow" />
              <span className="t-body-sm muted">14 agents</span>
            </div>
            <div className="col gap-2">
              {[
                {i:'CO', n:'Compliance Officer', m:'used in 32 sessions', tone:'amber'},
                {i:'RM', n:'Risk Manager',       m:'used in 28 sessions', tone:'red'},
                {i:'ME', n:'Macro Economist',    m:'used in 19 sessions', tone:'blue'},
                {i:'LC', n:'Legal Counsel',      m:'used in 14 sessions', tone:'blue'},
                {i:'RH', n:'Regulatory Hawk',    m:'new · 2 days old',     tone:'accent'},
              ].map((a,i)=>(
                <div key={i} className="row gap-3" style={{ padding:'6px 0', borderBottom: i<4?'1px dashed var(--hairline-2)':'none' }}>
                  <Avatar initials={a.i} size="sm" rim={a.tone} />
                  <div className="grow" style={{ minWidth:0 }}>
                    <div className="t-body" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.n}</div>
                    <div className="t-body-sm muted">{a.m}</div>
                  </div>
                </div>
              ))}
            </div>
            <Btn sm kind="ghost" iconRight="arrow-r" style={{ marginTop:8 }}>Open library</Btn>
          </div>

          {/* Editorial note */}
          <div className="card" style={{ padding:'14px 16px', background:'transparent', borderStyle:'dashed' }}>
            <div className="t-tiny" style={{ marginBottom:6 }}>Note from the office</div>
            <p className="t-quote" style={{ margin:'0 0 8px' }}>"A committee that meets in two minutes can be consulted before every decision — not after."</p>
            <div className="t-body-sm muted">— P. Anand, opening memo · v1.2</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SCREEN 2 — Convene (Set the Agenda)
// ════════════════════════════════════════════════════════════════════
function ScreenConvene({ committee, go }) {
  const uc = COMMITTEES[committee] || COMMITTEES.risk;
  return (
    <div className="col" style={{ height:'100%', overflow:'auto' }}>
      <PageHeader
        eyebrow={`New convening · ${uc.short}`}
        title={<span>Set the <em className="serif-it">agenda</em>.</span>}
        sub="Paste the question, attach context, and let the committee deliberate. Average session: 3 to 5 minutes."
        right={<>
          <Btn sm kind="ghost">Save as template</Btn>
          <Btn kind="ghost" sm>Cancel</Btn>
          <Btn kind="primary" iconRight="arrow-r">Convene committee</Btn>
        </>}
      />

      <div style={{ padding:'24px 32px', display:'grid', gridTemplateColumns:'minmax(0, 1.4fr) minmax(0, 1fr)', gap:24 }}>
        {/* Left: agenda */}
        <div className="col gap-4">
          <div className="card-elev" style={{ padding:16 }}>
            <div className="row gap-3" style={{ marginBottom:12, alignItems:'flex-start' }}>
              <div className="col grow">
                <div className="t-tiny">Topic</div>
                <div className="t-h2" style={{ marginTop:2 }}>{uc.topic}</div>
                <div className="t-body-sm muted" style={{ marginTop:4 }}>{uc.sub}</div>
              </div>
              <Btn sm kind="ghost" icon="pencil">Edit</Btn>
            </div>
            <div className="row gap-2" style={{ flexWrap:'wrap' }}>
              <Pill icon="paperclip">4 documents · 89 pages</Pill>
              <Pill icon="users">{uc.agents.length} agents</Pill>
              <Pill icon="clock">est. 4–6 min</Pill>
              <Pill icon="coin">~$0.15 in tokens</Pill>
            </div>
          </div>

          <div className="col gap-2">
            <div className="t-h3">Briefing question</div>
            <textarea className="input" style={{ minHeight:96, fontFamily:'var(--sans)', resize:'vertical' }} defaultValue={`Should we launch ETH Accumulator Series 3 in Q3 to accredited Singapore clients?

Key concerns:
1. Is the 15% collateral buffer adequate?
2. How does the September Fed rate outlook affect the knock-in probability?
3. Are there MAS notice considerations beyond SFA04-N12 §4.3?`} />
            <div className="row gap-2" style={{ justifyContent:'space-between' }}>
              <span className="t-body-sm muted">CoS will route sub-questions to the right agents. You don't need to address anyone in particular.</span>
              <span className="t-body-sm muted">3 questions · 312 chars</span>
            </div>
          </div>

          <div className="col gap-2">
            <div className="row gap-2" style={{ alignItems:'baseline' }}>
              <div className="t-h3">Context · documents</div>
              <span className="t-body-sm muted">Drop files, paste links, or pull from the data room.</span>
            </div>
            <div className="card-elev" style={{ padding:0, overflow:'hidden' }}>
              <table className="tbl">
                <tbody>
                  {uc.docs.map((d,i)=>(
                    <tr key={i}>
                      <td style={{ width:30 }}><Icon name="doc" size={14} style={{ color:'var(--ink-3)' }} /></td>
                      <td><span className="strong">{d.n}</span></td>
                      <td className="muted t-num" style={{ width:80 }}>{d.p} pp</td>
                      <td className="muted t-num" style={{ width:80 }}>{d.s}</td>
                      <td style={{ width:130 }}><Pill tone="green" icon="check" square>Indexed</Pill></td>
                      <td style={{ width:30 }}><Icon name="x" size={11} style={{ color:'var(--ink-4)', cursor:'pointer' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row gap-2 dotgrid" style={{ padding:'14px 16px', borderTop:'1px solid var(--hairline)', justifyContent:'center', color:'var(--ink-3)' }}>
                <Icon name="plus" size={13} /><span className="t-body-sm">Drop more files here, or paste a URL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: committee + pattern */}
        <div className="col gap-4">
          <div className="card-elev" style={{ padding:16 }}>
            <div className="row gap-2" style={{ marginBottom:10, alignItems:'baseline' }}>
              <div className="t-h3">Committee composition</div>
              <div className="grow" />
              <Btn sm kind="ghost">Change</Btn>
            </div>
            <div className="col gap-2">
              {uc.agents.map(a=>(
                <div key={a.id} className="row gap-3" style={{ padding:'6px 0', borderBottom:'1px dashed var(--hairline-2)' }}>
                  <Avatar initials={a.initials} size="sm" rim={a.tone} />
                  <div className="grow" style={{ minWidth:0 }}>
                    <div className="t-body strong" style={{ lineHeight:1.2 }}>{a.name}</div>
                    <div className="t-body-sm muted">{a.role}</div>
                  </div>
                  <Icon name={AGENT_ICON[a.id] || 'sparkle'} size={13} style={{ color:'var(--ink-4)' }} />
                </div>
              ))}
            </div>
            <Btn sm kind="ghost" icon="plus" style={{ marginTop:10 }}>Add an agent for this session</Btn>
          </div>

          <div className="card-elev" style={{ padding:16 }}>
            <div className="t-h3" style={{ marginBottom:8 }}>Deliberation pattern</div>
            <div className="col gap-2">
              {[
                {k:'Parallel', sub:'All agents draft simultaneously. Fastest.', on:false},
                {k:'Round Robin → Vote', sub:'Each agent sees the prior. Then a quality vote.', on:true},
                {k:'Debate', sub:'Pro / con pairs, then synthesis. Slowest.', on:false},
              ].map(p=>(
                <div key={p.k} className="row gap-3" style={{ padding:'10px 12px', border:'1px solid var(--hairline)', borderColor: p.on?'var(--ink)':'var(--hairline)', borderRadius:5, background: p.on?'var(--tint)':'var(--surface)' }}>
                  <span style={{ width:14, height:14, borderRadius:999, border:'2px solid '+(p.on?'var(--ink)':'var(--ink-4)'), display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {p.on && <span style={{ width:6, height:6, borderRadius:999, background:'var(--ink)' }} />}
                  </span>
                  <div className="grow">
                    <div className="t-body strong">{p.k}</div>
                    <div className="t-body-sm muted">{p.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="row gap-2 hairline-t" style={{ marginTop:14, paddingTop:12, justifyContent:'space-between' }}>
              <span className="t-tiny">Q&amp;A after drafts</span>
              <Pill tone="ink">{uc.qa}</Pill>
            </div>
            <div className="row gap-2" style={{ marginTop:8, justifyContent:'space-between' }}>
              <span className="t-tiny">Chief of Staff</span>
              <Pill icon="sparkle">On · max 3 revision rounds</Pill>
            </div>
          </div>

          <Btn kind="accent" lg iconRight="arrow-r" onClick={()=>go && go('boardroom')} style={{ width:'100%', justifyContent:'center' }}>
            Convene the committee
          </Btn>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Sidebar, ScreenDashboard, ScreenConvene });
