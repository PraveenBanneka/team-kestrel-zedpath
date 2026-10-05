// First-run experience (Gate 1 deck, slide 11 "Tell us about you once"): Welcome -> three intro slides ->
// About you, one question per screen (stream, district, Z-score, subjects, beyond grades). Errors appear only after
// the student presses Next (ui-ux-pro-max: inline validation after interaction, one task per screen).
import { useMemo, useState } from 'react';
import type { Meta, ProfileInput } from '../../shared/api.ts';
import { formatZ, parseZ } from '../../shared/banding.ts';
import type { Grade, StreamCode } from '../../shared/rules.ts';
import { nameOf } from '../../shared/describe.ts';
import { INTERESTS, type Achievement, type Extras, type Level, type Place } from '../storage.ts';

export function Logo({ size = 72 }: { size?: number }) {
  return <img src="/icons/icon.svg" width={size} height={size} alt="" aria-hidden="true" style={{ borderRadius: size * 0.22 }} />;
}

// ---------------------------------------------------------------- Welcome
export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="welcome">
      <div className="welcome-top">
        <Logo size={88} />
        <h1 className="display">ZedPath</h1>
        <p className="lead">Everything after A/Ls, in one place.</p>
        <p className="subtitle">Every path your results can reach: state universities, private degrees, diplomas, job exams and more.
          With the real deadlines, and a source for every fact.</p>
      </div>
      <div className="stack">
        <p className="section-label">Choose your language</p>
        <div className="lang-grid">
          <button className="lang-tile" disabled lang="si"><span className="big">සිංහල</span><span className="soon">Coming soon</span></button>
          <button className="lang-tile" disabled lang="ta"><span className="big">தமிழ்</span><span className="soon">Coming soon</span></button>
          <button className="lang-tile selected" onClick={onStart} lang="en"><span className="big">English</span><span className="soon">Continue</span></button>
        </div>
        <p className="fineprint">Free. No account needed. Your details stay on this phone. ZedPath is independent and not affiliated with the University Grants Commission.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Intro slides
const SLIDES = [
  { title: 'See every path you can reach', body: 'State university courses, and the roads that do not go through one: private degrees, higher diplomas, professional bodies, job exams and study abroad.', art: 'paths' },
  { title: 'Know your real chances', body: 'Each course is marked Safe, Likely or Reach, from five years of official cut-offs for your own district. Never a promise: an honest picture.', art: 'bands' },
  { title: 'Every fact has a source', body: 'Cut-offs, subject rules and dates come from the UGC handbook and official tables, with the page they came from, so you can check.', art: 'source' },
] as const;

function SlideArt({ kind }: { kind: typeof SLIDES[number]['art'] }) {
  if (kind === 'bands') return (
    <div className="art-bands" aria-hidden="true">
      <span className="pill band-SAFE">Safe</span><span className="pill band-LIKELY">Likely</span><span className="pill band-REACH">Reach</span>
    </div>);
  if (kind === 'source') return (
    <div className="art-source" aria-hidden="true"><span>UGC handbook 2025/26</span><b>page 70</b></div>);
  return (
    <svg className="art-paths" viewBox="0 0 240 120" aria-hidden="true">
      <path d="M20 100 C 80 100, 80 20, 140 20 S 200 60, 220 40" fill="none" stroke="var(--md-primary)" strokeWidth="6" strokeLinecap="round" />
      <path d="M20 100 C 90 100, 120 70, 220 80" fill="none" stroke="var(--md-outline)" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
      <path d="M20 100 C 70 90, 100 110, 220 110" fill="none" stroke="var(--md-outline)" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
      <circle cx="20" cy="100" r="9" fill="var(--md-primary)" /><circle cx="220" cy="40" r="11" fill="#FFC94A" />
    </svg>);
}

