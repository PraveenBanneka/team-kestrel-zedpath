// First-run experience (Gate 1 deck, slide 11 "Tell us about you once"), design v2: aurora welcome, three animated intro
// slides, then About you as one question per screen (stream, district, Z-score, subjects, beyond grades).
// Errors appear only after Next (ui-ux-pro-max: validate after interaction; one task per screen).
import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Atom, Calculator, ChevronRight, Cpu, Microscope, Palette, Search, Sprout, Trophy } from 'lucide-react';
import type { Meta, ProfileInput } from '../../shared/api.ts';
import { formatZ, parseZ } from '../../shared/banding.ts';
import type { Grade, StreamCode } from '../../shared/rules.ts';
import { matches } from '../../shared/search.ts';
import { nameOf } from '../../shared/describe.ts';
import { INTERESTS, type Achievement, type Extras, type Level, type Place } from '../storage.ts';
import { LANGS, getLang, t, type Key, type Lang } from '../i18n/index.ts';
const tr = t;

export function Logo({ size = 72 }: { size?: number }) {
  return <img src="/icons/icon.svg" width={size} height={size} alt="" aria-hidden="true" style={{ borderRadius: size * 0.22, display: 'block' }} />;
}

// ---------------------------------------------------------------- Welcome
export function Welcome({ onStart, onLogin, setLang }: { onStart: () => void; onLogin: () => void; setLang: (l: Lang) => void }) {
  const reduce = useReducedMotion();
  const rise = (d: number) => ({ initial: reduce ? false : { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: d, ease: [0.2, 0.8, 0.2, 1] as const } });
  return (
    <div className="welcome aurora">
      <div className="logo-wrap">
        <motion.div {...rise(0)}><Logo size={84} /></motion.div>
        <motion.h1 className="display" {...rise(0.08)}>ZedPath</motion.h1>
        <motion.p className="lead" {...rise(0.16)}>{t('welcome.lead')}</motion.p>
        <motion.p className="subtitle" {...rise(0.24)}>{t('welcome.body')}</motion.p>
      </div>
      <motion.div className="stack" style={{ gap: 12 }} {...rise(0.34)}>
        <p className="section-label">{t('welcome.choose')}</p>
        <div className="lang-grid">
          {LANGS.map(l => (
            <button key={l.code} className={`lang-tile ${getLang() === l.code ? 'selected' : ''}`} lang={l.code} aria-pressed={getLang() === l.code}
              onClick={() => { setLang(l.code); onStart(); }}><span className="big">{l.name}</span><span className="soon">{t('welcome.continue')}</span></button>))}
        </div>
        <button className="btn text on-aurora" onClick={onLogin}>{t('welcome.login')}</button>
        <p className="fineprint">{t('welcome.fine')}</p>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------- Intro slides
const SLIDES = [{ n: 1, art: 'paths' }, { n: 2, art: 'bands' }, { n: 3, art: 'source' }] as const;

function SlideArt({ kind }: { kind: typeof SLIDES[number]['art'] }) {
  if (kind === 'bands') return (
    <div className="art-bands" aria-hidden="true">
      {(['SAFE', 'LIKELY', 'REACH'] as const).map((b, i) => (
        <motion.span key={b} className={`pill band-${b}`} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.12 }}>
          {t(`band.${b}`)}</motion.span>))}
    </div>);
  if (kind === 'source') return (
    <motion.div className="art-source" aria-hidden="true" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
      <span>UGC handbook 2025/26</span><b>{t('intro.art.page')}</b><span className="helper">{t('intro.art.rules')}</span></motion.div>);
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
      <div className="row" style={{ justifyContent: 'space-between' }}><span className="section-label" style={{ margin: 0 }}>{t('intro.count', { i: i + 1, n: SLIDES.length })}</span><button className="btn text" onClick={onDone}>{t('intro.skip')}</button></div>
      <AnimatePresence mode="wait">
        <motion.div key={i} className="stack" style={{ gap: 18, flex: 1 }} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
          <div className={`intro-art ${s.art === 'paths' ? 'aurora' : ''}`} style={s.art === 'paths' ? undefined : { background: 'var(--surface-2)' }}><SlideArt kind={s.art} /></div>
          <h1 className="screen-title" style={{ textAlign: 'center' }}>{t(`intro.${s.n}.title` as Key)}</h1>
          <p className="subtitle intro-body">{t(`intro.${s.n}.body` as Key)}</p>
        </motion.div>
      </AnimatePresence>
      <div className="dots" role="tablist" aria-label={t('intro.label')}>
        {SLIDES.map((_, k) => <button key={k} role="tab" aria-selected={k === i} aria-label={t('intro.slide', { n: k + 1 })} onClick={() => setI(k)} />)}
      </div>
      <div className="flow-nav"><button className="btn filled block" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? t('intro.start') : t('intro.next')}</button></div>
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
const STEPS = [0, 1, 2, 3, 4] as const;
const stepName = (k: number) => t(`about.step.${k}` as Key);
const LEVELS: Level[] = ['SCHOOL', 'ZONAL', 'DISTRICT', 'PROVINCIAL', 'NATIONAL', 'INTERNATIONAL'];
const PLACES: Place[] = ['FIRST', 'SECOND', 'THIRD', 'TAKING_PART'];
const label = (group: 'kind' | 'level' | 'place', s: string) => t(`${group}.${s}` as Key);

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
  const [picking, setPickingRaw] = useState<number | null>(null);
  const [subjectQuery, setSubjectQuery] = useState('');
  const setPicking = (i: number | null) => { setPickingRaw(i); setSubjectQuery(''); };
  const [extras, setExtras] = useState<Extras>(extrasInitial);
  const [draft, setDraft] = useState<Omit<Achievement, 'id'>>({ activity: '', kind: 'SPORT', level: 'DISTRICT', place: 'FIRST', year: 2025 });

  const subjectNames = useMemo(() => new Map((meta?.subjects ?? []).filter(s => !s.code.endsWith('_OL')).map(s => [s.code, s.name])), [meta]);
  const zE4 = parseZ(z);
  const chosen = subjects.map(s => s[0]).filter(Boolean);
  const errorFor = [
    !stream ? t('about.err.stream') : null,
    !district ? t('about.err.district') : null,
    zE4 === null ? t('about.err.z') : null,
    chosen.length !== 3 || new Set(chosen).size !== 3 ? t('about.err.subjects') : subjects.some(s => !s[1]) ? t('about.err.grades') : null,
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
    const hit = (c: string) => matches(subjectQuery, subjectNames.get(c), c);
    const sugg = code && !subjectQuery.trim() ? SUGGESTED[code].filter(c => subjectNames.has(c)) : [];
    const rest = [...subjectNames.keys()].filter(c => !sugg.includes(c) && hit(c)).sort((a, b) => subjectNames.get(a)!.localeCompare(subjectNames.get(b)!));
    return { sugg, rest };
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="steps-bar" aria-label={t('about.stepAria', { i: step + 1, n: STEPS.length, name: stepName(step) })}>{STEPS.map((_, k) => <span key={k} className={k <= step ? 'on' : ''} />)}</div>
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={step} className="stack" style={{ gap: 14 }} initial={{ opacity: 0, x: 36 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -36 * dir }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
          <p className="section-label" style={{ margin: 0 }}>{t('about.stepOf', { i: step + 1, n: STEPS.length })}</p>

          {step === 0 && (<>
            <h1 className="screen-title">{t('about.stream.h')}</h1>
            <div className="tile-grid" role="radiogroup" aria-label={stepName(0)}>
              {(meta?.streams ?? []).map(s => { const Icon = STREAM_ICON[s.code]; return (
                <button key={s.code} type="button" role="radio" aria-checked={stream === s.code} className="tile" onClick={() => setStream(s.code)}>
                  <Icon size={26} strokeWidth={2} aria-hidden="true" />{t(`stream.${s.code}` as Key)}</button>); })}
            </div>
          </>)}

          {step === 1 && (<>
            <h1 className="screen-title">{t('about.district.h')}</h1>
            <p className="subtitle">{t('about.district.sub')}</p>
            <label className="search"><Search size={20} aria-hidden="true" /><input placeholder={t('about.district.search')} value={districtQuery} onChange={e => setDistrictQuery(e.target.value)} aria-label={t('about.district.search')} /></label>
            <div className="choice-list" role="radiogroup" aria-label={stepName(1)}>
              {(meta?.districts ?? []).filter(d => matches(districtQuery, d.name, d.code)).map(d => (
                <button key={d.code} type="button" role="radio" aria-checked={district === d.code} className="choice" onClick={() => setDistrict(d.code)}>
                  {d.name.charAt(0) + d.name.slice(1).toLowerCase()}{district === d.code && <span aria-hidden="true">✓</span>}
                </button>))}
            </div>
          </>)}

          {step === 2 && (<>
            <h1 className="screen-title">{t('about.z.h')}</h1>
            <p className="subtitle">{t('about.z.sub')}</p>
            <div className={`card z-field ${tried && errorFor ? 'bad' : ''}`}>
              <input inputMode="decimal" autoComplete="off" placeholder="1.4821" value={z} onChange={e => setZ(e.target.value)} aria-label={stepName(2)} aria-invalid={tried && !!errorFor} />
              <span className="underline" aria-hidden="true" />
            </div>
            <button className="btn text" style={{ alignSelf: 'center' }} disabled>{t('about.z.estimate')}</button>
          </>)}

          {step === 3 && (<>
            <h1 className="screen-title">{t('about.subj.h')}</h1>
            {subjects.map(([code, grade], i) => (
              <div key={i} className="card subject-card">
                <button type="button" className={`subject-pick ${code ? '' : 'empty'}`} onClick={() => setPicking(picking === i ? null : i)} aria-expanded={picking === i}>
                  {code ? (subjectNames.get(code) ?? nameOf(code)) : t('about.subj.choose', { n: i + 1 })}<ChevronRight size={18} aria-hidden="true" style={{ transform: picking === i ? 'rotate(90deg)' : undefined, transition: 'transform .2s' }} />
                </button>
                {picking === i && (() => { const { sugg, rest } = list(stream); return (
                  <div className="choice-list compact" role="listbox" aria-label={t('about.subj.aria', { n: i + 1 })}>
                    <label className="search"><Search size={20} aria-hidden="true" /><input autoFocus placeholder={t('about.subj.search')} value={subjectQuery}
                      onChange={e => setSubjectQuery(e.target.value)} aria-label={t('about.subj.search')} /></label>
                    {sugg.length === 0 && rest.length === 0 && <p className="helper">{t('about.subj.none', { q: subjectQuery })}</p>}
                    {sugg.length > 0 && <p className="section-label">{t('about.subj.common')}</p>}
                    {sugg.map(c => <SubjectOption key={c} c={c} name={subjectNames.get(c)!} selected={code === c} disabled={chosen.includes(c) && code !== c}
                      onPick={() => { setSubjects(s => s.map((x, j) => j === i ? [c, x[1]] : x)); setPicking(null); }} />)}
                    {sugg.length > 0 && <p className="section-label">{t('about.subj.all')}</p>}
                    {rest.map(c => <SubjectOption key={c} c={c} name={subjectNames.get(c)!} selected={code === c} disabled={chosen.includes(c) && code !== c}
                      onPick={() => { setSubjects(s => s.map((x, j) => j === i ? [c, x[1]] : x)); setPicking(null); }} />)}
                  </div>); })()}
                <div className="grade-row" role="radiogroup" aria-label={t('about.subj.gradeAria', { n: i + 1 })}>
                  {(['A', 'B', 'C', 'S'] as Grade[]).map(g => (
                    <button key={g} type="button" role="radio" aria-checked={grade === g} onClick={() => setSubjects(s => s.map((x, j) => j === i ? [x[0], g] : x))}>{g}</button>))}
                </div>
              </div>))}
          </>)}

          {step === 4 && (<>
            <h1 className="screen-title">{t('about.extra.h')}</h1>
            <p className="subtitle">{t('about.extra.sub')}</p>
            <p className="section-label">{t('about.extra.ach')}</p>
            {extras.achievements.length > 0 && (
              <div className="list-card">
                {extras.achievements.map(a => (
                  <div key={a.id} className="item" style={{ cursor: 'default' }}>
                    <Trophy size={20} aria-hidden="true" style={{ color: 'var(--reach)' }} />
                    <span className="grow"><span className="t">{a.activity}</span><span className="s">{label('kind', a.kind)} · {label('level', a.level)} · {a.place === 'TAKING_PART' ? t('about.extra.tookPart') : t('about.extra.place', { p: label('place', a.place) })} · {a.year}</span></span>
                    <button className="btn text" onClick={() => setExtras(e => ({ ...e, achievements: e.achievements.filter(x => x.id !== a.id) }))}>{t('about.extra.remove')}</button>
                  </div>))}
              </div>)}
            <div className="card stack">
              <input className="input" placeholder={t('about.extra.placeholder')} value={draft.activity} onChange={e => setDraft({ ...draft, activity: e.target.value })} aria-label={t('about.extra.activity')} />
              <div className="chips" role="radiogroup" aria-label={t('about.extra.type')}>
                {(['SPORT', 'COMPETITION', 'CLUB', 'ARTS', 'OTHER'] as const).map(k => (
                  <button key={k} type="button" className="chip" role="radio" aria-checked={draft.kind === k} onClick={() => setDraft({ ...draft, kind: k })}>{label('kind', k)}</button>))}
              </div>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <select className="select" aria-label={t('about.extra.level')} value={draft.level} onChange={e => setDraft({ ...draft, level: e.target.value as Level })}>
                  {LEVELS.map(l => <option key={l} value={l}>{label('level', l)}</option>)}</select>
                <select className="select" aria-label={t('about.extra.result')} value={draft.place} onChange={e => setDraft({ ...draft, place: e.target.value as Place })}>
                  {PLACES.map(p => <option key={p} value={p}>{label('place', p)}</option>)}</select>
                <select className="select" aria-label={t('about.extra.year')} value={draft.year} onChange={e => setDraft({ ...draft, year: Number(e.target.value) })}>
                  {[2026, 2025, 2024, 2023, 2022, 2021].map(y => <option key={y}>{y}</option>)}</select>
              </div>
              <button type="button" className="btn tonal" disabled={!draft.activity.trim()}
                onClick={() => { setExtras(e => ({ ...e, achievements: [...e.achievements, { ...draft, activity: draft.activity.trim(), id: crypto.randomUUID() }] })); setDraft({ ...draft, activity: '' }); }}>
                <Trophy size={18} aria-hidden="true" />{t('about.extra.add')}</button>
            </div>
            <p className="section-label">{t('about.extra.enjoy')}</p>
            <div className="chips">
              {INTERESTS.map(t => (
                <button key={t} type="button" className="chip" aria-pressed={extras.interests.includes(t)}
                  onClick={() => setExtras(e => ({ ...e, interests: e.interests.includes(t) ? e.interests.filter(x => x !== t) : [...e.interests, t] }))}>{tr(`interest.${t}` as Key)}</button>))}
            </div>
          </>)}
        </motion.div>
      </AnimatePresence>

      {tried && errorFor && <motion.p className="error-text" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>{errorFor}</motion.p>}
      <div className="flow-nav">
        {step > 0 && <button className="btn text" onClick={() => go(step - 1)}>{t('about.back')}</button>}
        <button className="btn filled block" onClick={next}>{step === STEPS.length - 1 ? t('about.done') : t('about.next')}</button>
      </div>
    </div>
  );
}

function SubjectOption({ c, name, selected, disabled, onPick }: { c: string; name: string; selected: boolean; disabled: boolean; onPick: () => void }) {
  return <button type="button" role="option" aria-selected={selected} className="choice" disabled={disabled} onClick={onPick} data-code={c}>{name}{selected && <span aria-hidden="true">✓</span>}</button>;
}
