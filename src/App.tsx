// ZedPath walking skeleton (ZP-DOC-02 R1: US-101 -> US-201/202 -> US-203 -> US-204), styled after the Gate 1 deck.
// Screens: About you -> Your paths -> State-university courses (Safe/Likely/Reach) -> Degree details; plus "why hidden".
// Routing uses the URL hash so the browser Back button and deep links work (ui-ux-pro-max: predictable back).
import { useEffect, useMemo, useState } from 'react';
import type { Meta, OfferingDetail, ProfileInput, ResultsResponse, OfferingSummary } from '../shared/api.ts';
import type { Band } from '../shared/banding.ts';
import { formatGap, formatZ, parseZ } from '../shared/banding.ts';
import type { Grade, StreamCode } from '../shared/rules.ts';
import { clearProfile, loadProfile, saveProfile } from './profile.ts';
import { IconBack, IconChevron, IconEdit } from './icons.tsx';
import { nameOf } from '../shared/describe.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';

const BAND_LABEL: Record<Band, string> = { SAFE: 'Safe', LIKELY: 'Likely', REACH: 'Reach', OUT_OF_RANGE: 'Out of range', NOT_ENOUGH_DATA: 'Not enough data' };
const TREND_LABEL = { RISING: 'rising', FALLING: 'falling', STEADY: 'steady', JUMPY: 'jumpy', NO_TREND: '' } as const;

function useHashRoute(): [string, (to: string) => void] {
  const [hash, setHash] = useState(() => location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => { setHash(location.hash.slice(1) || '/'); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return [hash, (to: string) => { location.hash = to; }];
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? `Request failed (${r.status})`);
  return body as T;
}

export function App() {
  const [route, go] = useHashRoute();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [profile, setProfile] = useState<ProfileInput | null>(() => loadProfile());
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api<Meta>('/meta').then(setMeta).catch(e => setError(String(e.message))); }, []);
  useEffect(() => {                                                    // FR-105: recalculate whenever the profile changes
    if (!profile) { setResults(null); return; }
    setResults(null); setError(null);
    api<ResultsResponse>('/results', { method: 'POST', body: JSON.stringify(profile) }).then(setResults).catch(e => setError(String(e.message)));
  }, [profile]);

  const onSave = (p: ProfileInput) => { saveProfile(p); setProfile(p); go('/paths'); };
  const onClear = () => { clearProfile(); setProfile(null); go('/'); };

  const [path, arg] = route.split('/').filter(Boolean);
  let screen: React.ReactNode;
  if (!profile || path === undefined || path === 'about') screen = <AboutYou meta={meta} initial={profile} onSave={onSave} onClear={profile ? onClear : undefined} />;
  else if (path === 'paths') screen = <YourPaths meta={meta} profile={profile} results={results} error={error} go={go} />;
  else if (path === 'courses') screen = <Courses profile={profile} meta={meta} results={results} band={(arg?.toUpperCase() as Band) || 'SAFE'} go={go} />;
  else if (path === 'course' && arg) screen = <DegreeDetails uniCode={arg} profile={profile} results={results} />;
  else if (path === 'hidden') screen = <Hidden results={results} />;
  else screen = <YourPaths meta={meta} profile={profile} results={results} error={error} go={go} />;

  const showBack = profile && path && path !== 'paths' && path !== 'about';
  return (
    <div className="shell">
      <header className="app-bar">
        {showBack
          ? <button className="icon-btn" onClick={() => history.back()} aria-label="Back"><IconBack /></button>
          : <span className="mark" aria-hidden="true">Z</span>}
        <span className="brand">ZedPath</span>
        <div className="lang-switch" role="group" aria-label="Language">
          <button aria-pressed="false" disabled title="Sinhala: coming soon" lang="si">සිං</button>
          <button aria-pressed="false" disabled title="Tamil: coming soon" lang="ta">த</button>
          <button aria-pressed="true" lang="en">EN</button>
        </div>
        {profile && path === 'paths' && <button className="icon-btn" onClick={() => go('/about')} aria-label="Edit my details"><IconEdit /></button>}
      </header>
      <main><ErrorBoundary resetKey={route}>{screen}</ErrorBoundary></main>
    </div>
  );
}

