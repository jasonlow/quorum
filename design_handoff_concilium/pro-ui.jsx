/* global React */
// Shared primitives + data for the professional AI Committee template.
const { useState, useEffect, useRef, useMemo, Fragment } = React;

// ── Static data (richer than the wireframe) ─────────────────
const COMMITTEES = {
  risk: {
    key:'risk',
    name:'Investment Risk Committee',
    short:'Investment Risk',
    accent:'#b8541f',
    description:'Reviews structured products, position concentration, and tail-risk exposures.',
    pattern:'Round Robin → Vote',
    qa:'Deep Dive (up to 5 questions)',
    persona:{ name:'Priya Anand', role:'Chief Risk Officer', initials:'PA' },
    topic:'ETH Accumulator Series 3',
    sub:'Structured product · 12-month tenor · 70% knock-in · 18% coupon',
    docs:[
      {n:'Product Memo — ETH Accumulator S3.pdf', s:'2.1 MB', p:32},
      {n:'Pricing Sheet — ETH Accumulator S3.xlsx', s:'0.5 MB', p:6},
      {n:'Term Sheet — ETH Accumulator S3.pdf', s:'0.8 MB', p:9},
      {n:'Counterparty Profile — Galaxy.pdf', s:'1.2 MB', p:14},
    ],
    agents:[
      { id:'risk',  initials:'RM', name:'Risk Manager',       role:'Quantitative risk · VaR · stress', tone:'red',    persona:'24 years sell-side; CFA, FRM. Defaults to conservative buffers.' },
      { id:'strat', initials:'IS', name:'Investment Strategist', role:'Market timing · positioning',   tone:'blue',   persona:'Macro-aware, tactical. 12-month horizon thinking.' },
      { id:'comp',  initials:'CO', name:'Compliance Officer', role:'MAS, SEC · investor eligibility', tone:'amber',  persona:'Notice 2009-02 specialist. Cites chapter and verse.' },
      { id:'treas', initials:'TR', name:'Treasury & Operations', role:'Custody · settlement · margin', tone:'green', persona:'Operational realist; 4hr top-up via Fireblocks.' },
      { id:'macro', initials:'ME', name:'Macro Economist',    role:'Rates · FX · geopolitics',        tone:'red',    persona:'Hawkish on Fed; tail-risk first.' },
    ],
  },
  onboard: {
    key:'onboard',
    name:'Client Onboarding Committee',
    short:'Onboarding',
    accent:'#2d6b48',
    description:'Reviews KYC packs, AML screening, and commercial fit for new institutional relationships.',
    pattern:'Parallel → Vote',
    qa:'Single round',
    persona:{ name:'Cheryl Goh', role:'Head of Onboarding', initials:'CG' },
    topic:'GoldPeak Capital — new client file',
    sub:'KYC pack · risk assessment · RM notes',
    docs:[
      {n:'KYC Pack — GoldPeak.pdf', s:'4.2 MB', p:58},
      {n:'UBO Chart — GoldPeak Group.pdf', s:'0.9 MB', p:3},
    ],
    agents:[
      { id:'comp', initials:'CO', name:'Compliance Officer', role:'PEP · sanctions · UBO', tone:'amber' },
      { id:'risk', initials:'RO', name:'Risk Officer',       role:'Tier · concentration',  tone:'red' },
      { id:'legal',initials:'LC', name:'Legal Counsel',      role:'Jurisdiction · contracts', tone:'blue' },
      { id:'rm',   initials:'RM', name:'Relationship Mgr',   role:'Commercial fit · AUM',  tone:'green' },
    ],
  },
  change: {
    key:'change',
    name:'Change Triage Committee',
    short:'Change Triage',
    accent:'#94701e',
    description:'Scores incoming product change requests for engineering, risk, and commercial impact.',
    pattern:'Parallel scoring',
    qa:'None',
    persona:{ name:'Marcus Kim', role:'Chief Technology Officer', initials:'MK' },
    topic:'Whale Alert — feature request',
    sub:'Real-time large-transfer notifications · institutional pitch',
    docs:[{n:'Feature Brief — Whale Alert v2.pdf', s:'0.6 MB', p:7}],
    agents:[
      { id:'cto',   initials:'AR', name:'CTO / Architect',   role:'Strategy · arch impact',     tone:'blue' },
      { id:'sec',   initials:'SO', name:'Security Officer',  role:'Attack surface · data',      tone:'red' },
      { id:'pm',    initials:'PM', name:'Product Manager',   role:'Value · demand · pricing',   tone:'green' },
      { id:'devops',initials:'DO', name:'DevOps Lead',       role:'Cost · deploy risk',         tone:'amber' },
      { id:'comp',  initials:'CC', name:'Compliance',        role:'Regulatory deadlines',       tone:'amber' },
    ],
  },
};

