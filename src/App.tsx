// ZedPath app shell. First run: Welcome -> Intro -> About you (5 steps). Then a bottom-navigation app:
// Paths (home) | Courses | Me. Styled after the Gate 1 deck; routing via the URL hash so Back and deep links work.
import { useEffect, useMemo, useState } from 'react';
import type { Meta, OfferingDetail, ProfileInput, ResultsResponse, OfferingSummary, RouteSummary } from '../shared/api.ts';
import type { Band } from '../shared/banding.ts';
import { formatGap, formatZ } from '../shared/banding.ts';
import { nameOf } from '../shared/describe.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { IconBack, IconChevron } from './icons.tsx';
import { AboutFlow, Intro, Logo, Welcome } from './screens/Onboarding.tsx';
import { clearEverything, isOnboarded, loadExtras, loadProfile, saveExtras, saveProfile, setOnboarded, specialIntakeHint, type Extras } from './storage.ts';
import { useInstallPrompt } from './pwa.ts';

const BAND_LABEL: Record<Band, string> = { SAFE: 'Safe', LIKELY: 'Likely', REACH: 'Reach', OUT_OF_RANGE: 'Out of range', NOT_ENOUGH_DATA: 'Not enough data' };
const TREND_LABEL = { RISING: 'rising', FALLING: 'falling', STEADY: 'steady', JUMPY: 'jumpy', NO_TREND: '' } as const;
export const ROUTE_GROUPS: { code: RouteSummary['group']; title: string; sub: string }[] = [
  { code: 'PRIVATE_DEGREE', title: 'Private and non-state degrees', sub: 'Approved institutes, the interest-free loan scheme' },
  { code: 'DIPLOMA', title: 'Higher diplomas and Open University', sub: 'SLIATE HNDs, OUSL, national diplomas' },
  { code: 'PROFESSIONAL', title: 'Professional qualifications', sub: 'CA, CMA, CIMA, AAT' },
  { code: 'VOCATIONAL', title: 'Vocational and NVQ courses', sub: 'VTA, DTET, NAITA, University of Vocational Technology' },
  { code: 'JOB_EXAM', title: 'Government job exams', sub: 'From the Government Gazette' },
  { code: 'SCHOLARSHIP_ABROAD', title: 'Study abroad scholarships', sub: 'Government-to-government, via the Ministry' },
  { code: 'RETRY', title: 'Sit the A/L again', sub: 'What it would take' },
];

function useHashRoute(): [string, (to: string) => void] {
  const [hash, setHash] = useState(() => location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => { setHash(location.hash.slice(1) || '/'); window.scrollTo(0, 0); };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return [hash, (to: string) => { location.hash = to; }];
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error ?? `Request failed (${r.status})`);
  return body as T;
}

