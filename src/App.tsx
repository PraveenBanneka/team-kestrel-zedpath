// ZedPath app shell, design v2. First run: Welcome -> Intro -> About you (5 steps). Then a floating bottom-navigation app:
// Paths (home) | My list | Journey | Groups | Ask, with Alerts (bell) and Me (avatar) in the top bar (CR-002).
// Routing via the URL hash so Back and deep links work.
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, ArrowLeft, Award, Bell, BellRing, Building2, CalendarDays, Users, ChevronRight, CloudCheck, Download, ExternalLink, Info, Landmark, LogOut, Map as MapIcon, Pencil, Plane,
  ListOrdered, Scale, ScrollText, ShieldCheck, Sparkles, Trash2, TriangleAlert, Trophy, UserRound, Wrench, type LucideIcon } from 'lucide-react';
import type { Meta, OfferingDetail, ProfileInput, ResultsResponse, OfferingSummary, RouteSummary } from '../shared/api.ts';
import type { MeResponse } from '../shared/account.ts';
import type { Band } from '../shared/banding.ts';
import { formatGap, formatZ } from '../shared/banding.ts';
import { nameOf } from '../shared/describe.ts';
import { matches } from '../shared/search.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { AboutFlow, Intro, Logo, Welcome } from './screens/Onboarding.tsx';
import { AuthScreen, CompleteContactScreen, RecoveryCodeScreen } from './screens/Account.tsx';
import { deleteAccount, fetchMe, logOut, logOutEverywhere, saveMe } from './account.ts';
import { notificationsSupported, sendTestNotification } from './notify.ts';
import { AskScreen, type AskTurn } from './screens/Ask.tsx';
import { MyListScreen } from './screens/MyList.tsx';
import { JourneyScreen, today } from './screens/Journey.tsx';
import { AlertsScreen } from './screens/Alerts.tsx';
import { GroupRoomScreen, GroupsScreen } from './screens/Groups.tsx';
import { checkNotice, type JourneyResponse } from '../shared/journey.ts';
import { COMPARE_MAX, CompareScreen } from './screens/Compare.tsx';
import { SyllabusCard } from './screens/Syllabus.tsx';
import { addToList, type ListEntry } from '../shared/list.ts';
import { clearEverything, loadAlertsSeen, loadJourney, saveJourney, isOnboarded, isPendingSync, loadCompare, loadList, saveCompare, saveList, loadExtras, loadProfile, saveExtras, saveProfile, setOnboarded, setPendingSync,
  specialIntakeHint, type Extras } from './storage.ts';
import { useInstallPrompt } from './pwa.ts';
import { shortDuration, shortInstitution, shortYear, titleCase } from './format.ts';
import { BandRing, CutoffChart, Page, Stagger, rise } from './ui.tsx';
import { LANGS, setLang as applyLang, t, type Key, type Lang } from './i18n/index.ts';
import { loadLang, saveLang } from './storage.ts';

