// Journey (CR-002, FR-401 to FR-405): the student's own timeline. Dated items are the notices the student added from
// Alerts; reminders are phone notifications in the Android app, a calendar file anywhere else.
// Video 2 (Praveen 2026-10-11): the "University admission, step by step" list is replaced by a checklist of the
// student's own next steps, ticked from what they have already done in ZedPath (results, list, compare, aptitude tests,
// deadlines); the one official step still ahead (apply to the UGC) keeps its handbook quote.
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BellOff, BellRing, CalendarPlus, CheckCircle2, ChevronRight, Circle, Megaphone, ScrollText, Trash2 } from 'lucide-react';
import type { ProfileInput, ResultsResponse } from '../../shared/api.ts';
import type { ListEntry } from '../../shared/list.ts';
import { buildJourney, noticeItem, reminderId, reminderTimes, toIcs, type DatedItem, type JourneyResponse, type NotifyPrefs } from '../../shared/journey.ts';
import { canScheduleReminders, replaceReminders, type Reminder } from '../notify.ts';
import { loadReminderIds, saveReminderIds } from '../storage.ts';
import { Stagger, rise } from '../ui.tsx';
import { locale, t } from '../i18n/index.ts';
import { Rich } from '../i18n/Rich.tsx';

export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const inDays = (n: number) => n === 0 ? t('jr.today') : n === 1 ? t('jr.tomorrow') : t('jr.inDays', { n });

/** The reminders for every upcoming dated item, at the days and hour chosen in Notification settings. */
export function remindersFor(items: DatedItem[], prefs: NotifyPrefs, now = new Date()): Reminder[] {
  return items.flatMap(it => reminderTimes(it.due, now, prefs).map(r => ({ id: reminderId(it.id, r.daysBefore), at: r.at, title: it.title,
    body: r.daysBefore === 1 ? t('jr.remindTomorrow', { d: longDate(it.due) }) : t('jr.remindDays', { n: r.daysBefore, d: longDate(it.due) }) })));
}

interface Step { id: string; done: boolean; title: string; sub: string; action?: { label: string; to: string } }