export function App() {
  const [route, go] = useHashRoute();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [profile, setProfile] = useState<ProfileInput | null>(() => loadProfile());
  const [extras, setExtras] = useState<Extras>(() => loadExtras());
  const [onboarded, setOnb] = useState(() => isOnboarded());
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [routes, setRoutes] = useState<RouteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api<Meta>('/meta').then(setMeta).catch(e => setError(String(e.message))); }, []);
  useEffect(() => { api<RouteSummary[]>('/routes').then(setRoutes).catch(() => setRoutes([])); }, []);
  useEffect(() => {                                                    // FR-105: recalculate whenever the profile changes
    if (!profile) { setResults(null); return; }
    setResults(null); setError(null);
    api<ResultsResponse>('/results', { method: 'POST', body: JSON.stringify(profile) }).then(setResults).catch(e => setError(String(e.message)));
  }, [profile]);

  const [path, arg] = route.split('/').filter(Boolean);
  const finishIntro = () => { setOnboarded(); setOnb(true); go('/about'); };
  const onSave = (p: ProfileInput, e: Extras) => { saveProfile(p); saveExtras(e); setProfile(p); setExtras(e); go('/paths'); };
  const onClear = () => { clearEverything(); setProfile(null); setExtras({ achievements: [], interests: [] }); setOnb(false); go('/'); };

  // First run
  if (!onboarded && path !== 'intro') return <div className="shell"><main><Welcome onStart={() => go('/intro')} /></main></div>;
  if (!onboarded && path === 'intro') return <div className="shell"><main><Intro onDone={finishIntro} /></main></div>;
  if (!profile || path === 'about') return (
    <div className="shell">
      <header className="app-bar">
        {profile ? <button className="icon-btn" onClick={() => history.back()} aria-label="Back"><IconBack /></button> : <Logo size={32} />}
        <span className="brand">About you</span>
      </header>
      <main><AboutFlow meta={meta} initial={profile} extrasInitial={extras} onSave={onSave} /></main>
    </div>);

  let screen: React.ReactNode, tab: 'paths' | 'courses' | 'me' = 'paths', title = 'ZedPath', back = false;
  if (path === 'courses') { tab = 'courses'; title = 'Courses'; screen = <Courses profile={profile} meta={meta} results={results} band={(arg?.toUpperCase() as Band) || 'SAFE'} go={go} />; }
  else if (path === 'course' && arg) { tab = 'courses'; back = true; title = 'Degree details'; screen = <DegreeDetails uniCode={arg} profile={profile} results={results} />; }
  else if (path === 'hidden') { tab = 'courses'; back = true; title = 'Hidden courses'; screen = <Hidden results={results} />; }
  else if (path === 'routes' && arg) { back = true; title = ROUTE_GROUPS.find(g => g.code === arg)?.title ?? 'Routes'; screen = <RouteList group={arg as RouteSummary['group']} routes={routes} go={go} />; }
  else if (path === 'route' && arg) { back = true; title = 'Route details'; screen = <RouteDetail id={arg} routes={routes} />; }
  else if (path === 'me') { tab = 'me'; title = 'Me'; screen = <Me profile={profile} meta={meta} extras={extras} go={go} onClear={onClear} />; }
  else screen = <YourPaths meta={meta} profile={profile} extras={extras} results={results} routes={routes} error={error} go={go} />;

  return (
    <div className="shell has-nav">
      <header className="app-bar">
        {back ? <button className="icon-btn" onClick={() => history.back()} aria-label="Back"><IconBack /></button> : <Logo size={32} />}
        <span className="brand">{title}</span>
      </header>
      <main><ErrorBoundary resetKey={route}>{screen}</ErrorBoundary></main>
      <nav className="bottom-nav" aria-label="Main">
        {([['paths', 'Paths', 'M480-80q-33 0-56.5-23.5T400-160v-160q0-33 23.5-56.5T480-400q33 0 56.5 23.5T560-320v160q0 33-23.5 56.5T480-80ZM240-560q-33 0-56.5-23.5T160-640q0-33 23.5-56.5T240-720q33 0 56.5 23.5T320-640q0 33-23.5 56.5T240-560Zm480 0q-33 0-56.5-23.5T640-640q0-33 23.5-56.5T720-720q33 0 56.5 23.5T800-640q0 33-23.5 56.5T720-560ZM480-640l-160 80v-80l160-80 160 80v80l-160-80Z'],
          ['courses', 'Courses', 'M480-120 200-272v-240L40-600l440-240 440 240v320h-80v-276l-80 44v240L480-120Zm0-332 274-148-274-148-274 148 274 148Zm0 241 200-108v-151L480-360 280-470v151l200 108Z'],
          ['me', 'Me', 'M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z']] as const)
          .map(([key, label, d]) => (
            <a key={key} href={`#/${key === 'courses' ? 'courses/safe' : key}`} className={tab === key ? 'sel' : ''} aria-current={tab === key ? 'page' : undefined}>
              <i><svg width="24" height="24" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true"><path d={d} /></svg></i>{label}
            </a>))}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------- Paths (home)
function YourPaths({ meta, profile, extras, results, routes, error, go }: { meta: Meta | null; profile: ProfileInput; extras: Extras;
  results: ResultsResponse | null; routes: RouteSummary[] | null; error: string | null; go: (to: string) => void }) {
  const hint = specialIntakeHint(extras);
  const install = useInstallPrompt();
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <h1 className="screen-title">Your paths</h1>
        <p className="subtitle" style={{ margin: 0 }}>{profileLine(profile, meta)}</p>
      </div>
      {error && <div className="alert error" role="alert">{error}</div>}
      {hint.applies && <div className="alert">Your {hint.sport ? 'sports ' : ''}achievements may qualify you for a <b>special intake</b> (up to 0.5% of places
        per course for national or international achievements, 2023 to 2025, if you are within 0.2000 of the cut-off). UGC handbook 2025/26, Section 6, p.166.</div>}
      <div className="panel">
        <button className="row-item" onClick={() => go('/courses/safe')} disabled={!results}>
          <span className="text">
            <span className="title">State universities</span>
            <span className="sub num">{results ? `Safe ${results.counts.SAFE} · Likely ${results.counts.LIKELY} · Reach ${results.counts.REACH}` : 'Checking every course against your results…'}</span>
          </span>
          <IconChevron />
        </button>
        {ROUTE_GROUPS.map(g => {
          const n = routes?.filter(r => r.group === g.code).length ?? 0;
          const open = routes?.filter(r => r.group === g.code && r.openNow).length ?? 0;
          return (
            <button key={g.code} className="row-item" onClick={() => go(`/routes/${g.code}`)} disabled={!routes || n === 0}>
              <span className="text"><span className="title">{g.title}</span><span className="sub">{g.sub}</span></span>
              <span className="row" style={{ flexWrap: 'nowrap' }}>
                {open > 0 && <span className="pill band-SAFE">{open} open now</span>}
                {!open && n > 0 && <span className="pill band-NOT_ENOUGH_DATA">{n}</span>}
                <IconChevron />
              </span>
            </button>);
        })}
      </div>
      {results && results.hidden.length > 0 && (
        <button className="hidden-bar" onClick={() => go('/hidden')}>{results.hidden.length} courses hidden: subject rules not met · <u>see why</u></button>
      )}
      {install.canInstall && <button className="btn tonal" onClick={install.prompt}>Install ZedPath on this phone</button>}
      <p className="footer-note">Bands compare your Z-score with five years of cut-offs for your district. Past cut-offs describe the past:
        no band is a promise of admission. ZedPath is independent and not affiliated with the University Grants Commission.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Courses by band
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
          </button>))}
      </div>
      <div className="panel" role="tabpanel">
        {!results && [0, 1, 2].map(i => <div key={i} className="skeleton" style={{ margin: 12 }} />)}
        {results && list.length === 0 && <p className="row-item muted">No courses in this band for your results.</p>}
        {list.map(o => <CourseRow key={`${o.uniCode}-${o.group}`} o={o} onOpen={() => go(`/course/${o.uniCode}`)} />)}
      </div>
      {results && <button className="hidden-bar" onClick={() => go('/hidden')}>{results.hidden.length} courses hidden · <u>see why</u></button>}
    </div>
  );
}

