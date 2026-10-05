// ZedPath app shell, design v2. First run: Welcome -> Intro -> About you (5 steps). Then a floating bottom-navigation app:
// Paths (home) | Courses | Me. Routing via the URL hash so Back and deep links work.
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Award, BellRing, Building2, ChevronRight, CloudCheck, Download, ExternalLink, GraduationCap, Info, Landmark, LogOut, Map as MapIcon, Pencil, Plane,
  ListOrdered, RotateCcw, Scale, ScrollText, ShieldCheck, Sparkles, Trash2, TriangleAlert, Trophy, UserRound, Wrench, type LucideIcon } from 'lucide-react';
import type { Meta, OfferingDetail, ProfileInput, ResultsResponse, OfferingSummary, RouteSummary } from '../shared/api.ts';
import type { MeResponse } from '../shared/account.ts';
import type { Band } from '../shared/banding.ts';
import { formatGap, formatZ } from '../shared/banding.ts';
import { nameOf } from '../shared/describe.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { AboutFlow, Intro, Logo, Welcome } from './screens/Onboarding.tsx';
import { AuthScreen, RecoveryCodeScreen } from './screens/Account.tsx';
import { deleteAccount, fetchMe, logOut, logOutEverywhere, saveMe } from './account.ts';
import { notificationsSupported, sendTestNotification } from './notify.ts';
import { AskScreen, type AskTurn } from './screens/Ask.tsx';
import { MyListScreen } from './screens/MyList.tsx';
import { COMPARE_MAX, CompareScreen } from './screens/Compare.tsx';
import { SyllabusCard } from './screens/Syllabus.tsx';
import { addToList, type ListEntry } from '../shared/list.ts';
import { clearEverything, isOnboarded, isPendingSync, loadCompare, loadList, saveCompare, saveList, loadExtras, loadProfile, saveExtras, saveProfile, setOnboarded, setPendingSync,
  specialIntakeHint, type Extras } from './storage.ts';
import { useInstallPrompt } from './pwa.ts';
import { shortDuration, shortInstitution, shortYear, titleCase } from './format.ts';
import { BandRing, CutoffChart, Page, Stagger, rise } from './ui.tsx';