const SESSIONS = [
  { id:'S-2147', t:'ETH Accumulator Series 3',     committee:'Investment Risk',  dec:'Approved · conditions', tone:'green',  chair:'P. Anand',  ts:'2h ago',  dur:'4m 08s', agents:5 },
  { id:'S-2146', t:'GoldPeak Capital onboarding',  committee:'Onboarding',       dec:'Escalated',             tone:'amber',  chair:'C. Goh',     ts:'5h ago',  dur:'3m 22s', agents:4 },
  { id:'S-2145', t:'Whale Alert v2 — feature req', committee:'Change Triage',    dec:'Priority · 7.2',        tone:'blue',   chair:'M. Kim',     ts:'1d ago',  dur:'2m 14s', agents:5 },
  { id:'S-2144', t:'BTC Range Note',               committee:'Investment Risk',  dec:'Rejected',              tone:'red',    chair:'P. Anand',  ts:'1d ago',  dur:'5m 03s', agents:5 },
  { id:'S-2143', t:'Meridian Capital onboarding',  committee:'Onboarding',       dec:'Approved',              tone:'green',  chair:'C. Goh',     ts:'2d ago',  dur:'2m 47s', agents:4 },
  { id:'S-2142', t:'Sov-debt overlay strategy',    committee:'Investment Risk',  dec:'Approved · conditions', tone:'green',  chair:'P. Anand',  ts:'2d ago',  dur:'6m 11s', agents:5 },
  { id:'S-2141', t:'Lightning-route v3 deprec.',   committee:'Change Triage',    dec:'Priority · 5.8',        tone:'blue',   chair:'M. Kim',     ts:'3d ago',  dur:'1m 58s', agents:4 },
];

const KPIS = [
  { label:'Sessions this week',     val:'47',     delta:'+12',  good:true,  hint:'vs prior week' },
  { label:'Median time to decision', val:'3m 41s', delta:'-22%', good:true,  hint:'down from 4m 44s' },
  { label:'Decisions w/ dissent',    val:'8',      delta:'17%',  good:false, hint:'preserved on record' },
  { label:'Avg. tokens / session',   val:'94k',    delta:'+4%',  good:true,  hint:'inside budget' },
];