// ---------------------------------------------------------------- About you (US-101, US-102)
function AboutYou({ meta, initial, onSave, onClear }: { meta: Meta | null; initial: ProfileInput | null;
  onSave: (p: ProfileInput) => void; onClear?: () => void }) {
  const [stream, setStream] = useState<StreamCode | ''>(initial?.stream ?? '');
  const [district, setDistrict] = useState(initial?.district ?? '');
  const [z, setZ] = useState(initial ? formatZ(initial.zE4).replace('−', '-') : '');
  const initialSubjects = initial ? Object.entries(initial.al) : [];
  const [subjects, setSubjects] = useState<[string, Grade | ''][]>(
    [0, 1, 2].map(i => (initialSubjects[i] as [string, Grade]) ?? ['', '']));
  const [touched, setTouched] = useState(false);

  const zE4 = parseZ(z);
  const chosen = subjects.map(s => s[0]).filter(Boolean);
  const errors = {
    stream: !stream ? 'Choose your stream' : null,
    district: !district ? 'Choose the district you sat from' : null,
    z: zE4 === null ? 'Enter your Z-score with four decimals, for example 1.4821' : null,
    subjects: chosen.length !== 3 || new Set(chosen).size !== 3 ? 'Choose three different subjects'
      : subjects.some(s => !s[1]) ? 'Choose a grade for each subject' : null,
  };
  const valid = !Object.values(errors).some(Boolean);
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setTouched(true);
    if (!valid) return;
    onSave({ stream: stream as StreamCode, district, zE4: zE4!, al: Object.fromEntries(subjects) as Record<string, Grade> });
  };
  const show = (k: keyof typeof errors) => touched && errors[k];

  return (
    <form className="stack" style={{ gap: 16 }} onSubmit={submit} noValidate>
      <div className="progress" aria-hidden="true"><span className="on" /><span className={valid ? 'on' : ''} /><span /></div>
      <h1 className="screen-title">About you</h1>
      <p className="subtitle" style={{ margin: 0 }}>Three details in, your whole map out. Nothing is stored on our servers; no account needed.</p>

      <p className="section-label">Results</p>
      <div className="field">
        <span className="label-m muted" id="stream-label">Stream</span>
        <div className="chips" role="radiogroup" aria-labelledby="stream-label">
          {(meta?.streams ?? []).map(s => (
            <button type="button" key={s.code} className="chip" role="radio" aria-checked={stream === s.code} onClick={() => setStream(s.code)}>{s.name}</button>
          ))}
        </div>
        {show('stream') && <span className="error-text" role="alert">{errors.stream}</span>}
      </div>
      <div className="field">
        <label htmlFor="district">District you sat from</label>
        <select id="district" className="select" value={district} onChange={e => setDistrict(e.target.value)} aria-invalid={!!show('district')}>
          <option value="">Choose a district</option>
          {(meta?.districts ?? []).map(d => <option key={d.code} value={d.code}>{titleCase(d.name)}</option>)}
        </select>
        {show('district') && <span className="error-text" role="alert">{errors.district}</span>}
      </div>
      <div className="field">
        <label htmlFor="z">Your Z-score</label>
        <input id="z" className="input num" inputMode="decimal" autoComplete="off" placeholder="1.4821" value={z}
          onChange={e => setZ(e.target.value)} aria-invalid={!!show('z')} aria-describedby="z-help" />
        <span id="z-help" className={show('z') ? 'error-text' : 'helper'}>{show('z') || 'As printed on your results sheet, four decimals'}</span>
      </div>
      <div className="field">
        <span className="label-m muted">Subjects and grades</span>
        {subjects.map(([code, grade], i) => (
          <div className="subject-row" key={i}>
            <select className="select" aria-label={`Subject ${i + 1}`} value={code}
              onChange={e => setSubjects(s => s.map((x, j) => j === i ? [e.target.value, x[1]] : x))}>
              <option value="">Subject {i + 1}</option>
              {(meta?.subjects ?? []).filter(s => !s.code.endsWith('_OL')).map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <select className="select" aria-label={`Grade for subject ${i + 1}`} value={grade}
              onChange={e => setSubjects(s => s.map((x, j) => j === i ? [x[0], e.target.value as Grade] : x))}>
              <option value="">Grade</option>
              {(['A', 'B', 'C', 'S'] as Grade[]).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        ))}
        {show('subjects') && <span className="error-text" role="alert">{errors.subjects}</span>}
      </div>
      {onClear && <button type="button" className="btn text" style={{ alignSelf: 'flex-start' }} onClick={onClear}>Clear my data</button>}
      <div className="bottom-cta"><button className="btn filled block" type="submit">Show my options</button></div>
    </form>
  );
}

// ---------------------------------------------------------------- Your paths (US-201, US-202, US-501 placeholder)
function YourPaths({ meta, profile, results, error, go }: { meta: Meta | null; profile: ProfileInput; results: ResultsResponse | null;
  error: string | null; go: (to: string) => void }) {
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <h1 className="screen-title">Your paths</h1>
        <p className="subtitle" style={{ margin: 0 }}>{profileLine(profile, meta)}</p>
      </div>
      {error && <div className="alert error" role="alert">{error}</div>}
      <div className="panel" aria-busy={!results}>
        <button className="row-item" onClick={() => go('/courses/safe')} disabled={!results}>
          <span className="text">
            <span className="title">State university</span>
            <span className="sub num">{results
              ? `Safe ${results.counts.SAFE} · Likely ${results.counts.LIKELY} · Reach ${results.counts.REACH}`
              : 'Checking every course against your results…'}</span>
          </span>
          <IconChevron />
        </button>
        {[['Private degrees', 'Matched to your stream'], ['Job exams', 'From the Government Gazette'], ['Vocational courses', 'Near your district'],
          ['Study abroad', 'Entry needs checked'], ['Retry the A/L', 'What it would take']].map(([t, s]) => (
          <div className="row-item" key={t} aria-disabled="true">
            <span className="text"><span className="title">{t}</span><span className="sub">{s}</span></span>
            <span className="pill band-NOT_ENOUGH_DATA">Coming soon</span>
          </div>
        ))}
      </div>
      {results && results.hidden.length > 0 && (
        <button className="hidden-bar" onClick={() => go('/hidden')}>
          {results.hidden.length} courses hidden: subject rules not met · <u>see why</u>
        </button>
      )}
      <p className="footer-note">Bands compare your Z-score with past cut-offs for your district. Past cut-offs describe the past:
        no band is a promise of admission. ZedPath is independent and not affiliated with the University Grants Commission.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Courses by band (US-203, US-205)
function Courses({ profile, meta, results, band, go }: { profile: ProfileInput; meta: Meta | null; results: ResultsResponse | null;
  band: Band; go: (to: string) => void }) {
  const tabs: Band[] = ['SAFE', 'LIKELY', 'REACH'];
  const list = useMemo(() => (results?.offerings ?? []).filter(o => o.band === band)
    .sort((a, b) => (b.gapToLatestE4 ?? 0) - (a.gapToLatestE4 ?? 0)), [results, band]);
  const total = results ? results.counts.SAFE + results.counts.LIKELY + results.counts.REACH : 0;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <p className="subtitle" style={{ margin: 0 }}>{profileLine(profile, meta)}</p>
        <h1 className="screen-title">{results ? `${total} courses within reach` : 'Checking courses…'}</h1>
      </div>
      <div className="segmented" role="tablist" aria-label="Band">
        {tabs.map(t => (
          <button key={t} role="tab" aria-selected={t === band} onClick={() => go(`/courses/${t.toLowerCase()}`)}>
            {BAND_LABEL[t]} <span className="num">{results?.counts[t] ?? '–'}</span>
          </button>
        ))}
      </div>
      <div className="panel" role="tabpanel">
        {!results && [0, 1, 2].map(i => <div key={i} className="skeleton" style={{ margin: 12 }} />)}
        {results && list.length === 0 && <p className="row-item muted">No courses in this band for your results.</p>}
        {list.map(o => <CourseRow key={`${o.uniCode}-${o.group}`} o={o} onOpen={() => go(`/course/${o.uniCode}`)} />)}
      </div>
    </div>
  );
}

function CourseRow({ o, onOpen }: { o: OfferingSummary; onOpen: () => void }) {
  const gap = o.gapToLatestE4 === null ? '' : `${formatGap(o.gapToLatestE4)} ${o.gapToLatestE4 >= 0 ? 'above' : 'below'} last year`;
  const span = o.limitedHistory ? `based on ${o.yearsUsed} year${o.yearsUsed > 1 ? 's' : ''}` : `${o.yearsUsed}-yr history${o.trend !== 'NO_TREND' ? ` · ${TREND_LABEL[o.trend]}` : ''}`;
  return (
    <button className="row-item" onClick={onOpen}>
      <span className="text">
        <span className="title">{titleCase(o.course)}{o.groupLabel ? ` (${o.group})` : ''}</span>
        <span className="sub">{titleCase(o.institution)} · {o.uniCode}</span>
        <span className="gap num">{[gap, span, o.hasAptitudeTest ? 'aptitude test' : '', o.needsOl ? 'check O/L requirement' : ''].filter(Boolean).join(' · ')}</span>
      </span>
      <span className={`pill band-${o.band}`}>{BAND_LABEL[o.band]}</span>
    </button>
  );
}

// ---------------------------------------------------------------- Degree details (US-204)
function DegreeDetails({ uniCode, profile, results }: { uniCode: string; profile: ProfileInput; results: ResultsResponse | null }) {
  const [d, setD] = useState<OfferingDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api<OfferingDetail>(`/offerings/${uniCode}?district=${profile.district}`).then(setD).catch(e => setErr(String(e.message))); }, [uniCode, profile.district]);
  const mine = results?.offerings.filter(o => o.uniCode === uniCode) ?? [];
  if (err) return <div className="alert error" role="alert">{err}</div>;
  if (!d) return <div className="skeleton" />;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <p className="section-label" style={{ margin: 0 }}>Degree details</p>
        <h1 className="screen-title">{titleCase(d.course)}</h1>
        <p className="subtitle" style={{ margin: 0 }}>{titleCase(d.institution)}{d.duration ? ` · ${shortDuration(d.duration)}` : ''} · Uni-Code {d.uniCode}</p>
      </div>
      <div className="row">
        {mine.map(o => <span key={o.group} className={`pill band-${o.band}`}>{BAND_LABEL[o.band]}{mine.length > 1 ? ` (${o.group})` : ''}</span>)}
        <span className={`pill ${d.hasAptitudeTest ? 'band-REACH' : 'band-SAFE'}`}>{d.hasAptitudeTest ? 'Aptitude test required' : 'No aptitude test'}</span>
        {d.selectionBasis === 'MERIT_ONLY' && <span className="pill band-LIKELY">All-island merit</span>}
      </div>
      {(() => {
        const latest = d.groups[0]?.history.find(h => h.academicYear === d.groups[0].history[0]?.academicYear);
        return (
          <dl className="panel kv">
            <dt className="block">Needs</dt>
            <dd className="block needs">{[...d.needs, ...d.olNeeds].map((line, i) => (
              <span key={i} className={line.startsWith('  ') ? 'indent' : line.endsWith(':') ? 'group' : ''}>{line.trim()}</span>))}</dd>
            <dt className="block">You have</dt>
            <dd className="block needs">{Object.entries(profile.al).map(([s, g]) => <span key={s}>{g} in {nameOf(s)}</span>)}</dd>
            {latest && <><dt>Cut-off {latest.academicYear.replace(/\/(\d{2})(\d{2})$/, '/$2')}, your district</dt>
              <dd>{latest.zE4 === null ? 'NQC' : formatZ(latest.zE4)}</dd></>}
            <dt>Your Z-score</dt><dd>{formatZ(profile.zE4)}</dd>
          </dl>
        );
      })()}
      {d.ambiguousWording && <div className="alert">The handbook's wording for this course can be read two ways. ZedPath shows it to you;
        confirm on the UGC application form, which lists only the courses you are eligible for.</div>}
      <details className="exact">
        <summary className="source-link">Exact handbook wording (UGC handbook 2025/26, page {d.requirementCitation.page})</summary>
        <p className="body-m">{d.requirementText}</p>
      </details>
      {d.groups.map(g => (
        <section key={g.code} className="stack">
          <p className="section-label">Cut-offs for your district{d.groups.length > 1 ? ` · group ${g.code}` : ''}</p>
          <div className="panel">
            <table className="table">
              <thead><tr><th scope="col">Intake</th><th scope="col">Minimum Z-score</th></tr></thead>
              <tbody>
                {g.history.map(h => (
                  <tr key={h.academicYear}><td>{h.academicYear}</td><td className="num">{h.zE4 === null ? 'No qualified candidates' : formatZ(h.zE4)}</td></tr>
                ))}
                <tr className="you"><td>You</td><td className="num">{formatZ(profile.zE4)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="source">Sources: {[...new Set(g.history.map(h => `${h.citation.label} p.${h.citation.page}`))].join('; ')}</p>
        </section>
      ))}
      {d.otherRequirements && <div className="alert">{d.otherRequirements}</div>}
      <div className="alert info">Some courses are not taught in all three languages, so meeting the cut-off does not guarantee selection (UGC cut-off table note).</div>
    </div>
  );
}

