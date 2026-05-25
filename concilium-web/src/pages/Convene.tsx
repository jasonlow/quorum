import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, FileText, Paperclip, Sparkles, Upload, X } from 'lucide-react';
import { Btn } from '@/ui/Btn';
import { Avatar } from '@/ui/Avatar';
import { Pill } from '@/ui/Pill';
import { PageHeader } from '@/ui/PageHeader';
import {
  committeesApi, documentsApi, sessionsApi,
  type SessionDocumentView,
} from '@/features/sessions/api';
import { useSessionStore } from '@/features/sessions/store';
import type { CommitteeView, SessionView } from '@/features/sessions/types';

const SAMPLE_TOPIC =
  'Review ETH Accumulator Series 3 — proposed structured product for accredited investors. ' +
  '12-month tenor, 70% knock-in barrier, 18% coupon p.a. paid in USDC.';

const SAMPLE_CONTEXT = `# Product Memo — ETH Accumulator Series 3

**Status:** Proposed
**Target audience:** Accredited investors only
**Tenor:** 12 months
**Notional:** USD 10M target, minimum subscription USD 250K

## Structure
- Daily accumulation of ETH/USD at prevailing spot; knock-in barrier at 70% of strike.
- If spot breaches the barrier, accumulation rate doubles for the remainder of the tenor.
- Coupon: 18% p.a., paid monthly in USDC.

## Collateral
- Initial buffer: 15% of notional. Margin call at 7% utilisation.

## Market context
- ETH spot 3,245; vol 60-day 58%, implied 1m ATM 64%.
- Fed: pause through Q2 expected, one cut priced for H2.
- 8 of 47 prior accumulator positions hit knock-in in 24m; 6/8 self-topped within 12h of margin notice.

## Regulatory
- Classified internally as Specified Investment Product (SIP), accredited-only.
`;

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const DEFAULT_COMMITTEE_NAME = 'Investment Risk Committee';
const MAX_DOCS = 5;

