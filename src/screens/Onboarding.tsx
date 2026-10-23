// First-run experience (Gate 1 deck, slide 11 "Tell us about you once"), design v2: aurora welcome, seven animated intro
// slides, then About you as one question per screen (stream, district, Z-score, subjects, beyond grades).
// Errors appear only after Next (ui-ux-pro-max: validate after interaction; one task per screen).
import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Atom, Building2, Calculator, Check, ChevronRight, ClipboardList, Cpu, GraduationCap, Microscope, Palette, Plane, Search, Sparkles, Sprout, Trophy, Wrench } from 'lucide-react';
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
export function Welcome({ onStart, onLogin, onDemo, setLang }: { onStart: () => void; onLogin: () => void; onDemo: () => Promise<void>; setLang: (l: Lang) => void }) {
  const [demoBusy, setDemoBusy] = useState(false), [demoErr, setDemoErr] = useState<string | null>(null);
  const demo = () => { setDemoBusy(true); setDemoErr(null); onDemo().catch(e => { setDemoErr((e as Error).message); setDemoBusy(false); }); };
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
      {/* Praveen 2026-10-23 (screen recording): Try the demo comes first and stands out, because a judge clicks the first
          thing they see; choosing a language only selects it, and the demo (or a new account) opens in that language. */}
      <motion.div className="stack welcome-actions" style={{ gap: 12 }} {...rise(0.34)}>
        <button className={`demo-cta ${reduce ? '' : 'pulse'}`} onClick={demo} disabled={demoBusy}>
          <Sparkles size={24} aria-hidden="true" />
          <span className="grow"><b>{demoBusy ? t('welcome.demoBusy') : t('welcome.demo')}</b><small>{t('welcome.demoSub')}</small></span>
          <ChevronRight size={22} aria-hidden="true" />
        </button>
        {demoErr && <p className="fineprint" role="alert">{demoErr}</p>}
        <p className="section-label" id="lang-h">{t('welcome.choose')}</p>
        <div className="lang-grid" role="radiogroup" aria-labelledby="lang-h">
          {LANGS.map(l => (
            <button key={l.code} className={`lang-tile ${getLang() === l.code ? 'selected' : ''}`} lang={l.code} role="radio" aria-checked={getLang() === l.code}
              onClick={() => setLang(l.code)}><span className="big">{l.name}</span>
              <span className="soon">{getLang() === l.code ? <><Check size={12} aria-hidden="true" /> {t('welcome.picked')}</> : '\u00a0'}</span></button>))}
        </div>
        <button className="btn outline-white" onClick={onStart}>{t('welcome.create')}</button>
        <button className="btn text on-aurora" onClick={onLogin}>{t('welcome.login')}</button>
        <p className="fineprint">{t('welcome.fine')}</p>
        <p className="team-line">{t('welcome.team')}</p>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------- Intro slides
// Seven slides (Praveen 2026-10-14: "4 more screens and better graphics"): each shows a small animated scene of the
// real app. Numbers in the scenes are illustrations and carry an "Example" tag (trust rule: sample data is labelled).
// Swipe or tap Next; Skip leaves at any time; reduced motion shows the scenes without animation.
const SLIDES = [
  { n: 1, art: 'paths' }, { n: 2, art: 'bands' }, { n: 3, art: 'source' }, { n: 4, art: 'list' },
  { n: 5, art: 'ask' }, { n: 6, art: 'journey' }, { n: 7, art: 'groups' },
] as const;
type Art = typeof SLIDES[number]['art'];

function Example() { return <span className="scene-tag">{t('intro.art.example')}</span>; }

function SlideArt({ kind }: { kind: Art }) {
  const reduce = useReducedMotion();
  const pop = (d: number, y = 14) => (reduce ? {} : { initial: { opacity: 0, y }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.45, ease: [0.2, 0.8, 0.2, 1] as const } });
  if (kind === 'paths') {
    // A hub: the student in the middle, five kinds of path around (Praveen 2026-10-14: a clearer drawing for slide 1).
    const spots = [
      { k: 'uni', I: GraduationCap, a: -90 }, { k: 'private', I: Building2, a: -18 }, { k: 'jobs', I: ClipboardList, a: 54 },
      { k: 'diploma', I: Wrench, a: 126 }, { k: 'abroad', I: Plane, a: 198 },
    ] as const;
    const at = (deg: number, r = 34) => ({ x: 50 + r * Math.cos((deg * Math.PI) / 180), y: 50 + r * Math.sin((deg * Math.PI) / 180) });
    return (
      <div className="scene-inner">
        <div className="hub" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="hub-lines">
            {spots.map((sp, i) => { const e = at(sp.a, 24); return (
              <motion.line key={sp.k} x1="50" y1="50" x2={e.x} y2={e.y} stroke="rgba(255,255,255,.75)" strokeWidth="0.9" strokeDasharray="1.6 2.2" strokeLinecap="round"
                initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25 + i * 0.08, duration: 0.5 }} />); })}
          </svg>
          <div className="hub-pos" style={{ left: '50%', top: '50%' }}>
            <motion.div className="hub-me" initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
              <img src="/avatars/a05.svg" alt="" /><span>{t('intro.art.you')}</span>
            </motion.div>
          </div>
          {spots.map((sp, i) => { const e = at(sp.a); return (
            <div key={sp.k} className="hub-pos" style={{ left: `${e.x}%`, top: `${e.y}%` }}>
              <motion.div className={`hub-spot ${i === 0 ? 'lead' : ''}`}
                initial={reduce ? false : { scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.65 + i * 0.1, type: 'spring', stiffness: 280, damping: 20 }}>
                <span className="hub-icon"><sp.I size={20} strokeWidth={2.2} /></span><span className="hub-label">{t(`intro.art.${sp.k}` as Key)}</span>
              </motion.div>
            </div>); })}
        </div>
      </div>);
  }
  if (kind === 'bands') {
    const parts = [{ b: 'SAFE', n: 44, c: 'var(--safe)' }, { b: 'LIKELY', n: 3, c: 'var(--likely)' }, { b: 'REACH', n: 17, c: 'var(--reach)' }] as const;
    const total = 64, C = 2 * Math.PI * 42;
    let off = 0;
    return (
      <div className="scene-inner"><Example />
        <motion.div className="glass ring-card" {...pop(0.05)}>
          <svg viewBox="0 0 100 100" className="mini-ring" aria-hidden="true">
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface-3)" strokeWidth="11" />
            {parts.map(p => { const len = (p.n / total) * C; const el = (
              <motion.circle key={p.b} cx="50" cy="50" r="42" fill="none" stroke={p.c} strokeWidth="11" strokeDasharray={`${len} ${C}`} strokeDashoffset={-off}
                transform="rotate(-90 50 50)" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + off / C, duration: 0.5 }} />);
              off += len; return el; })}
            <text x="50" y="49" textAnchor="middle" className="ring-n">64</text>
            <text x="50" y="62" textAnchor="middle" className="ring-l">{t('intro.art.within')}</text>
          </svg>
          <div className="stack" style={{ gap: 8 }}>
            {parts.map((p, i) => <motion.span key={p.b} className={`pill band-${p.b}`} {...pop(0.6 + i * 0.15, 0)}><b>{p.n}</b> {t(`band.${p.b}`)}</motion.span>)}
          </div>
        </motion.div>
      </div>);
  }
  if (kind === 'source') return (
    <div className="scene-inner"><Example />
      <motion.div className="glass src-num" {...pop(0.05)}><span className="helper">{t('intro.art.cutoff')}</span><b>1.3842</b></motion.div>
      <svg className="src-link" viewBox="0 0 40 60" aria-hidden="true">
        <motion.path d="M20 2 V 58" stroke="#fff" strokeWidth="3" strokeDasharray="4 6" fill="none" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.5 }} />
      </svg>
      <motion.div className="glass src-page" {...pop(0.75)}>
        <span className="src-head">UGC handbook 2025/26 · <b>{t('intro.art.page')}</b></span>
        <span className="src-line" /><span className="src-line hl" /><span className="src-line short" />
        <span className="helper">{t('intro.art.rules')}</span>
      </motion.div>
    </div>);
  if (kind === 'list') {
    const rows = [{ c: 'Physical Science · Colombo', b: 'REACH' }, { c: 'Software Engineering · Sabaragamuwa', b: 'LIKELY' }, { c: 'Data Science · Sabaragamuwa', b: 'SAFE' }] as const;
    return (
      <div className="scene-inner"><Example />
        <div className="glass mini-list">
          {rows.map((r, i) => (
            <motion.div key={r.c} className="mini-row" {...pop(0.1 + i * 0.12)}>
              <span className="mini-n">{i + 1}</span><span className="mini-c">{r.c}</span><span className={`pill band-${r.b}`}>{t(`band.${r.b}`)}</span>
            </motion.div>))}
        </div>
        <motion.div className="glass warn-toast" {...pop(0.9)}><span aria-hidden="true">⚠️</span>{t('intro.art.warn')}</motion.div>
      </div>);
  }
  if (kind === 'ask') return (
    <div className="scene-inner chat"><Example />
      <motion.div className="bubble me" {...pop(0.1)}>{t('intro.art.q')}</motion.div>
      <motion.div className="bubble them" {...pop(0.6)}>
        <span className="pill band-LIKELY">{t('intro.art.depends')}</span>
        <span>{t('intro.art.a')}</span>
        <span className="src-chip">📖 {t('intro.art.src')}</span>
      </motion.div>
    </div>);
  if (kind === 'journey') {
    const steps = [{ k: 'step1', s: 'done' }, { k: 'step2', s: 'open' }, { k: 'step3', s: 'locked' }] as const;
    return (
      <div className="scene-inner"><Example />
        <div className="glass tl-card">
          {steps.map((st, i) => (
            <motion.div key={st.k} className={`tl-row ${st.s}`} {...pop(0.15 + i * 0.18)}>
              <span className="tl-dot" aria-hidden="true">{st.s === 'done' ? '✓' : st.s === 'locked' ? '🔒' : ''}</span>
              <span className="tl-text"><b>{t(`intro.art.${st.k}` as Key)}</b>
                <span className="helper">{st.s === 'done' ? t('intro.art.done') : st.s === 'open' ? t('intro.art.open') : t('intro.art.locked')}</span></span>
            </motion.div>))}
        </div>
        <motion.div className="glass bell" {...pop(0.85)}><span aria-hidden="true">🔔</span>{t('intro.art.remind')}</motion.div>
      </div>);
  }
  return (
    <div className="scene-inner chat"><Example />
      <motion.div className="g-msg" {...pop(0.1)}><img src="/avatars/a03.svg" alt="" aria-hidden="true" /><div className="bubble them">{t('intro.art.g1')}</div></motion.div>
      <motion.div className="g-msg" {...pop(0.6)}><img src="/avatars/a07.svg" alt="" aria-hidden="true" />
        <div className="bubble them"><span className="senior-badge">{t('intro.art.senior')}</span>{t('intro.art.g2')}</div></motion.div>
      <motion.div className="glass shield" {...pop(1.0)}><span aria-hidden="true">🛡️</span>{t('intro.art.safe')}</motion.div>
    </div>);
}