function CourseRow({ o, onOpen }: { o: OfferingSummary; onOpen: () => void }) {
  const gap = o.gapToLatestE4 === null ? '' : `${formatGap(o.gapToLatestE4)} vs last year`;
  const span = o.limitedHistory ? `${o.yearsUsed} yr${o.yearsUsed > 1 ? 's' : ''} of data` : `${o.yearsUsed} yrs${o.trend !== 'NO_TREND' ? ` · ${TREND_LABEL[o.trend]}` : ''}`;
  return (
    <button className="row-item" onClick={onOpen}>
      <span className="text">
        <span className="title">{titleCase(o.course)}{o.groupLabel ? ` (${o.group})` : ''}</span>
        <span className="sub">{shortInstitution(o.institution)}</span>
        <span className="gap num">{[gap, span, o.hasAptitudeTest ? 'aptitude test' : '', o.needsOl ? 'check O/L' : ''].filter(Boolean).join(' · ')}</span>
      </span>
      <span className={`pill band-${o.band}`}>{BAND_LABEL[o.band]}</span>
    </button>
  );
}

// ---------------------------------------------------------------- Degree details
function DegreeDetails({ uniCode, profile, results }: { uniCode: string; profile: ProfileInput; results: ResultsResponse | null }) {
  const [d, setD] = useState<OfferingDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api<OfferingDetail>(`/offerings/${uniCode}?district=${profile.district}`).then(setD).catch(e => setErr(String(e.message))); }, [uniCode, profile.district]);
  const mine = results?.offerings.filter(o => o.uniCode === uniCode) ?? [];
  if (err) return <div className="alert error" role="alert">{err}</div>;
  if (!d) return <div className="skeleton" />;
  const latest = d.groups[0]?.history[0];
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div>
        <h1 className="screen-title">{titleCase(d.course)}</h1>
        <p className="subtitle" style={{ margin: 0 }}>{shortInstitution(d.institution)}{d.duration ? ` · ${shortDuration(d.duration)}` : ''} · {d.uniCode}</p>
      </div>
      <div className="row">
        {mine.map(o => <span key={o.group} className={`pill band-${o.band}`}>{BAND_LABEL[o.band]}{mine.length > 1 ? ` (${o.group})` : ''}</span>)}
        <span className={`pill ${d.hasAptitudeTest ? 'band-REACH' : 'band-SAFE'}`}>{d.hasAptitudeTest ? 'Aptitude test' : 'No aptitude test'}</span>
        {d.selectionBasis === 'MERIT_ONLY' && <span className="pill band-LIKELY">All-island merit</span>}
      </div>
      <dl className="panel kv">
        <dt className="block">Needs</dt>
        <dd className="block needs">{[...d.needs, ...d.olNeeds].map((line, i) => (
          <span key={i} className={line.startsWith('  ') ? 'indent' : line.endsWith(':') ? 'group' : ''}>{line.trim()}</span>))}</dd>
        <dt className="block">You have</dt>
        <dd className="block needs">{Object.entries(profile.al).map(([s, g]) => <span key={s}>{g} in {nameOf(s)}</span>)}</dd>
        {latest && <><dt>Cut-off {latest.academicYear.replace(/\/(\d{2})(\d{2})$/, '/$2')}, your district</dt><dd>{latest.zE4 === null ? 'NQC' : formatZ(latest.zE4)}</dd></>}
        <dt>Your Z-score</dt><dd>{formatZ(profile.zE4)}</dd>
      </dl>
      {d.ambiguousWording && <div className="alert">The handbook's wording for this course can be read two ways. ZedPath shows it to you;
        confirm on the UGC application form, which lists only the courses you are eligible for.</div>}
      <details className="exact">
        <summary className="source-link">Exact handbook wording · UGC handbook 2025/26, p.{d.requirementCitation.page}</summary>
        <p className="body-m">{d.requirementText}</p>
      </details>
      {d.groups.map(g => (
        <section key={g.code} className="stack">
          <p className="section-label">Cut-offs for your district{d.groups.length > 1 ? ` · ${g.code}` : ''}</p>
          <table className="table">
            <thead><tr><th scope="col">Intake</th><th scope="col">Minimum Z-score</th></tr></thead>
            <tbody>
              {g.history.map(h => <tr key={h.academicYear}><td>{h.academicYear}</td><td className="num">{h.zE4 === null ? 'No qualified candidates' : formatZ(h.zE4)}</td></tr>)}
              <tr className="you"><td>You</td><td className="num">{formatZ(profile.zE4)}</td></tr>
            </tbody>
          </table>
          <p className="source">Sources: {[...new Set(g.history.map(h => `${h.citation.label} p.${h.citation.page}`))].join(' · ')}</p>
        </section>
      ))}
      {d.otherRequirements && <div className="alert">{d.otherRequirements}</div>}
      <p className="footer-note">Some courses are not taught in all three languages, so meeting the cut-off does not guarantee selection (UGC cut-off table note).</p>
    </div>
  );
}