const BAND_LABEL: Record<Band, string> = { SAFE: 'Safe', LIKELY: 'Likely', REACH: 'Reach', OUT_OF_RANGE: 'Out of range', NOT_ENOUGH_DATA: 'Not enough data' };
const TREND_LABEL = { RISING: 'rising', FALLING: 'falling', STEADY: 'steady', JUMPY: 'jumpy', NO_TREND: '' } as const;
export const ROUTE_GROUPS: { code: RouteSummary['group']; title: string; sub: string; icon: LucideIcon; tone: string }[] = [
  { code: 'PRIVATE_DEGREE', title: 'Private degrees', sub: 'Approved institutes, interest-free loans', icon: Building2, tone: 'var(--violet)' },
  { code: 'DIPLOMA', title: 'Diplomas and Open University', sub: 'SLIATE HNDs, OUSL', icon: ScrollText, tone: 'var(--brand-500)' },
  { code: 'PROFESSIONAL', title: 'Professional bodies', sub: 'CA, CMA, CIMA, AAT', icon: Award, tone: 'var(--teal)' },
  { code: 'VOCATIONAL', title: 'Vocational and NVQ', sub: 'VTA, DTET, NAITA, UoVT', icon: Wrench, tone: 'var(--reach)' },
  { code: 'JOB_EXAM', title: 'Government job exams', sub: 'From the Gazette', icon: Landmark, tone: 'var(--safe)' },
  { code: 'SCHOLARSHIP_ABROAD', title: 'Study abroad', sub: 'Government scholarships', icon: Plane, tone: 'var(--likely)' },
  { code: 'RETRY', title: 'Sit the A/L again', sub: 'What it would take', icon: RotateCcw, tone: 'var(--out)' },
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

  // Accounts (CR-001): with no account (or no accounts on the server) everything below is skipped and the app behaves
  // exactly as before. With one, every save also goes to the account, and the account's copy is loaded on start,
  // unless a save never reached it (offline): then the phone's newer copy is pushed instead of being overwritten.
  const [me, setMe] = useState<{ username: string } | null>(null);
  const [recovery, setRecovery] = useState<{ username: string; code: string } | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [list, setListRaw] = useState<ListEntry[]>(() => loadList());
  const setList = (l: ListEntry[]) => { saveList(l); setListRaw(l); };
  const [compare, setCompareRaw] = useState<string[]>(() => loadCompare());
  const setCompare = (c: string[]) => { saveCompare(c); setCompareRaw(c); };
  const [askTurns, setAskTurnsRaw] = useState<AskTurn[]>(() => { try { return JSON.parse(sessionStorage.getItem('zedpath.ask.v1') ?? '[]'); } catch { return []; } });
  const setAskTurns = (f: (t: AskTurn[]) => AskTurn[]) => setAskTurnsRaw(t => { const n = f(t); try { sessionStorage.setItem('zedpath.ask.v1', JSON.stringify(n.filter(x => x.reply || x.error))); } catch { /* private mode */ } return n; });
  const push = (p: ProfileInput, e: Extras) => saveMe(p, e)
    .then(() => { setPendingSync(false); setSyncNote(null); })
    .catch(() => { setPendingSync(true); setSyncNote('Saved on this phone. It will copy to your account next time you are online.'); });
  const adopt = (m: MeResponse) => {
    setMe({ username: m.username });
    const local = loadProfile();
    if (local && (isPendingSync() || !m.profile)) { void push(local, loadExtras()); return; }
    if (!m.profile) return;
    saveProfile(m.profile); saveExtras(m.extras); setProfile(m.profile); setExtras(m.extras);
    setOnboarded(); setOnb(true);
  };
  useEffect(() => { fetchMe().then(m => m && adopt(m)).catch(() => {}); }, []);   // once, on start

  const [path, arg] = route.split('/').filter(Boolean);
  const finishIntro = () => { setOnboarded(); setOnb(true); go('/about'); };
  const onSave = (p: ProfileInput, e: Extras) => {
    saveProfile(p); saveExtras(e); setProfile(p); setExtras(e);
    if (me) void push(p, e);
    go('/paths');
  };
  const reset = () => { clearEverything(); setListRaw([]); setCompareRaw([]); setMe(null); setProfile(null); setExtras({ achievements: [], interests: [] }); setOnb(false); go('/'); };
  const onClear = async () => { if (me) await logOut().catch(() => {}); reset(); };
  const account = {
    username: me?.username ?? null, syncNote,
    logOut: async () => { await logOut().catch(() => {}); setMe(null); },
    logOutEverywhere: async () => { await logOutEverywhere().catch(() => {}); setMe(null); },
    deleteAccount: async () => { await deleteAccount(); reset(); },
  };

  // Account screens: a focused flow with Back and no bottom navigation, reachable before and after onboarding.
  if (['signup', 'login', 'recover', 'saved-code'].includes(path)) {
    const titles: Record<string, string> = { signup: 'Create account', login: 'Log in', recover: 'Reset password', 'saved-code': 'Recovery code' };
    const afterAuth = () => go(loadProfile() ? '/me' : '/about');
    return (
      <div className="shell">
        <header className="app-bar">
          {path !== 'saved-code' ? <button className="icon-btn" onClick={() => history.back()} aria-label="Back"><ArrowLeft size={22} /></button> : <Logo size={32} />}
          <span className="brand">{titles[path]}</span>
        </header>
        <main><Page k={route}>{path === 'saved-code'
          ? (recovery ? <RecoveryCodeScreen username={recovery.username} code={recovery.code} onDone={() => { setRecovery(null); afterAuth(); }} />
            : <div className="card"><p className="subtitle">Your recovery code was shown once and is no longer on screen.</p></div>)
          : <AuthScreen mode={path as 'signup' | 'login' | 'recover'} profile={profile} extras={extras} go={go}
              onSignedUp={(username, code) => { setMe({ username }); setPendingSync(false); setRecovery({ username, code }); setOnboarded(); setOnb(true); go('/saved-code'); }}
              onLoggedIn={m => { adopt(m); setOnboarded(); setOnb(true); go(m.profile || loadProfile() ? '/paths' : '/about'); }} />}
        </Page></main>
      </div>);
  }

  // First run
  if (!onboarded && path !== 'intro') return <div className="shell"><main><Welcome onStart={() => go('/intro')} onLogin={() => go('/login')} /></main></div>;
  if (!onboarded && path === 'intro') return <div className="shell"><main><Intro onDone={finishIntro} /></main></div>;
  if (!profile || path === 'about') return (
    <div className="shell">
      <header className="app-bar">
        {profile ? <button className="icon-btn" onClick={() => history.back()} aria-label="Back"><ArrowLeft size={22} /></button> : <Logo size={32} />}
        <span className="brand">About you</span>
      </header>
      <main><AboutFlow meta={meta} initial={profile} extrasInitial={extras} onSave={onSave} /></main>
    </div>);

  let screen: React.ReactNode, tab: 'paths' | 'courses' | 'ask' | 'me' = 'paths', title = 'ZedPath', back = false;
  if (path === 'courses') { tab = 'courses'; title = 'Courses'; screen = <Courses results={results} band={(arg?.toUpperCase() as Band) || 'SAFE'} go={go} listCount={list.length} />; }
  else if (path === 'compare') { tab = 'courses'; back = true; title = 'Compare'; screen = <CompareScreen codes={compare} setCodes={setCompare} profile={profile} results={results} list={list} go={go} />; }
  else if (path === 'list') { tab = 'courses'; title = 'My list'; screen = <MyListScreen list={list} setList={setList} results={results} go={go} />; }
  else if (path === 'course' && arg) { tab = 'courses'; back = true; title = 'Degree details'; screen = <DegreeDetails uniCode={arg} profile={profile} results={results} go={go} list={list} setList={setList} compare={compare} setCompare={setCompare} />; }
  else if (path === 'ask') { tab = 'ask'; title = 'Ask ZedPath'; screen = <AskScreen profile={profile} turns={askTurns} setTurns={setAskTurns}
    initialQuestion={arg ? decodeURIComponent(arg) : null} onConsumedInitial={() => history.replaceState(null, '', '#/ask')} />; }
  else if (path === 'hidden') { tab = 'courses'; back = true; title = 'Hidden courses'; screen = <Hidden results={results} />; }
  else if (path === 'routes' && arg) { back = true; title = 'Other paths'; screen = <RouteList group={arg as RouteSummary['group']} routes={routes} go={go} />; }
  else if (path === 'route' && arg) { back = true; title = 'Route details'; screen = <RouteDetail id={arg} routes={routes} />; }
  else if (path === 'me') { tab = 'me'; title = 'Me'; screen = <Me profile={profile} meta={meta} extras={extras} go={go} onClear={onClear} account={account} />; }
  else screen = <YourPaths meta={meta} profile={profile} extras={extras} results={results} routes={routes} error={error} go={go} listCount={list.length} />;

  const NAV: [typeof tab, string, LucideIcon, string][] = [['paths', 'Paths', MapIcon, '#/paths'], ['courses', 'Courses', GraduationCap, '#/courses/safe'], ['ask', 'Ask', Sparkles, '#/ask'], ['me', 'Me', UserRound, '#/me']];
  return (
    <div className="shell has-nav">
      <header className="app-bar">
        {back ? <button className="icon-btn" onClick={() => history.back()} aria-label="Back"><ArrowLeft size={22} /></button> : <Logo size={32} />}
        <span className="brand">{title}</span>
      </header>
      <main><ErrorBoundary resetKey={route}><Page k={route}>{screen}</Page></ErrorBoundary></main>
      <nav className="bottom-nav" aria-label="Main">
        {NAV.map(([key, label, Icon, href]) => (
          <a key={key} href={href} className={tab === key ? 'sel' : ''} aria-current={tab === key ? 'page' : undefined}>
            {tab === key && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <Icon size={22} strokeWidth={tab === key ? 2.4 : 2} aria-hidden="true" /><span>{label}</span>
          </a>))}
      </nav>
    </div>
  );
}

// ---------------------------------------------------------------- Paths (home)
function YourPaths({ meta, profile, extras, results, routes, error, go, listCount }: { listCount: number; meta: Meta | null; profile: ProfileInput; extras: Extras;
  results: ResultsResponse | null; routes: RouteSummary[] | null; error: string | null; go: (to: string) => void }) {
  const hint = specialIntakeHint(extras);
  const install = useInstallPrompt();
  const c = results?.counts;
  return (
    <>
      <section className="hero aurora" aria-label="State universities">
        <div>
          <span className="eyebrow">State universities · 2025/26 intake</span>
          <h1>{c ? `${c.SAFE + c.LIKELY + c.REACH} courses within your reach` : 'Checking every course…'}</h1>
          <span className="meta">{profileLine(profile, meta)}</span>
        </div>
        {c ? (
          <div className="hero-body">
            <BandRing safe={c.SAFE} likely={c.LIKELY} reach={c.REACH} />
            <div className="ring-legend num">
              <span><i className="dot" style={{ background: '#3DDC97' }} /><b>{c.SAFE}</b>Safe</span>
              <span><i className="dot" style={{ background: '#9DB8FF' }} /><b>{c.LIKELY}</b>Likely</span>
              <span><i className="dot" style={{ background: '#FFC94A' }} /><b>{c.REACH}</b>Reach</span>
            </div>
          </div>) : !error && <div className="skeleton" style={{ height: 116, opacity: .25 }} />}
        <button className="btn white" onClick={() => go('/courses/safe')} disabled={!results}>See the courses<ChevronRight size={18} aria-hidden="true" /></button>
      </section>
      {error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{error}</div>}
      {hint.applies && <div className="alert gold"><Trophy size={20} aria-hidden="true" /><span>Your {hint.sport ? 'sports ' : ''}achievements may qualify you for a <b>special intake</b>:
        up to 0.5% of places per course for national or international achievements (2023 to 2025), if you are within 0.2000 of the cut-off.
        <span className="source" style={{ display: 'block', marginTop: 4, color: 'inherit', opacity: .75 }}>UGC handbook 2025/26, Section 6, p.166</span></span></div>}
      {results && results.hidden.length > 0 && (
        <button className="hidden-bar" onClick={() => go('/hidden')}><span>{results.hidden.length} courses hidden: subject rules not met</span><span className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>See why<ChevronRight size={16} aria-hidden="true" /></span></button>)}
      <button className="card list-entry" onClick={() => go('/list')}>
        <span className="ic" style={{ background: 'var(--likely-bg)', color: 'var(--likely)' }}><ListOrdered size={22} aria-hidden="true" /></span>
        <span className="grow"><span className="t">My list</span><span className="s">{listCount ? `${listCount} course${listCount > 1 ? 's' : ''} in your order, checked for mistakes` : 'Build your UGC preference list'}</span></span>
        <ChevronRight size={20} className="chev" aria-hidden="true" />
      </button>
      <p className="section-label">Other paths</p>
      <Stagger className="bento">
        {ROUTE_GROUPS.map((g, i) => {
          const n = routes?.filter(r => r.group === g.code).length ?? 0;
          const open = routes?.filter(r => r.group === g.code && r.openNow).length ?? 0;
          const Icon = g.icon;
          return (
            <motion.button key={g.code} variants={rise} className="bento-tile" onClick={() => go(`/routes/${g.code}`)} disabled={!routes || n === 0}
              style={i === ROUTE_GROUPS.length - 1 ? { gridColumn: '1 / -1', minHeight: 96 } : undefined}>
              <span className="ic" style={{ background: `color-mix(in srgb, ${g.tone} 14%, transparent)`, color: g.tone }}><Icon size={22} aria-hidden="true" /></span>
              {open > 0 ? <span className="pill open corner">{open} open</span> : n > 0 && <span className="pill band-NOT_ENOUGH_DATA corner num">{n}</span>}
              <span className="t">{g.title}</span><span className="s">{g.sub}</span>
            </motion.button>);
        })}
      </Stagger>
      {install.canInstall && <button className="btn tonal" onClick={install.prompt}><Download size={18} aria-hidden="true" />Install ZedPath on this phone</button>}
      <p className="footer-note">Bands compare your Z-score with five years of cut-offs for your district. Past cut-offs describe the past:
        no band is a promise of admission. ZedPath is independent and not affiliated with the University Grants Commission.</p>
    </>
  );
}

// ---------------------------------------------------------------- Courses by band
function Courses({ results, band, go, listCount }: { results: ResultsResponse | null; band: Band; go: (to: string) => void; listCount: number }) {
  const tabs: Band[] = ['SAFE', 'LIKELY', 'REACH'];
  const list = useMemo(() => (results?.offerings ?? []).filter(o => o.band === band)
    .sort((a, b) => (b.gapToLatestE4 ?? 0) - (a.gapToLatestE4 ?? 0)), [results, band]);
  const total = results ? results.counts.SAFE + results.counts.LIKELY + results.counts.REACH : 0;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">{results ? `${total} courses within reach` : 'Checking courses…'}</h1>
        <p className="subtitle">Sorted by how far you are above last year's cut-off for your district.</p>
        <button className="btn text" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => go('/list')}><ListOrdered size={18} aria-hidden="true" />My list{listCount ? ` (${listCount})` : ''}</button>
        <button className="btn text" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => go('/compare')}><Scale size={18} aria-hidden="true" />Compare courses</button>
      </div>
      <div className="seg" role="tablist" aria-label="Band">
        {tabs.map(t => (
          <button key={t} role="tab" aria-selected={t === band} onClick={() => go(`/courses/${t.toLowerCase()}`)}>
            {t === band && <motion.span layoutId="seg-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span>{BAND_LABEL[t]}<span className="count num">{results?.counts[t] ?? '–'}</span></span>
          </button>))}
      </div>
      {!results && <div className="stack">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton" />)}</div>}
      {results && list.length === 0 && <div className="card"><p className="subtitle">No courses in this band for your results.</p></div>}
      {list.length > 0 && (
        <Stagger key={band} className="list-card" role="tabpanel">
          {list.map((o, i) => <CourseRow key={`${o.uniCode}-${o.group}`} o={o} animate={i < 14} onOpen={() => go(`/course/${o.uniCode}`)} />)}
        </Stagger>)}
      {results && <button className="hidden-bar" onClick={() => go('/hidden')}><span>{results.hidden.length} courses hidden</span><span className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>See why<ChevronRight size={16} aria-hidden="true" /></span></button>}
    </>
  );
}