export function Convene() {
  const navigate = useNavigate();
  const hydrate = useSessionStore(s => s.hydrateFromView);

  const [committees, setCommittees] = useState<CommitteeView[] | null>(null);
  const [committeeId, setCommitteeId] = useState<string | null>(null);
  const [topic, setTopic] = useState(SAMPLE_TOPIC);
  const [contextMd, setContextMd] = useState(SAMPLE_CONTEXT);
  const [error, setError] = useState<string | null>(null);

  // Stage 1 → Stage 2 transition: created session sits in CONVENED until Start
  const [draftSession, setDraftSession] = useState<SessionView | null>(null);
  const [savingAgenda, setSavingAgenda] = useState(false);
  const [starting, setStarting] = useState(false);

  // Documents (stage 2)
  const [documents, setDocuments] = useState<SessionDocumentView[]>([]);
  const [uploading, setUploading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NL agenda-generation panel (stage 1)
  const [nlOpen, setNlOpen] = useState(false);
  const [nlText, setNlText] = useState('');
  const [nlBusy, setNlBusy] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

  useEffect(() => {
    committeesApi.list('PUBLISHED')
      .then(list => {
        setCommittees(list);
        const def = list.find(c => c.name === DEFAULT_COMMITTEE_NAME) ?? list[0];
        setCommitteeId(def?.id ?? null);
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function onSaveAgenda() {
    setSavingAgenda(true);
    setError(null);
    try {
      const view = await sessionsApi.convene({
        committeeId: committeeId ?? undefined,
        topic,
        contextMd,
      });
      setDraftSession(view);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingAgenda(false);
    }
  }

  async function onStart() {
    if (!draftSession) return;
    setStarting(true);
    setError(null);
    try {
      await sessionsApi.deliberate(draftSession.id);
      hydrate(draftSession);
      navigate(`/sessions/${draftSession.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStarting(false);
    }
  }

  async function onUploadFile(file: File) {
    if (!draftSession) return;
    setUploading(true);
    setDocError(null);
    try {
      const uploaded = await documentsApi.upload(draftSession.id, file);
      setDocuments(prev => [...prev, uploaded]);
    } catch (e) {
      setDocError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function onRemoveDocument(docId: string) {
    if (!draftSession) return;
    setDocError(null);
    try {
      await documentsApi.remove(draftSession.id, docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e) {
      setDocError(e instanceof Error ? e.message : String(e));
    }
  }

  async function runGenerate() {
    if (!nlText.trim()) return;
    setNlBusy(true);
    setNlError(null);
    try {
      const draft = await sessionsApi.generateAgenda(committeeId, nlText.trim());
      setTopic(draft.topic ?? '');
      setContextMd(draft.contextMd ?? '');
      setNlOpen(false);
      setNlText('');
    } catch (e) {
      setNlError(e instanceof Error ? e.message : String(e));
    } finally {
      setNlBusy(false);
    }
  }

  const chosenCommittee = committees?.find(c => c.id === committeeId) ?? null;
  const stage = draftSession === null ? 'agenda' : 'documents';

  return (
    <>
      <PageHeader
        eyebrow={stage === 'agenda' ? 'New session' : 'New session · documents'}
        title={stage === 'agenda' ? 'Set the agenda' : 'Attach supporting documents'}
        sub={
          stage === 'agenda'
            ? 'Pick a committee, paste the topic + context, then continue to attach any supporting documents the committee should read.'
            : 'Optional. Upload PDF / DOCX / XLSX / CSV files — Tika extracts the text and prepends it to every agent\'s context. You can skip this and Start directly.'
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 980 }}>

        {/* ═══════════════════ STAGE 1: AGENDA ═══════════════════ */}
        {stage === 'agenda' && (
          <>
            {/* ─── Committee picker ────────────────────────────────── */}
            <section>
              <div className="row gap-3" style={{ alignItems: 'baseline', marginBottom: 10 }}>
                <label className="t-tiny">Committee</label>
                <div className="grow" />
                <Link to="/committees" style={{ textDecoration: 'none' }}>
                  <Btn kind="ghost" size="sm">Manage committees →</Btn>
                </Link>
              </div>

              {committees === null && !error && (
                <div className="t-body-sm muted" style={{ padding: 12 }}>Loading committees…</div>
              )}

              {committees !== null && committees.length === 0 && (
                <div className="empty-state">
                  No active committees. <Link to="/committees/new">Create one</Link> first.
                </div>
              )}

              {committees !== null && committees.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 12,
                }}>
                  {committees.map(c => {
                    const selected = c.id === committeeId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCommitteeId(c.id)}
                        className="card"
                        style={{
                          textAlign: 'left',
                          cursor: 'pointer',
                          padding: 14,
                          border: selected
                            ? '2px solid var(--accent)'
                            : '1px solid var(--hairline)',
                          background: selected ? 'var(--accent-bg)' : 'var(--surface)',
                          display: 'flex', flexDirection: 'column', gap: 8,
                          minWidth: 0,
                        }}
                      >
                        <div className="row gap-2" style={{ alignItems: 'baseline' }}>
                          <div className="t-h3" style={{
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', flex: 1,
                          }}>{c.name}</div>
                          {selected && (
                            <Check size={16} strokeWidth={2.2} style={{ color: 'var(--accent)', flex: '0 0 auto' }} />
                          )}
                        </div>
                        {c.description && (
                          <div className="t-body-sm muted" style={{
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          }}>
                            {c.description}
                          </div>
                        )}
                        <div className="row gap-1" style={{ flexWrap: 'wrap' }}>
                          <Pill>{c.orchestrationPattern.replace(/_/g, ' ').toLowerCase()}</Pill>
                          <Pill>Q&A: {c.qaIntensity.toLowerCase()}</Pill>
                        </div>
                        <div className="av-stack" style={{ marginTop: 4 }}>
                          {c.members.slice(0, 7).map(m => (
                            <Avatar key={m.agentId} initials={initials(m.agentName)} size="sm" />
                          ))}
                          {c.members.length > 7 && (
                            <span className="t-tiny muted" style={{ marginLeft: 4, alignSelf: 'center' }}>
                              +{c.members.length - 7}
                            </span>
                          )}
                        </div>
                        <div className="t-tiny muted">
                          {c.members.length} {c.members.length === 1 ? 'member' : 'members'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ─── NL agenda generator ─────────────────────────────── */}
            <div className="card" style={{
              padding: 14,
              background: 'var(--accent-bg)',
              border: '1px solid var(--accent)',
            }}>
              <div className="row gap-3" style={{ alignItems: 'center' }}>
                <Sparkles size={16} strokeWidth={1.7} style={{ color: 'var(--accent)' }} />
                <div className="t-h3" style={{ margin: 0, color: 'var(--accent)' }}>
                  Generate agenda from description
                </div>
                <div className="grow" />
                {!nlOpen && (
                  <Btn kind="accent" size="sm" type="button" onClick={() => setNlOpen(true)}>
                    Describe the topic
                  </Btn>
                )}
              </div>

              {nlOpen && (
                <div style={{ marginTop: 12 }}>
                  <textarea
                    className="input"
                    value={nlText}
                    onChange={(e) => setNlText(e.target.value)}
                    placeholder={
                      chosenCommittee
                        ? `e.g. a structured product offering ETH exposure with downside protection, 12-month tenor, accredited investors only — pitched at ${chosenCommittee.name}`
                        : 'e.g. a new structured product proposal, a client onboarding case, an engineering change request…'
                    }
                    rows={4}
                  />
                  <div className="t-tiny muted" style={{ marginTop: 4 }}>
                    {chosenCommittee
                      ? `Will be pitched for ${chosenCommittee.name} — pick a different committee above to retarget.`
                      : 'Pick a committee above for better-targeted output.'}
                  </div>
                  {nlError && <div className="notice notice-err" style={{ marginTop: 8 }}>{nlError}</div>}
                  <div className="row gap-2" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                    <Btn type="button" onClick={() => { setNlOpen(false); setNlText(''); setNlError(null); }} disabled={nlBusy}>
                      Cancel
                    </Btn>
                    <Btn kind="accent" icon={Sparkles} type="button" onClick={runGenerate} disabled={nlBusy || !nlText.trim()}>
                      {nlBusy ? 'Generating…' : 'Generate agenda'}
                    </Btn>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Topic + context ─────────────────────────────────── */}
            <div>
              <label className="t-tiny" style={{ display: 'block', marginBottom: 6 }}>Topic</label>
              <input
                className="input"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What should the committee deliberate on?"
              />
            </div>

            <div>
              <label className="t-tiny" style={{ display: 'block', marginBottom: 6 }}>Context (markdown)</label>
              <textarea
                className="input"
                value={contextMd}
                onChange={(e) => setContextMd(e.target.value)}
                rows={16}
                style={{ fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.55 }}
              />
              <div className="t-tiny muted" style={{ marginTop: 6 }}>
                ~{contextMd.length} chars · the same context is passed to every member of the committee.
              </div>
            </div>

            {error && <div className="notice notice-err">{error}</div>}

            <div className="row gap-3">
              <Btn onClick={() => navigate('/')}>Back</Btn>
              <div className="grow" />
              <Btn
                kind="accent"
                size="lg"
                iconRight={ArrowRight}
                onClick={onSaveAgenda}
                disabled={savingAgenda || topic.trim().length === 0 || !chosenCommittee}
              >
                {savingAgenda
                  ? 'Saving…'
                  : 'Save & attach documents →'}
              </Btn>
            </div>
          </>
        )}

        {/* ═══════════════════ STAGE 2: DOCUMENTS + START ═══════════════════ */}
        {stage === 'documents' && draftSession && (
          <>
            {/* ─── Agenda recap (read-only) ────────────────────────── */}
            <div className="card" style={{ padding: 16 }}>
              <div className="row gap-2" style={{ alignItems: 'baseline', marginBottom: 8 }}>
                <div className="t-tiny muted">Committee</div>
                <div className="t-body" style={{ fontWeight: 600 }}>
                  {chosenCommittee?.name ?? '—'}
                </div>
              </div>
              <div className="t-tiny muted" style={{ marginBottom: 4 }}>Topic</div>
              <div className="t-body" style={{ marginBottom: 12 }}>{topic}</div>
              {contextMd.trim() && (
                <>
                  <div className="t-tiny muted" style={{ marginBottom: 4 }}>Context</div>
                  <div className="t-body-sm muted" style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--mono)', fontSize: 11.5, lineHeight: 1.5,
                    maxHeight: 180, overflow: 'auto',
                    padding: 10, background: 'var(--surface-2)',
                    border: '1px solid var(--hairline)', borderRadius: 6,
                  }}>
                    {contextMd}
                  </div>
                </>
              )}
            </div>

            {/* ─── Documents panel ─────────────────────────────────── */}
            <section>
              <div className="row gap-3" style={{ alignItems: 'baseline', marginBottom: 10 }}>
                <label className="t-tiny">
                  Supporting documents
                  {' '}
                  <span className="muted">({documents.length}/{MAX_DOCS})</span>
                </label>
                <div className="grow" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadFile(f);
                  }}
                />
                <Btn
                  size="sm"
                  icon={Upload}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || documents.length >= MAX_DOCS}
                >
                  {uploading ? 'Extracting…' : 'Upload document'}
                </Btn>
              </div>

              <div className="t-tiny muted" style={{ marginBottom: 10 }}>
                Tika extracts the text and prepends it to every agent\'s context.
                Accepted: PDF, DOCX, XLSX, CSV, TXT, MD. Max 5 docs, 50 KB extracted text per doc.
                Scanned-image PDFs are not supported in the PoC.
              </div>

              {docError && (
                <div className="notice notice-err" style={{ marginBottom: 10 }}>{docError}</div>
              )}

              {documents.length === 0 ? (
                <div className="empty-state" style={{ padding: 20, textAlign: 'center' }}>
                  <Paperclip size={20} strokeWidth={1.5} style={{ color: 'var(--ink-3)', marginBottom: 8 }} />
                  <div className="t-body-sm muted">
                    No documents attached. The committee will see only the topic + context above.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {documents.map(d => (
                    <div key={d.id} className="card" style={{
                      padding: 12,
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                      <div className="row gap-3" style={{ alignItems: 'center' }}>
                        <FileText size={16} strokeWidth={1.7} style={{ color: 'var(--accent)' }} />
                        <div className="grow" style={{ minWidth: 0 }}>
                          <div className="t-body" style={{
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{d.filename}</div>
                          <div className="t-tiny muted">
                            {formatBytes(d.byteSize)} · {d.extractedChars.toLocaleString()} chars extracted
                          </div>
                        </div>
                        <Btn
                          type="button" size="sm" kind="ghost" icon={X}
                          onClick={() => onRemoveDocument(d.id)}
                          aria-label="Remove document"
                        />
                      </div>
                      {d.previewSnippet && (
                        <div className="t-tiny muted" style={{
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.5,
                          padding: 8, background: 'var(--surface-2)',
                          border: '1px solid var(--hairline)', borderRadius: 4,
                          maxHeight: 90, overflow: 'hidden',
                        }}>
                          {d.previewSnippet}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {error && <div className="notice notice-err">{error}</div>}

            <div className="row gap-3">
              <Btn onClick={() => navigate('/')}>Back</Btn>
              <div className="grow" />
              <Btn
                kind="accent"
                size="lg"
                iconRight={ArrowRight}
                onClick={onStart}
                disabled={starting}
              >
                {starting ? 'Starting…' : 'Start deliberation'}
              </Btn>
            </div>
          </>
        )}
      </div>
    </>
  );
}