// ---------------------------------------------------------------- Why hidden (US-202)
function Hidden({ results }: { results: ResultsResponse | null }) {
  if (!results) return <div className="skeleton" />;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1 className="screen-title">Why {results.hidden.length} courses are hidden</h1>
      <p className="subtitle" style={{ margin: 0 }}>Each needs subjects or grades your results do not meet. The rule is quoted from the UGC handbook.</p>
      <div className="panel">
        {results.hidden.map(h => (
          <div className="row-item" key={h.uniCode}>
            <span className="text">
              <span className="title">{titleCase(h.course)}</span>
              <span className="sub">{titleCase(h.institution)} · {h.uniCode}</span>
              <span className="sub">{h.reason} <span className="source">(handbook p.{h.page})</span></span>
            </span>
            <span className="pill band-OUT_OF_RANGE">Not eligible</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function profileLine(p: ProfileInput, meta: Meta | null): string {
  const stream = meta?.streams.find(s => s.code === p.stream)?.name ?? p.stream;
  const district = titleCase(meta?.districts.find(d => d.code === p.district)?.name ?? p.district);
  return `${stream} · ${district} · Z ${formatZ(p.zE4)}`;
}
function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\b(Of|And|In|The|For|&)\b/g, w => w.toLowerCase())
    .replace(/\b(Ict|It|Mit|Tesl|Sp|Sab|Tv|Bis|Ucsc)\b/gi, w => w.toUpperCase()).replace(/^./, c => c.toUpperCase());
}

/** "03 years; 04-year Honours at UCSC, ... (p70)" -> "3 years (honours option)" */
function shortDuration(s: string): string {
  const first = s.replace(/\s*\(p\d+\)/g, '').split(/[;(]/)[0].trim().replace(/^0(\d)/, '$1').replace(/Years?/i, 'years');
  return /honours/i.test(s) && !/honours/i.test(first) ? `${first} (honours option)` : first;
}