function CourseRow({ o, animate, onOpen }: { o: OfferingSummary; animate: boolean; onOpen: () => void }) {
  const gap = o.gapToLatestE4 === null ? '' : `${formatGap(o.gapToLatestE4)} vs last year`;
  const span = o.limitedHistory ? `${o.yearsUsed} yr${o.yearsUsed > 1 ? 's' : ''} of data` : `${o.yearsUsed} yrs${o.trend !== 'NO_TREND' ? ` · ${TREND_LABEL[o.trend]}` : ''}`;
  return (
    <motion.button variants={animate ? rise : undefined} className="item" onClick={onOpen}>
      <span className={`strip ${o.band}`} aria-hidden="true" />
      <span className="grow">
        <span className="t">{titleCase(o.course)}{o.groupLabel ? ` (${o.group})` : ''}</span>
        <span className="s">{shortInstitution(o.institution)}</span>
        <span className="m">{[gap, span, o.hasAptitudeTest ? 'aptitude test' : '', o.needsOl ? 'check O/L' : ''].filter(Boolean).join(' · ')}</span>
      </span>
      <span className="sr-only">{BAND_LABEL[o.band]}</span>
      <ChevronRight size={20} className="chev" aria-hidden="true" />
    </motion.button>
  );
}

// ---------------------------------------------------------------- Degree details
function AddToList({ d, mine, list, setList, go }: { d: OfferingDetail; mine: OfferingSummary[]; list: ListEntry[];
  setList: (l: ListEntry[]) => void; go: (to: string) => void }) {
  const [note, setNote] = useState<string | null>(null);
  const onList = list.some(e => e.uniCode === d.uniCode);
  if (onList) return (
    <div className="row" style={{ flexWrap: 'nowrap' }}>
      <button className="btn tonal" style={{ flex: 1 }} onClick={() => go('/list')}><ListOrdered size={18} aria-hidden="true" />On my list: #{list.findIndex(e => e.uniCode === d.uniCode) + 1}</button>
      <button className="btn text" onClick={() => setList(list.filter(e => e.uniCode !== d.uniCode))}>Remove</button>
    </div>);
  const best = mine[0];                                     // FR-302: only offerings the results screen lists as eligible
  const add = () => {
    const r = addToList(list, { uniCode: d.uniCode, group: best?.group ?? 'ALL', course: titleCase(d.course), institution: shortInstitution(d.institution), band: best?.band ?? 'NOT_ENOUGH_DATA' }, !!best);
    if (r.ok) { setList(r.list); setNote(null); }
    else setNote({ NOT_ELIGIBLE: 'Your subjects do not meet this course\'s rules, so it cannot go on your list.', DUPLICATE: 'Already on your list.', FULL: 'Your list is full (125 courses).' }[r.reason]);
  };
  return (
    <div className="stack" style={{ gap: 6 }}>
      <button className="btn filled" onClick={add} disabled={!best}><ListOrdered size={18} aria-hidden="true" />{best ? 'Add to my list' : 'Not eligible: cannot add to my list'}</button>
      {note && <p className="helper" role="status">{note}</p>}
    </div>);
}

