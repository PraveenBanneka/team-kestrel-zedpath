// "What you'll study": the university's own curriculum for this degree, year by year, with the page it came from.
import { useState } from 'react';
import { BookOpen, ChevronRight, ExternalLink } from 'lucide-react';
import type { Syllabus } from '../../shared/api.ts';

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const dateLabel = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function SyllabusCard({ s }: { s: Syllabus }) {
  const [open, setOpen] = useState(0);
  const total = s.years.reduce((a, y) => a + y.modules.length, 0);
  return (
    <section className="card stack" aria-labelledby="syl-h">
      <h2 id="syl-h" className="title-l"><BookOpen size={20} aria-hidden="true" style={{ verticalAlign: '-3px', marginRight: 8, color: 'var(--brand-500)' }} />What you'll study</h2>
      <p className="subtitle" style={{ margin: 0 }}>{s.degree}{s.duration ? ` · ${s.duration}` : ''} · <span className="num">{total}</span> modules listed by the university</p>
      {s.specialisations.length > 0 && <div className="have">{s.specialisations.slice(0, 8).map(x => <span key={x}>{x}</span>)}</div>}
      <div className="syl-years">
        {s.years.map((y, i) => (
          <div key={y.label} className={`syl-year ${open === i ? 'open' : ''}`}>
            <button type="button" className="syl-head" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
              <span className="grow">{y.label}</span><span className="helper num">{y.modules.length}</span>
              <ChevronRight size={18} aria-hidden="true" style={{ transform: open === i ? 'rotate(90deg)' : undefined, transition: 'transform .2s' }} />
            </button>
            {open === i && <ul className="syl-list">{y.modules.map((m, k) => <li key={k}>{m}</li>)}</ul>}
          </div>))}
      </div>
      {s.notes && <p className="helper" style={{ margin: 0 }}>{s.notes}</p>}
      <p className="source">Source: {s.sourceUrls.map((u, i) => (
        <a key={u} className="source-link" href={u} target="_blank" rel="noopener">{i ? ', ' : ''}{host(u)} <ExternalLink size={12} aria-hidden="true" /></a>))}
        {' '}· checked {dateLabel(s.retrievedOn)}. Universities update their curricula; confirm with the faculty.</p>
    </section>
  );
}