export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  return (
    <div className="intro">
      <div className="row" style={{ justifyContent: 'flex-end' }}><button className="btn text" onClick={onDone}>Skip</button></div>
      <div className="intro-art"><SlideArt kind={s.art} /></div>
      <h1 className="screen-title" style={{ textAlign: 'center' }}>{s.title}</h1>
      <p className="subtitle intro-body">{s.body}</p>
      <div className="dots" role="tablist" aria-label="Introduction">
        {SLIDES.map((_, k) => <button key={k} role="tab" aria-selected={k === i} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} />)}
      </div>
      <div className="bottom-cta"><button className="btn filled block" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? 'Get started' : 'Next'}</button></div>
    </div>
  );
}

// ---------------------------------------------------------------- About you: one question per screen
const SUGGESTED: Record<StreamCode, string[]> = {
  PHYS: ['CMATH', 'PHY', 'CHEM', 'ICT', 'HMATH', 'AGRI'],
  BIO: ['BIO', 'CHEM', 'PHY', 'AGRI', 'ICT'],
  COMMERCE: ['ACC', 'BSTUD', 'ECON', 'ICT', 'BSTAT', 'GEOG', 'ENG'],
  ARTS: ['SIN', 'TAM', 'ENG', 'GEOG', 'HIST', 'POLSCI', 'ECON', 'BUDDHISM', 'ART', 'LOGIC', 'CMS', 'ICT'],
  ET: ['ET', 'SFT', 'ICT', 'ECON', 'GEOG', 'ENG', 'AGRI', 'ACC', 'MATH'],
  BST: ['BST', 'SFT', 'ICT', 'ECON', 'GEOG', 'ENG', 'AGRI', 'ACC', 'MATH'],
};
const STEPS = ['Stream', 'District', 'Z-score', 'Subjects', 'Beyond grades'] as const;
const LEVELS: Level[] = ['SCHOOL', 'ZONAL', 'DISTRICT', 'PROVINCIAL', 'NATIONAL', 'INTERNATIONAL'];
const PLACES: Place[] = ['FIRST', 'SECOND', 'THIRD', 'TAKING_PART'];
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ');

