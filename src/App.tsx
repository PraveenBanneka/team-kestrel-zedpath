// ZedPath app shell, design v2. First run: Welcome -> Intro -> About you (5 steps). Then a floating bottom-navigation app:
// Paths (home) | My list | Journey | Groups | Ask, with Alerts (bell) and Me (avatar) in the top bar (CR-002).
// Routing via the URL hash so Back and deep links work.
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Search, ArrowLeft, Award, BookmarkCheck, BookmarkPlus, Building2, CalendarDays, Users, ChevronRight, CloudCheck, Download, ExternalLink, Info, Landmark, LogOut, Map as MapIcon, Pencil, Plane,
  ListOrdered, Scale, CheckCircle2, Circle, X, ScrollText, ShieldCheck, Sparkles, Trash2, TriangleAlert, Trophy, UserRound, Wrench, type LucideIcon } from 'lucide-react';
import type { Meta, OfferingDetail, ProfileInput, ResultsResponse, OfferingSummary, RouteSummary } from '../shared/api.ts';
import type { MeResponse } from '../shared/account.ts';
import type { Band } from '../shared/banding.ts';
import { formatGap, formatZ } from '../shared/banding.ts';
import { nameOf } from '../shared/describe.ts';
import { matches } from '../shared/search.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { AboutFlow, Intro, Logo, Welcome } from './screens/Onboarding.tsx';
import { DEMO_EXTRAS, DEMO_PROFILE, demoOn } from './demo.ts';
demoOn();                                                        // remember ?demo=kasun on first open (the installed app opens without it)
import { AuthScreen, CompleteContactScreen, RecoveryCodeScreen } from './screens/Account.tsx';
import { deleteAccount, fetchJourney, fetchMe, followCourse as apiFollowCourse, followNotice as apiFollowNotice, logOut, logOutEverywhere, markApplied, markStep,
  saveAvatar, saveMe, SESSION_LOST, demoLogin } from './account.ts';
import { AVATAR_CODES, PersonAvatar } from './avatars.tsx';
import type { JourneyStepId, MyJourney } from '../shared/journey.ts';
import { AskScreen, type AskTurn } from './screens/Ask.tsx';
import { MyListScreen } from './screens/MyList.tsx';
import { JourneyScreen, longDate, today, type JourneyOps } from './screens/Journey.tsx';
import { GroupInfoScreen, GroupRoomScreen, GroupsScreen } from './screens/Groups.tsx';
import { checkNotice, type JourneyResponse } from '../shared/journey.ts';
import { COMPARE_MAX, CompareScreen } from './screens/Compare.tsx';
import { SyllabusCard } from './screens/Syllabus.tsx';
import { addManyToList, addToList, type ListEntry } from '../shared/list.ts';
import { loadNotifyPrefs, saveNotifyPrefs, loadOwner, setOwner, clearStudentData } from './storage.ts';
import type { NotifyPrefs } from '../shared/journey.ts';
import { clearEverything, loadAlertsSeen, loadJourney, saveJourney, isOnboarded, clearOnboarded, isPendingSync, loadCompare, loadList, saveCompare, saveList, loadExtras, loadProfile, saveExtras, saveProfile, setOnboarded, setPendingSync,
  specialIntakeHint, type Extras } from './storage.ts';