// ── Icon set (line, 16px default) ───────────────────────────
function Icon({ name, size=14, stroke=1.6, style }) {
  const s = size; const sw = stroke;
  const p = { stroke:'currentColor', strokeWidth:sw, fill:'none', strokeLinecap:'round', strokeLinejoin:'round' };
  const v = (kids)=> <svg width={s} height={s} viewBox="0 0 16 16" style={style}>{kids}</svg>;
  switch (name) {
    case 'home':     return v(<><path d="M2 7l6-5 6 5v7H2z" {...p}/><path d="M6 14V9h4v5" {...p}/></>);
    case 'inbox':    return v(<><path d="M2 9v3a1 1 0 001 1h10a1 1 0 001-1V9" {...p}/><path d="M2 9h3l1 2h4l1-2h3M3 3h10v6" {...p}/></>);
    case 'gavel':    return v(<><path d="M3 12l5-5 4 4-5 5z" {...p}/><path d="M6 5l5 5M9 2l5 5" {...p}/></>);
    case 'users':    return v(<><circle cx="6" cy="6" r="2.4" {...p}/><circle cx="12" cy="7" r="1.8" {...p}/><path d="M2 13c0-2 1.8-3.4 4-3.4S10 11 10 13M10 13c0-1.4.8-2.4 2-2.4s2 1 2 2.4" {...p}/></>);
    case 'archive':  return v(<><rect x="2" y="3" width="12" height="3" rx="0.5" {...p}/><path d="M3 6v7h10V6M6 9h4" {...p}/></>);
    case 'gear':     return v(<><circle cx="8" cy="8" r="2" {...p}/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3" {...p}/></>);
    case 'plus':     return v(<path d="M8 3v10M3 8h10" {...p}/>);
    case 'search':   return v(<><circle cx="7" cy="7" r="4" {...p}/><path d="M10 10l3 3" {...p}/></>);
    case 'doc':      return v(<><path d="M4 2h6l3 3v9H4z" {...p}/><path d="M10 2v3h3" {...p}/><path d="M6 8h4M6 11h4" {...p}/></>);
    case 'chart':    return v(<><path d="M2 13h12M4 11V7M7 11V4M10 11V8M13 11V5" {...p}/></>);
    case 'shield':   return v(<><path d="M8 1l5 2v4c0 3-2.5 6-5 7-2.5-1-5-4-5-7V3z" {...p}/></>);
    case 'coin':     return v(<><circle cx="8" cy="8" r="5" {...p}/><path d="M6 6h3a1.5 1.5 0 010 3H6m0 0h4" {...p}/></>);
    case 'globe':    return v(<><circle cx="8" cy="8" r="5" {...p}/><path d="M3 8h10M8 3c1.8 2 1.8 8 0 10M8 3c-1.8 2-1.8 8 0 10" {...p}/></>);
    case 'lock':     return v(<><rect x="4" y="7" width="8" height="6" rx="1" {...p}/><path d="M6 7V5a2 2 0 014 0v2" {...p}/></>);
    case 'check':    return v(<path d="M3 8l3 3 7-7" {...p}/>);
    case 'x':        return v(<path d="M4 4l8 8M12 4l-8 8" {...p}/>);
    case 'warn':     return v(<><path d="M8 2l6 11H2z" {...p}/><path d="M8 6v3M8 11v.5" {...p}/></>);
    case 'arrow-r':  return v(<path d="M3 8h10M9 4l4 4-4 4" {...p}/>);
    case 'arrow-dr': return v(<path d="M4 4l8 8M12 6v6H6" {...p}/>);
    case 'arrow-u':  return v(<path d="M8 13V3M4 7l4-4 4 4" {...p}/>);
    case 'arrow-d':  return v(<path d="M8 3v10M4 9l4 4 4-4" {...p}/>);
    case 'dot-3':    return v(<><circle cx="3" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="13" cy="8" r="1" fill="currentColor" stroke="none"/></>);
    case 'clock':    return v(<><circle cx="8" cy="8" r="5.5" {...p}/><path d="M8 5v3l2 1.5" {...p}/></>);
    case 'paperclip':return v(<path d="M11 7l-4 4a2 2 0 11-3-3l5-5a3 3 0 014 4l-6 6" {...p}/>);
    case 'send':     return v(<path d="M14 2L2 7l5 2 2 5z" {...p}/>);
    case 'sparkle':  return v(<path d="M8 2l1.5 4L13.5 7.5 9.5 9 8 13l-1.5-4L2.5 7.5 6.5 6z" {...p}/>);
    case 'play':     return v(<path d="M5 3l8 5-8 5z" {...p}/>);
    case 'pause':    return v(<><rect x="4" y="3" width="3" height="10" {...p}/><rect x="9" y="3" width="3" height="10" {...p}/></>);
    case 'stop':     return v(<rect x="4" y="4" width="8" height="8" {...p}/>);
    case 'refresh':  return v(<><path d="M2 8a6 6 0 0110-4.5M14 8a6 6 0 01-10 4.5" {...p}/><path d="M12 1v3h-3M4 15v-3h3" {...p}/></>);
    case 'down':     return v(<path d="M3 6l5 5 5-5" {...p}/>);
    case 'eye':      return v(<><path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" {...p}/><circle cx="8" cy="8" r="2" {...p}/></>);
    case 'hand':     return v(<><path d="M5 2v6M7 1v7M9 2v6M11 4v4M3 8c0 4 2.5 7 5.5 7s4.5-2.5 4.5-5V6" {...p}/></>);
    case 'thumb':    return v(<><path d="M3 7h2v7H3zM5 7l2-4 1 1v3h4l1 1-1 6H5" {...p}/></>);
    case 'down-thumb': return v(<><path d="M3 2h2v7H3zM5 9l2 4 1-1v-3h4l1-1-1-6H5" {...p}/></>);
    case 'flag':     return v(<><path d="M3 2v12" {...p}/><path d="M3 3h8l-2 3 2 3H3" {...p}/></>);
    case 'pencil':   return v(<><path d="M11 2l3 3-9 9H2v-3z" {...p}/></>);
    case 'pin':      return v(<><path d="M8 1v6M5 7h6l-1 5H6zM8 12v3" {...p}/></>);
    case 'star':     return v(<path d="M8 1.5l2 4.5 5 .5-3.7 3.4 1.1 4.9L8 12l-4.4 2.8 1.1-4.9L1 6.5l5-.5z" {...p}/>);
    case 'expand':   return v(<><path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3" {...p}/></>);
    case 'spinner':  return v(<g><circle cx="8" cy="8" r="5" stroke="currentColor" strokeOpacity="0.15" strokeWidth={sw} fill="none"/><path d="M8 3a5 5 0 015 5" stroke="currentColor" strokeWidth={sw} fill="none" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite"/></path></g>);
    default: return null;
  }
}

const AGENT_ICON = {
  risk:'chart', strat:'chart', comp:'shield', treas:'coin', macro:'globe',
  legal:'gavel', rm:'star', cto:'sparkle', sec:'lock', pm:'doc', devops:'gear', cc:'shield',
};

// ── Avatar ──────────────────────────────────────────────────
function Avatar({ initials, size, rim, style, title }) {
  const cls = ['av', size==='sm'&&'av-sm', size==='lg'&&'av-lg', size==='xl'&&'av-xl', rim&&`av-rim-${rim}`].filter(Boolean).join(' ');
  return <span className={cls} style={style} title={title}>{initials}</span>;
}
function AvatarStack({ items, size }) {
  return (
    <span className="av-stack">
      {items.map((a,i)=><Avatar key={i} initials={a.initials} size={size} style={{ zIndex: items.length-i }} title={a.name} />)}
    </span>
  );
}

// ── Button / Pill ───────────────────────────────────────────
function Btn({ kind='default', sm, lg, icon, iconRight, children, style, ...rest }) {
  const cls = [
    'btn',
    kind==='primary' && 'btn-primary',
    kind==='accent'  && 'btn-accent',
    kind==='ghost'   && 'btn-ghost',
    kind==='danger'  && 'btn-danger',
    sm && 'btn-sm', lg && 'btn-lg',
  ].filter(Boolean).join(' ');
  return (
    <button className={cls} style={style} {...rest}>
      {icon && <Icon name={icon} size={lg?15:13} />}
      {children}
      {iconRight && <Icon name={iconRight} size={lg?15:13} />}
    </button>
  );
}
function Pill({ tone, square, icon, children, style }) {
  const cls = ['pill', square&&'pill-sq', tone&&`pill-${tone}`].filter(Boolean).join(' ');
  return <span className={cls} style={style}>{icon && <Icon name={icon} size={11} />}{children}</span>;
}

// ── Pretty agent card ───────────────────────────────────────
function AgentTile({ agent, state='thinking', detail, pct, accent }) {
  // states: queued, thinking, drafting, submitted, revising, passed, dissent
  const stateMap = {
    queued:    { pill:'',         label:'Queued',     pillCls:'',           pulse:false },
    thinking:  { pill:'',         label:'Thinking',   pillCls:'pill',       pulse:true  },
    drafting:  { pill:'',         label:'Drafting',   pillCls:'pill',       pulse:true  },
    submitted: { pill:'amber',    label:'Submitted',  pillCls:'pill pill-amber', pulse:false },
    revising:  { pill:'amber',    label:'Revising',   pillCls:'pill pill-amber', pulse:true  },
    passed:    { pill:'green',    label:'Passed QA',  pillCls:'pill pill-green', pulse:false },
    dissent:   { pill:'red',      label:'Dissenting', pillCls:'pill pill-red',   pulse:false },
  };
  const st = stateMap[state] || stateMap.thinking;
  return (
    <div className="card-elev" style={{ padding:14, display:'flex', flexDirection:'column', gap:10, minWidth:0 }}>
      <div className="row gap-3" style={{ minWidth:0 }}>
        <Avatar initials={agent.initials} rim={agent.tone} />
        <div className="grow" style={{ minWidth:0 }}>
          <div className="t-h3" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{agent.name}</div>
          <div className="t-tiny" style={{ marginTop:1 }}>{agent.role}</div>
        </div>
        <Icon name={AGENT_ICON[agent.id] || 'sparkle'} size={14} style={{ color:'var(--ink-4)' }} />
      </div>
      <div className={`bar ${state==='revising'?'bar-striped bar-amber':state==='passed'?'bar-green':state==='dissent'?'':''}`}>
        <i style={{ width: `${pct ?? (state==='thinking'?42:state==='drafting'?60:state==='submitted'?100:state==='revising'?72:state==='passed'?100:state==='dissent'?100:state==='queued'?8:42)}%` }} />
      </div>
      <div className="row gap-2" style={{ justifyContent:'space-between' }}>
        <span className={st.pillCls}>
          {st.pulse && <span className="live-dot" style={{ background: state==='revising'?'var(--amber)':'var(--accent)' }} />}
          {st.label}
        </span>
        {detail && <span className="t-tiny" style={{ textTransform:'none', letterSpacing:0 }}>{detail}</span>}
      </div>
    </div>
  );
}

// ── Section header ──────────────────────────────────────────
function PageHeader({ eyebrow, title, sub, right }) {
  return (
    <div className="row gap-4" style={{ alignItems:'flex-end', padding:'24px 32px 18px', borderBottom:'1px solid var(--hairline)' }}>
      <div className="grow">
        {eyebrow && <div className="t-tiny" style={{ marginBottom:6 }}>{eyebrow}</div>}
        <div className="t-h1">{title}</div>
        {sub && <div className="t-body muted" style={{ marginTop:4, maxWidth:720 }}>{sub}</div>}
      </div>
      {right && <div className="row gap-2">{right}</div>}
    </div>
  );
}

// expose
Object.assign(window, {
  COMMITTEES, SESSIONS, KPIS,
  Icon, Avatar, AvatarStack, Btn, Pill, AgentTile, PageHeader,
  AGENT_ICON,
  useState, useEffect, useRef, useMemo, Fragment,
});