export function Intro({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const reduce = useReducedMotion();
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  const go = (to: number) => { if (to < 0 || to >= SLIDES.length) return; setDir(to > i ? 1 : -1); setI(to); };
  return (
    <div className="intro">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="section-label" style={{ margin: 0 }}>{t('intro.count', { i: i + 1, n: SLIDES.length })}</span>
        <button className="btn text" onClick={onDone}>{t('intro.skip')}</button>
      </div>
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div key={i} className="stack" style={{ gap: 16, flex: 1 }}
          initial={reduce ? false : { opacity: 0, x: 40 * dir }} animate={{ opacity: 1, x: 0 }} exit={reduce ? undefined : { opacity: 0, x: -40 * dir }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
          drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18}
          onDragEnd={(_, info) => { if (info.offset.x < -60) go(i + 1); else if (info.offset.x > 60) go(i - 1); }}>
          <div className={`intro-art scene scene-${s.art}`}><SlideArt kind={s.art} /></div>
          <h1 className="screen-title" style={{ textAlign: 'center' }}>{t(`intro.${s.n}.title` as Key)}</h1>
          <p className="subtitle intro-body">{t(`intro.${s.n}.body` as Key)}</p>
        </motion.div>
      </AnimatePresence>
      <div className="dots" role="tablist" aria-label={t('intro.label')}>
        {SLIDES.map((_, k) => <button key={k} role="tab" aria-selected={k === i} aria-label={t('intro.slide', { n: k + 1 })} onClick={() => go(k)}><span /></button>)}
      </div>
      <div className="flow-nav row" style={{ gap: 10 }}>
        {i > 0 && <button className="btn text" onClick={() => go(i - 1)}>{t('about.back')}</button>}
        <button className="btn filled block" style={{ flex: 1 }} onClick={() => (last ? onDone() : go(i + 1))}>{last ? t('intro.start') : t('intro.next')}</button>
      </div>
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
