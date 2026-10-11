// First-run experience (Gate 1 deck, slide 11 "Tell us about you once"), design v2: aurora welcome, three animated intro
// slides, then About you as one question per screen (stream, district, Z-score, subjects, beyond grades).
// Errors appear only after Next (ui-ux-pro-max: validate after interaction; one task per screen).
import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Atom, Calculator, ChevronRight, Cpu, Microscope, Palette, Search, Sprout, Trophy } from 'lucide-react';
import type { Meta, ProfileInput } from '../../shared/api.ts';
import { formatZ, parseZ } from '../../shared/banding.ts';
import type { Grade, StreamCode } from '../../shared/rules.ts';
import { nameOf } from '../../shared/describe.ts';
import { INTERESTS, type Achievement, type Extras, type Level, type Place } from '../storage.ts';

export function Logo({ size = 72 }: { size?: number }) {
  return <img src="/icons/icon.svg" width={size} height={size} alt="" aria-hidden="true" style={{ borderRadius: size * 0.22, display: 'block' }} />;
}

// ---------------------------------------------------------------- Welcome
export function Welcome({ onStart, onLogin }: { onStart: () => void; onLogin: () => void }) {
  const reduce = useReducedMotion();
  const rise = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: d, ease: [0.2, 0.8, 0.2, 1] as const } });
  return (
    <div className="welcome aurora">
      <div className="logo-wrap">
        <motion.div {...rise(0)}><Logo size={84} /></motion.div>
        <motion.h1 className="display" {...rise(0.08)}>ZedPath</motion.h1>
        <motion.p className="lead" {...rise(0.16)}>Everything after A/Ls, in one place.</motion.p>
        <motion.p className="subtitle" {...rise(0.24)}>Every path your results can reach: state universities, private degrees, diplomas,
          job exams and more. With the real deadlines, and a source for every fact.</motion.p>
      </div>
      <motion.div className="stack" style={{ gap: 12 }} {...rise(0.34)}>
        <p className="section-label">Choose your language</p>
        <div className="lang-grid">
          <button className="lang-tile" disabled lang="si"><span className="big">සිංහල</span><span className="soon">Coming soon</span></button>
          <button className="lang-tile" disabled lang="ta"><span className="big">தமிழ்</span><span className="soon">Coming soon</span></button>
          <button className="lang-tile selected" onClick={onStart} lang="en"><span className="big">English</span><span className="soon">Continue</span></button>
        </div>
        <button className="btn text on-aurora" onClick={onLogin}>Already have an account? Log in</button>
        <p className="fineprint">Free. No account needed: your details stay on this phone unless you choose to make one. ZedPath is independent and not affiliated with the University Grants Commission.</p>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------- Intro slides
const SLIDES = [
  { title: 'See every path you can reach', body: 'State university courses, and the roads that do not go through one: private degrees, higher diplomas, professional bodies, job exams and study abroad.', art: 'paths' },
  { title: 'Know your real chances', body: 'Each course is marked Safe, Likely or Reach from five years of official cut-offs for your own district. Never a promise: an honest picture.', art: 'bands' },
  { title: 'Every fact has a source', body: 'Cut-offs, subject rules and dates come from the UGC handbook and official tables, with the page they came from, so you can check.', art: 'source' },
] as const;

function SlideArt({ kind }: { kind: typeof SLIDES[number]['art'] }) {
  if (kind === 'bands') return (
    <div className="art-bands" aria-hidden="true">
      {(['SAFE', 'LIKELY', 'REACH'] as const).map((b, i) => (
        <motion.span key={b} className={`pill band-${b}`} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.12 }}>
          {b.charAt(0) + b.slice(1).toLowerCase()}</motion.span>))}
    </div>);
  if (kind === 'source') return (
    <motion.div className="art-source" aria-hidden="true" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
      <span>UGC handbook 2025/26</span><b>page 70</b><span className="helper">Computer Science · entry rules</span></motion.div>);
  return (
    <svg className="art-paths" viewBox="0 0 240 140" aria-hidden="true">
      <motion.path d="M20 115 C 80 115, 80 30, 140 30 S 200 70, 220 45" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1 }} />
      <path d="M20 115 C 90 115, 120 85, 220 95" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
      <path d="M20 115 C 70 105, 100 128, 220 128" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
      <circle cx="20" cy="115" r="10" fill="#fff" />
      <motion.circle cx="220" cy="45" r="13" fill="#FFC94A" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.9, type: 'spring' }} />
    </svg>);
}

export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  return (
    <div className="intro">
      <div className="row" style={{ justifyContent: 'space-between' }}><span className="section-label" style={{ margin: 0 }}>{i + 1} of {SLIDES.length}</span><button className="btn text" onClick={onDone}>Skip</button></div>
      <AnimatePresence mode="wait">
        <motion.div key={i} className="stack" style={{ gap: 18, flex: 1 }} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
          <div className={`intro-art ${s.art === 'paths' ? 'aurora' : ''}`} style={s.art === 'paths' ? undefined : { background: 'var(--surface-2)' }}><SlideArt kind={s.art} /></div>
          <h1 className="screen-title" style={{ textAlign: 'center' }}>{s.title}</h1>
          <p className="subtitle intro-body">{s.body}</p>
        </motion.div>
      </AnimatePresence>
      <div className="dots" role="tablist" aria-label="Introduction">
        {SLIDES.map((_, k) => <button key={k} role="tab" aria-selected={k === i} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} />)}
      </div>
      <div className="flow-nav"><button className="btn filled block" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? 'Get started' : 'Next'}</button></div>
    </div>
  );
}