function DegreeDetails({ uniCode, profile, results, go, list, setList, compare, setCompare }: { uniCode: string; profile: ProfileInput; results: ResultsResponse | null;
  go: (to: string) => void; list: ListEntry[]; setList: (l: ListEntry[]) => void; compare: string[]; setCompare: (c: string[]) => void }) {
  const [d, setD] = useState<OfferingDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api<OfferingDetail>(`/offerings/${uniCode}?district=${profile.district}`).then(setD).catch(e => setErr(String(e.message))); }, [uniCode, profile.district]);
  const mine = results?.offerings.filter(o => o.uniCode === uniCode) ?? [];
  if (err) return <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{err}</div>;
  if (!d) return <><div className="skeleton" style={{ height: 220 }} /><div className="skeleton" /></>;
  const latest = d.groups[0]?.history.find(h => h.zE4 !== null) ?? d.groups[0]?.history[0];
  return (
    <>
      <section className="detail-hero aurora">
        <div className="row">
          {mine.map(o => <span key={o.group} className={`pill band-${o.band}`}>{BAND_LABEL[o.band]}{mine.length > 1 ? ` (${o.group})` : ''}</span>)}
          <span className="pill">{d.hasAptitudeTest ? 'Aptitude test' : 'No aptitude test'}</span>
          {d.selectionBasis === 'MERIT_ONLY' && <span className="pill">All-island merit</span>}
        </div>
        <h1>{titleCase(d.course)}</h1>
        <span className="meta">{shortInstitution(d.institution)}{d.duration ? ` · ${shortDuration(d.duration)}` : ''} · {d.uniCode}</span>
        <div className="compare num">
          <div><b>{formatZ(profile.zE4)}</b><span>Your Z-score</span></div>
          <div><b>{latest ? (latest.zE4 === null ? 'NQC' : formatZ(latest.zE4)) : '–'}</b><span>Cut-off {latest ? shortYear(latest.academicYear) : ''}, your district</span></div>
        </div>
      </section>

      <button className="btn tonal" onClick={() => go(`/ask/${encodeURIComponent(`Explain ${titleCase(d.course)} at ${shortInstitution(d.institution)}: what it needs and what my chances are.`)}`)}>
        <Sparkles size={18} aria-hidden="true" />Explain this course with Ask ZedPath</button>
      <AddToList d={d} mine={mine} list={list} setList={setList} go={go} />
      {compare.includes(d.uniCode)
        ? <button className="btn tonal" onClick={() => go('/compare')}><Scale size={18} aria-hidden="true" />Compare now ({compare.length})</button>
        : <button className="btn tonal" disabled={compare.length >= COMPARE_MAX} onClick={() => { setCompare([...compare, d.uniCode]); if (compare.length >= 1) go('/compare'); }}>
            <Scale size={18} aria-hidden="true" />{compare.length >= COMPARE_MAX ? `Compare is full (${COMPARE_MAX})` : compare.length ? `Compare with ${compare.length === 1 ? 'the other course' : `${compare.length} others`}` : 'Compare'}</button>}
      <section className="card stack" aria-labelledby="needs-h">
        <h2 id="needs-h" className="title-l">What it needs</h2>
        <div className="needs">{[...d.needs, ...d.olNeeds].map((line, i) => (
          <span key={i} className={line.endsWith(':') ? 'group' : ''}>{line.trim()}</span>))}</div>
        <p className="section-label">You have</p>
        <div className="have">{Object.entries(profile.al).map(([s, g]) => <span key={s}>{g} · {nameOf(s)}</span>)}</div>
        <details className="exact">
          <summary className="source-link"><ScrollText size={16} aria-hidden="true" />Exact handbook wording · p.{d.requirementCitation.page}</summary>
          <p className="body-m">{d.requirementText}</p>
        </details>
      </section>
      {d.syllabus && <SyllabusCard s={d.syllabus} />}
      {d.ambiguousWording && <div className="alert warn"><Info size={20} aria-hidden="true" />The handbook's wording for this course can be read two ways.
        ZedPath shows it to you; confirm on the UGC application form, which lists only the courses you are eligible for.</div>}

      {d.groups.map(g => (
        <section key={g.code} className="card stack">
          <h2 className="title-l">Cut-offs for your district{d.groups.length > 1 ? ` · ${g.code}` : ''}</h2>
          <CutoffChart history={g.history} zE4={profile.zE4} />
          <details className="exact">
            <summary className="source-link">All years as a table</summary>
            <table className="table">
              <thead><tr><th scope="col">Intake</th><th scope="col">Minimum Z-score</th></tr></thead>
              <tbody>
                {g.history.map(h => <tr key={h.academicYear}><td>{h.academicYear}</td><td className="num">{h.zE4 === null ? 'No qualified candidates' : formatZ(h.zE4)}</td></tr>)}
                <tr className="you"><td>You</td><td className="num">{formatZ(profile.zE4)}</td></tr>
              </tbody>
            </table>
          </details>
          <p className="source">Sources: {[...new Set(g.history.map(h => `${h.citation.label} p.${h.citation.page}`))].join(' · ')}</p>
        </section>
      ))}
      {d.otherRequirements && <div className="alert info"><Info size={20} aria-hidden="true" />{d.otherRequirements}</div>}
      <p className="footer-note">Some courses are not taught in all three languages, so meeting the cut-off does not guarantee selection (UGC cut-off table note).</p>
    </>
  );
}

