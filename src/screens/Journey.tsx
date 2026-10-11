// Journey (CR-002, FR-401 to FR-405). CR-006 (Praveen 2026-10-11): the Journey is the student's own checklist, saved on
// the account. Two tabs: "My steps" and "Open now" (the Alerts, moved here from the bell).
// - Every step starts unticked; the student ticks it. A step can be ticked only once its window is open: the three
//   preparation steps at any time, the UGC steps from the date in the UGC press notice (never invented, so while the
//   date is not announced the step is locked). The server checks the same rule (worker/my-journey.ts).
// - The student follows courses (course page) and notices or other paths (Open now, other-path pages). Followed
//   notices give the dated deadlines and reminders; "I applied" can be ticked once a notice has opened.
// Reminders: phone notifications in the Android app, a calendar file anywhere else.
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BellOff, BellRing, CalendarPlus, Check, CheckCircle2, ChevronRight, Circle, Lock, Megaphone, ScrollText, Trash2 } from 'lucide-react';
import type { ProfileInput, ResultsResponse } from '../../shared/api.ts';
import type { ListEntry } from '../../shared/list.ts';
import { JOURNEY_STEP_IDS, noticeItem, noticeTickable, reminderId, reminderTimes, stepWindow, toIcs, type DatedItem, type JourneyResponse,
  type JourneyStepId, type MyJourney, type NotifyPrefs } from '../../shared/journey.ts';
import { canScheduleReminders, replaceReminders, type Reminder } from '../notify.ts';
import { loadReminderIds, saveReminderIds } from '../storage.ts';
import { shortInstitution, titleCase } from '../format.ts';
import { Stagger, rise } from '../ui.tsx';
import { locale, t, type Key } from '../i18n/index.ts';
import { Rich } from '../i18n/Rich.tsx';
import { AlertsScreen } from './Alerts.tsx';

export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const inDays = (n: number) => n === 0 ? t('jr.today') : n === 1 ? t('jr.tomorrow') : t('jr.inDays', { n });

/** The reminders for every upcoming dated item, at the days and hour chosen in Notification settings. */
export function remindersFor(items: DatedItem[], prefs: NotifyPrefs, now = new Date()): Reminder[] {
  return items.flatMap(it => reminderTimes(it.due, now, prefs).map(r => ({ id: reminderId(it.id, r.daysBefore), at: r.at, title: it.title,
    body: r.daysBefore === 1 ? t('jr.remindTomorrow', { d: longDate(it.due) }) : t('jr.remindDays', { n: r.daysBefore, d: longDate(it.due) }) })));
}

/** What the student can change in their Journey (App keeps the state and saves each change to the account). */
export interface JourneyOps {
  my: MyJourney | null;
  setStep: (id: JourneyStepId, done: boolean) => void;
  setApplied: (routeId: string, applied: boolean) => void;
  followNotice: (routeId: string, on: boolean) => void;
  followCourse: (uniCode: string, on: boolean) => void;
  note: string | null;
}

const STEP_TEXT: Record<JourneyStepId, { title: Key; sub: Key }> = {
  RESULTS: { title: 'ck.results', sub: 'ck.resultsTodo' }, LIST: { title: 'ck.list', sub: 'ck.listTodo' }, COMPARE: { title: 'ck.compare', sub: 'ck.compareTodo' },
  UGC_APPLY: { title: 'step.UGC_APPLY.title', sub: 'step.UGC_APPLY.detail' }, UGC_ORDER: { title: 'step.UGC_ORDER.title', sub: 'step.UGC_ORDER.detail' },
  APTITUDE: { title: 'step.APTITUDE.title', sub: 'step.APTITUDE.detail' }, UGC_SELECTION: { title: 'step.UGC_SELECTION.title', sub: 'step.UGC_SELECTION.detail' },
  UGC_REGISTER: { title: 'step.UGC_REGISTER.title', sub: 'step.UGC_REGISTER.detail' },
};