export function JourneyScreen({ data, saved, setSaved, list, compare, profile, results, prefs, go }: { data: JourneyResponse | null; saved: string[];
  setSaved: (ids: string[]) => void; list: ListEntry[]; compare: string[]; profile: ProfileInput | null; results: ResultsResponse | null;
  prefs: NotifyPrefs; go: (to: string) => void }) {
  const [reminderIds, setReminderIds] = useState<number[]>(() => loadReminderIds());
  const [note, setNote] = useState<string | null>(null);
  const day = today();
  const dated = useMemo(() => (data?.notices ?? []).filter(n => saved.includes(n.routeId)).map(noticeItem), [data, saved]);
  const aptitude = useMemo(() => list.filter(e => results?.offerings.some(o => o.uniCode === e.uniCode && o.hasAptitudeTest))
    .map(e => `${e.course}, ${e.institution}`), [list, results]);
  const view = data ? buildJourney(data.steps, aptitude, dated, day) : null;
  const upcoming = view ? [view.next, ...view.upcoming].filter(Boolean) as DatedItem[] : [];
  const native = canScheduleReminders();
  const remindersOn = reminderIds.length > 0;
  const noDays = !prefs.week && !prefs.day;

  const sync = async (on: boolean) => {                              // replaces the whole set, so it never doubles up
    const r = await replaceReminders(reminderIds, on ? remindersFor(upcoming, prefs) : []).catch(() => ({ ok: false as const, reason: t('jr.failed') }));
    if (!r.ok) { setNote(r.reason); return; }
    saveReminderIds(r.ids); setReminderIds(r.ids);
    setNote(on ? (r.ids.length ? t('jr.setN', { n: r.ids.length }) : t('jr.noUpcoming')) : t('jr.offDone'));
  };
  // Dates or settings changed while reminders are on: keep the phone's reminders in step.
  useEffect(() => { if (native && remindersOn) void sync(true); }, [saved.join(','), data?.notices.length, prefs.week, prefs.day, prefs.hour]);   // eslint-disable-line react-hooks/exhaustive-deps

  const calendar = () => {
    const blob = new Blob([toIcs(upcoming, new Date(), prefs)], { type: 'text/calendar' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'zedpath-journey.ics' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setNote(t('jr.icsDone'));
  };

  if (!data || !view) return <><div className="skeleton" style={{ height: 160 }} /><div className="skeleton" /></>;
  const apply = data.steps.find(s => s.id === 'UGC_APPLY');
  const steps: Step[] = [
    { id: 'results', done: !!profile, title: t('ck.results'), sub: profile ? t('ck.resultsDone') : t('ck.resultsTodo'), action: { label: profile ? t('ck.edit') : t('ck.start'), to: '/about' } },
    { id: 'list', done: list.length > 0, title: t('ck.list'), sub: list.length ? (list.length === 1 ? t('paths.listOne') : t('paths.listSome', { n: list.length })) : t('ck.listTodo'),
      action: { label: list.length ? t('ck.open') : t('ck.build'), to: list.length ? '/list' : '/courses/safe' } },
    { id: 'compare', done: compare.length >= 2, title: t('ck.compare'), sub: compare.length >= 2 ? t('ck.compareDone', { n: compare.length }) : t('ck.compareTodo'), action: { label: t('ck.open'), to: '/compare' } },
    { id: 'aptitude', done: list.length > 0 && aptitude.length === 0, title: t('ck.aptitude'),
      sub: !list.length ? t('ck.aptitudeWait') : aptitude.length ? t('ck.aptitudeTodo', { c: aptitude.join('; ') }) : t('ck.aptitudeNone') },
    { id: 'dates', done: saved.length > 0, title: t('ck.dates'), sub: saved.length ? t('ck.datesDone', { n: saved.length }) : t('ck.datesTodo'), action: { label: t('jr.openAlerts'), to: '/alerts' } },
    { id: 'apply', done: false, title: t('ck.apply'), sub: t('ck.applySub') },
  ];
  const done = steps.filter(s => s.done).length;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">{t('jr.h')}</h1>
        <p className="subtitle">{t('ck.sub')}</p>
      </div>

      {view.next ? (
        <section className="hero aurora" aria-label={t('jr.next')} style={{ gap: 6 }}>
          <span className="eyebrow">{t('jr.next')}</span>
          <h1>{view.next.daysLeft === 0 ? t('jr.closesToday') : t('jr.closesIn', { when: inDays(view.next.daysLeft) })}</h1>
          <span className="meta">{view.next.title}</span>
          <span className="meta num">{longDate(view.next.due)}</span>
        </section>
      ) : (
        <div className="card stack">
          <Megaphone size={26} aria-hidden="true" style={{ color: 'var(--brand-500)' }} />
          <p className="subtitle"><Rich text={t('jr.none')} /></p>
          <button className="btn tonal" onClick={() => go('/alerts')}>{t('jr.openAlerts')}<ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      )}

      <section className="card stack checklist" aria-labelledby="ck-h">
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <h2 id="ck-h" className="title-l grow" style={{ margin: 0 }}>{t('ck.h')}</h2>
          <span className="pill band-SAFE num">{t('ck.progress', { d: done, n: steps.length })}</span>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done} aria-label={t('ck.h')}>
          <motion.span initial={{ width: 0 }} animate={{ width: `${(done / steps.length) * 100}%` }} transition={{ duration: .6, ease: [0.2, 0.8, 0.2, 1] }} /></div>
        <ol className="check-list">
          {steps.map(s => (
            <li key={s.id} className={s.done ? 'done' : ''}>
              {s.done ? <CheckCircle2 size={24} aria-hidden="true" className="ck-ic done" /> : <Circle size={24} aria-hidden="true" className="ck-ic" />}
              <div className="stack" style={{ gap: 2, minWidth: 0, flex: 1 }}>
                <span className="title-m">{s.title}<span className="sr-only">{s.done ? `, ${t('ck.doneSr')}` : ''}</span></span>
                <span className="helper">{s.sub}</span>
                {s.id === 'apply' && apply && (
                  <details className="exact">
                    <summary className="source-link"><ScrollText size={14} aria-hidden="true" />{data.handbook}, p.{apply.page}</summary>
                    <p className="body-m" lang="en">“{apply.quote}”</p>
                  </details>)}
              </div>
              {s.action && !s.done && <button className="btn tonal small" onClick={() => go(s.action!.to)}>{s.action.label}</button>}
            </li>))}
        </ol>
      </section>

      {upcoming.length > 0 && (native
        ? <button className={`btn ${remindersOn ? 'tonal' : 'filled'}`} disabled={!remindersOn && noDays} onClick={() => void sync(!remindersOn)}>
            {remindersOn ? <><BellOff size={18} aria-hidden="true" />{t('jr.remindOff')}</> : <><BellRing size={18} aria-hidden="true" />{t('jr.remindOnSet')}</>}</button>
        : <button className="btn filled" onClick={calendar}><CalendarPlus size={18} aria-hidden="true" />{t('jr.calendar')}</button>)}
      {upcoming.length > 0 && <button className="btn text" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => go('/me')}>{t('jr.settings')}</button>}
      {note && <p className="helper" role="status">{note}</p>}

      {upcoming.length > 0 && (<>
        <p className="section-label">{t('jr.yourDates')}</p>
        <Stagger className="list-card">
          {upcoming.map(it => (
            <motion.div key={it.id} variants={rise} className="item" style={{ cursor: 'default' }}>
              <span className="strip LIKELY" aria-hidden="true" />
              <span className="grow"><span className="t">{it.title}</span><span className="s num">{longDate(it.due)} · {inDays(Math.max(0, Math.round((Date.parse(it.due) - Date.parse(day)) / 864e5)))}</span>
                <span className="m">{it.source}</span></span>
              <button className="icon-btn" aria-label={t('jr.removeAria', { t: it.title })} onClick={() => setSaved(saved.filter(id => `notice:${id}` !== it.id))}><Trash2 size={18} /></button>
            </motion.div>))}
        </Stagger>
      </>)}

      {view.past.length > 0 && (<>
        <p className="section-label">{t('jr.past')}</p>
        <div className="list-card">{view.past.map(it => (
          <div key={it.id} className="item" style={{ cursor: 'default', opacity: .7 }}>
            <CheckCircle2 size={20} aria-hidden="true" style={{ color: 'var(--safe)', flex: 'none' }} />
            <span className="grow"><span className="t">{it.title}</span><span className="s num">{longDate(it.due)}</span></span>
          </div>))}</div>
      </>)}
      <p className="footer-note">{t('jr.footer')}</p>
    </>
  );
}