// ---------------------------------------------------------------- About you: one question per screen
const STREAM_ICON: Record<StreamCode, typeof Atom> = { ARTS: Palette, COMMERCE: Calculator, BIO: Microscope, PHYS: Atom, ET: Cpu, BST: Sprout };
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
  const [dir, setDir] = useState(1);
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

  const go = (to: number) => { setDir(to > step ? 1 : -1); setStep(to); setTried(false); window.scrollTo(0, 0); };
  const next = () => {
    setTried(true);
    if (errorFor) return;
    if (step < STEPS.length - 1) { go(step + 1); return; }
    onSave({ stream: stream as StreamCode, district, zE4: zE4!, al: Object.fromEntries(subjects) as Record<string, Grade> }, extras);
  };
  const list = (code: StreamCode | '') => {
    const sugg = code ? SUGGESTED[code].filter(c => subjectNames.has(c)) : [];
    const rest = [...subjectNames.keys()].filter(c => !sugg.includes(c)).sort((a, b) => subjectNames.get(a)!.localeCompare(subjectNames.get(b)!));
    return { sugg, rest };
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="steps-bar" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>{STEPS.map((_, k) => <span key={k} className={k <= step ? 'on' : ''} />)}</div>
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={step} className="stack" style={{ gap: 14 }} initial={{ opacity: 0, x: 36 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -36 * dir }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
          <p className="section-label" style={{ margin: 0 }}>Step {step + 1} of {STEPS.length}</p>

          {step === 0 && (<>
            <h1 className="screen-title">Which stream did you sit?</h1>
            <div className="tile-grid" role="radiogroup" aria-label="Stream">
              {(meta?.streams ?? []).map(s => { const Icon = STREAM_ICON[s.code]; return (
                <button key={s.code} type="button" role="radio" aria-checked={stream === s.code} className="tile" onClick={() => setStream(s.code)}>
                  <Icon size={26} strokeWidth={2} aria-hidden="true" />{s.name}</button>); })}
            </div>
          </>)}

          {step === 1 && (<>
            <h1 className="screen-title">Which district did you sit from?</h1>
            <p className="subtitle">The UGC rule: the district of the school you attended most in the three years before the exam.</p>
            <label className="search"><Search size={20} aria-hidden="true" /><input placeholder="Search districts" value={districtQuery} onChange={e => setDistrictQuery(e.target.value)} aria-label="Search districts" /></label>
            <div className="choice-list" role="radiogroup" aria-label="District">
              {(meta?.districts ?? []).filter(d => d.name.toLowerCase().includes(districtQuery.toLowerCase())).map(d => (
                <button key={d.code} type="button" role="radio" aria-checked={district === d.code} className="choice" onClick={() => setDistrict(d.code)}>
                  {d.name.charAt(0) + d.name.slice(1).toLowerCase()}{district === d.code && <span aria-hidden="true">✓</span>}
                </button>))}
            </div>
          </>)}

          {step === 2 && (<>
            <h1 className="screen-title">What is your Z-score?</h1>
            <p className="subtitle">Exactly as printed on your results sheet, with four decimals.</p>
            <div className={`card z-field ${tried && errorFor ? 'bad' : ''}`}>
              <input inputMode="decimal" autoComplete="off" placeholder="1.4821" value={z} onChange={e => setZ(e.target.value)} aria-label="Z-score" aria-invalid={tried && !!errorFor} />
              <span className="underline" aria-hidden="true" />
            </div>
            <button className="btn text" style={{ alignSelf: 'center' }} disabled>No results yet? Estimate (coming soon)</button>
          </>)}

          {step === 3 && (<>
            <h1 className="screen-title">Your three subjects and grades</h1>
            {subjects.map(([code, grade], i) => (
              <div key={i} className="card subject-card">
                <button type="button" className={`subject-pick ${code ? '' : 'empty'}`} onClick={() => setPicking(picking === i ? null : i)} aria-expanded={picking === i}>
                  {code ? (subjectNames.get(code) ?? nameOf(code)) : `Choose subject ${i + 1}`}<ChevronRight size={18} aria-hidden="true" style={{ transform: picking === i ? 'rotate(90deg)' : undefined, transition: 'transform .2s' }} />
                </button>
                {picking === i && (() => { const { sugg, rest } = list(stream); return (
                  <div className="choice-list compact" role="listbox" aria-label={`Subject ${i + 1}`}>
                    {sugg.length > 0 && <p className="section-label">Common in your stream</p>}
                    {sugg.map(c => <SubjectOption key={c} c={c} name={subjectNames.get(c)!} selected={code === c} disabled={chosen.includes(c) && code !== c}
                      onPick={() => { setSubjects(s => s.map((x, j) => j === i ? [c, x[1]] : x)); setPicking(null); }} />)}
                    {sugg.length > 0 && <p className="section-label">All subjects</p>}
                    {rest.map(c => <SubjectOption key={c} c={c} name={subjectNames.get(c)!} selected={code === c} disabled={chosen.includes(c) && code !== c}
                      onPick={() => { setSubjects(s => s.map((x, j) => j === i ? [c, x[1]] : x)); setPicking(null); }} />)}
                  </div>); })()}
                <div className="grade-row" role="radiogroup" aria-label={`Grade for subject ${i + 1}`}>
                  {(['A', 'B', 'C', 'S'] as Grade[]).map(g => (
                    <button key={g} type="button" role="radio" aria-checked={grade === g} onClick={() => setSubjects(s => s.map((x, j) => j === i ? [x[0], g] : x))}>{g}</button>))}
                </div>
              </div>))}
          </>)}

          {step === 4 && (<>
            <h1 className="screen-title">Beyond grades</h1>
            <p className="subtitle">Optional. Sports, competitions, clubs and certificates can open special intakes; what you enjoy helps us show the paths that suit you. It stays on this phone.</p>
            <p className="section-label">Achievements</p>
            {extras.achievements.length > 0 && (
              <div className="list-card">
                {extras.achievements.map(a => (
                  <div key={a.id} className="item" style={{ cursor: 'default' }}>
                    <Trophy size={20} aria-hidden="true" style={{ color: 'var(--reach)' }} />
                    <span className="grow"><span className="t">{a.activity}</span><span className="s">{label(a.kind)} · {label(a.level)} · {a.place === 'TAKING_PART' ? 'took part' : `${label(a.place)} place`} · {a.year}</span></span>
                    <button className="btn text" onClick={() => setExtras(e => ({ ...e, achievements: e.achievements.filter(x => x.id !== a.id) }))}>Remove</button>
                  </div>))}
              </div>)}
            <div className="card stack">
              <input className="input" placeholder="e.g. Chess, Science Olympiad, Volleyball" value={draft.activity} onChange={e => setDraft({ ...draft, activity: e.target.value })} aria-label="Activity" />
              <div className="chips" role="radiogroup" aria-label="Type">
                {(['SPORT', 'COMPETITION', 'CLUB', 'ARTS', 'OTHER'] as const).map(k => (
                  <button key={k} type="button" className="chip" role="radio" aria-checked={draft.kind === k} onClick={() => setDraft({ ...draft, kind: k })}>{label(k)}</button>))}
              </div>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <select className="select" aria-label="Level" value={draft.level} onChange={e => setDraft({ ...draft, level: e.target.value as Level })}>
                  {LEVELS.map(l => <option key={l} value={l}>{label(l)}</option>)}</select>
                <select className="select" aria-label="Result" value={draft.place} onChange={e => setDraft({ ...draft, place: e.target.value as Place })}>
                  {PLACES.map(p => <option key={p} value={p}>{p === 'TAKING_PART' ? 'Took part' : label(p)}</option>)}</select>
                <select className="select" aria-label="Year" value={draft.year} onChange={e => setDraft({ ...draft, year: Number(e.target.value) })}>
                  {[2026, 2025, 2024, 2023, 2022, 2021].map(y => <option key={y}>{y}</option>)}</select>
              </div>
              <button type="button" className="btn tonal" disabled={!draft.activity.trim()}
                onClick={() => { setExtras(e => ({ ...e, achievements: [...e.achievements, { ...draft, activity: draft.activity.trim(), id: crypto.randomUUID() }] })); setDraft({ ...draft, activity: '' }); }}>
                <Trophy size={18} aria-hidden="true" />Add achievement</button>
            </div>
            <p className="section-label">What you enjoy</p>
            <div className="chips">
              {INTERESTS.map(t => (
                <button key={t} type="button" className="chip" aria-pressed={extras.interests.includes(t)}
                  onClick={() => setExtras(e => ({ ...e, interests: e.interests.includes(t) ? e.interests.filter(x => x !== t) : [...e.interests, t] }))}>{t}</button>))}
            </div>
          </>)}
        </motion.div>
      </AnimatePresence>

      {tried && errorFor && <motion.p className="error-text" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{errorFor}</motion.p>}
      <div className="flow-nav">
        {step > 0 && <button className="btn text" onClick={() => go(step - 1)}>Back</button>}
        <button className="btn filled block" onClick={next}>{step === STEPS.length - 1 ? 'Show my paths' : 'Next'}</button>
      </div>
    </div>
  );
}

function SubjectOption({ c, name, selected, disabled, onPick }: { c: string; name: string; selected: boolean; disabled: boolean; onPick: () => void }) {
  return <button type="button" role="option" aria-selected={selected} className="choice" disabled={disabled} onClick={onPick} data-code={c}>{name}{selected && <span aria-hidden="true">✓</span>}</button>;
}
