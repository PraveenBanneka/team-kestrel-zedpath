// Ask ZedPath screen: a short conversation with cited answers. CR-004 (Praveen 2026-10-11, "AI replies are not
// formatted well"): every answer is a card with
//   1. a verdict chip (Yes / No / It depends / Not in official sources) when the model gave one;
//   2. the lead line and short bullets, long answers folded behind "Show more";
//   3. the student's own chances as band pills ("checked against your results");
//   4. next-step actions built by ZedPath from its own matches (open, add to list, compare, add to Journey);
//   5. source chips (page numbers) that open the exact quote;
//   6. two follow-up questions; and "Helpful" / "Report a wrong answer".
// Questions are sent with the app language, so an unclear question is answered in the language of the interface.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, BookOpenCheck, CalendarPlus, Check, ChevronDown, ChevronRight, ExternalLink, Flag, ListPlus, Scale, ShieldCheck, Sparkles, ThumbsUp, TriangleAlert } from 'lucide-react';
import type { ProfileInput, ResultsResponse } from '../../shared/api.ts';
import type { Extras } from '../../shared/account.ts';
import { QUESTION_MAX, type AskAction, type AskResponse, type Verdict } from '../../shared/ask.ts';
import { addToList, type ListEntry } from '../../shared/list.ts';
import { askZedPath, sendFeedback } from '../ask.ts';
import { layoutAnswer } from '../../shared/answer.ts';
import { getLang, t, type Key } from '../i18n/index.ts';
import { longDate } from './Journey.tsx';
import { askSuggestions } from '../ask-suggest.ts';

export interface AskTurn { question: string; reply: AskResponse | null; error: string | null }
export interface AskContext {
  results: ResultsResponse | null; list: ListEntry[]; setList: (l: ListEntry[]) => void;
  compare: string[]; setCompare: (c: string[]) => void; saved: string[]; setSaved: (ids: string[]) => void; go: (to: string) => void;
}

const SHOW = 4;                                   // bullets shown before "Show more"
const VERDICT_TONE: Record<Verdict, string> = { YES: 'band-SAFE', NO: 'band-OUT_OF_RANGE', DEPENDS: 'band-LIKELY', NOT_FOUND: 'band-NOT_ENOUGH_DATA' };
// Suggestions are asked in the interface language: Ask ZedPath answers in the language of the question.
const general = () => [t('ask.q.ugc'), t('ask.q.loan'), t('ask.q.jobs'), t('ask.q.z')];

/** **bold** and [n] citation markers inside one line of the answer. */
function inline(s: string, key: string, onCite: (n: number) => void): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|\[\d+(?:\s*,\s*\d+)*\])/g).filter(Boolean).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <b key={`${key}-${i}`}>{part.slice(2, -2)}</b>;
    const cite = part.match(/^\[(\d+(?:\s*,\s*\d+)*)\]$/);
    if (cite) return cite[1].split(',').map(n => Number(n.trim())).map(n =>
      <button key={`${key}-${i}-${n}`} type="button" className="cite" onClick={() => onCite(n)} aria-label={t('ask.source', { n })}>{n}</button>);
    return <span key={`${key}-${i}`}>{part}</span>;
  });
}

function AnswerText({ text, onCite }: { text: string; onCite: (n: number) => void }) {
  const [all, setAll] = useState(false);
  const { lead, bullets, rest } = layoutAnswer(text);
  const shown = all ? bullets : bullets.slice(0, SHOW);
  return (
    <div className="answer-text">
      {lead && <p className="answer-lead">{inline(lead, 'lead', onCite)}</p>}
      {shown.length > 0 && <ul>{shown.map((b, i) => <li key={i}>{inline(b, `li${i}`, onCite)}</li>)}</ul>}
      {(all || bullets.length <= SHOW) && rest.map((r, i) => <p key={`r${i}`}>{inline(r, `r${i}`, onCite)}</p>)}
      {!all && bullets.length > SHOW &&
        <button type="button" className="btn text" style={{ paddingLeft: 0 }} onClick={() => setAll(true)}><ChevronDown size={16} aria-hidden="true" />{t('ask.more')}</button>}
    </div>);
}