const bandLabel = (b: Band) => t(`band.${b}`);
const trendLabel = (tr: OfferingSummary['trend']) => tr === 'NO_TREND' ? '' : t(`trend.${tr}`);
export const ROUTE_GROUPS: { code: RouteSummary['group']; title: string; sub: string; icon: LucideIcon; tone: string }[] = [
  { code: 'PRIVATE_DEGREE', title: 'Private degrees', sub: 'Approved institutes, interest-free loans', icon: Building2, tone: 'var(--violet)' },
  { code: 'DIPLOMA', title: 'Diplomas and Open University', sub: 'SLIATE HNDs, OUSL', icon: ScrollText, tone: 'var(--brand-500)' },
  { code: 'PROFESSIONAL', title: 'Professional bodies', sub: 'CA, CMA, CIMA, AAT', icon: Award, tone: 'var(--teal)' },
  { code: 'VOCATIONAL', title: 'Vocational and NVQ', sub: 'VTA, DTET, NAITA, UoVT', icon: Wrench, tone: 'var(--reach)' },
  { code: 'JOB_EXAM', title: 'Government job exams', sub: 'From the Gazette', icon: Landmark, tone: 'var(--safe)' },
  { code: 'SCHOLARSHIP_ABROAD', title: 'Study abroad', sub: 'Government scholarships', icon: Plane, tone: 'var(--likely)' },
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
  const [lang, setLangState] = useState<Lang>(() => { const l = loadLang(); applyLang(l); return l; });
  const changeLang = (l: Lang) => { applyLang(l); saveLang(l); setLangState(l); };
  const [meta, setMeta] = useState<Meta | null>(null);
  const [profile, setProfile] = useState<ProfileInput | null>(() => loadProfile());
  const [extras, setExtras] = useState<Extras>(() => loadExtras());
  const [onboarded, setOnb] = useState(() => isOnboarded());
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [routes, setRoutes] = useState<RouteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api<Meta>('/meta').then(setMeta).catch(e => setError(String(e.message))); }, []);
  useEffect(() => { api<RouteSummary[]>('/routes').then(setRoutes).catch(() => setRoutes([])); }, []);
  const [journey, setJourney] = useState<JourneyResponse | null>(null);
  useEffect(() => { api<JourneyResponse>('/journey').then(setJourney).catch(() => {}); }, []);
  const [saved, setSavedRaw] = useState<string[]>(() => loadJourney());
  const setSaved = (ids: string[]) => { saveJourney(ids); setSavedRaw(ids); };
  useEffect(() => {                                                    // FR-105: recalculate whenever the profile changes
    if (!profile) { setResults(null); return; }
    setResults(null); setError(null);
    api<ResultsResponse>('/results', { method: 'POST', body: JSON.stringify(profile) }).then(setResults).catch(e => setError(String(e.message)));
  }, [profile]);

  // Accounts (CR-001): with no account (or no accounts on the server) everything below is skipped and the app behaves
  // exactly as before. With one, every save also goes to the account, and the account's copy is loaded on start,
  // unless a save never reached it (offline): then the phone's newer copy is pushed instead of being overwritten.
  const [me, setMe] = useState<{ username: string; role: MeResponse['role']; senior: MeResponse['senior']; contact: MeResponse['contact'] } | null>(null);
  const [checked, setChecked] = useState(false);              // CR-003: the account check has finished (no anonymous use)
  const [offline, setOffline] = useState(false);              // the check failed for lack of a connection, not for lack of an account
  const checkAccount = () => { setOffline(false); setChecked(false);
    fetchMe().then(m => m && adopt(m)).catch(() => setOffline(true)).finally(() => setChecked(true)); };
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
    setMe({ username: m.username, role: m.role, senior: m.senior, contact: m.contact });
    if (m.role !== 'STUDENT') { setOnboarded(); setOnb(true); return; }       // a senior's results (if any) stay on this phone
    const local = loadProfile();
    if (local && (isPendingSync() || !m.profile)) { void push(local, loadExtras()); return; }
    if (!m.profile) return;
    saveProfile(m.profile); saveExtras(m.extras); setProfile(m.profile); setExtras(m.extras);
    setOnboarded(); setOnb(true);
  };
  useEffect(checkAccount, []);   // once, on start   // eslint-disable-line react-hooks/exhaustive-deps

  const [path, arg] = route.split('/').filter(Boolean);
  const finishIntro = () => { setOnboarded(); setOnb(true); go('/signup'); };       // CR-003: an account comes first
  const onSave = (p: ProfileInput, e: Extras) => {
    saveProfile(p); saveExtras(e); setProfile(p); setExtras(e);
    if (me?.role === 'STUDENT') void push(p, e);
    go('/paths');
  };
  const reset = () => { clearEverything(); setListRaw([]); setCompareRaw([]); setSavedRaw([]); setMe(null); setProfile(null); setExtras({ achievements: [], interests: [] }); setOnb(false); go('/'); };
  const onClear = async () => { if (me) await logOut().catch(() => {}); reset(); };
  const account = {
    username: me?.username ?? null, senior: me?.senior ?? null, contact: me?.contact ?? null, syncNote,
    logOut: async () => { await logOut().catch(() => {}); setMe(null); },
    logOutEverywhere: async () => { await logOutEverywhere().catch(() => {}); setMe(null); },
    deleteAccount: async () => { await deleteAccount(); reset(); },
  };

  // Account screens: a focused flow with Back and no bottom navigation, reachable before and after onboarding.
  if (['signup', 'login', 'recover', 'saved-code'].includes(path)) {
    const [, , freshFlag] = route.split('/');                      // /saved-code/new: just signed up (not a reset)
    const titles: Record<string, string> = { signup: t('title.signup'), login: t('title.login'), recover: t('title.recover'), 'saved-code': t('title.savedCode') };
    const afterAuth = (fresh = false) => fetchMe().then(m => { if (m) adopt(m); go(m?.role === 'SENIOR' ? '/groups' : !fresh && loadProfile() ? '/paths' : '/about'); }).catch(() => go('/about'));
    return (
      <div className="shell">
        <header className="app-bar">
          {path !== 'saved-code' ? <button className="icon-btn" onClick={() => history.back()} aria-label={t('nav.back')}><ArrowLeft size={22} /></button> : <Logo size={32} />}
          <span className="brand">{titles[path]}</span>
        </header>
        <main><Page k={route}>{path === 'saved-code'
          ? (recovery ? <RecoveryCodeScreen username={recovery.username} code={recovery.code} onDone={() => { setRecovery(null); void afterAuth(freshFlag === 'new'); }} />
            : <div className="card"><p className="subtitle">{t('auth.codeGone')}</p></div>)
          : <AuthScreen mode={path as 'signup' | 'login' | 'recover'} profile={profile} extras={extras} go={go}
              onSignedUp={(username, code) => { setMe({ username, role: 'STUDENT', senior: null, contact: null }); setPendingSync(false); setRecovery({ username, code }); setOnboarded(); setOnb(true); go(path === 'signup' ? '/saved-code/new' : '/saved-code'); }}
              onLoggedIn={m => { adopt(m); setOnboarded(); setOnb(true); go(m.role === 'SENIOR' ? '/groups' : m.profile || loadProfile() ? '/paths' : '/about'); }} />}
        </Page></main>
      </div>);
  }

  // CR-003: every use needs an account. Until the check finishes, a blank shell; then sign-up (or log in) first, and an
  // account made before CR-003 completes its contact details before anything else.
  if (onboarded && !checked) return <div className="shell"><main><div className="skeleton" style={{ height: 200, marginTop: 24 }} /></main></div>;
  if (onboarded && !me && offline) return (
    <div className="shell"><main><div className="card stack" style={{ marginTop: 24 }}><p className="subtitle">{t('app.offline')}</p>
      <button className="btn filled" onClick={checkAccount}>{t('app.retry')}</button></div></main></div>);
  if (onboarded && !me) { go('/signup'); return null; }
  if (me && !me.contact || path === 'contact') return (
    <div className="shell">
      <header className="app-bar">
        {me?.contact ? <button className="icon-btn" onClick={() => history.back()} aria-label={t('nav.back')}><ArrowLeft size={22} /></button> : <Logo size={32} />}
        <span className="brand">{t('title.me')}</span>
      </header>
      <main><Page k="contact"><CompleteContactScreen initial={me?.contact ?? null} onDone={m => { adopt(m); go(me?.contact ? '/me' : loadProfile() || m.role === 'SENIOR' ? '/paths' : '/about'); }} /></Page></main>
    </div>);

  // First run
  if (!onboarded && path !== 'intro') return <div className="shell"><main><Welcome onStart={() => go('/intro')} onLogin={() => go('/login')} setLang={changeLang} /></main></div>;
  if (!onboarded && path === 'intro') return <div className="shell"><main><Intro onDone={finishIntro} /></main></div>;
  const SENIOR_OK = ['groups', 'group', 'ask', 'me', 'journey', 'alerts'];
  if (!profile && me?.role === 'SENIOR' && !SENIOR_OK.includes(path)) { go('/groups'); return null; }
  if ((!profile && me?.role !== 'SENIOR') || path === 'about') return (
    <div className="shell">
      <header className="app-bar">
        {profile ? <button className="icon-btn" onClick={() => history.back()} aria-label={t('nav.back')}><ArrowLeft size={22} /></button> : <Logo size={32} />}
        <span className="brand">{t('title.about')}</span>
      </header>
      <main><AboutFlow meta={meta} initial={profile} extrasInitial={extras} onSave={onSave} /></main>
    </div>);

  let screen: React.ReactNode, tab: 'paths' | 'list' | 'journey' | 'groups' | 'ask' | null = 'paths', title = 'ZedPath', back = false;
  if (path === 'courses' && profile) { back = true; title = t('title.courses'); screen = <Courses results={results} band={(arg?.toUpperCase() as Band) || 'SAFE'} go={go} listCount={list.length} />; }
  else if (path === 'compare' && profile) { tab = 'list'; back = true; title = t('title.compare'); screen = <CompareScreen codes={compare} setCodes={setCompare} profile={profile} results={results} list={list} go={go} />; }
  else if (path === 'list') { tab = 'list'; title = t('title.list'); screen = <MyListScreen list={list} setList={setList} results={results} go={go} />; }
  else if (path === 'journey') { tab = 'journey'; title = t('title.journey'); screen = <JourneyScreen data={journey} saved={saved} setSaved={setSaved} list={list} results={results} go={go} />; }
  else if (path === 'alerts') { tab = null; back = true; title = t('title.alerts'); screen = <AlertsScreen data={journey} profile={profile} dob={me?.contact?.birthDate ?? null} saved={saved} setSaved={setSaved} go={go} />; }
  else if (path === 'groups') { tab = 'groups'; title = t('title.groups'); screen = <GroupsScreen loggedIn={!!me} list={list} results={results} go={go} />; }
  else if (path === 'group' && arg && me) { tab = 'groups'; back = true; title = t('title.group'); screen = <GroupRoomScreen id={Number(arg)} username={me.username} go={go} />; }
  else if (path === 'course' && arg && profile) { tab = 'paths'; back = true; title = t('title.course'); screen = <DegreeDetails uniCode={arg} profile={profile} results={results} go={go} list={list} setList={setList} compare={compare} setCompare={setCompare} />; }
  else if (path === 'ask') { tab = 'ask'; title = t('title.ask'); screen = <AskScreen profile={profile} extras={extras} turns={askTurns} setTurns={setAskTurns}
    initialQuestion={arg ? decodeURIComponent(arg) : null} onConsumedInitial={() => history.replaceState(null, '', '#/ask')}
    ctx={{ results, list, setList, compare, setCompare, saved, setSaved, go }} />; }
  else if (path === 'hidden') { back = true; title = t('title.hidden'); screen = <Hidden results={results} />; }
  else if (path === 'routes' && arg) { back = true; title = t('title.routes'); screen = <RouteList group={arg as RouteSummary['group']} routes={routes} go={go} />; }
  else if (path === 'route' && arg) { back = true; title = t('title.route'); screen = <RouteDetail id={arg} routes={routes} />; }
  else if (path === 'me') { tab = null; back = true; title = t('title.me'); screen = <Me profile={profile} meta={meta} extras={extras} go={go} onClear={onClear} account={account} lang={lang} setLang={changeLang} />; }
  else if (!profile) { tab = 'groups'; title = t('title.groups'); screen = <GroupsScreen loggedIn={!!me} list={list} results={results} go={go} />; }
  else screen = <YourPaths meta={meta} profile={profile} extras={extras} results={results} routes={routes} error={error} go={go} listCount={list.length} />;

  const NAV: [NonNullable<typeof tab>, string, LucideIcon, string][] = [['paths', t('nav.paths'), MapIcon, '#/paths'], ['list', t('nav.list'), ListOrdered, '#/list'],
    ['journey', t('nav.journey'), CalendarDays, '#/journey'], ['groups', t('nav.groups'), Users, '#/groups'], ['ask', t('nav.ask'), Sparkles, '#/ask']];
  // The bell counts open notices the student has not opened yet and is not ruled out for (checked on this phone).
  const seen = loadAlertsSeen(), dob = me?.contact?.birthDate ?? null, day = today();
  const unread = (journey?.notices ?? []).filter(n => !seen.includes(n.routeId) && checkNotice(n, profile, dob, day).forYou).length;
  return (
    <div className="shell has-nav">
      <header className="app-bar">
        {back ? <button className="icon-btn" onClick={() => history.back()} aria-label={t('nav.back')}><ArrowLeft size={22} /></button> : <Logo size={32} />}
        <span className="brand">{title}</span>
        <a className="icon-btn bar-bell" href="#/alerts" aria-label={unread ? t('nav.alertsNew', { n: unread }) : t('nav.alerts')}><Bell size={22} aria-hidden="true" />
          {unread > 0 && <span className="badge num" aria-hidden="true">{unread}</span>}</a>
        <a className="avatar small" href="#/me" aria-label={t('nav.me')}>{me ? me.username.charAt(0).toUpperCase() : <UserRound size={20} aria-hidden="true" />}</a>
      </header>
      <main><ErrorBoundary resetKey={route}><Page k={route}>{screen}</Page></ErrorBoundary></main>
      <nav className="bottom-nav" aria-label={t('nav.main')}>
        {NAV.map(([key, label, Icon, href]) => (
          <a key={key} href={href} className={tab === key ? 'sel' : ''} aria-current={tab === key ? 'page' : undefined}>
            {tab === key && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <Icon size={22} strokeWidth={tab === key ? 2.4 : 2} aria-hidden="true" /><span>{label}</span>
            {key === 'list' && list.length > 0 && <span className="nav-count num" aria-label={t('nav.listCount', { n: list.length })}>{list.length}</span>}
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
          <span className="eyebrow">{t('paths.eyebrow')}</span>
          <h1>{c ? t('paths.reach', { n: c.SAFE + c.LIKELY + c.REACH }) : t('paths.checking')}</h1>
          <span className="meta">{profileLine(profile, meta)}</span>
        </div>
        {c ? (
          <div className="hero-body">
            <BandRing safe={c.SAFE} likely={c.LIKELY} reach={c.REACH} />
            <div className="ring-legend num">
              <span><i className="dot" style={{ background: '#3DDC97' }} /><b>{c.SAFE}</b>{t('band.SAFE')}</span>
              <span><i className="dot" style={{ background: '#9DB8FF' }} /><b>{c.LIKELY}</b>{t('band.LIKELY')}</span>
              <span><i className="dot" style={{ background: '#FFC94A' }} /><b>{c.REACH}</b>{t('band.REACH')}</span>
            </div>
          </div>) : !error && <div className="skeleton" style={{ height: 116, opacity: .25 }} />}
        <button className="btn white" onClick={() => go('/courses/safe')} disabled={!results}>{t('paths.see')}<ChevronRight size={18} aria-hidden="true" /></button>
      </section>
      {error && <div className="alert error" role="alert"><TriangleAlert size={20} aria-hidden="true" />{error}</div>}
      {hint.applies && <div className="alert gold"><Trophy size={20} aria-hidden="true" /><span>{t('paths.special', { sport: hint.sport ? t('paths.sport') : '' })}
        <span className="source" style={{ display: 'block', marginTop: 4, color: 'inherit', opacity: .75 }}>UGC handbook 2025/26, Section 6, p.166</span></span></div>}
      {results && results.hidden.length > 0 && (
        <button className="hidden-bar" onClick={() => go('/hidden')}><span>{t('paths.hidden', { n: results.hidden.length })}</span><span className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>{t('paths.seeWhy')}<ChevronRight size={16} aria-hidden="true" /></span></button>)}
      <button className="card list-entry" onClick={() => go('/list')}>
        <span className="ic" style={{ background: 'var(--likely-bg)', color: 'var(--likely)' }}><ListOrdered size={22} aria-hidden="true" /></span>
        <span className="grow"><span className="t">{t('paths.list')}</span><span className="s">{listCount ? (listCount === 1 ? t('paths.listOne') : t('paths.listSome', { n: listCount })) : t('paths.listNone')}</span></span>
        <ChevronRight size={20} className="chev" aria-hidden="true" />
      </button>
      <p className="section-label">{t('paths.other')}</p>
      <Stagger className="bento">
        {ROUTE_GROUPS.map(g => {
          const n = routes?.filter(r => r.group === g.code).length ?? 0;
          const open = routes?.filter(r => r.group === g.code && r.openNow).length ?? 0;
          const Icon = g.icon;
          return (
            <motion.button key={g.code} variants={rise} className="bento-tile" onClick={() => go(`/routes/${g.code}`)} disabled={!routes || n === 0}>
              <span className="ic" style={{ background: `color-mix(in srgb, ${g.tone} 14%, transparent)`, color: g.tone }}><Icon size={22} aria-hidden="true" /></span>
              {open > 0 ? <span className="pill open corner">{t('paths.open', { n: open })}</span> : n > 0 && <span className="pill band-NOT_ENOUGH_DATA corner num">{n}</span>}
              <span className="t">{t(`rg.${g.code}` as Key)}</span><span className="s">{t(`rg.${g.code}.sub` as Key)}</span>
            </motion.button>);
        })}
      </Stagger>
      {install.canInstall && <button className="btn tonal" onClick={install.prompt}><Download size={18} aria-hidden="true" />{t('paths.install')}</button>}
      <p className="footer-note">{t('paths.footer')}</p>
    </>
  );
}

// ---------------------------------------------------------------- Courses by band
function Courses({ results, band, go, listCount }: { results: ResultsResponse | null; band: Band; go: (to: string) => void; listCount: number }) {
  const tabs: Band[] = ['SAFE', 'LIKELY', 'REACH'];
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  // While searching, all three bands are searched at once (the band shows on each row's colour strip).
  const list = useMemo(() => (results?.offerings ?? []).filter(o => searching ? tabs.includes(o.band) && matches(query, o.course, o.institution, o.uniCode)
    : o.band === band).sort((a, b) => (b.gapToLatestE4 ?? 0) - (a.gapToLatestE4 ?? 0)), [results, band, query]);   // eslint-disable-line react-hooks/exhaustive-deps
  const total = results ? results.counts.SAFE + results.counts.LIKELY + results.counts.REACH : 0;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">{results ? t('courses.reach', { n: total }) : t('courses.checking')}</h1>
        <p className="subtitle">{t('courses.sorted')}</p>
        <button className="btn text" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => go('/list')}><ListOrdered size={18} aria-hidden="true" />{t('nav.list')}{listCount ? ` (${listCount})` : ''}</button>
        <button className="btn text" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => go('/compare')}><Scale size={18} aria-hidden="true" />{t('courses.compare')}</button>
      </div>
      <label className="search"><Search size={20} aria-hidden="true" /><input placeholder={t('courses.search')} value={query}
        onChange={e => setQuery(e.target.value)} aria-label={t('courses.searchAria')} enterKeyHint="search" /></label>
      {!searching && <div className="seg" role="tablist" aria-label={t('courses.band')}>
        {tabs.map(t => (
          <button key={t} role="tab" aria-selected={t === band} onClick={() => go(`/courses/${t.toLowerCase()}`)}>
            {t === band && <motion.span layoutId="seg-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <span>{bandLabel(t)}<span className="count num">{results?.counts[t] ?? '–'}</span></span>
          </button>))}
      </div>}
      {searching && results && <p className="helper" role="status">{t('courses.matches', { n: list.length, q: query.trim() })}</p>}
      {!results && <div className="stack">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton" />)}</div>}
      {results && list.length === 0 && <div className="card"><p className="subtitle">{searching ? t('courses.noSearch') : t('courses.noBand')}</p></div>}
      {list.length > 0 && (
        <Stagger key={searching ? 'search' : band} className="list-card" role="tabpanel">
          {list.map((o, i) => <CourseRow key={`${o.uniCode}-${o.group}`} o={o} animate={i < 14} onOpen={() => go(`/course/${o.uniCode}`)} />)}
        </Stagger>)}
      {results && <button className="hidden-bar" onClick={() => go('/hidden')}><span>{t('courses.hidden', { n: results.hidden.length })}</span><span className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>{t('paths.seeWhy')}<ChevronRight size={16} aria-hidden="true" /></span></button>}
    </>
  );
}

function CourseRow({ o, animate, onOpen }: { o: OfferingSummary; animate: boolean; onOpen: () => void }) {
  const gap = o.gapToLatestE4 === null ? '' : t('row.vsLast', { gap: formatGap(o.gapToLatestE4) });
  const span = o.limitedHistory ? (o.yearsUsed === 1 ? t('row.yrData') : t('row.yrsData', { n: o.yearsUsed }))
    : `${t('row.yrs', { n: o.yearsUsed })}${o.trend !== 'NO_TREND' ? ` · ${trendLabel(o.trend)}` : ''}`;
  return (
    <motion.button variants={animate ? rise : undefined} className="item" onClick={onOpen}>
      <span className={`strip ${o.band}`} aria-hidden="true" />
      <span className="grow">
        <span className="t">{titleCase(o.course)}{o.groupLabel ? ` (${o.group})` : ''}</span>
        <span className="s">{shortInstitution(o.institution)}</span>
        <span className="m">{[gap, span, o.hasAptitudeTest ? t('row.aptitude') : '', o.needsOl ? t('row.checkOl') : ''].filter(Boolean).join(' · ')}</span>
      </span>
      <span className="sr-only">{bandLabel(o.band)}</span>
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
      <button className="btn tonal" style={{ flex: 1 }} onClick={() => go('/list')}><ListOrdered size={18} aria-hidden="true" />{t('detail.onList', { n: list.findIndex(e => e.uniCode === d.uniCode) + 1 })}</button>
      <button className="btn text" onClick={() => setList(list.filter(e => e.uniCode !== d.uniCode))}>{t('detail.remove')}</button>
    </div>);
  const best = mine[0];                                     // FR-302: only offerings the results screen lists as eligible
  const add = () => {
    const r = addToList(list, { uniCode: d.uniCode, group: best?.group ?? 'ALL', course: titleCase(d.course), institution: shortInstitution(d.institution), band: best?.band ?? 'NOT_ENOUGH_DATA' }, !!best);
    if (r.ok) { setList(r.list); setNote(null); }
    else setNote(t(`detail.err.${r.reason}`));
  };
  return (
    <div className="stack" style={{ gap: 6 }}>
      <button className="btn filled" onClick={add} disabled={!best}><ListOrdered size={18} aria-hidden="true" />{best ? t('detail.add') : t('detail.notEligible')}</button>
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
          {mine.map(o => <span key={o.group} className={`pill band-${o.band}`}>{bandLabel(o.band)}{mine.length > 1 ? ` (${o.group})` : ''}</span>)}
          <span className="pill">{d.hasAptitudeTest ? t('detail.aptitude') : t('detail.noAptitude')}</span>
          {d.selectionBasis === 'MERIT_ONLY' && <span className="pill">{t('detail.merit')}</span>}
        </div>
        <h1>{titleCase(d.course)}</h1>
        <span className="meta">{shortInstitution(d.institution)}{d.duration ? ` · ${shortDuration(d.duration)}` : ''} · {d.uniCode}</span>
        <div className="compare num">
          <div><b>{formatZ(profile.zE4)}</b><span>{t('detail.yourZ')}</span></div>
          <div><b>{latest ? (latest.zE4 === null ? 'NQC' : formatZ(latest.zE4)) : '–'}</b><span>{t('detail.cutoff', { y: latest ? shortYear(latest.academicYear) : '' })}</span></div>
        </div>
      </section>

      <button className="btn tonal" onClick={() => go(`/ask/${encodeURIComponent(t('detail.explainQ', { course: titleCase(d.course), inst: shortInstitution(d.institution) }))}`)}>
        <Sparkles size={18} aria-hidden="true" />{t('detail.explain')}</button>
      <AddToList d={d} mine={mine} list={list} setList={setList} go={go} />
      {compare.includes(d.uniCode) || compare.length >= COMPARE_MAX
        ? <button className="btn tonal" onClick={() => go('/compare')}><Scale size={18} aria-hidden="true" />{compare.includes(d.uniCode) ? t('detail.compareNow', { n: compare.length }) : t('detail.compareFull', { n: COMPARE_MAX })}</button>
        : <button className="btn tonal" onClick={() => { setCompare([...compare, d.uniCode]); go('/compare'); }}>
            <Scale size={18} aria-hidden="true" />{compare.length ? (compare.length === 1 ? t('detail.compareOther') : t('detail.compareOthers', { n: compare.length })) : t('detail.compare')}</button>}
      <section className="card stack" aria-labelledby="needs-h">
        <h2 id="needs-h" className="title-l">{t('detail.needs')}</h2>
        <div className="needs">{[...d.needs, ...d.olNeeds].map((line, i) => (
          <span key={i} className={line.endsWith(':') ? 'group' : ''}>{line.trim()}</span>))}</div>
        <p className="section-label">{t('detail.have')}</p>
        <div className="have">{Object.entries(profile.al).map(([s, g]) => <span key={s}>{g} · {nameOf(s)}</span>)}</div>
        <details className="exact">
          <summary className="source-link"><ScrollText size={16} aria-hidden="true" />{t('detail.wording', { p: d.requirementCitation.page })}</summary>
          <p className="body-m">{d.requirementText}</p>
        </details>
      </section>
      {d.syllabus && <SyllabusCard s={d.syllabus} />}
      {d.ambiguousWording && <div className="alert warn"><Info size={20} aria-hidden="true" />{t('detail.ambiguous')}</div>}

      {d.groups.map(g => (
        <section key={g.code} className="card stack">
          <h2 className="title-l">{t('detail.cutoffs')}{d.groups.length > 1 ? ` · ${g.code}` : ''}</h2>
          <CutoffChart history={g.history} zE4={profile.zE4} />
          <details className="exact">
            <summary className="source-link">{t('detail.table')}</summary>
            <table className="table">
              <thead><tr><th scope="col">{t('detail.intake')}</th><th scope="col">{t('detail.minZ')}</th></tr></thead>
              <tbody>
                {g.history.map(h => <tr key={h.academicYear}><td>{h.academicYear}</td><td className="num">{h.zE4 === null ? t('detail.nqc') : formatZ(h.zE4)}</td></tr>)}
                <tr className="you"><td>{t('detail.you')}</td><td className="num">{formatZ(profile.zE4)}</td></tr>
              </tbody>
            </table>
          </details>
          <p className="source">{t('detail.sources', { s: [...new Set(g.history.map(h => `${h.citation.label} p.${h.citation.page}`))].join(' · ') })}</p>
        </section>
      ))}
      {d.otherRequirements && <div className="alert info"><Info size={20} aria-hidden="true" />{d.otherRequirements}</div>}
      <p className="footer-note">{t('detail.footer')}</p>
    </>
  );
}

// ---------------------------------------------------------------- Hidden courses
function Hidden({ results }: { results: ResultsResponse | null }) {
  if (!results) return <div className="skeleton" />;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">{t('hidden.h', { n: results.hidden.length })}</h1>
        <p className="subtitle">{t('hidden.sub')}</p>
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
        <div className="stack" style={{ gap: 2 }}><h1 className="screen-title">{t(`rg.${group}` as Key)}</h1><p className="subtitle">{t(`rg.${group}.sub` as Key)}</p></div>
      </div>
      <p className="helper"><ShieldCheck size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />{t('routes.checked')}</p>
      {!routes ? <div className="skeleton" /> : (
        <Stagger className="list-card">
          {list.map(r => (
            <motion.button variants={rise} key={r.id} className="item" onClick={() => go(`/route/${r.id}`)}>
              <span className="grow"><span className="t">{r.name}</span><span className="s">{r.provider}</span>
                {r.costText && <span className="m">{r.costText}</span>}</span>
              {r.openNow && <span className="pill open">{t('routes.open')}</span>}
              <ChevronRight size={20} className="chev" aria-hidden="true" />
            </motion.button>))}
        </Stagger>)}
    </>
  );
}

function RouteDetail({ id, routes }: { id: string; routes: RouteSummary[] | null }) {
  const r = routes?.find(x => x.id === id);
  if (!routes) return <div className="skeleton" />;
  if (!r) return <div className="alert error"><TriangleAlert size={20} aria-hidden="true" />{t('routes.notFound')}</div>;
  const g = ROUTE_GROUPS.find(x => x.code === r.group);
  return (
    <>
      <div className="stack" style={{ gap: 8 }}>
        <div className="row">{r.openNow && <span className="pill open">{t('routes.openNow')}</span>}<span className="pill band-LIKELY">{g ? t(`rg.${g.code}` as Key) : ''}</span></div>
        <h1 className="screen-title">{r.name}</h1><p className="subtitle">{r.provider}</p>
      </div>
      {(r.duration || r.costText) && (
        <div className="compare plain num">
          {r.duration && <div><b>{r.duration}</b><span>{t('routes.duration')}</span></div>}
          {r.costText && <div><b>{r.costText}</b><span>{t('routes.cost')}</span></div>}
        </div>)}
      {r.intakeTiming && <section className="card stack"><h2 className="title-l">{t('routes.when')}</h2><p className="body-m" style={{ margin: 0 }}>{r.intakeTiming}</p></section>}
      <section className="card stack">
        <h2 className="title-l">{t('routes.req')}</h2>
        <p className="body-m" style={{ margin: 0 }}>{r.requirements}</p>
        <p className="source">{t('routes.official', { s: r.sourceLocator, d: r.retrievedOn })}</p>
      </section>
      {r.warning && <div className="alert warn"><TriangleAlert size={20} aria-hidden="true" />{r.warning}</div>}
      {r.officialUrl && <a className="btn filled block" href={r.officialUrl} target="_blank" rel="noopener">{t('routes.site')}<ExternalLink size={18} aria-hidden="true" /></a>}
      <a className="btn text" href={r.sourceUrl} target="_blank" rel="noopener" style={{ alignSelf: 'center' }}>{t('routes.doc')}</a>
    </>
  );
}

// ---------------------------------------------------------------- Me
interface AccountControls { username: string | null; senior: MeResponse['senior']; contact: MeResponse['contact']; syncNote: string | null; logOut: () => Promise<void>;
  logOutEverywhere: () => Promise<void>; deleteAccount: () => Promise<void> }

function AccountCard({ account, go }: { account: AccountControls; go: (to: string) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  if (!account.username) return (
    <section className="card stack account-card">
      <h2 className="title-l">{t('acc.keep')}</h2>
      <p className="subtitle">{t('acc.keepSub')}</p>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <button className="btn filled" style={{ flex: 1 }} onClick={() => go('/signup')}>{t('acc.create')}</button>
        <button className="btn text" onClick={() => go('/login')}>{t('acc.login')}</button>
      </div>
    </section>);
  return (
    <section className="card stack account-card">
      <div className="row" style={{ flexWrap: 'nowrap', gap: 12 }}>
        <span className="avatar" aria-hidden="true">{account.username.charAt(0).toUpperCase()}</span>
        <span className="stack" style={{ gap: 0, minWidth: 0 }}>
          <span className="title-l" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.username}</span>
          <span className="helper"><CloudCheck size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />{t('acc.saved')}</span>
        </span>
      </div>
      {account.contact && (
        <div className="stack" style={{ gap: 2 }}>
          <span className="body-m"><b>{account.contact.fullName}</b></span>
          <span className="helper">{account.contact.email} · {account.contact.mobile}</span>
          <button className="btn text" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => go('/contact')}><Pencil size={16} aria-hidden="true" />{t('ct.edit')}</button>
        </div>)}
      {account.senior && <span className="pill band-SAFE" style={{ alignSelf: 'flex-start' }}><ShieldCheck size={13} aria-hidden="true" />{t('acc.senior', { course: titleCase(account.senior.course), inst: shortInstitution(account.senior.institution), y: account.senior.year })}</span>}
      {account.syncNote && <div className="alert info"><Info size={20} aria-hidden="true" />{account.syncNote}</div>}
      <div className="row">
        <button className="btn tonal" onClick={account.logOut}><LogOut size={18} aria-hidden="true" />{t('acc.logout')}</button>
        <button className="btn text" onClick={account.logOutEverywhere}>{t('acc.logoutAll')}</button>
      </div>
      {!confirming
        ? <button className="btn text" style={{ alignSelf: 'flex-start', color: 'var(--danger)' }} onClick={() => setConfirming(true)}><Trash2 size={18} aria-hidden="true" />{t('acc.delete')}</button>
        : <div className="alert error" role="alertdialog" aria-label={t('acc.confirmAria')}>
            <TriangleAlert size={20} aria-hidden="true" />
            <span className="stack" style={{ gap: 8 }}>
              <span>{t('acc.deleteWarn')}</span>
              <span className="row">
                <button className="btn filled danger" onClick={() => account.deleteAccount().catch(() => setFailed(t('acc.deleteFail')))}>{t('acc.deleteYes')}</button>
                <button className="btn text" onClick={() => setConfirming(false)}>{t('acc.deleteNo')}</button>
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
        {state === 'sending' ? t('me.sending') : t('me.test')}</button>
      {state === 'sent' && <p className="helper" role="status">{t('me.sent')}</p>}
      {!['idle', 'sending', 'sent'].includes(state) && <p className="helper" role="status">{state}</p>}
    </div>
  );
}

function Me({ profile, meta, extras, go, onClear, account, lang, setLang }: { profile: ProfileInput | null; meta: Meta | null; extras: Extras; go: (to: string) => void;
  onClear: () => void; account: AccountControls; lang: Lang; setLang: (l: Lang) => void }) {
  const install = useInstallPrompt();
  return (
    <>
      {profile && <section className="hero aurora" style={{ gap: 6 }}>
        <span className="eyebrow">{t('me.results')}</span>
        <h1 className="num">Z {formatZ(profile.zE4)}</h1>
        <span className="meta">{profileLine(profile, meta).split(' · ').slice(0, 2).join(' · ')}</span>
        <div className="row" style={{ marginTop: 8 }}>{Object.entries(profile.al).map(([s, g]) => <span key={s} className="pill">{g} · {nameOf(s)}</span>)}</div>
      </section>}
      <section className="card stack">
        <h2 className="title-l">{t('me.beyond')}</h2>
        {extras.achievements.length === 0 && extras.interests.length === 0 && <p className="subtitle">{t('me.nothing')}</p>}
        {extras.achievements.map(a => <span key={a.id} className="row body-m" style={{ flexWrap: 'nowrap' }}><Trophy size={18} aria-hidden="true" style={{ color: 'var(--reach)', flex: 'none' }} />{a.activity} · {t(`level.${a.level}`)} · {a.year}</span>)}
        {extras.interests.length > 0 && <div className="have">{extras.interests.map(i => <span key={i}>{t(`interest.${i}` as Key)}</span>)}</div>}
      </section>
      <button className="btn tonal" onClick={() => go('/about')}><Pencil size={18} aria-hidden="true" />{t('me.edit')}</button>
      <p className="section-label">{t('me.account')}</p>
      <AccountCard account={account} go={go} />
      <p className="section-label">{t('me.language')}</p>
      <div className="chips" role="radiogroup" aria-label={t('me.language')}>
        {LANGS.map(l => <button key={l.code} className="chip" role="radio" aria-checked={lang === l.code} lang={l.code} onClick={() => setLang(l.code)}>{l.name}</button>)}
      </div>
      <p className="helper">{t('lang.note')}</p>
      <p className="section-label">{t('me.app')}</p>
      {install.canInstall ? <button className="btn tonal" onClick={install.prompt}><Download size={18} aria-hidden="true" />{t('paths.install')}</button>
        : <p className="helper">{install.installed ? t('me.installed') : t('me.howInstall')}</p>}
      <TestNotification />
      <p className="section-label">{t('me.privacy')}</p>
      <p className="body-m muted" style={{ margin: 0 }}>{account.username ? t('me.privAccount') : t('me.privLocal')}</p>
      <button className="btn text" style={{ alignSelf: 'flex-start', color: 'var(--danger)' }} onClick={onClear}><Trash2 size={18} aria-hidden="true" />
        {account.username ? t('me.clearAccount') : t('me.clearLocal')}</button>
    </>
  );
}

// ---------------------------------------------------------------- helpers
function profileLine(p: ProfileInput, meta: Meta | null): string {
  const stream = meta?.streams.some(s => s.code === p.stream) ? t(`stream.${p.stream}` as Key) : p.stream;
  const district = titleCase(meta?.districts.find(d => d.code === p.district)?.name ?? p.district);
  return `${stream} · ${district} · Z ${formatZ(p.zE4)}`;
}
export { titleCase } from './format.ts';