// ---------------------------------------------------------------- Hidden courses
function Hidden({ results }: { results: ResultsResponse | null }) {
  if (!results) return <div className="skeleton" />;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1 className="screen-title">Why {results.hidden.length} courses are hidden</h1>
      <p className="subtitle" style={{ margin: 0 }}>Each needs subjects or grades your results do not meet. The rule is quoted from the UGC handbook.</p>
      <div className="panel">
        {results.hidden.map(h => (
          <div className="row-item" key={h.uniCode}>
            <span className="text"><span className="title">{titleCase(h.course)}</span><span className="sub">{shortInstitution(h.institution)}</span>
              <span className="sub">{h.reason} <span className="source">(p.{h.page})</span></span></span>
          </div>))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Other routes
function RouteList({ group, routes, go }: { group: RouteSummary['group']; routes: RouteSummary[] | null; go: (to: string) => void }) {
  const g = ROUTE_GROUPS.find(x => x.code === group);
  const list = (routes ?? []).filter(r => r.group === group).sort((a, b) => Number(b.openNow) - Number(a.openNow));
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div><h1 className="screen-title">{g?.title}</h1><p className="subtitle" style={{ margin: 0 }}>{g?.sub}. Checked against official sources on 5 Oct 2026.</p></div>
      <div className="panel">
        {list.map(r => (
          <button key={r.id} className="row-item" onClick={() => go(`/route/${r.id}`)}>
            <span className="text"><span className="title">{r.name}</span><span className="sub">{r.provider}</span>
              {r.costText && <span className="gap">{r.costText}</span>}</span>
            {r.openNow ? <span className="pill band-SAFE">Open now</span> : <IconChevron />}
          </button>))}
      </div>
    </div>
  );
}

function RouteDetail({ id, routes }: { id: string; routes: RouteSummary[] | null }) {
  const r = routes?.find(x => x.id === id);
  if (!routes) return <div className="skeleton" />;
  if (!r) return <div className="alert error">Route not found.</div>;
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div><h1 className="screen-title">{r.name}</h1><p className="subtitle" style={{ margin: 0 }}>{r.provider}</p></div>
      <div className="row">{r.openNow && <span className="pill band-SAFE">Open now</span>}<span className="pill band-LIKELY">{ROUTE_GROUPS.find(g => g.code === r.group)?.title}</span></div>
      <dl className="panel kv">
        {r.duration && <><dt>Duration</dt><dd>{r.duration}</dd></>}
        {r.costText && <><dt>Cost</dt><dd>{r.costText}</dd></>}
        {r.intakeTiming && <><dt className="block">When</dt><dd className="block needs"><span>{r.intakeTiming}</span></dd></>}
        <dt className="block">Entry requirements (official wording)</dt><dd className="block needs"><span style={{ fontWeight: 400 }}>{r.requirements}</span></dd>
      </dl>
      {r.warning && <div className="alert">{r.warning}</div>}
      <p className="source">Source: {r.sourceLocator}. <a className="source-link" href={r.sourceUrl} target="_blank" rel="noopener">Open the official source</a> · checked {r.retrievedOn}</p>
      {r.officialUrl && <a className="btn tonal" href={r.officialUrl} target="_blank" rel="noopener">Go to the official website</a>}
    </div>
  );
}