// ---------------------------------------------------------------- Hidden courses
function Hidden({ results }: { results: ResultsResponse | null }) {
  if (!results) return <div className="skeleton" />;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">Why {results.hidden.length} courses are hidden</h1>
        <p className="subtitle">Each needs subjects or grades your results do not meet. The rule is quoted from the UGC handbook.</p>
      </div>
      <Stagger className="list-card">
        {results.hidden.map((h, i) => (
          <motion.div variants={i < 14 ? rise : undefined} className="item" style={{ cursor: 'default' }} key={h.uniCode}>
            <span className="strip OUT_OF_RANGE" aria-hidden="true" />
            <span className="grow"><span className="t">{titleCase(h.course)}</span><span className="s">{shortInstitution(h.institution)}</span>
              <span className="m">{h.reason} · p.{h.page}</span></span>
          </motion.div>))}
      </Stagger>
    </>
  );
}

// ---------------------------------------------------------------- Other routes
function RouteList({ group, routes, go }: { group: RouteSummary['group']; routes: RouteSummary[] | null; go: (to: string) => void }) {
  const g = ROUTE_GROUPS.find(x => x.code === group);
  const list = (routes ?? []).filter(r => r.group === group).sort((a, b) => Number(b.openNow) - Number(a.openNow));
  const Icon = g?.icon ?? MapIcon;
  return (
    <>
      <div className="row" style={{ flexWrap: 'nowrap', gap: 14 }}>
        <span className="ic-lg" style={{ background: `color-mix(in srgb, ${g?.tone ?? 'var(--brand)'} 14%, transparent)`, color: g?.tone }}><Icon size={26} aria-hidden="true" /></span>
        <div className="stack" style={{ gap: 2 }}><h1 className="screen-title">{g?.title}</h1><p className="subtitle">{g?.sub}</p></div>
      </div>
      <p className="helper"><ShieldCheck size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />Checked against official sources on 5 Oct 2026.</p>
      {!routes ? <div className="skeleton" /> : (
        <Stagger className="list-card">
          {list.map(r => (
            <motion.button variants={rise} key={r.id} className="item" onClick={() => go(`/route/${r.id}`)}>
              <span className="grow"><span className="t">{r.name}</span><span className="s">{r.provider}</span>
                {r.costText && <span className="m">{r.costText}</span>}</span>
              {r.openNow && <span className="pill open">Open</span>}
              <ChevronRight size={20} className="chev" aria-hidden="true" />
            </motion.button>))}
        </Stagger>)}
    </>
  );
}