export function JourneyScreen({ tab, data, ops, list, compare, profile, results, prefs, dob, unread, go }: { tab: 'steps' | 'open';
  data: JourneyResponse | null; ops: JourneyOps; list: ListEntry[]; compare: string[]; profile: ProfileInput | null;
  results: ResultsResponse | null; prefs: NotifyPrefs; dob: string | null; unread: number; go: (to: string) => void }) {
  const [reminderIds, setReminderIds] = useState<number[]>(() => loadReminderIds());
  const [note, setNote] = useState<string | null>(null);
  const day = today();
  const followed = ops.my?.notices ?? [];
  const saved = followed.map(n => n.routeId);
  const dated = useMemo(() => (data?.notices ?? []).filter(n => saved.includes(n.routeId)).map(noticeItem), [data, saved.join(',')]);   // eslint-disable-line react-hooks/exhaustive-deps
  const upcoming = dated.filter(d => d.due >= day).sort((a, b) => a.due.localeCompare(b.due));
  const next = upcoming[0];
  const native = canScheduleReminders();
  const remindersOn = reminderIds.length > 0;
  const noDays = !prefs.week && !prefs.day;

  const sync = async (on: boolean) => {                              // replaces the whole set, so it never doubles up
    const r = await replaceReminders(reminderIds, on ? remindersFor(upcoming, prefs) : []).catch(() => ({ ok: false as const, reason: t('jr.failed') }));
    if (!r.ok) { setNote(r.reason); return; }
    saveReminderIds(r.ids); setReminderIds(r.ids);
    setNote(on ? (r.ids.length ? t('jr.setN', { n: r.ids.length }) : t('jr.noUpcoming')) : t('jr.offDone'));
  };
  useEffect(() => { if (native && remindersOn) void sync(true); }, [saved.join(','), data?.notices.length, prefs.week, prefs.day, prefs.hour]);   // eslint-disable-line react-hooks/exhaustive-deps
  const calendar = () => {
    const blob = new Blob([toIcs(upcoming, new Date(), prefs)], { type: 'text/calendar' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'zedpath-journey.ics' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setNote(t('jr.icsDone'));
  };

  const tabs = (
    <div className="seg" role="tablist" aria-label={t('jr.h')}>
      {(['steps', 'open'] as const).map(k => (
        <button key={k} role="tab" aria-selected={tab === k} onClick={() => go(k === 'steps' ? '/journey' : '/journey/open')}>
          {tab === k && <motion.span layoutId="jr-pill" className="seg-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span>{k === 'steps' ? t('jt.steps') : t('jt.open')}{k === 'open' && unread > 0 && <span className="count num">{unread}</span>}</span>
        </button>))}
    </div>);

  if (tab === 'open') return (<>
    <div className="stack" style={{ gap: 4 }}><h1 className="screen-title">{t('jr.h')}</h1></div>
    {tabs}
    <AlertsScreen embedded data={data} profile={profile} dob={dob} saved={saved} setSaved={ids => {
      for (const r of ids.filter(x => !saved.includes(x))) ops.followNotice(r, true);
      for (const r of saved.filter(x => !ids.includes(x))) ops.followNotice(r, false);
    }} go={go} />
  </>);

  if (!data) return <><div className="skeleton" style={{ height: 160 }} /><div className="skeleton" /></>;
  const done = new Set((ops.my?.steps ?? []).map(s => s.stepId));
  const aptitude = list.filter(e => results?.offerings.some(o => o.uniCode === e.uniCode && o.hasAptitudeTest)).map(e => `${e.course}, ${e.institution}`);
  const hint = (id: JourneyStepId) => id === 'LIST' ? (list.length ? t('ck.listHave', { n: list.length }) : '')
    : id === 'COMPARE' ? (compare.length ? t('ck.compareHave', { n: compare.length }) : '')
    : id === 'RESULTS' ? (profile ? t('ck.resultsHave') : '')
    : id === 'APTITUDE' ? (aptitude.length ? t('ck.aptitudeTodo', { c: aptitude.join('; ') }) : list.length ? t('ck.aptitudeNone') : '') : '';
  const courseName = (u: string) => { const o = results?.offerings.find(x => x.uniCode === u); return o ? `${titleCase(o.course)}, ${shortInstitution(o.institution)}` : u; };
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">{t('jr.h')}</h1>
        <p className="subtitle">{t('jt.sub')}</p>
      </div>
      {tabs}
      {next ? (
        <section className="hero aurora" aria-label={t('jr.next')} style={{ gap: 6 }}>
          <span className="eyebrow">{t('jr.next')}</span>
          <h1>{next.due === day ? t('jr.closesToday') : t('jr.closesIn', { when: inDays(Math.round((Date.parse(next.due) - Date.parse(day)) / 864e5)) })}</h1>
          <span className="meta">{next.title}</span>
          <span className="meta num">{longDate(next.due)}</span>
        </section>
      ) : (
        <div className="card stack">
          <Megaphone size={26} aria-hidden="true" style={{ color: 'var(--brand-500)' }} />
          <p className="subtitle"><Rich text={t('jt.none')} /></p>
          <button className="btn tonal" onClick={() => go('/journey/open')}>{t('jt.openNow')}<ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      )}

      <section className="card stack checklist" aria-labelledby="ck-h">
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <h2 id="ck-h" className="title-l" style={{ margin: 0, flex: 1 }}>{t('ck.h')}</h2>
          <span className="pill band-SAFE num">{t('ck.progress', { d: done.size, n: JOURNEY_STEP_IDS.length })}</span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={JOURNEY_STEP_IDS.length} aria-valuenow={done.size} aria-label={t('ck.h')}>
          <motion.span initial={{ width: 0 }} animate={{ width: `${(done.size / JOURNEY_STEP_IDS.length) * 100}%` }} transition={{ duration: .5 }} /></div>
        <ol className="check-list">
          {JOURNEY_STEP_IDS.map(id => {
            const w = stepWindow(id, data.steps, day), on = done.has(id), h = hint(id);
            return (
              <li key={id} className={on ? 'done' : ''}>
                <button type="button" role="checkbox" aria-checked={on} disabled={!w.open} className="ck-box"
                  aria-label={t(STEP_TEXT[id].title)} onClick={() => ops.setStep(id, !on)}>
                  {!w.open ? <Lock size={20} aria-hidden="true" /> : on ? <CheckCircle2 size={24} aria-hidden="true" /> : <Circle size={24} aria-hidden="true" />}
                </button>
                <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                  <span className="title-m">{t(STEP_TEXT[id].title)}</span>
                  {!w.open && <span className="pill band-NOT_ENOUGH_DATA" style={{ alignSelf: 'flex-start', whiteSpace: 'normal' }}>
                    {w.opensOn ? t('jt.opensOn', { d: longDate(w.opensOn) }) : t('jt.notAnnounced')}</span>}
                  <span className="helper">{t(STEP_TEXT[id].sub)}</span>
                  {h && <span className="helper" style={{ color: 'var(--ink-2)' }}>{h}</span>}
                  {id === 'UGC_APPLY' && (() => { const s = data.steps.find(x => x.id === 'UGC_APPLY'); return s ? (
                    <details className="exact"><summary className="source-link"><ScrollText size={14} aria-hidden="true" />{data.handbook}, p.{s.page}</summary>
                      <p className="body-m" lang="en">“{s.quote}”</p></details>) : null; })()}
                </div>
              </li>);
          })}
        </ol>
      </section>

      <p className="section-label">{t('jt.following')}</p>
      {followed.length === 0 && (ops.my?.courses.length ?? 0) === 0 && <div className="card"><p className="subtitle">{t('jt.followNone')}</p></div>}
      {followed.length > 0 && (
        <Stagger className="list-card">
          {followed.map(f => {
            const n = data.notices.find(x => x.routeId === f.routeId);
            const can = noticeTickable(n, day);
            return (
              <motion.div key={f.routeId} variants={rise} className="item" style={{ cursor: 'default' }}>
                <span className="strip LIKELY" aria-hidden="true" />
                <span className="grow"><span className="t" lang="en">{n?.title ?? f.routeId}</span>
                  {n && <span className="s num">{n.closesOn >= day ? `${longDate(n.closesOn)} · ${inDays(Math.round((Date.parse(n.closesOn) - Date.parse(day)) / 864e5))}` : t('al.closed')}</span>}
                  <label className={`applied ${can ? '' : 'locked'}`}>
                    <input type="checkbox" checked={!!f.appliedAt} disabled={!can} onChange={e => ops.setApplied(f.routeId, e.target.checked)} />
                    {can ? t('jt.applied') : t('jt.appliedLocked', { d: n?.opensOn ? longDate(n.opensOn) : '' })}
                  </label></span>
                <button className="icon-btn" aria-label={t('jr.removeAria', { t: n?.title ?? f.routeId })} onClick={() => ops.followNotice(f.routeId, false)}><Trash2 size={18} /></button>
              </motion.div>);
          })}
        </Stagger>)}
      {(ops.my?.courses.length ?? 0) > 0 && (
        <div className="list-card">
          {ops.my!.courses.map(c => (
            <div key={c.uniCode} className="item">
              <span className="strip SAFE" aria-hidden="true" />
              <button type="button" className="grow list-main" onClick={() => go(`/course/${c.uniCode}`)} style={{ background: 'none', border: 0, textAlign: 'left', padding: 0, cursor: 'pointer', color: 'inherit' }}>
                <span className="t">{courseName(c.uniCode)}</span><span className="s">{t('jt.course', { u: c.uniCode })}</span></button>
              <button className="icon-btn" aria-label={t('jt.unfollow')} onClick={() => ops.followCourse(c.uniCode, false)}><Trash2 size={18} /></button>
            </div>))}
        </div>)}

      {upcoming.length > 0 && (native
        ? <button className={`btn ${remindersOn ? 'tonal' : 'filled'}`} disabled={!remindersOn && noDays} onClick={() => void sync(!remindersOn)}>
            {remindersOn ? <><BellOff size={18} aria-hidden="true" />{t('jr.remindOff')}</> : <><BellRing size={18} aria-hidden="true" />{t('jr.remindOnSet')}</>}</button>
        : <button className="btn filled" onClick={calendar}><CalendarPlus size={18} aria-hidden="true" />{t('jr.calendar')}</button>)}
      {upcoming.length > 0 && <button className="btn text" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => go('/me')}>{t('jr.settings')}</button>}
      {(note || ops.note) && <p className="helper" role="status">{note ?? ops.note}</p>}
      <p className="footer-note"><Check size={13} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />{t('jt.footer')}</p>
    </>
  );
}
