// Groups (CR-002, FR-703 to FR-705): "Don't decide alone." A group per target course and one per A/L batch. Needs an
// account (the server enforces it). Verified seniors carry a badge; every message is screened automatically; members
// report and block. Messages travel over a WebSocket to the group's room.
// Video 2 (Praveen 2026-10-11): WhatsApp-style chat list and room; group rules accepted before joining (CR-005, the
// server refuses a join or the live room without them); popular course groups; labelled sample conversations.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, BadgeCheck, Ban, ChevronRight, Flag, Info, LogOut, ShieldCheck, TriangleAlert, Users, X } from 'lucide-react';
import { GROUP_RULES_VERSION, GROUP_RULE_COUNT, MESSAGE_MAX, REPORT_REASONS, type ChatMessage, type GroupSummary, type GroupsResponse, type ReportReason,
  type ServerFrame } from '../../shared/groups.ts';
import type { ResultsResponse } from '../../shared/api.ts';
import type { ListEntry } from '../../shared/list.ts';
import { ApiFailure } from '../account.ts';
import { Stagger, rise } from '../ui.tsx';
import { locale, t, type Key } from '../i18n/index.ts';
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
/** A steady colour per name (avatars and author names), like a chat app. */
const TONES = ['#1F8A70', '#3461C9', '#B4458C', '#C26B00', '#6A4FC9', '#0E7C9A', '#A33A3A', '#4E7A1E'];
const tone = (s: string) => TONES[[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % TONES.length];
const initials = (s: string) => s.replace(/^Sample( senior)? · /, '').split(/[\s·,]+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('');
const groupKey = (g: GroupSummary) => `${g.kind}:${g.courseCode ?? ''}`;

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  return <span className="wa-avatar" aria-hidden="true" style={{ background: tone(name), width: size, height: size, fontSize: size * .38 }}>{initials(name) || <Users size={size * .45} />}</span>;
}

/** The group rules (CR-005). With onAccept: the student ticks "I agree" and joins; without: read-only (inside a room). */
export function RulesCard({ onAccept, onClose, busy }: { onAccept?: () => void; onClose: () => void; busy?: boolean }) {
  const [agree, setAgree] = useState(false);
  return (
    <motion.section className="card stack wa-rules" role="dialog" aria-labelledby="rules-h" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <ShieldCheck size={22} aria-hidden="true" style={{ color: 'var(--wa-green)', flex: 'none' }} />
        <h2 id="rules-h" className="title-l" style={{ margin: 0, flex: 1 }}>{t('gr.rulesH')}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t('gr.close')}><X size={20} /></button>
      </div>
      <ol className="wa-rule-list">{Array.from({ length: GROUP_RULE_COUNT }, (_, i) => <li key={i}>{t(`gr.rule.${i + 1}` as Key)}</li>)}</ol>
      {onAccept && (<>
        <label className="row check" style={{ flexWrap: 'nowrap' }}><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
          <span className="body-m">{t('gr.rulesAgree')}</span></label>
        <button className="btn filled wa-btn" disabled={!agree || busy} onClick={onAccept}>{busy ? t('gr.joining') : t('gr.rulesJoin')}</button>
      </>)}
    </motion.section>);
}