function RouteDetail({ id, routes }: { id: string; routes: RouteSummary[] | null }) {
  const r = routes?.find(x => x.id === id);
  if (!routes) return <div className="skeleton" />;
  if (!r) return <div className="alert error"><TriangleAlert size={20} aria-hidden="true" />Route not found.</div>;
  const g = ROUTE_GROUPS.find(x => x.code === r.group);
  return (
    <>
      <div className="stack" style={{ gap: 8 }}>
        <div className="row">{r.openNow && <span className="pill open">Open now</span>}<span className="pill band-LIKELY">{g?.title}</span></div>
        <h1 className="screen-title">{r.name}</h1><p className="subtitle">{r.provider}</p>
      </div>
      {(r.duration || r.costText) && (
        <div className="compare plain num">
          {r.duration && <div><b>{r.duration}</b><span>Duration</span></div>}
          {r.costText && <div><b>{r.costText}</b><span>Cost</span></div>}
        </div>)}
      {r.intakeTiming && <section className="card stack"><h2 className="title-l">When</h2><p className="body-m" style={{ margin: 0 }}>{r.intakeTiming}</p></section>}
      <section className="card stack">
        <h2 className="title-l">Entry requirements</h2>
        <p className="body-m" style={{ margin: 0 }}>{r.requirements}</p>
        <p className="source">Official wording. Source: {r.sourceLocator} · checked {r.retrievedOn}</p>
      </section>
      {r.warning && <div className="alert warn"><TriangleAlert size={20} aria-hidden="true" />{r.warning}</div>}
      {r.officialUrl && <a className="btn filled block" href={r.officialUrl} target="_blank" rel="noopener">Go to the official website<ExternalLink size={18} aria-hidden="true" /></a>}
      <a className="btn text" href={r.sourceUrl} target="_blank" rel="noopener" style={{ alignSelf: 'center' }}>Open the source document</a>
    </>
  );
}