// ---------------------------------------------------------------- Me
function Me({ profile, meta, extras, go, onClear }: { profile: ProfileInput; meta: Meta | null; extras: Extras; go: (to: string) => void; onClear: () => void }) {
  const install = useInstallPrompt();
  return (
    <div className="stack" style={{ gap: 16 }}>
      <h1 className="screen-title">Me</h1>
      <dl className="panel kv">
        <dt>Results</dt><dd>{profileLine(profile, meta)}</dd>
        <dt>Subjects</dt><dd>{Object.entries(profile.al).map(([s, g]) => `${nameOf(s)} ${g}`).join(', ')}</dd>
        <dt>Achievements</dt><dd>{extras.achievements.length || 'None'}</dd>
        <dt>Interests</dt><dd>{extras.interests.join(', ') || 'None'}</dd>
      </dl>
      <button className="btn tonal" onClick={() => go('/about')}>Edit my details</button>
      <p className="section-label">Language</p>
      <div className="lang-switch" role="group" aria-label="Language">
        <button aria-pressed="false" disabled lang="si">සිංහල</button><button aria-pressed="false" disabled lang="ta">தமிழ்</button><button aria-pressed="true" lang="en">English</button>
      </div>
      <p className="helper">Sinhala and Tamil are being translated and checked by native speakers.</p>
      <p className="section-label">App</p>
      {install.canInstall ? <button className="btn tonal" onClick={install.prompt}>Install ZedPath on this phone</button>
        : <p className="helper">{install.installed ? 'ZedPath is installed on this phone.' : 'To install: open your browser menu and choose "Add to Home screen" or "Install app".'}</p>}
      <p className="section-label">Privacy</p>
      <p className="body-m muted">Your results, achievements and interests are stored only on this phone. They are sent to ZedPath only to calculate your options and are not kept.</p>
      <button className="btn text" style={{ alignSelf: 'flex-start', color: 'var(--md-error)' }} onClick={onClear}>Delete everything on this phone</button>
    </div>
  );
}

// ---------------------------------------------------------------- helpers
function profileLine(p: ProfileInput, meta: Meta | null): string {
  const stream = meta?.streams.find(s => s.code === p.stream)?.name ?? p.stream;
  const district = titleCase(meta?.districts.find(d => d.code === p.district)?.name ?? p.district);
  return `${stream} · ${district} · Z ${formatZ(p.zE4)}`;
}
export function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\b(Of|And|In|The|For|&)\b/g, w => w.toLowerCase())
    .replace(/\b(Ict|It|Mit|Tesl|Sp|Sab|Tv|Bis|Ucsc)\b/gi, w => w.toUpperCase()).replace(/^./, c => c.toUpperCase());
}
function shortInstitution(s: string): string {
  return titleCase(s).replace(/,?\s*Sri Lanka$/i, '').replace(/^University of /, '').replace(/ University$/, '');
}
/** "03 years; 04-year Honours at UCSC, ... (p70)" -> "3 years (honours option)" */
function shortDuration(s: string): string {
  const first = s.replace(/\s*\(p\d+\)/g, '').split(/[;(]/)[0].trim().replace(/^0(\d)/, '$1').replace(/Years?/i, 'years');
  return /honours/i.test(s) && !/honours/i.test(first) ? `${first} (honours option)` : first;
}