/** Next steps for one action: open / add to list / compare for a course; add to Journey for a notice. */
function ActionRow({ a, ctx }: { a: AskAction; ctx: AskContext }) {
  if (a.kind === 'NOTICE') {
    const added = ctx.saved.includes(a.routeId);
    return (
      <div className="ask-action">
        <span className="grow"><span className="t" lang="en">{a.title}</span><span className="s">{t('al.closes', { d: longDate(a.closesOn) })}</span></span>
        {added ? <button className="btn tonal small" onClick={() => ctx.go('/journey')}><Check size={16} aria-hidden="true" />{t('al.inJourney')}</button>
          : <button className="btn tonal small" onClick={() => ctx.setSaved([...ctx.saved, a.routeId])}><CalendarPlus size={16} aria-hidden="true" />{t('ask.toJourney')}</button>}
      </div>);
  }
  const onList = ctx.list.some(e => e.uniCode === a.uniCode);
  const eligible = a.band !== null && a.band !== 'OUT_OF_RANGE';
  const inCompare = ctx.compare.includes(a.uniCode);
  const add = () => { const r = addToList(ctx.list, { uniCode: a.uniCode, group: 'ALL', course: a.course, institution: a.institution, band: a.band ?? 'NOT_ENOUGH_DATA' }, eligible);
    if (r.ok) ctx.setList(r.list); };
  return (
    <div className="ask-action">
      <button type="button" className="grow ask-action-main" onClick={() => ctx.go(`/course/${a.uniCode}`)}>
        <span className="t" lang="en">{a.course}</span><span className="s" lang="en">{a.institution} · {a.uniCode}</span>
        {a.band && <span className={`pill band-${a.band}`}>{t(`band.${a.band}` as Key)}</span>}
      </button>
      <div className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
        {onList ? <span className="icon-btn" aria-label={t('ask.onList')} title={t('ask.onList')}><Check size={18} /></span>
          : eligible && <button className="icon-btn" onClick={add} aria-label={t('detail.add')} title={t('detail.add')}><ListPlus size={18} /></button>}
        {!inCompare && ctx.compare.length < 3 && <button className="icon-btn" onClick={() => { ctx.setCompare([...ctx.compare, a.uniCode]); ctx.go('/compare'); }}
          aria-label={t('detail.compare')} title={t('detail.compare')}><Scale size={18} /></button>}
      </div>
    </div>);
}

function Feedback({ question, reply }: { question: string; reply: AskResponse }) {
  const [state, setState] = useState<'idle' | 'note' | 'sending' | 'thanks' | string>('idle');
  const [note, setNote] = useState('');
  const send = async (rating: 'HELPFUL' | 'WRONG') => {
    setState('sending');
    try { await sendFeedback({ question, answer: reply.answer, pages: reply.citations.map(c => c.page).filter((p): p is number => p !== null), rating, note: note.trim() || undefined, lang: getLang() }); setState('thanks'); }
    catch (e) { setState((e as Error).message); }
  };
  if (state === 'thanks') return <p className="helper" role="status">{t('ask.thanks')}</p>;
  if (state === 'note' || state === 'sending') return (
    <div className="stack" style={{ gap: 6 }}>
      <label className="field"><span className="helper">{t('ask.wrongWhat')}</span>
        <input className="input" value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder={t('ask.wrongPlaceholder')} /></label>
      <p className="helper" style={{ margin: 0 }}>{t('ask.sentNote')}</p>
      <button className="btn tonal small" style={{ alignSelf: 'flex-start' }} disabled={state === 'sending'} onClick={() => void send('WRONG')}><Flag size={16} aria-hidden="true" />{t('ask.sendReport')}</button>
    </div>);
  return (
    <div className="row ask-feedback" style={{ gap: 4 }}>
      <button className="btn text small" onClick={() => void send('HELPFUL')}><ThumbsUp size={16} aria-hidden="true" />{t('ask.helpful')}</button>
      <button className="btn text small" onClick={() => setState('note')}><Flag size={16} aria-hidden="true" />{t('ask.wrong')}</button>
      {!['idle', 'note', 'sending', 'thanks'].includes(state) && <span className="helper">{state}</span>}
    </div>);
}