import { useInstallPrompt } from './pwa.ts';
import { shortDuration, shortInstitution, shortYear, titleCase } from './format.ts';
import { BandRing, CutoffChart, Page, Stagger, rise } from './ui.tsx';
import { LANGS, locale, setLang as applyLang, t, type Key, type Lang } from './i18n/index.ts';
import type { InstitutionFact } from '../shared/statistics.ts';
import type { AptitudeNotice } from '../shared/api.ts';
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
  const [my, setMy] = useState<MyJourney | null>(null);
  const [jNote, setJNote] = useState<string | null>(null);
  const [prefs, setPrefsRaw] = useState<NotifyPrefs>(() => loadNotifyPrefs());
  const setPrefs = (p: NotifyPrefs) => { saveNotifyPrefs(p); setPrefsRaw(p); };
  useEffect(() => {                                                    // FR-105: recalculate whenever the profile changes
    if (!profile) { setResults(null); return; }
    setResults(null); setError(null);
    api<ResultsResponse>('/results', { method: 'POST', body: JSON.stringify(profile) }).then(setResults).catch(e => setError(String(e.message)));
  }, [profile]);

  // Accounts (CR-001): with no account (or no accounts on the server) everything below is skipped and the app behaves
  // exactly as before. With one, every save also goes to the account, and the account's copy is loaded on start,
  // unless a save never reached it (offline): then the phone's newer copy is pushed instead of being overwritten.
  const [me, setMe] = useState<{ username: string; role: MeResponse['role']; senior: MeResponse['senior']; contact: MeResponse['contact']; avatar: MeResponse['avatar']; demo?: boolean } | null>(null);
  const [checked, setChecked] = useState(false);              // CR-003: the account check has finished (no anonymous use)
  const meRef = useRef(me); meRef.current = me;
  // The server dropped this phone's session (e.g. logged out on all devices, account deleted): forget it and go to Log in.
  useEffect(() => {
    const lost = () => { if (meRef.current) { setMe(null); go('/login'); } };
    addEventListener(SESSION_LOST, lost); return () => removeEventListener(SESSION_LOST, lost);
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
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
    // Audit lead 7: a different student logging in on this phone never inherits the previous student's local data.
    const owner = loadOwner();
    if (owner && owner !== m.username) { clearStudentData(); setProfile(null); setExtras({ achievements: [], interests: [] }); setListRaw([]); setCompareRaw([]); }
    setOwner(m.username);
    setMe({ username: m.username, role: m.role, senior: m.senior, contact: m.contact, avatar: m.avatar, demo: m.demo });
    if (m.role !== 'STUDENT') { setOnboarded(); setOnb(true); return; }       // a senior's results (if any) stay on this phone
    const local = loadProfile();
    if (local && (isPendingSync() || !m.profile)) { void push(local, loadExtras()); return; }
    if (!m.profile) return;
    saveProfile(m.profile); saveExtras(m.extras); setProfile(m.profile); setExtras(m.extras);
    setOnboarded(); setOnb(true);
  };
  useEffect(checkAccount, []);   // once, on start   // eslint-disable-line react-hooks/exhaustive-deps

  const [path, arg, sub] = route.split('/').filter(Boolean);

  // CR-006: the Journey is saved on the account. On first load, notices followed on this phone before CR-006 are copied
  // to the account once, then the phone's copy is cleared. Each change is shown at once and undone if saving fails.
  useEffect(() => {
    if (!me) { setMy(null); return; }
    let live = true;
    fetchJourney().then(async j => {
      const local = loadJourney(), add = local.filter(r => !j.notices.some(n => n.routeId === r));
      for (const r of add) await apiFollowNotice(r, true).catch(() => {});
      if (local.length) saveJourney([]);
      const fresh = add.length ? await fetchJourney() : j;
      if (live) setMy(fresh);
    }).catch(() => { if (live) setMy({ courses: [], notices: [], steps: [] }); });
    return () => { live = false; };
  }, [me?.username]);   // eslint-disable-line react-hooks/exhaustive-deps
  const mutate = (change: (j: MyJourney) => MyJourney, save: () => Promise<unknown>) => {
    if (!my) return;
    const before = my; setMy(change(before)); setJNote(null);
    save().catch(e => { setMy(before); setJNote((e as Error).message); });
  };
  const now = () => new Date().toISOString();
  const ops: JourneyOps = {
    my, note: jNote,
    setStep: (id: JourneyStepId, done: boolean) => mutate(j => ({ ...j, steps: done ? [...j.steps.filter(s => s.stepId !== id), { stepId: id, doneAt: now() }]
      : j.steps.filter(s => s.stepId !== id) }), () => markStep(id, done)),
    setApplied: (r, applied) => mutate(j => ({ ...j, notices: j.notices.map(n => n.routeId === r ? { ...n, appliedAt: applied ? now() : null } : n) }), () => markApplied(r, applied)),
    followNotice: (r, on) => mutate(j => ({ ...j, notices: on ? (j.notices.some(n => n.routeId === r) ? j.notices : [...j.notices, { routeId: r, followedAt: now(), appliedAt: null }])
      : j.notices.filter(n => n.routeId !== r) }), () => apiFollowNotice(r, on)),
    followCourse: (u, on) => mutate(j => ({ ...j, courses: on ? (j.courses.some(c => c.uniCode === u) ? j.courses : [...j.courses, { uniCode: u, followedAt: now() }])
      : j.courses.filter(c => c.uniCode !== u) }), () => apiFollowCourse(u, on)),
  };
  const saved = my?.notices.map(n => n.routeId) ?? [];
  const setSaved = (ids: string[]) => {
    for (const r of ids.filter(x => !saved.includes(x))) ops.followNotice(r, true);
    for (const r of saved.filter(x => !ids.includes(x))) ops.followNotice(r, false);
  };
  // CR-003: an account comes first. The phone counts as onboarded only once it signs up or logs in (onSignedUp/onLoggedIn),
  // so Back from Create account returns to the Welcome screen instead of being sent straight back to sign-up.
  const finishIntro = () => go('/signup');
  const onSave = (p: ProfileInput, e: Extras) => {
    saveProfile(p); saveExtras(e); setProfile(p); setExtras(e);
    if (me?.role === 'STUDENT') void push(p, e);
    go('/paths');
  };
  const reset = () => { clearEverything(); setListRaw([]); setCompareRaw([]); setMy(null); setMe(null); setProfile(null); setExtras({ achievements: [], interests: [] }); setOnb(false); go('/'); };
  const onClear = async () => { if (me) await logOut().catch(() => {}); reset(); };
  const account = {
    username: me?.username ?? null, demo: !!me?.demo, avatar: me?.avatar ?? null, senior: me?.senior ?? null, contact: me?.contact ?? null, syncNote,
    logOut: async () => { await logOut(); setMe(null); },                       // audit lead 6: a failure is reported to the student
    logOutEverywhere: async () => { await logOutEverywhere(); setMe(null); },
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
          {path !== 'saved-code' ? <button className="icon-btn" onClick={() => { if (me || path === 'recover') { history.back(); return; } clearOnboarded(); setOnb(false); go('/'); }} aria-label={t('nav.back')}><ArrowLeft size={22} /></button> : <Logo size={32} />}
          <span className="brand">{titles[path]}</span>
        </header>
        <main><Page k={route}>{path === 'saved-code'
          ? (recovery ? <RecoveryCodeScreen username={recovery.username} code={recovery.code} onDone={() => { setRecovery(null); void afterAuth(freshFlag === 'new'); }} />
            : <div className="card"><p className="subtitle">{t('auth.codeGone')}</p></div>)
          : <AuthScreen mode={path as 'signup' | 'login' | 'recover'} profile={profile} extras={extras} go={go}
              onSignedUp={(username, code) => { setMe({ username, role: 'STUDENT', senior: null, contact: null, avatar: null }); setPendingSync(false); setRecovery({ username, code }); setOnboarded(); setOnb(true); go(path === 'signup' ? '/saved-code/new' : '/saved-code'); }}
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
  if (!onboarded && path !== 'intro') return <div className="shell"><main><Welcome onStart={() => go('/intro')} onLogin={() => go('/login')} setLang={changeLang}
    onDemo={() => demoLogin().then(m => { adopt(m); setOnboarded(); setOnb(true); go('/paths'); })} /></main></div>;
  if (!onboarded && path === 'intro') return <div className="shell"><main><Intro onDone={finishIntro} /></main></div>;
  const SENIOR_OK = ['groups', 'group', 'ask', 'me', 'journey', 'alerts'];
  if (!profile && me?.role === 'SENIOR' && !SENIOR_OK.includes(path)) { go('/groups'); return null; }
  if ((!profile && me?.role !== 'SENIOR') || path === 'about') return (
    <div className="shell">
      <header className="app-bar">
        {profile ? <button className="icon-btn" onClick={() => history.back()} aria-label={t('nav.back')}><ArrowLeft size={22} /></button> : <Logo size={32} />}
        <span className="brand">{t('title.about')}</span>
      </header>
      <main><AboutFlow meta={meta} initial={profile ?? (demoOn() ? DEMO_PROFILE : null)}
        extrasInitial={!profile && demoOn() && !extras.achievements.length && !extras.interests.length ? DEMO_EXTRAS : extras} onSave={onSave} /></main>
    </div>);

  // The Journey tab counts open notices the student has not seen yet and is not ruled out for (checked on this phone).
  const seen = loadAlertsSeen(), dob = me?.contact?.birthDate ?? null, day = today();
  const unread = !prefs.badge ? 0 : (journey?.notices ?? []).filter(n => !seen.includes(n.routeId) && checkNotice(n, profile, dob, day).forYou).length;
  let screen: React.ReactNode, tab: 'paths' | 'list' | 'journey' | 'groups' | 'ask' | null = 'paths', title = 'ZedPath', back = false;
  if (path === 'courses' && profile) { back = true; title = t('title.courses'); screen = <Courses results={results} band={(arg?.toUpperCase() as Band) || 'SAFE'} go={go} list={list} setList={setList} setCompare={setCompare} />; }
  else if (path === 'compare' && profile) { tab = 'list'; back = true; title = t('title.compare'); screen = <CompareScreen codes={compare} setCodes={setCompare} profile={profile} results={results} list={list} go={go} />; }
  else if (path === 'list') { tab = 'list'; title = t('title.list'); screen = <MyListScreen list={list} setList={setList} results={results} go={go} setCompare={setCompare} />; }
  else if (path === 'journey' || path === 'alerts') { tab = 'journey'; title = t('title.journey');
    screen = <JourneyScreen tab={path === 'alerts' || arg === 'open' ? 'open' : 'steps'} data={journey} ops={ops} list={list} compare={compare} profile={profile}
      results={results} prefs={prefs} dob={me?.contact?.birthDate ?? null} unread={unread} go={go} />; }
  else if (path === 'groups') { tab = 'groups'; title = t('title.groups'); screen = <GroupsScreen loggedIn={!!me} list={list} results={results} go={go} />; }
  else if (path === 'group' && arg && sub === 'info' && me) { tab = 'groups'; back = true; title = t('gi.info'); screen = <GroupInfoScreen id={Number(arg)} username={me.username} go={go} />; }
  else if (path === 'group' && arg && me) { tab = 'groups'; back = true; title = t('title.group'); screen = <GroupRoomScreen id={Number(arg)} username={me.username} go={go} />; }
  else if (path === 'course' && arg && profile) { tab = 'paths'; back = true; title = t('title.course'); screen = <DegreeDetails uniCode={arg} profile={profile} results={results} go={go} list={list} setList={setList} compare={compare} setCompare={setCompare}
    following={!!my?.courses.some(c => c.uniCode === arg)} onFollow={me ? on => ops.followCourse(arg, on) : null} />; }
  else if (path === 'ask') { tab = 'ask'; title = t('title.ask'); screen = <AskScreen profile={profile} extras={extras} turns={askTurns} setTurns={setAskTurns}
    initialQuestion={arg ? decodeURIComponent(arg) : null} onConsumedInitial={() => history.replaceState(null, '', '#/ask')}
    ctx={{ results, list, setList, compare, setCompare, saved, setSaved, go }} />; }
  else if (path === 'hidden') { back = true; title = t('title.hidden'); screen = <Hidden results={results} />; }
  else if (path === 'routes' && arg) { back = true; title = t('title.routes'); screen = <RouteList group={arg as RouteSummary['group']} routes={routes} go={go} />; }
  else if (path === 'route' && arg) { back = true; title = t('title.route'); screen = <RouteDetail id={arg} routes={routes} following={saved.includes(arg)} onFollow={me ? on => ops.followNotice(arg, on) : null} />; }
  else if (path === 'me') { tab = null; back = true; title = t('title.me'); screen = <Me profile={profile} meta={meta} extras={extras} go={go} onClear={onClear} account={account} lang={lang} setLang={changeLang} prefs={prefs} setPrefs={setPrefs}
    avatar={me?.avatar ?? null} setAvatar={me ? a => saveAvatar(a).then(adopt) : null} />; }
  else if (!profile) { tab = 'groups'; title = t('title.groups'); screen = <GroupsScreen loggedIn={!!me} list={list} results={results} go={go} />; }
  else screen = <YourPaths meta={meta} profile={profile} extras={extras} results={results} routes={routes} error={error} go={go} listCount={list.length} />;

  const NAV: [NonNullable<typeof tab>, string, LucideIcon, string][] = [['paths', t('nav.paths'), MapIcon, '#/paths'], ['list', t('nav.list'), ListOrdered, '#/list'],
    ['journey', t('nav.journey'), CalendarDays, '#/journey'], ['groups', t('nav.groups'), Users, '#/groups'], ['ask', t('nav.ask'), Sparkles, '#/ask']];
  return (
    <div className="shell has-nav">
      <header className="app-bar">
        {back ? <button className="icon-btn" onClick={() => history.back()} aria-label={t('nav.back')}><ArrowLeft size={22} /></button> : <Logo size={32} />}
        <span className="brand">{title}</span>
        <a className="avatar small plain" href="#/me" aria-label={t('nav.me')}>{me ? <PersonAvatar avatar={me.avatar} name={me.username} size={36} /> : <UserRound size={20} aria-hidden="true" />}</a>
      </header>
      {/* The three Courses tabs are one screen, so a selection survives switching Safe / Likely / Reach (Praveen 2026-10-14). */}
      <main><ErrorBoundary resetKey={route}><Page k={path === 'courses' ? 'courses' : route}>{screen}</Page></ErrorBoundary></main>
      <nav className="bottom-nav" aria-label={t('nav.main')}>
        {NAV.map(([key, label, Icon, href]) => (
          <a key={key} href={href} className={tab === key ? 'sel' : ''} aria-current={tab === key ? 'page' : undefined}>
            {tab === key && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            <Icon size={22} strokeWidth={tab === key ? 2.4 : 2} aria-hidden="true" /><span>{label}</span>
            {key === 'list' && list.length > 0 && <span className="nav-count num" aria-label={t('nav.listCount', { n: list.length })}>{list.length}</span>}
            {key === 'journey' && unread > 0 && <span className="nav-count num" aria-label={t('nav.alertsNew', { n: unread })}>{unread}</span>}
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
        <button className="hidden-bar" onClick={() => go('/hidden')}><span>{t('paths.hidden', { n: results.hidden.length })}</span><span className="row see-why">{t('paths.seeWhy')}<ChevronRight size={16} aria-hidden="true" /></span></button>)}
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
function Courses({ results, band, go, list, setList, setCompare }: { results: ResultsResponse | null; band: Band; go: (to: string) => void; list: ListEntry[];
  setList: (l: ListEntry[]) => void; setCompare: (c: string[]) => void }) {
  const tabs: Band[] = ['SAFE', 'LIKELY', 'REACH'];
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[] | null>(null);          // null = not selecting; else the Uni-Codes picked
  const [note, setNote] = useState<string | null>(null);
  const onList = (u: string) => list.some(e => e.uniCode === u);
  const toggle = (u: string) => setPicked(p => p === null ? [u] : p.includes(u) ? p.filter(x => x !== u) : [...p, u]);
  const addPicked = () => {
    const chosen = (picked ?? []).map(u => results?.offerings.find(o => o.uniCode === u)).filter(Boolean) as OfferingSummary[];
    const r = addManyToList(list, chosen.map(o => ({ uniCode: o.uniCode, group: o.group, course: titleCase(o.course), institution: shortInstitution(o.institution), band: o.band })));
    setList(r.list); setPicked(null);
    setNote([r.added === 1 ? t('sel.addedOne') : t('sel.added', { n: r.added }), r.already ? t('sel.already', { n: r.already }) : '', r.full ? t('detail.err.FULL') : ''].filter(Boolean).join(' '));
  };
  const searching = query.trim() !== '';
  // While searching, all three bands are searched at once (the band shows on each row's colour strip).
  const shown = useMemo(() => (results?.offerings ?? []).filter(o => searching ? tabs.includes(o.band) && matches(query, o.course, o.institution, o.uniCode)
    : o.band === band).sort((a, b) => (b.gapToLatestE4 ?? 0) - (a.gapToLatestE4 ?? 0)), [results, band, query]);   // eslint-disable-line react-hooks/exhaustive-deps
  const total = results ? results.counts.SAFE + results.counts.LIKELY + results.counts.REACH : 0;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">{results ? t('courses.reach', { n: total }) : t('courses.checking')}</h1>
        <p className="subtitle">{t('courses.sorted')}</p>
        <div className="row" style={{ gap: 4 }}>
          <button className="btn text" style={{ paddingLeft: 0 }} onClick={() => go('/compare')}><Scale size={18} aria-hidden="true" />{t('courses.compare')}</button>
          <button className="btn text" onClick={() => { setNote(null); setPicked(p => p === null ? [] : null); }} aria-pressed={picked !== null}>
            <CheckCircle2 size={18} aria-hidden="true" />{picked === null ? t('sel.select') : t('sel.cancel')}</button>
        </div>
        {picked === null && results && <p className="helper">{t('sel.tip')}</p>}
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
      {!searching && <p className="helper band-hint">{t(`bandHint.${band}` as Key)}</p>}
      {searching && results && <p className="helper" role="status">{t('courses.matches', { n: shown.length, q: query.trim() })}</p>}
      {note && <p className="helper" role="status">{note} <button className="btn text small" onClick={() => go('/list')}>{t('sel.openList')}</button></p>}
      {!results && <div className="stack">{[0, 1, 2, 3].map(i => <div key={i} className="skeleton" />)}</div>}
      {results && shown.length === 0 && <div className="card"><p className="subtitle">{searching ? t('courses.noSearch') : t('courses.noBand')}</p></div>}
      {shown.length > 0 && (
        <Stagger key={searching ? 'search' : band} className="list-card" role="tabpanel">
          {shown.map((o, i) => <CourseRow key={`${o.uniCode}-${o.group}`} o={o} animate={i < 14} onOpen={() => go(`/course/${o.uniCode}`)}
            selecting={picked !== null} selected={!!picked?.includes(o.uniCode)} listed={onList(o.uniCode)} onPick={() => { setNote(null); toggle(o.uniCode); }} />)}
        </Stagger>)}
      {picked !== null && (
        <div className="select-bar" role="region" aria-label={t('sel.bar')}>
          <span className="grow"><span className="sel-badge num" role="status" aria-label={t('sel.count', { n: picked.length })}>{picked.length}</span></span>
          <button className="icon-btn" onClick={() => setPicked(null)} aria-label={t('sel.cancel')}><X size={20} /></button>
          <button className="btn tonal small" disabled={picked.length === 0} onClick={() => { setCompare(picked.slice(0, COMPARE_MAX)); go('/compare'); }}>
            <Scale size={16} aria-hidden="true" />{t('sel.compare')}</button>
          <button className="btn filled small" disabled={picked.length === 0} onClick={addPicked}><ListOrdered size={16} aria-hidden="true" />{t('sel.add')}</button>
        </div>)}
      {results && <button className="hidden-bar" onClick={() => go('/hidden')}><span>{t('courses.hidden', { n: results.hidden.length })}</span><span className="row see-why">{t('paths.seeWhy')}<ChevronRight size={16} aria-hidden="true" /></span></button>}
    </>
  );
}

/** A course in the list. Tap opens it; press and hold (or "Select") starts choosing several; while choosing, tap ticks. */
function CourseRow({ o, animate, onOpen, selecting = false, selected = false, listed = false, onPick }: { o: OfferingSummary; animate: boolean; onOpen: () => void;
  selecting?: boolean; selected?: boolean; listed?: boolean; onPick?: () => void }) {
  const hold = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const start = (e: React.PointerEvent) => {
    if (!onPick) return;
    const h = { timer: 0, x: e.clientX, y: e.clientY, fired: false };
    h.timer = window.setTimeout(() => { h.fired = true; onPick(); navigator.vibrate?.(15); }, 450);
    hold.current = h;
  };
  const moved = (e: React.PointerEvent) => { const h = hold.current; if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > 10) { clearTimeout(h.timer); hold.current = null; } };
  const end = () => { if (hold.current && !hold.current.fired) clearTimeout(hold.current.timer); };
  const click = () => { if (hold.current?.fired) { hold.current = null; return; } hold.current = null; if (selecting && onPick) onPick(); else onOpen(); };
  const gap = o.gapToLatestE4 === null ? '' : t('row.vsLast', { gap: formatGap(o.gapToLatestE4) });
  const span = o.limitedHistory ? (o.yearsUsed === 1 ? t('row.yrData') : t('row.yrsData', { n: o.yearsUsed }))
    : `${t('row.yrs', { n: o.yearsUsed })}${o.trend !== 'NO_TREND' ? ` · ${trendLabel(o.trend)}` : ''}`;
  return (
    <motion.button variants={animate ? rise : undefined} className={`item ${selected ? 'picked' : ''}`} onClick={click} onPointerDown={start} onPointerMove={moved}
      onPointerUp={end} onPointerCancel={end} onContextMenu={e => { if (onPick) e.preventDefault(); }} aria-pressed={selecting ? selected : undefined}>
      <span className={`strip ${o.band}`} aria-hidden="true" />
      {selecting && (selected ? <CheckCircle2 size={22} className="pick-ic on" aria-hidden="true" /> : <Circle size={22} className="pick-ic" aria-hidden="true" />)}
      <span className="grow">
        <span className="t">{titleCase(o.course)}{o.groupLabel ? ` (${o.group})` : ''}</span>
        <span className="s">{shortInstitution(o.institution)}</span>
        <span className="m">{[listed ? t('sel.onList') : '', gap, span, o.hasAptitudeTest ? t('row.aptitude') : '', o.needsOl ? t('row.checkOl') : ''].filter(Boolean).join(' · ')}</span>
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

function DegreeDetails({ uniCode, profile, results, go, list, setList, compare, setCompare, following, onFollow }: { uniCode: string; profile: ProfileInput; results: ResultsResponse | null;
  go: (to: string) => void; list: ListEntry[]; setList: (l: ListEntry[]) => void; compare: string[]; setCompare: (c: string[]) => void;
  following: boolean; onFollow: ((on: boolean) => void) | null }) {
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
      {onFollow && <button className="btn tonal" aria-pressed={following} onClick={() => onFollow(!following)}>
        {following ? <><BookmarkCheck size={18} aria-hidden="true" />{t('jt.followingCourse')}</> : <><BookmarkPlus size={18} aria-hidden="true" />{t('jt.followCourse')}</>}</button>}
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
      {d.aptitude && <AptitudeCard a={d.aptitude} />}
      {d.facts.length > 0 && <FactsCard facts={d.facts} />}
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

function RouteDetail({ id, routes, following, onFollow }: { id: string; routes: RouteSummary[] | null; following: boolean; onFollow: ((on: boolean) => void) | null }) {
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
      {onFollow && <button className="btn tonal" aria-pressed={following} onClick={() => onFollow(!following)}>
        {following ? <><BookmarkCheck size={18} aria-hidden="true" />{t('jt.following1')}</> : <><BookmarkPlus size={18} aria-hidden="true" />{t('jt.follow')}</>}</button>}
      {r.officialUrl && <a className="btn filled block" href={r.officialUrl} target="_blank" rel="noopener">{t('routes.site')}<ExternalLink size={18} aria-hidden="true" /></a>}
      <a className="btn text" href={r.sourceUrl} target="_blank" rel="noopener" style={{ alignSelf: 'center' }}>{t('routes.doc')}</a>
    </>
  );
}

// ---------------------------------------------------------------- Me
interface AccountControls { username: string | null; demo: boolean; avatar: string | null; senior: MeResponse['senior']; contact: MeResponse['contact']; syncNote: string | null; logOut: () => Promise<void>;
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
        <PersonAvatar avatar={account.avatar} name={account.username} size={46} />
        <span className="stack" style={{ gap: 0, minWidth: 0 }}>
          <span className="title-l" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.username}</span>
          {account.demo && <span className="helper">{t('acc.demo')}</span>}
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
        <button className="btn tonal" onClick={() => account.logOut().catch(() => setFailed(t('acc.logoutFail')))}><LogOut size={18} aria-hidden="true" />{t('acc.logout')}</button>
        <button className="btn text" onClick={() => account.logOutEverywhere().catch(() => setFailed(t('acc.logoutFail')))}>{t('acc.logoutAll')}</button>
      </div>
      {failed && !confirming && <p className="alert error" role="alert">{failed}</p>}
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

/** Notification settings (video 2): which reminders, at what time, and the new-alert count on the bell. On this phone. */
function NotificationSettings({ prefs, setPrefs }: { prefs: NotifyPrefs; setPrefs: (p: NotifyPrefs) => void }) {
  const Toggle = ({ k, label, sub }: { k: 'week' | 'day' | 'badge'; label: string; sub?: string }) => (
    <label className="setting">
      <span className="grow"><span className="t">{label}</span>{sub && <span className="s">{sub}</span>}</span>
      <input type="checkbox" role="switch" className="switch" checked={prefs[k]} onChange={e => setPrefs({ ...prefs, [k]: e.target.checked })} />
    </label>);
  return (
    <section className="card stack" style={{ gap: 4 }} aria-labelledby="notif-h">
      <h2 id="notif-h" className="title-l">{t('ns.h')}</h2>
      <p className="helper">{t('ns.sub')}</p>
      <Toggle k="week" label={t('ns.week')} />
      <Toggle k="day" label={t('ns.day')} />
      <div className="setting">
        <span className="grow"><span className="t">{t('ns.time')}</span></span>
        <div className="seg small" role="radiogroup" aria-label={t('ns.time')}>
          {([8, 18] as const).map(h => <button key={h} role="radio" aria-checked={prefs.hour === h} className={prefs.hour === h ? 'on' : ''} onClick={() => setPrefs({ ...prefs, hour: h })}>
            {h === 8 ? t('ns.morning') : t('ns.evening')}</button>)}
        </div>
      </div>
      <Toggle k="badge" label={t('ns.badge')} sub={t('ns.badgeSub')} />
      {!prefs.week && !prefs.day && <p className="helper" role="status">{t('ns.noneOn')}</p>}
    </section>);
}

/** CR-006: choose a preset profile picture (no photo upload). */
function AvatarPicker({ avatar, name, setAvatar }: { avatar: string | null; name: string; setAvatar: (a: string | null) => Promise<unknown> }) {
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null);
  const pick = async (a: string | null) => { setBusy(true); setErr(null); try { await setAvatar(a); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return (
    <section className="card stack" aria-labelledby="av-h">
      <div className="row" style={{ flexWrap: 'nowrap', gap: 12 }}>
        <PersonAvatar avatar={avatar} name={name} size={56} />
        <span className="stack" style={{ gap: 2 }}><h2 id="av-h" className="title-l" style={{ margin: 0 }}>{t('av.h')}</h2><span className="helper">{t('av.sub')}</span></span>
      </div>
      <div className="avatar-grid" role="radiogroup" aria-label={t('av.h')}>
        <button type="button" role="radio" aria-checked={avatar === null} disabled={busy} onClick={() => void pick(null)} aria-label={t('av.initials')}>
          <PersonAvatar avatar={null} name={name} size={44} /></button>
        {AVATAR_CODES.map(a => <button key={a} type="button" role="radio" aria-checked={avatar === a} disabled={busy} onClick={() => void pick(a)}
          aria-label={t('av.one', { n: Number(a.slice(1)) })}><PersonAvatar avatar={a} name={name} size={44} /></button>)}
      </div>
      {err && <p className="helper" role="status">{err}</p>}
    </section>);
}

function Me({ profile, meta, extras, go, onClear, account, lang, setLang, prefs, setPrefs, avatar, setAvatar }: { profile: ProfileInput | null; meta: Meta | null; extras: Extras; go: (to: string) => void;
  onClear: () => void; account: AccountControls; lang: Lang; setLang: (l: Lang) => void; prefs: NotifyPrefs; setPrefs: (p: NotifyPrefs) => void;
  avatar: string | null; setAvatar: ((a: string | null) => Promise<unknown>) | null }) {
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
      {setAvatar && account.username && <AvatarPicker avatar={avatar} name={account.username} setAvatar={setAvatar} />}
      <AccountCard account={account} go={go} />
      <p className="section-label">{t('me.language')}</p>
      <div className="chips" role="radiogroup" aria-label={t('me.language')}>
        {LANGS.map(l => <button key={l.code} className="chip" role="radio" aria-checked={lang === l.code} lang={l.code} onClick={() => setLang(l.code)}>{l.name}</button>)}
      </div>
      <p className="helper">{t('lang.note')}</p>
      <p className="section-label">{t('me.app')}</p>
      {install.canInstall ? <button className="btn tonal" onClick={install.prompt}><Download size={18} aria-hidden="true" />{t('paths.install')}</button>
        : <p className="helper">{install.installed ? t('me.installed') : t('me.howInstall')}</p>}
      <p className="section-label">{t('ns.label')}</p>
      <NotificationSettings prefs={prefs} setPrefs={setPrefs} />
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

// UGC "Sri Lanka University Statistics 2024" for this university: every number links to its table and page.
const FACT_ORDER = ['ADMITTED', 'STUDENTS', 'HOSTEL', 'WELFARE', 'GRADUATES'] as const;
function FactsCard({ facts }: { facts: InstitutionFact[] }) {
  const n = (v: number) => v.toLocaleString(locale());
  const sorted = [...facts].sort((a, b) => FACT_ORDER.indexOf(a.kind) - FACT_ORDER.indexOf(b.kind));
  return (
    <section className="card stack facts-card" aria-labelledby="facts-h">
      <h2 id="facts-h" className="title-l" style={{ margin: 0 }}>{t('facts.h')}</h2>
      <p className="helper" style={{ margin: 0 }}>{t('facts.sub')}</p>
      <dl className="facts">
        {sorted.map(f => (
          <div key={f.kind} className="fact">
            <dt>{t(`facts.${f.kind}` as Key)}</dt>
            <dd>
              <span className="fact-value num">{f.kind === 'WELFARE' ? t('facts.welfareValue', { m: n(f.value), b: n(f.value2 ?? 0) }) : n(f.value)}</span>
              {f.kind === 'HOSTEL' && f.share !== undefined && <span className="helper">{t('facts.hostelShare', { p: f.share })}</span>}
              {f.flags.map(fl => <span key={fl} className="helper">{t(`facts.flag.${fl}` as Key)}</span>)}
              <a className="source-link small" href={f.source.url} target="_blank" rel="noopener noreferrer">{t('facts.source', { t: f.source.table, p: f.source.page })}</a>
            </dd>
          </div>))}
      </dl>
    </section>);
}

// Aptitude / practical test: the official notice, with the most recent intake's dates shown as past when they are.
function AptitudeCard({ a }: { a: AptitudeNotice }) {
  const line = (k: Key, kp: Key, d: string | null) => d && <li>{t(a.past ? k : kp, { d: longDate(d) })}</li>;
  return (
    <section className="card stack" aria-labelledby="apt-h">
      <h2 id="apt-h" className="title-l" style={{ margin: 0 }}>{t('apt.h')}</h2>
      <p className="helper" style={{ margin: 0 }}>{t('apt.sub')}</p>
      {a.officialUrl && <>
        <p className="section-label" style={{ margin: 0 }}>{t(a.past ? 'apt.last' : 'apt.current', { y: a.academicYear })}</p>
        <ul className="plain-list">
          {line('apt.opened', 'apt.opens', a.registrationOpens)}
          {line('apt.closed', 'apt.closes', a.registrationCloses)}
          {line('apt.tested', 'apt.test', a.testDate)}
        </ul>
        {a.past && <p className="helper" style={{ margin: 0 }}>{t('apt.next')}</p>}
        <a className="source-link" href={a.officialUrl} target="_blank" rel="noopener noreferrer">{t('apt.notice', { i: a.institution })}</a>
      </>}
      {a.joint.length > 0 && <>
        <p className="helper" style={{ margin: 0 }}>{t('apt.joint')}</p>
        {a.joint.map(j => <a key={j.officialUrl} className="source-link" href={j.officialUrl} target="_blank" rel="noopener noreferrer">{t('apt.notice', { i: j.institution })}</a>)}
      </>}
    </section>);
}
