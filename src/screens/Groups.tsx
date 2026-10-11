// Groups (CR-002, FR-703 to FR-705): "Don't decide alone." A group per target course and one per A/L batch. Needs an
// account (the server enforces it). Verified seniors carry a badge; every message is screened automatically; members
// report and block. Messages travel over a WebSocket to the group's room.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, BadgeCheck, Ban, ChevronRight, Flag, LogOut, ShieldCheck, TriangleAlert, Users } from 'lucide-react';
import { MESSAGE_MAX, REPORT_REASONS, type ChatMessage, type GroupSummary, type GroupsResponse, type ReportReason, type ServerFrame } from '../../shared/groups.ts';
import type { ListEntry } from '../../shared/list.ts';
import { ApiFailure } from '../account.ts';
import { Stagger, rise } from '../ui.tsx';
import { locale, t } from '../i18n/index.ts';
import { Rich } from '../i18n/Rich.tsx';

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let r: Response;
  try { r = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new ApiFailure(0, 'No connection. Check your internet and try again'); }
  if (r.status === 204) return undefined as T;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiFailure(r.status, data.error ?? `Something went wrong (${r.status})`);
  return data as T;
}

const reasonLabel = (r: ReportReason) => t(`reason.${r}`);
const title = (g: GroupSummary) => g.kind === 'COURSE' ? t('gr.waiting', { course: g.name }) : g.name;
const subtitle = (g: GroupSummary) => g.kind === 'BATCH' ? t('gr.batchSub')
  : g.universities === 1 ? t('gr.courseSubOne', { code: g.courseCode ?? '' }) : t('gr.courseSub', { code: g.courseCode ?? '', n: g.universities });
const members = (n: number) => n === 1 ? t('gr.member') : t('gr.members', { n });