function Reply({ question, reply, ctx, onAsk }: { question: string; reply: AskResponse; ctx: AskContext; onAsk: (q: string) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const cite = (n: number) => setOpen(open === n ? null : n);
  const quote = reply.citations.find(c => c.n === open);
  const actions = reply.actions ?? [];
  const course = actions.find(a => a.kind === 'COURSE');
  const followUps = course && course.kind === 'COURSE'
    ? [t('ask.fu.chances', { course: course.course }), t('ask.fu.study', { course: course.course })]
    : reply.verdict === 'NOT_FOUND' ? [] : general().filter(q => q !== question).slice(0, 2);
  return (
    <div className="stack" style={{ gap: 12 }}>
      {reply.verdict && <span className={`pill verdict ${VERDICT_TONE[reply.verdict]}`}>{t(`ask.v.${reply.verdict}` as Key)}</span>}
      <AnswerText text={reply.answer} onCite={cite} />

      {reply.citations.length > 0 && (
        <div className="stack" style={{ gap: 6 }}>
          <div className="chips source-chips" aria-label={t('ask.sources')}>
            {reply.citations.map(c => (
              <button key={c.n} type="button" className={`chip small ${open === c.n ? 'on' : ''}`} aria-expanded={open === c.n} onClick={() => cite(c.n)}>
                <BookOpenCheck size={14} aria-hidden="true" /><span className="num">{c.n}</span><span className="chip-text">{c.page ? `${t('ask.handbook')} p.${c.page}` : c.source}</span></button>))}
          </div>
          {quote && (
            <div className="source-quote card-inset">
              <span className="title-s" lang="en">{quote.source}{quote.page ? `, p.${quote.page}` : ''}</span>
              <p lang="en">“{quote.quote}…”</p>
              <div className="row" style={{ gap: 16 }}>
                {quote.routeId && <button type="button" className="source-link link-btn" onClick={() => ctx.go(`/route/${quote.routeId}`)}>{t('ask.inZedPath')}<ChevronRight size={14} aria-hidden="true" /></button>}
                {quote.url && <a className="source-link" href={quote.url} target="_blank" rel="noopener">{quote.page ? t('ask.openHandbook') : t('ask.openSource')} <ExternalLink size={13} aria-hidden="true" /></a>}
              </div>
            </div>)}
        </div>)}

      {actions.length > 0 && (
        <div className="facts">
          <span className="facts-h"><ShieldCheck size={16} aria-hidden="true" />{actions.some(a => a.kind === 'COURSE' && a.band) ? t('ask.checked') : t('ask.next')}</span>
          {actions.map(a => <ActionRow key={a.kind === 'COURSE' ? a.uniCode : a.routeId} a={a} ctx={ctx} />)}
        </div>)}

      {followUps.length > 0 && (
        <div className="chips">{followUps.map(f => <button key={f} type="button" className="chip small" onClick={() => onAsk(f)}><Sparkles size={13} aria-hidden="true" />{f}</button>)}</div>)}
      <Feedback question={question} reply={reply} />
    </div>
  );
}

export function AskScreen({ profile, extras, turns, setTurns, initialQuestion, onConsumedInitial, ctx }: {
  profile: ProfileInput | null; extras: Extras; turns: AskTurn[]; setTurns: (f: (t: AskTurn[]) => AskTurn[]) => void;
  initialQuestion: string | null; onConsumedInitial: () => void; ctx: AskContext;
}) {
  const [q, setQ] = useState('');
  const busy = turns.some(x => !x.reply && !x.error);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setQ('');
    setTurns(x => [...x, { question: text, reply: null, error: null }]);
    try {
      const reply = await askZedPath(text, profile, extras.achievements.length || extras.interests.length ? extras : null);
      setTurns(x => x.map((y, i) => i === x.length - 1 ? { ...y, reply } : y));
    } catch (e) {
      setTurns(x => x.map((y, i) => i === x.length - 1 ? { ...y, error: (e as Error).message } : y));
    }
  };
  // A #/ask/<question> link only fills the box (security audit run-1, lead 15): a link must never spend the student's
  // daily questions without a tap.
  useEffect(() => { if (initialQuestion) { onConsumedInitial(); setQ(initialQuestion); } }, [initialQuestion]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns]);

  // Five questions built from this student's own details (src/ask-suggest.ts).
  const suggestions = profile ? askSuggestions(extras, ctx.list) : general();
  const submit = (e: FormEvent) => { e.preventDefault(); void send(q); };
  return (
    <div className="ask-screen">
      <div className="row" style={{ flexWrap: 'nowrap', gap: 14 }}>
        <span className="ic-lg aurora" aria-hidden="true"><Sparkles size={26} /></span>
        <div className="stack" style={{ gap: 2 }}>
          <h1 className="screen-title">{t('title.ask')}</h1>
          <p className="subtitle">{t('ask.sub')}</p>
        </div>
      </div>

      {turns.length === 0 && (
        <div className="stack" style={{ gap: 10 }}>
          <p className="section-label">{t('ask.try')}</p>
          <div className="chips">{suggestions.map(s => <button key={s} type="button" className="chip" onClick={() => void send(s)}>{s}</button>)}</div>
          {!profile && <p className="helper">{t('ask.noProfile')}</p>}
        </div>)}

      <div className="stack" style={{ gap: 14 }}>
        {turns.map((turn, i) => (
          <div key={i} className="stack" style={{ gap: 10 }}>
            <motion.div className="bubble-q" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{turn.question}</motion.div>
            {!turn.reply && !turn.error && <div className="card bubble-a"><div className="thinking"><Sparkles size={16} aria-hidden="true" />{t('ask.thinking')}</div></div>}
            {turn.error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{turn.error}</div>}
            {turn.reply && <motion.div className="card bubble-a" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Reply question={turn.question} reply={turn.reply} ctx={ctx} onAsk={q2 => void send(q2)} /></motion.div>}
          </div>))}
        <div ref={endRef} />
      </div>

      <div className="ask-bottom">
        <form className="composer" onSubmit={submit}>
          <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder={t('ask.placeholder')} maxLength={QUESTION_MAX}
            aria-label={t('ask.aria')} enterKeyHint="send" />
          <button className="send" type="submit" disabled={busy || !q.trim()} aria-label={t('ask.send')}><ArrowUp size={22} /></button>
        </form>
        <p className="fineprint" style={{ textAlign: 'center' }}>{t('ask.fine')}</p>
      </div>
    </div>
  );
}