export function AboutFlow({ meta, initial, extrasInitial, onSave }: { meta: Meta | null; initial: ProfileInput | null;
  extrasInitial: Extras; onSave: (p: ProfileInput, e: Extras) => void }) {
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [stream, setStream] = useState<StreamCode | ''>(initial?.stream ?? '');
  const [district, setDistrict] = useState(initial?.district ?? '');
  const [districtQuery, setDistrictQuery] = useState('');
  const [z, setZ] = useState(initial ? formatZ(initial.zE4).replace('−', '-') : '');
  const [subjects, setSubjects] = useState<[string, Grade | ''][]>(
    initial ? Object.entries(initial.al) as [string, Grade][] : [['', ''], ['', ''], ['', '']]);
  const [picking, setPicking] = useState<number | null>(null);
  const [extras, setExtras] = useState<Extras>(extrasInitial);
  const [draft, setDraft] = useState<Omit<Achievement, 'id'>>({ activity: '', kind: 'SPORT', level: 'DISTRICT', place: 'FIRST', year: 2025 });

  const subjectNames = useMemo(() => new Map((meta?.subjects ?? []).filter(s => !s.code.endsWith('_OL')).map(s => [s.code, s.name])), [meta]);
  const zE4 = parseZ(z);
  const chosen = subjects.map(s => s[0]).filter(Boolean);
  const errorFor = [
    !stream ? 'Choose your stream' : null,
    !district ? 'Choose the district you sat from' : null,
    zE4 === null ? 'Enter your Z-score with four decimals, for example 1.4821' : null,
    chosen.length !== 3 || new Set(chosen).size !== 3 ? 'Choose three different subjects' : subjects.some(s => !s[1]) ? 'Choose a grade for each subject' : null,
    null,
  ][step];

  const next = () => {
    setTried(true);
    if (errorFor) return;
    setTried(false);
    if (step < STEPS.length - 1) { setStep(step + 1); window.scrollTo(0, 0); return; }
    onSave({ stream: stream as StreamCode, district, zE4: zE4!, al: Object.fromEntries(subjects) as Record<string, Grade> }, extras);
  };
  const back = () => { setTried(false); if (step > 0) setStep(step - 1); };

  const list = (code: StreamCode | '') => {
    const sugg = code ? SUGGESTED[code].filter(c => subjectNames.has(c)) : [];
    const rest = [...subjectNames.keys()].filter(c => !sugg.includes(c)).sort((a, b) => subjectNames.get(a)!.localeCompare(subjectNames.get(b)!));
    return { sugg, rest };
  };

  return (
    <div className="stack flow">
      <div className="progress steps5" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
        {STEPS.map((_, k) => <span key={k} className={k <= step ? 'on' : ''} />)}
      </div>
      <p className="section-label">Step {step + 1} of {STEPS.length}</p>

      {step === 0 && (<>
        <h1 className="screen-title">Which stream did you sit?</h1>
        <div className="tile-grid" role="radiogroup" aria-label="Stream">
          {(meta?.streams ?? []).map(s => (
            <button key={s.code} type="button" role="radio" aria-checked={stream === s.code} className="tile" onClick={() => setStream(s.code)}>{s.name}</button>
          ))}
        </div>
      </>)}

      {step === 1 && (<>
        <h1 className="screen-title">Which district did you sit from?</h1>
        <p className="subtitle">Usually your school's district. The UGC rule: the school you attended most in the three years before the exam.</p>
        <input className="input" placeholder="Search districts" value={districtQuery} onChange={e => setDistrictQuery(e.target.value)} aria-label="Search districts" />
        <div className="choice-list" role="radiogroup" aria-label="District">
          {(meta?.districts ?? []).filter(d => d.name.toLowerCase().includes(districtQuery.toLowerCase())).map(d => (
            <button key={d.code} type="button" role="radio" aria-checked={district === d.code} className="choice" onClick={() => setDistrict(d.code)}>
              {d.name.charAt(0) + d.name.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </>)}

      {step === 2 && (<>
        <h1 className="screen-title">What is your Z-score?</h1>
        <p className="subtitle">Exactly as printed on your results sheet, with four decimals.</p>
        <input className="input big-input num" inputMode="decimal" autoComplete="off" placeholder="1.4821" value={z} onChange={e => setZ(e.target.value)}
          aria-label="Z-score" aria-invalid={tried && !!errorFor} />
        <button className="btn text" style={{ alignSelf: 'flex-start' }} disabled>No results yet? Estimate (coming soon)</button>
      </>)}

      {step === 3 && (<>
        <h1 className="screen-title">Your three subjects and grades</h1>
        {subjects.map(([code, grade], i) => (
          <div key={i} className="subject-card">
            <button type="button" className="choice subject-pick" onClick={() => setPicking(picking === i ? null : i)} aria-expanded={picking === i}>
              {code ? (subjectNames.get(code) ?? nameOf(code)) : `Choose subject ${i + 1}`}
            </button>
            {picking === i && (() => { const { sugg, rest } = list(stream); return (
              <div className="choice-list compact" role="listbox" aria-label={`Subject ${i + 1}`}>
                {sugg.length > 0 && <p className="section-label">Common in your stream</p>}
                {[...sugg, ...rest].map((c, k) => (<>
                  {k === sugg.length && sugg.length > 0 && <p className="section-label" key={`h${c}`}>All subjects</p>}
                  <button key={c} type="button" role="option" aria-selected={code === c} className="choice"
                    disabled={chosen.includes(c) && code !== c}
                    onClick={() => { setSubjects(s => s.map((x, j) => j === i ? [c, x[1]] : x)); setPicking(null); }}>{subjectNames.get(c)}</button>
                </>))}
              </div>); })()}
            <div className="segmented grades" role="radiogroup" aria-label={`Grade for subject ${i + 1}`}>
              {(['A', 'B', 'C', 'S'] as Grade[]).map(g => (
                <button key={g} type="button" role="radio" aria-selected={grade === g} aria-checked={grade === g}
                  onClick={() => setSubjects(s => s.map((x, j) => j === i ? [x[0], g] : x))}>{g}</button>
              ))}
            </div>
          </div>
        ))}
      </>)}

      {step === 4 && (<>
        <h1 className="screen-title">Beyond grades</h1>
        <p className="subtitle">Optional. Sports, competitions, clubs and certificates can open special intakes, and what you enjoy helps us show the paths that suit you.
          It stays on this phone.</p>
        <p className="section-label">Achievements</p>
        {extras.achievements.length === 0 && <p className="body-m muted">None added yet.</p>}
        <ul className="list">
          {extras.achievements.map(a => (
            <li key={a.id} className="row-item" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <span className="text"><span className="title">{a.activity}</span>
                <span className="sub">{label(a.kind)} · {label(a.level)} · {label(a.place)} · {a.year}</span></span>
              <button className="btn text" onClick={() => setExtras(e => ({ ...e, achievements: e.achievements.filter(x => x.id !== a.id) }))}>Remove</button>
            </li>
          ))}
        </ul>
        <div className="add-box stack">
          <input className="input" placeholder="e.g. Chess, Science Olympiad, Volleyball" value={draft.activity}
            onChange={e => setDraft({ ...draft, activity: e.target.value })} aria-label="Activity" />
          <div className="chips" role="radiogroup" aria-label="Type">
            {(['SPORT', 'COMPETITION', 'CLUB', 'ARTS', 'OTHER'] as const).map(k => (
              <button key={k} type="button" className="chip" role="radio" aria-checked={draft.kind === k} onClick={() => setDraft({ ...draft, kind: k })}>{label(k)}</button>))}
          </div>
          <div className="row">
            <select className="select" aria-label="Level" value={draft.level} onChange={e => setDraft({ ...draft, level: e.target.value as Level })}>
              {LEVELS.map(l => <option key={l} value={l}>{label(l)} level</option>)}</select>
            <select className="select" aria-label="Result" value={draft.place} onChange={e => setDraft({ ...draft, place: e.target.value as Place })}>
              {PLACES.map(p => <option key={p} value={p}>{p === 'TAKING_PART' ? 'Took part' : `${label(p)} place`}</option>)}</select>
            <select className="select" aria-label="Year" value={draft.year} onChange={e => setDraft({ ...draft, year: Number(e.target.value) })}>
              {[2026, 2025, 2024, 2023, 2022, 2021].map(y => <option key={y}>{y}</option>)}</select>
          </div>
          <button type="button" className="btn tonal" disabled={!draft.activity.trim()}
            onClick={() => { setExtras(e => ({ ...e, achievements: [...e.achievements, { ...draft, activity: draft.activity.trim(), id: crypto.randomUUID() }] }));
              setDraft({ ...draft, activity: '' }); }}>Add achievement</button>
        </div>
        <p className="section-label">What you enjoy</p>
        <div className="chips">
          {INTERESTS.map(t => (
            <button key={t} type="button" className="chip" aria-pressed={extras.interests.includes(t)}
              onClick={() => setExtras(e => ({ ...e, interests: e.interests.includes(t) ? e.interests.filter(x => x !== t) : [...e.interests, t] }))}>{t}</button>))}
        </div>
      </>)}

      {tried && errorFor && <p className="error-text" role="alert">{errorFor}</p>}
      <div className="bottom-cta row nav-cta">
        {step > 0 && <button className="btn text" onClick={back}>Back</button>}
        <button className="btn filled block" onClick={next}>{step === STEPS.length - 1 ? 'Show my paths' : 'Next'}</button>
      </div>
    </div>
  );
}