export function GroupsScreen({ loggedIn, list, results, go }: { loggedIn: boolean; list: ListEntry[]; results: ResultsResponse | null; go: (to: string) => void }) {
  const [data, setData] = useState<GroupsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState<GroupSummary | null>(null);         // the group whose rules are on screen
  const [reading, setReading] = useState(false);                             // the rules, read-only
  // The courses on My list; with an empty list, the student's three best-chance courses ("groups you might be in").
  const fromResults = (results?.offerings ?? []).filter(o => o.band === 'SAFE' || o.band === 'LIKELY').map(o => o.uniCode.slice(0, 3));
  const courses = [...new Set(list.length ? list.map(e => e.uniCode.slice(0, 3)) : fromResults)].slice(0, list.length ? 30 : 3).join(',');
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

  const open = (g: GroupSummary) => { if (g.joined && g.rulesAccepted && g.id) go(`/group/${g.id}`); else { setError(null); setAsking(g); } };
  const join = async (g: GroupSummary) => {
    setBusy(true); setError(null);
    try { const j = await call<GroupSummary>('POST', '/groups/join', { kind: g.kind, courseCode: g.courseCode ?? undefined, acceptRules: GROUP_RULES_VERSION }); go(`/group/${j.id}`); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const joined = data?.groups.filter(g => g.joined) ?? [];
  const suggested = data?.groups.filter(g => !g.joined) ?? [];
  const popular = data?.popular.filter(g => !g.joined) ?? [];
  const Row = ({ g }: { g: GroupSummary }) => (
    <motion.button variants={rise} className="item wa-row" onClick={() => open(g)}>
      <Avatar name={g.name} />
      <span className="grow"><span className="t">{title(g)}</span><span className="s">{subtitle(g)}</span>
        <span className="m num">{g.members ? members(g.members) : t('gr.first')}</span></span>
      {g.joined ? <ChevronRight size={20} className="chev" aria-hidden="true" /> : <span className="pill wa-join">{t('gr.join')}</span>}
    </motion.button>);
  const section = (label: string, gs: GroupSummary[]) => gs.length > 0 && (<>
    <p className="section-label">{label}</p>
    <Stagger className="list-card">{gs.map(g => <Row key={groupKey(g)} g={g} />)}</Stagger>
  </>);
  return (
    <>
      <Intro />
      {asking && <RulesCard busy={busy} onClose={() => setAsking(null)} onAccept={() => void join(asking)} />}
      {error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{error}</div>}
      {!data && !error && <><div className="skeleton" /><div className="skeleton" /></>}
      {section(t('gr.yours'), joined)}
      {data && section(joined.length ? t('gr.more') : t('gr.for'), suggested)}
      {data && suggested.length === 0 && joined.length === 0 && <div className="card"><p className="subtitle">{t('gr.addCourses')}</p></div>}
      {section(t('gr.popular'), popular)}
      {data?.role === 'STUDENT' && !data.groups.some(g => g.kind === 'BATCH') && <p className="helper">{t('gr.batchLater')}</p>}
      {reading && <RulesCard onClose={() => setReading(false)} />}
      <button className="btn text" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => setReading(r => !r)} aria-expanded={reading}>
        <ShieldCheck size={18} aria-hidden="true" />{t('gr.rulesShow')}</button>
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

const dayLabel = (iso: string) => {
  const d = new Date(iso), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return t('jr.today');
  if (d.toDateString() === y.toDateString()) return t('gr.yesterday');
  return d.toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' });
};

export function GroupRoomScreen({ id, username, go }: { id: number; username: string | null; go: (to: string) => void }) {
  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [rules, setRules] = useState(false);
  const [hiddenAuthors, setHiddenAuthors] = useState<string[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { call<GroupSummary>('GET', `/groups/${id}`).then(setGroup).catch(e => setError(e.message)); }, [id, attempt]);
  const ready = group?.joined && group.rulesAccepted;
  useEffect(() => {
    if (!ready) return;
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
  }, [id, attempt, ready]);
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
  const accept = async () => {
    if (!group) return;
    try { await call('POST', '/groups/join', { kind: group.kind, courseCode: group.courseCode ?? undefined, acceptRules: GROUP_RULES_VERSION }); setAttempt(a => a + 1); }
    catch (x) { setError((x as Error).message); }
  };

  const shown = msgs.filter(m => !hiddenAuthors.includes(m.author));
  if (group && !ready) return <RulesCard onAccept={() => void accept()} onClose={() => go('/groups')} />;
  return (
    <div className="wa-room">
      <header className="wa-head">
        <Avatar name={group?.name ?? '?'} size={42} />
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="t">{group ? title(group) : ' '}</span>
          <span className="s num">{group ? `${members(group.members)} · ${state === 'open' ? t('gr.online') : state === 'connecting' ? t('gr.connecting') : t('gr.disconnected')}` : ''}</span>
        </span>
        <button className="icon-btn" onClick={() => setRules(r => !r)} aria-label={t('gr.rulesShow')} aria-expanded={rules}><Info size={20} /></button>
      </header>
      {rules && <RulesCard onClose={() => setRules(false)} />}
      <div className="wa-chat" aria-live="polite">
        {shown.some(m => m.sample) && <p className="wa-system"><Info size={13} aria-hidden="true" />{t('gr.sampleNote')}</p>}
        {state === 'connecting' && <div className="skeleton" style={{ height: 80 }} />}
        {state === 'closed' && !error && <div className="alert warn" role="status"><TriangleAlert size={20} aria-hidden="true" /><span className="stack" style={{ gap: 6 }}>{t('gr.disconnected')}<button className="btn tonal" style={{ alignSelf: 'flex-start' }} onClick={() => setAttempt(a => a + 1)}>{t('gr.reconnect')}</button></span></div>}
        {state === 'open' && shown.length === 0 && <p className="wa-system">{t('gr.empty')}</p>}
        {shown.map((m, i) => {
          const mine = !m.sample && m.author === username;
          const newDay = i === 0 || new Date(shown[i - 1].at).toDateString() !== new Date(m.at).toDateString();
          const sameAuthor = !newDay && i > 0 && shown[i - 1].author === m.author;
          return (
            <div key={m.id} className="stack" style={{ gap: 4 }}>
              {newDay && <span className="wa-day">{dayLabel(m.at)}</span>}
              <motion.div className={`wa-msg ${mine ? 'mine' : ''} ${sameAuthor ? 'cont' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                {!mine && !sameAuthor && <span className="wa-author" style={{ color: tone(m.author) }}>{m.author}</span>}
                {m.badge && !sameAuthor && <span className={`wa-badge ${m.sample ? 'sample' : ''}`}>{!m.sample && <BadgeCheck size={12} aria-hidden="true" />}{m.badge}</span>}
                <span className="wa-body">{m.body}
                  <span className="wa-meta num">{m.sample && <span className="wa-sample">{t('gr.sample')}</span>}{new Date(m.at).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}
                    {!mine && !m.sample && <button className="wa-more" aria-label={t('gr.reportAria', { u: m.author })} aria-expanded={menu === m.id} onClick={() => setMenu(menu === m.id ? null : m.id)}><Flag size={12} /></button>}</span></span>
                {menu === m.id && (
                  <div className="stack" style={{ gap: 6, marginTop: 6 }}>
                    <span className="helper">{t('gr.reportAs')}</span>
                    <div className="chips">{REPORT_REASONS.map(r => <button key={r} className="chip small" onClick={() => void report(m, r)}>{reasonLabel(r)}</button>)}</div>
                    <button className="btn text danger-text" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => void block(m)}><Ban size={16} aria-hidden="true" />{t('gr.block', { u: m.author })}</button>
                  </div>)}
              </motion.div>
            </div>);
        })}
        <div ref={endRef} />
      </div>
      {error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{error}</div>}
      {note && <p className="helper" role="status">{note}</p>}
      <form className="wa-composer" onSubmit={send}>
        <input className="input" value={text} onChange={e => setText(e.target.value)} placeholder={state === 'open' ? t('gr.write') : t('gr.connecting')} maxLength={MESSAGE_MAX}
          aria-label={t('gr.msgAria')} enterKeyHint="send" disabled={state !== 'open'} />
        <button className="send" type="submit" disabled={state !== 'open' || !text.trim()} aria-label={t('gr.send')}><ArrowUp size={22} /></button>
      </form>
      <button className="btn text" style={{ alignSelf: 'center' }} onClick={() => void leave()}><LogOut size={18} aria-hidden="true" />{t('gr.leave')}</button>
    </div>
  );
}
