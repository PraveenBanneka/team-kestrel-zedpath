// Ask ZedPath screen: a short conversation with cited answers. Every claim carries a numbered source; tapping it shows
// the exact handbook passage and page. Personal facts come from ZedPath's own engine and are labelled as such.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, BookOpenCheck, ExternalLink, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react';
import type { ProfileInput } from '../../shared/api.ts';
import { QUESTION_MAX, type AskResponse } from '../../shared/ask.ts';
import { askZedPath } from '../ask.ts';

export interface AskTurn { question: string; reply: AskResponse | null; error: string | null }

const GENERAL = ['When do UGC applications usually open?', 'What is the interest-free student loan?',
  'Which government job exams accept A/L results?', 'What does Z-score mean for university entry?'];

/** Renders the model's plain text: paragraphs, "-"/"*" bullets, **bold**, and [n] as tappable citation chips. */
function AnswerText({ text, onCite }: { text: string; onCite: (n: number) => void }) {
  const inline = (s: string, key: string): ReactNode[] => s.split(/(\*\*[^*]+\*\*|\[\d+(?:\s*,\s*\d+)*\])/g).filter(Boolean).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <b key={`${key}-${i}`}>{part.slice(2, -2)}</b>;
    const cite = part.match(/^\[(\d+(?:\s*,\s*\d+)*)\]$/);
    if (cite) return cite[1].split(',').map(n => Number(n.trim())).map(n =>
      <button key={`${key}-${i}-${n}`} type="button" className="cite" onClick={() => onCite(n)} aria-label={`Source ${n}`}>{n}</button>);
    return <span key={`${key}-${i}`}>{part}</span>;
  });
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => { if (list.length) blocks.push(<ul key={`ul-${blocks.length}`}>{list.map((l, i) => <li key={i}>{inline(l, `li${blocks.length}-${i}`)}</li>)}</ul>); list = []; };
  text.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (/^([-*•]|\d+\.)\s+/.test(t)) { list.push(t.replace(/^([-*•]|\d+\.)\s+/, '')); return; }
    flush();
    if (t) blocks.push(<p key={`p-${i}`}>{inline(t, `p${i}`)}</p>);
  });
  flush();
  return <div className="answer-text">{blocks}</div>;
}

function Reply({ reply }: { reply: AskResponse }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <AnswerText text={reply.answer} onCite={n => setOpen(open === n ? null : n)} />
      {reply.engineFacts.length > 0 && (
        <div className="facts">
          <span className="facts-h"><ShieldCheck size={16} aria-hidden="true" />Checked against your results by ZedPath</span>
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
                  {c.url && <a className="source-link" href={c.url} target="_blank" rel="noopener">Open the official source <ExternalLink size={13} aria-hidden="true" /></a>}
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

  const suggestions = profile ? ['What do I need for Medicine?', 'Can I do Computer Science?', ...GENERAL.slice(0, 3)] : GENERAL;
  const submit = (e: FormEvent) => { e.preventDefault(); void send(q); };
  return (
    <>
      <div className="row" style={{ flexWrap: 'nowrap', gap: 14 }}>
        <span className="ic-lg aurora" aria-hidden="true"><Sparkles size={26} /></span>
        <div className="stack" style={{ gap: 2 }}>
          <h1 className="screen-title">Ask ZedPath</h1>
          <p className="subtitle">Answers from the UGC handbook 2025/26 and official sources, with the page they came from. Ask in English, සිංහල or தமிழ்.</p>
        </div>
      </div>

      {turns.length === 0 && (
        <div className="stack" style={{ gap: 10 }}>
          <p className="section-label">Try asking</p>
          <div className="chips">{suggestions.map(s => <button key={s} type="button" className="chip" onClick={() => void send(s)}>{s}</button>)}</div>
          {!profile && <p className="helper">Enter your results in Me to get answers about your own chances.</p>}
        </div>)}

      <div className="stack" style={{ gap: 14 }}>
        {turns.map((t, i) => (
          <div key={i} className="stack" style={{ gap: 10 }}>
            <motion.div className="bubble-q" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{t.question}</motion.div>
            {!t.reply && !t.error && <div className="card bubble-a"><div className="thinking"><Sparkles size={16} aria-hidden="true" />Reading the handbook…</div></div>}
            {t.error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{t.error}</div>}
            {t.reply && <motion.div className="card bubble-a" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><Reply reply={t.reply} /></motion.div>}
          </div>))}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={submit}>
        <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Ask about courses, rules or dates" maxLength={QUESTION_MAX}
          aria-label="Your question" enterKeyHint="send" />
        <button className="send" type="submit" disabled={busy || !q.trim()} aria-label="Send"><ArrowUp size={22} /></button>
      </form>
      <p className="fineprint" style={{ textAlign: 'center' }}>Ask ZedPath can make mistakes. Tap a number to check the page it used.</p>
    </>
  );
}
