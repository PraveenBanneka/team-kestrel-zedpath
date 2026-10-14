// Groups (CR-002, FR-703 to FR-705): "Don't decide alone." A group per target course and one per A/L batch. Needs an
// account (the server enforces it). Verified seniors carry a badge; every message is screened automatically; members
// report and block. Messages travel over a WebSocket to the group's room.
// Video 2 (Praveen 2026-10-11): WhatsApp-style chat list and room; popular course groups; labelled sample conversations.
// CR-006 (Praveen 2026-10-11): the rules are accepted ONCE per account (the first join; the server records and enforces
// it); tapping the group's name opens its info page (description, rules, members, Exit group); people have preset
// avatars; the room keeps its connection alive and reconnects on its own instead of showing "Disconnected".
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, BadgeCheck, Ban, ChevronRight, Flag, Info, LogOut, ShieldCheck, TriangleAlert, Users, X } from 'lucide-react';
import { GROUP_RULES_VERSION, GROUP_RULE_COUNT, MESSAGE_MAX, REPORT_REASONS, type ChatMessage, type GroupMemberInfo, type GroupSummary, type GroupsResponse,
  type ReportReason, type ServerFrame } from '../../shared/groups.ts';
import type { ResultsResponse } from '../../shared/api.ts';
import type { ListEntry } from '../../shared/list.ts';
import { ApiFailure, noteStatus } from '../account.ts';
import { PersonAvatar } from '../avatars.tsx';
import { Stagger, rise } from '../ui.tsx';
import { locale, t, type Key } from '../i18n/index.ts';
import { Rich } from '../i18n/Rich.tsx';

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let r: Response;
  try { r = await fetch(`/api${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new ApiFailure(0, 'No connection. Check your internet and try again'); }
  if (r.status === 204) return undefined as T;
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { noteStatus(path, r.status); throw new ApiFailure(r.status, data.error ?? `Something went wrong (${r.status})`); }
  return data as T;
}
/** Join a group. The current rules version is sent only when the student has just accepted them (the first time). */
const joinGroup = (g: Pick<GroupSummary, 'kind' | 'courseCode'>, accepting: boolean) =>
  call<GroupSummary>('POST', '/groups/join', { kind: g.kind, courseCode: g.courseCode ?? undefined, ...(accepting ? { acceptRules: GROUP_RULES_VERSION } : {}) });

const reasonLabel = (r: ReportReason) => t(`reason.${r}`);
const title = (g: GroupSummary) => g.kind === 'COURSE' ? t('gr.waiting', { course: g.name }) : g.name;
const subtitle = (g: GroupSummary) => g.kind === 'BATCH' ? t('gr.batchSub')
  : g.universities === 1 ? t('gr.courseSubOne', { code: g.courseCode ?? '' }) : t('gr.courseSub', { code: g.courseCode ?? '', n: g.universities });
const members = (n: number) => n === 1 ? t('gr.member') : t('gr.members', { n });
const groupKey = (g: GroupSummary) => `${g.kind}:${g.courseCode ?? ''}`;

/** The group rules. With onAccept: the student ticks "I agree" and joins (asked once per account); without: read-only. */
export function RulesCard({ onAccept, onClose, busy, extra }: { onAccept?: () => void; onClose?: () => void; busy?: boolean; extra?: string }) {
  const [agree, setAgree] = useState(false);
  return (
    <motion.section className="card stack wa-rules" role={onAccept ? 'dialog' : undefined} aria-labelledby="rules-h" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <ShieldCheck size={22} aria-hidden="true" style={{ color: 'var(--wa-green)', flex: 'none' }} />
        <h2 id="rules-h" className="title-l" style={{ margin: 0, flex: 1 }}>{t('gr.rulesH')}</h2>
        {onClose && <button className="icon-btn" onClick={onClose} aria-label={t('gr.close')}><X size={20} /></button>}
      </div>
      <ol className="wa-rule-list">
        {Array.from({ length: GROUP_RULE_COUNT }, (_, i) => <li key={i}>{t(`gr.rule.${i + 1}` as Key)}</li>)}
        {extra && <li>{extra}</li>}
      </ol>
      {onAccept && (<>
        <p className="helper">{t('gi.once')}</p>
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
  const [asking, setAsking] = useState<GroupSummary | null>(null);         // the group waiting for the one-time rules
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

  const join = async (g: GroupSummary, accepting: boolean) => {
    setBusy(true); setError(null);
    try { const j = await joinGroup(g, accepting); go(`/group/${j.id}`); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  // Joined: open the room. Not joined: join at once if the rules were accepted before, else ask them this one time.
  const open = (g: GroupSummary) => {
    if (g.joined && g.id) { go(`/group/${g.id}`); return; }
    if (data?.rulesAccepted) void join(g, false); else { setError(null); setAsking(g); }
  };
  const joined = data?.groups.filter(g => g.joined) ?? [];
  const suggested = data?.groups.filter(g => !g.joined) ?? [];
  const popular = data?.popular.filter(g => !g.joined) ?? [];
  const Row = ({ g }: { g: GroupSummary }) => (
    <motion.button variants={rise} className="item wa-row" onClick={() => open(g)} disabled={busy}>
      <PersonAvatar avatar={null} name={g.name} size={48} />
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
      {asking && <RulesCard busy={busy} onClose={() => setAsking(null)} onAccept={() => void join(asking, true)} />}
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
const description = (g: GroupSummary) => g.kind === 'COURSE' ? t('gi.descCourse', { course: g.name, n: g.universities }) : t('gi.descBatch', { name: g.name });
const groupRule = (g: GroupSummary) => g.kind === 'COURSE' ? t('gi.ruleCourse') : t('gi.ruleBatch');

/** Not a member yet (or never accepted the rules): join here, with the rules the first time. */
function JoinGate({ group, onJoined }: { group: GroupSummary; onJoined: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const join = async (accepting: boolean) => {
    setBusy(true); setError(null);
    try { await joinGroup(group, accepting); onJoined(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  return (<>
    {group.rulesAccepted
      ? <section className="card stack"><h2 className="title-l">{title(group)}</h2><p className="subtitle">{description(group)}</p>
          <button className="btn filled wa-btn" disabled={busy} onClick={() => void join(false)}>{busy ? t('gr.joining') : t('gr.join')}</button></section>
      : <RulesCard busy={busy} extra={groupRule(group)} onAccept={() => void join(true)} />}
    {error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{error}</div>}
  </>);
}

export function GroupRoomScreen({ id, username, go }: { id: number; username: string | null; go: (to: string) => void }) {
  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<'connecting' | 'open' | 'retrying' | 'closed'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hiddenAuthors, setHiddenAuthors] = useState<string[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { call<GroupSummary>('GET', `/groups/${id}`).then(setGroup).catch(e => setError(e.message)); }, [id, attempt]);
  const ready = !!(group?.joined && group.rulesAccepted);
  // The live connection. It pings every 25 s (answered by the server without waking the room) so it is not dropped while
  // idle, and if it does drop it reconnects on its own (1, 2, 4... up to 15 s). Only after three failed tries does the
  // student see "Reconnecting"; an account deleted elsewhere (code 1008) ends it for good.
  useEffect(() => {
    if (!ready) return;
    let stop = false, failures = 0, retry = 0, ping = 0;
    const connect = () => {
      const sock = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/groups/${id}/live`);
      ws.current = sock;
      sock.onopen = () => { failures = 0; setState('open'); setError(null); ping = window.setInterval(() => { try { sock.send('ping'); } catch { /* closing */ } }, 25_000); };
      sock.onclose = ev => {
        clearInterval(ping);
        if (stop) return;
        if (ev.code === 1008) { setState('closed'); setError(t('gr.deleted')); return; }
        failures++; setState(failures >= 3 ? 'retrying' : 'connecting');
        retry = window.setTimeout(connect, Math.min(15_000, 1000 * 2 ** (failures - 1)));
      };
      sock.onmessage = ev => {
        if (ev.data === 'pong') return;
        const f = JSON.parse(String(ev.data)) as ServerFrame;
        if (f.type === 'history') setMsgs(f.messages);
        else if (f.type === 'message') setMsgs(m => [...m, f.message]);
        else if (f.type === 'hidden') setMsgs(m => m.filter(x => x.id !== f.id));
        else if (f.type === 'error') setError(f.error);
      };
    };
    connect();
    return () => { stop = true; clearTimeout(retry); clearInterval(ping); ws.current?.close(); };
  }, [id, ready]);
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

  if (group && !ready) return <JoinGate group={group} onJoined={() => setAttempt(a => a + 1)} />;
  const shown = msgs.filter(m => !hiddenAuthors.includes(m.author));
  return (
    <div className="wa-room">
      <button type="button" className="wa-head" onClick={() => go(`/group/${id}/info`)} aria-label={t('gi.open')}>
        <PersonAvatar avatar={null} name={group?.name ?? '?'} size={42} />
        <span className="grow" style={{ minWidth: 0 }}>
          <span className="t">{group ? title(group) : ' '}</span>
          <span className="s num">{group ? `${members(group.members)} · ${state === 'open' ? t('gr.online') : t('gr.connecting')}` : ''}</span>
        </span>
        <ChevronRight size={20} className="chev" aria-hidden="true" />
      </button>
      <div className="wa-chat" aria-live="polite">
        {shown.some(m => m.sample) && <p className="wa-system"><Info size={13} aria-hidden="true" />{t('gr.sampleNote')}</p>}
        {state === 'connecting' && msgs.length === 0 && <div className="skeleton" style={{ height: 80 }} />}
        {state === 'retrying' && <p className="wa-system" role="status">{t('gi.reconnecting')}</p>}
        {state === 'open' && shown.length === 0 && <p className="wa-system">{t('gr.empty')}</p>}
        {shown.map((m, i) => {
          const mine = !m.sample && m.author === username;
          const newDay = i === 0 || new Date(shown[i - 1].at).toDateString() !== new Date(m.at).toDateString();
          const sameAuthor = !newDay && i > 0 && shown[i - 1].author === m.author;
          return (
            <div key={m.id} className="stack" style={{ gap: 4 }}>
              {newDay && <span className="wa-day">{dayLabel(m.at)}</span>}
              <div className={`wa-line ${mine ? 'mine' : ''}`}>
                {!mine && (sameAuthor ? <span className="wa-avatar-gap" aria-hidden="true" /> : <PersonAvatar avatar={m.avatar} name={m.author} size={30} />)}
                <motion.div className={`wa-msg ${mine ? 'mine' : ''} ${sameAuthor ? 'cont' : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  {!mine && !sameAuthor && <span className="wa-author">{m.author}</span>}
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
              </div>
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
    </div>
  );
}

/** CR-006: the group's info page (tap its name in the room): description, rules, members, and Exit group at the bottom. */
export function GroupInfoScreen({ id, username, go }: { id: number; username: string | null; go: (to: string) => void }) {
  const [group, setGroup] = useState<GroupSummary | null>(null);
  const [people, setPeople] = useState<GroupMemberInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    call<GroupSummary>('GET', `/groups/${id}`).then(setGroup).catch(e => setError(e.message));
    call<GroupMemberInfo[]>('GET', `/groups/${id}/members`).then(setPeople).catch(() => setPeople([]));
  }, [id]);
  const leave = async () => { try { await call('POST', `/groups/${id}/leave`); go('/groups'); } catch (x) { setError((x as Error).message); } };
  if (error) return <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{error}</div>;
  if (!group) return <><div className="skeleton" style={{ height: 160 }} /><div className="skeleton" /></>;
  return (
    <>
      <section className="stack" style={{ alignItems: 'center', textAlign: 'center', gap: 6 }}>
        <PersonAvatar avatar={null} name={group.name} size={88} />
        <h1 className="screen-title" style={{ margin: 0 }}>{title(group)}</h1>
        <span className="subtitle num">{t('gi.groupOf', { n: members(group.members) })}</span>
      </section>
      <section className="card stack">
        <h2 className="title-m">{t('gi.about')}</h2>
        <p className="body-m" style={{ margin: 0 }}>{description(group)}</p>
      </section>
      <RulesCard extra={groupRule(group)} />
      <section className="card stack" aria-labelledby="gi-members">
        <h2 id="gi-members" className="title-m">{t('gi.membersH', { n: group.members })}</h2>
        {!people && <div className="skeleton" />}
        <div className="list-card flat">
          {people?.map(p => (
            <div key={p.username} className="item" style={{ cursor: 'default' }}>
              <PersonAvatar avatar={p.avatar} name={p.username} size={40} />
              <span className="grow"><span className="t">{p.username === username ? t('gi.you') : p.username}</span>
                {p.badge && <span className="s" style={{ color: 'var(--wa-green)' }}><BadgeCheck size={12} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />{p.badge}</span>}</span>
            </div>))}
        </div>
        <p className="helper">{t('gi.membersNote')}</p>
      </section>
      {!confirm
        ? <button className="btn text danger-text exit-group" onClick={() => setConfirm(true)}><LogOut size={18} aria-hidden="true" />{t('gi.exit')}</button>
        : <div className="alert error" role="alertdialog" aria-label={t('gi.exit')}><TriangleAlert size={20} aria-hidden="true" />
            <span className="stack" style={{ gap: 8 }}>{t('gi.exitConfirm')}
              <span className="row"><button className="btn filled danger" onClick={() => void leave()}>{t('gi.exit')}</button>
                <button className="btn text" onClick={() => setConfirm(false)}>{t('sel.cancel')}</button></span></span></div>}
      <p className="footer-note"><Users size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />{t('gi.footer')}</p>
    </>
  );
}