// ---------------------------------------------------------------- Me
interface AccountControls { username: string | null; syncNote: string | null; logOut: () => Promise<void>;
  logOutEverywhere: () => Promise<void>; deleteAccount: () => Promise<void> }

function AccountCard({ account, go }: { account: AccountControls; go: (to: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  if (!account.username) return (
    <section className="card stack account-card">
      <h2 className="title-l">Keep your details in an account</h2>
      <p className="subtitle">Open ZedPath on any phone or laptop with everything already filled in. Just a username: no email or phone number.</p>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <button className="btn filled" style={{ flex: 1 }} onClick={() => go('/signup')}>Create account</button>
        <button className="btn text" onClick={() => go('/login')}>Log in</button>
      </div>
    </section>);
  return (
    <section className="card stack account-card">
      <div className="row" style={{ flexWrap: 'nowrap', gap: 12 }}>
        <span className="avatar" aria-hidden="true">{account.username.charAt(0).toUpperCase()}</span>
        <span className="stack" style={{ gap: 0, minWidth: 0 }}>
          <span className="title-l" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.username}</span>
          <span className="helper"><CloudCheck size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />Your details are saved to this account</span>
        </span>
      </div>
      {account.syncNote && <div className="alert info"><Info size={20} aria-hidden="true" />{account.syncNote}</div>}
      <div className="row">
        <button className="btn tonal" onClick={account.logOut}><LogOut size={18} aria-hidden="true" />Log out</button>
        <button className="btn text" onClick={account.logOutEverywhere}>Log out on every device</button>
      </div>
      {!confirming
        ? <button className="btn text" style={{ alignSelf: 'flex-start', color: 'var(--danger)' }} onClick={() => setConfirming(true)}><Trash2 size={18} aria-hidden="true" />Delete my account</button>
        : <div className="alert error" role="alertdialog" aria-label="Confirm account deletion">
            <TriangleAlert size={20} aria-hidden="true" />
            <span className="stack" style={{ gap: 8 }}>
              <span>This deletes your account and everything saved in it, for good. It cannot be undone.</span>
              <span className="row">
                <button className="btn filled danger" onClick={() => account.deleteAccount().catch(() => setFailed('Could not delete. Check your connection and try again.'))}>Delete for good</button>
                <button className="btn text" onClick={() => setConfirming(false)}>Keep my account</button>
              </span>
              {failed && <span>{failed}</span>}
            </span>
          </div>}
    </section>);
}

function TestNotification() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | string>('idle');
  if (!notificationsSupported()) return null;
  const send = async () => {
    if (state === 'sending') return;                     // one tap, one notification
    setState('sending');
    const r = await sendTestNotification().catch(() => ({ ok: false as const, reason: 'Could not show the notification. Try again.' }));
    setState(r.ok ? 'sent' : r.reason);
  };
  return (
    <div className="stack" style={{ gap: 6 }}>
      <button className="btn tonal" onClick={send} disabled={state === 'sending'}><BellRing size={18} aria-hidden="true" />
        {state === 'sending' ? 'Sending…' : 'Send a test notification'}</button>
      {state === 'sent' && <p className="helper" role="status">Sent. Check your notifications.</p>}
      {!['idle', 'sending', 'sent'].includes(state) && <p className="helper" role="status">{state}</p>}
    </div>
  );
}