export function GroupsScreen({ loggedIn, list, go }: { loggedIn: boolean; list: ListEntry[]; go: (to: string) => void }) {
  const [data, setData] = useState<GroupsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const courses = [...new Set(list.map(e => e.uniCode.slice(0, 3)))].join(',');
  useEffect(() => {
    if (!loggedIn) return;
    call<GroupsResponse>('GET', `/groups?courses=${courses}`).then(setData).catch(e => setError(e.message));
  }, [loggedIn, courses]);

  if (!loggedIn) return (
    <>
      <Intro />
      <section className="card stack">
        <h2 className="title-l">{t('gr.needAcc')}</h2>
        <p className="subtitle">{t('gr.needAccSub')}</p>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <button className="btn filled" style={{ flex: 1 }} onClick={() => go('/signup')}>{t('acc.create')}</button>
          <button className="btn text" onClick={() => go('/login')}>{t('acc.login')}</button>
        </div>
      </section>
    </>);

  const join = async (g: GroupSummary) => {
    const key = `${g.kind}:${g.courseCode ?? ''}`;
    setBusy(key); setError(null);
    try { const j = await call<GroupSummary>('POST', '/groups/join', { kind: g.kind, courseCode: g.courseCode ?? undefined }); go(`/group/${j.id}`); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  };
  const joined = data?.groups.filter(g => g.joined) ?? [];
  const suggested = data?.groups.filter(g => !g.joined) ?? [];
  return (
    <>
      <Intro />
      {error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{error}</div>}
      {!data && !error && <><div className="skeleton" /><div className="skeleton" /></>}
      {joined.length > 0 && (<>
        <p className="section-label">{t('gr.yours')}</p>
        <Stagger className="list-card">{joined.map(g => (
          <motion.button key={g.id} variants={rise} className="item" onClick={() => go(`/group/${g.id}`)}>
            <span className="ic" style={{ background: 'var(--likely-bg)', color: 'var(--likely)' }}><Users size={20} aria-hidden="true" /></span>
            <span className="grow"><span className="t">{title(g)}</span><span className="s">{subtitle(g)}</span><span className="m num">{members(g.members)}</span></span>
            <ChevronRight size={20} className="chev" aria-hidden="true" />
          </motion.button>))}</Stagger>
      </>)}
      {data && (<>
        <p className="section-label">{joined.length ? t('gr.more') : t('gr.for')}</p>
        {suggested.length === 0 && <div className="card"><p className="subtitle">{t('gr.addCourses')}</p></div>}
        <Stagger className="list-card">{suggested.map(g => (
          <motion.div key={`${g.kind}:${g.courseCode}`} variants={rise} className="item" style={{ cursor: 'default' }}>
            <span className="ic" style={{ background: 'var(--safe-bg)', color: 'var(--safe)' }}><Users size={20} aria-hidden="true" /></span>
            <span className="grow"><span className="t">{title(g)}</span><span className="s">{subtitle(g)}</span><span className="m num">{g.members ? members(g.members) : t('gr.first')}</span></span>
            <button className="btn tonal" onClick={() => void join(g)} disabled={busy !== null}>{busy === `${g.kind}:${g.courseCode ?? ''}` ? t('gr.joining') : t('gr.join')}</button>
          </motion.div>))}</Stagger>
        {data.role === 'STUDENT' && !data.groups.some(g => g.kind === 'BATCH') && <p className="helper">{t('gr.batchLater')}</p>}
      </>)}
      <p className="footer-note"><ShieldCheck size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />
        <Rich text={t('gr.footer')} /></p>
    </>
  );
}

function Intro() {
  return (
    <div className="stack" style={{ gap: 4 }}>
      <h1 className="screen-title">{t('gr.introH')}</h1>
      <p className="subtitle">{t('gr.introSub')}</p>
    </div>);
}

export function GroupRoomScreen({ id, username, go }: { id: number; username: string | null; go: (to: string) => void }) {
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hiddenAuthors, setHiddenAuthors] = useState<string[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const sock = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/groups/${id}/live`);
    ws.current = sock; setState('connecting');
    sock.onopen = () => { setState('open'); setError(null); };
    sock.onclose = ev => { setState('closed'); if (ev.code === 1008) setError(t('gr.deleted')); };
    sock.onmessage = ev => {
      const f = JSON.parse(String(ev.data)) as ServerFrame;
      if (f.type === 'history') setMsgs(f.messages);
      else if (f.type === 'message') setMsgs(m => [...m, f.message]);
      else if (f.type === 'hidden') setMsgs(m => m.filter(x => x.id !== f.id));
      else if (f.type === 'error') setError(f.error);
    };
    return () => sock.close();
  }, [id, attempt]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs.length]);

  const send = (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || state !== 'open') return;
    setError(null);
    ws.current?.send(JSON.stringify({ type: 'post', body }));
    setText('');
  };
  const report = async (m: ChatMessage, reason: ReportReason) => {
    setMenu(null);
    try { await call('POST', `/groups/${id}/report`, { messageId: m.id, reason }); setNote(t('gr.reported')); }
    catch (x) { setNote((x as Error).message); }
  };
  const block = async (m: ChatMessage) => {
    setMenu(null);
    try { await call('POST', '/blocks', { username: m.author }); setHiddenAuthors(a => [...a, m.author]); setNote(t('gr.blocked', { u: m.author })); }
    catch (x) { setNote((x as Error).message); }
  };
  const leave = async () => { try { await call('POST', `/groups/${id}/leave`); go('/groups'); } catch (x) { setNote((x as Error).message); } };

  const shown = msgs.filter(m => !hiddenAuthors.includes(m.author));
  return (
    <>
      <div className="alert info" role="note"><ShieldCheck size={20} aria-hidden="true" /><span>{t('gr.rules')}</span></div>
      {state === 'closed' && !error && <div className="alert warn" role="status"><TriangleAlert size={20} aria-hidden="true" /><span className="stack" style={{ gap: 6 }}>{t('gr.disconnected')}<button className="btn tonal" style={{ alignSelf: 'flex-start' }} onClick={() => setAttempt(a => a + 1)}>{t('gr.reconnect')}</button></span></div>}
      {state === 'connecting' && <div className="skeleton" style={{ height: 80 }} />}
      {state !== 'connecting' && shown.length === 0 && <div className="card"><p className="subtitle">{t('gr.empty')}</p></div>}
      <div className="stack chat" style={{ gap: 10 }}>
        {shown.map(m => {
          const mine = m.author === username;
          return (
            <motion.div key={m.id} className={`card stack msg ${mine ? 'mine' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="row" style={{ flexWrap: 'nowrap', gap: 6, alignItems: 'center' }}>
                <span className="title-s grow" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{mine ? t('gr.you') : m.author}</span>
                <span className="helper num">{new Date(m.at).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}</span>
                {!mine && <button className="icon-btn" aria-label={t('gr.reportAria', { u: m.author })} aria-expanded={menu === m.id} onClick={() => setMenu(menu === m.id ? null : m.id)}><Flag size={16} /></button>}
              </div>
              {m.badge && <span className="pill band-SAFE" style={{ alignSelf: 'flex-start' }}><BadgeCheck size={13} aria-hidden="true" />{m.badge}</span>}
              <p className="body-m" style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.body}</p>
              {menu === m.id && (
                <div className="stack" style={{ gap: 6 }}>
                  <span className="helper">{t('gr.reportAs')}</span>
                  <div className="chips">{REPORT_REASONS.map(r => <button key={r} className="chip" onClick={() => void report(m, r)}>{reasonLabel(r)}</button>)}</div>
                  <button className="btn text danger-text" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => void block(m)}><Ban size={16} aria-hidden="true" />{t('gr.block', { u: m.author })}</button>
                </div>)}
            </motion.div>);
        })}
        <div ref={endRef} />
      </div>
      {error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{error}</div>}
      {note && <p className="helper" role="status">{note}</p>}
      <form className="composer" onSubmit={send}>
        <input className="input" value={text} onChange={e => setText(e.target.value)} placeholder={state === 'open' ? t('gr.write') : t('gr.connecting')} maxLength={MESSAGE_MAX}
          aria-label={t('gr.msgAria')} enterKeyHint="send" disabled={state !== 'open'} />
        <button className="send" type="submit" disabled={state !== 'open' || !text.trim()} aria-label={t('gr.send')}><ArrowUp size={22} /></button>
      </form>
      <button className="btn text" style={{ alignSelf: 'center' }} onClick={() => void leave()}><LogOut size={18} aria-hidden="true" />{t('gr.leave')}</button>
    </>
  );
}
