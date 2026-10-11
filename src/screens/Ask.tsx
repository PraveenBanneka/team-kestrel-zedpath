// Ask ZedPath screen: a short conversation with cited answers. Every claim carries a numbered source; tapping it shows
// the exact handbook passage and page. Personal facts come from ZedPath's own engine and are labelled as such.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, BookOpenCheck, ExternalLink, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import type { ProfileInput } from '../../shared/api.ts';
import { QUESTION_MAX, type AskResponse } from '../../shared/ask.ts';
import { askZedPath } from '../ask.ts';
import { layoutAnswer } from '../../shared/answer.ts';
import { t } from '../i18n/index.ts';

export interface AskTurn { question: string; reply: AskResponse | null; error: string | null }

// Suggestions are asked in the interface language: Ask ZedPath answers in the language of the question.
const general = () => [t('ask.q.ugc'), t('ask.q.loan'), t('ask.q.jobs'), t('ask.q.z')];

/** Renders an answer as one lead line and short bullets (shared/answer.ts makes that layout even from one long
 *  paragraph), with **bold** and [n] as tappable citation chips. */
function AnswerText({ text, onCite }: { text: string; onCite: (n: number) => void }) {
  const inline = (s: string, key: string): ReactNode[] => s.split(/(\*\*[^*]+\*\*|\[\d+(?:\s*,\s*\d+)*\])/g).filter(Boolean).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <b key={`${key}-${i}`}>{part.slice(2, -2)}</b>;
    const cite = part.match(/^\[(\d+(?:\s*,\s*\d+)*)\]$/);
    if (cite) return cite[1].split(',').map(n => Number(n.trim())).map(n =>
      <button key={`${key}-${i}-${n}`} type="button" className="cite" onClick={() => onCite(n)} aria-label={t('ask.source', { n })}>{n}</button>);
    return <span key={`${key}-${i}`}>{part}</span>;
  });
  const { lead, bullets, rest } = layoutAnswer(text);
  return (
    <div className="answer-text">
      {lead && <p className="answer-lead">{inline(lead, 'lead')}</p>}
      {bullets.length > 0 && <ul>{bullets.map((b, i) => <li key={i}>{inline(b, `li${i}`)}</li>)}</ul>}
      {rest.map((r, i) => <p key={`r${i}`}>{inline(r, `r${i}`)}</p>)}
    </div>);
}

function Reply({ reply }: { reply: AskResponse }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <AnswerText text={reply.answer} onCite={n => setOpen(open === n ? null : n)} />
      {reply.engineFacts.length > 0 && (
        <div className="facts">
          <span className="facts-h"><ShieldCheck size={16} aria-hidden="true" />{t('ask.checked')}</span>
          {reply.engineFacts.map((f, i) => <span key={i} className="body-m">{f}</span>)}
        </div>)}
      {reply.citations.length > 0 && (
        <div className="sources">
          {reply.citations.map(c => (
            <div key={c.n} className={`source-item ${open === c.n ? 'open' : ''}`}>
              <button type="button" className="source-row" onClick={() => setOpen(open === c.n ? null : c.n)} aria-expanded={open === c.n}>
                <span className="cite static">{c.n}</span>
                <BookOpenCheck size={16} aria-hidden="true" />
                <span className="grow">{c.source}{c.page ? `, p.${c.page}` : ''}</span>
              </button>
              {open === c.n && (
                <div className="source-quote">
                  <p>“{c.quote}…”</p>
                  {c.url && <a className="source-link" href={c.url} target="_blank" rel="noopener">{t('ask.openSource')} <ExternalLink size={13} aria-hidden="true" /></a>}
                </div>)}
            </div>))}
        </div>)}
    </div>
  );
}

export function AskScreen({ profile, turns, setTurns, initialQuestion, onConsumedInitial }: {
  profile: ProfileInput | null; turns: AskTurn[]; setTurns: (f: (t: AskTurn[]) => AskTurn[]) => void;
  initialQuestion: string | null; onConsumedInitial: () => void;
}) {
  const [q, setQ] = useState('');
  const busy = turns.some(t => !t.reply && !t.error);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setQ('');
    setTurns(t => [...t, { question: text, reply: null, error: null }]);
    try {
      const reply = await askZedPath(text, profile);
      setTurns(t => t.map((x, i) => i === t.length - 1 ? { ...x, reply } : x));
    } catch (e) {
      setTurns(t => t.map((x, i) => i === t.length - 1 ? { ...x, error: (e as Error).message } : x));
    }
  };
  useEffect(() => { if (initialQuestion) { onConsumedInitial(); void send(initialQuestion); } }, [initialQuestion]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [turns]);

  const suggestions = profile ? [t('ask.q.medicine'), t('ask.q.cs'), ...general().slice(0, 3)] : general();
  const submit = (e: FormEvent) => { e.preventDefault(); void send(q); };
  return (
    <>
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
            {turn.reply && <motion.div className="card bubble-a" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><Reply reply={turn.reply} /></motion.div>}
          </div>))}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={submit}>
        <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder={t('ask.placeholder')} maxLength={QUESTION_MAX}
          aria-label={t('ask.aria')} enterKeyHint="send" />
        <button className="send" type="submit" disabled={busy || !q.trim()} aria-label={t('ask.send')}><ArrowUp size={22} /></button>
      </form>
      <p className="fineprint" style={{ textAlign: 'center' }}>{t('ask.fine')}</p>
    </>
  );
}