function Me({ profile, meta, extras, go, onClear, account }: { profile: ProfileInput; meta: Meta | null; extras: Extras; go: (to: string) => void;
  onClear: () => void; account: AccountControls }) {
  const install = useInstallPrompt();
  return (
    <>
      <section className="hero aurora" style={{ gap: 6 }}>
        <span className="eyebrow">Your results</span>
        <h1 className="num">Z {formatZ(profile.zE4)}</h1>
        <span className="meta">{profileLine(profile, meta).split(' · ').slice(0, 2).join(' · ')}</span>
        <div className="row" style={{ marginTop: 8 }}>{Object.entries(profile.al).map(([s, g]) => <span key={s} className="pill">{g} · {nameOf(s)}</span>)}</div>
      </section>
      <section className="card stack">
        <h2 className="title-l">Beyond grades</h2>
        {extras.achievements.length === 0 && extras.interests.length === 0 && <p className="subtitle">Nothing added yet. Achievements can open special intakes.</p>}
        {extras.achievements.map(a => <span key={a.id} className="row body-m" style={{ flexWrap: 'nowrap' }}><Trophy size={18} aria-hidden="true" style={{ color: 'var(--reach)', flex: 'none' }} />{a.activity} · {a.level.toLowerCase()} · {a.year}</span>)}
        {extras.interests.length > 0 && <div className="have">{extras.interests.map(t => <span key={t}>{t}</span>)}</div>}
      </section>
      <button className="btn tonal" onClick={() => go('/about')}><Pencil size={18} aria-hidden="true" />Edit my details</button>
      <p className="section-label">Account</p>
      <AccountCard account={account} go={go} />
      <p className="section-label">Language</p>
      <div className="chips" role="radiogroup" aria-label="Language">
        <button className="chip" role="radio" aria-checked="false" disabled lang="si">සිංහල</button>
        <button className="chip" role="radio" aria-checked="false" disabled lang="ta">தமிழ்</button>
        <button className="chip" role="radio" aria-checked="true" lang="en">English</button>
      </div>
      <p className="helper">Sinhala and Tamil are being translated and checked by native speakers.</p>
      <p className="section-label">App</p>
      {install.canInstall ? <button className="btn tonal" onClick={install.prompt}><Download size={18} aria-hidden="true" />Install ZedPath on this phone</button>
        : <p className="helper">{install.installed ? 'ZedPath is installed on this phone.' : 'To install: open your browser menu and choose "Add to Home screen" or "Install app".'}</p>}
      <TestNotification />
      <p className="section-label">Privacy</p>
      <p className="body-m muted" style={{ margin: 0 }}>{account.username
        ? 'Your results, achievements and interests are kept on this phone and in your account, under your username only. Delete your account above to remove them from ZedPath for good.'
        : 'Your results, achievements and interests are stored only on this phone. They are sent to ZedPath only to calculate your options and are not kept.'}</p>
      <button className="btn text" style={{ alignSelf: 'flex-start', color: 'var(--danger)' }} onClick={onClear}><Trash2 size={18} aria-hidden="true" />
        {account.username ? 'Log out and clear this phone' : 'Delete everything on this phone'}</button>
    </>
  );
}

// ---------------------------------------------------------------- helpers
function profileLine(p: ProfileInput, meta: Meta | null): string {
  const stream = meta?.streams.find(s => s.code === p.stream)?.name ?? p.stream;
  const district = titleCase(meta?.districts.find(d => d.code === p.district)?.name ?? p.district);
  return `${stream} · ${district} · Z ${formatZ(p.zE4)}`;
}
export { titleCase } from './format.ts';
