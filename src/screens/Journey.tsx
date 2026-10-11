// Journey (CR-002, FR-401 to FR-405): the student's own timeline. The UGC steps come in order from the handbook (their
// dates are set each year by UGC press notices, so ZedPath says that instead of guessing); dated items are the notices
// the student added from Alerts. Reminders: phone notifications in the Android app, a calendar file anywhere else.
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BellOff, BellRing, CalendarPlus, CheckCircle2, ChevronRight, Clock, Megaphone, Route, ScrollText, Trash2 } from 'lucide-react';
import type { ResultsResponse } from '../../shared/api.ts';
import type { ListEntry } from '../../shared/list.ts';
import { buildJourney, noticeItem, reminderId, reminderTimes, toIcs, type DatedItem, type JourneyResponse } from '../../shared/journey.ts';
import { canScheduleReminders, replaceReminders, type Reminder } from '../notify.ts';
import { loadReminderIds, saveReminderIds } from '../storage.ts';
import { Stagger, rise } from '../ui.tsx';

export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const longDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const inDays = (n: number) => n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;

/** The reminders for every upcoming dated item (7 days and 1 day before, 08:00). */
export function remindersFor(items: DatedItem[], now = new Date()): Reminder[] {
  return items.flatMap(it => reminderTimes(it.due, now).map(r => ({ id: reminderId(it.id, r.daysBefore), at: r.at, title: it.title,
    body: r.daysBefore === 1 ? `Closes tomorrow (${longDate(it.due)}).` : `Closes in ${r.daysBefore} days (${longDate(it.due)}).` })));
}

export function JourneyScreen({ data, saved, setSaved, list, results, go }: { data: JourneyResponse | null; saved: string[];
  setSaved: (ids: string[]) => void; list: ListEntry[]; results: ResultsResponse | null; go: (to: string) => void }) {
  const [reminderIds, setReminderIds] = useState<number[]>(() => loadReminderIds());
  const [note, setNote] = useState<string | null>(null);
  const t = today();
  const dated = useMemo(() => (data?.notices ?? []).filter(n => saved.includes(n.routeId)).map(noticeItem), [data, saved]);
  const aptitude = useMemo(() => list.filter(e => results?.offerings.some(o => o.uniCode === e.uniCode && o.hasAptitudeTest))
    .map(e => `${e.course}, ${e.institution}`), [list, results]);
  const view = data ? buildJourney(data.steps, aptitude, dated, t) : null;
  const upcoming = view ? [view.next, ...view.upcoming].filter(Boolean) as DatedItem[] : [];
  const native = canScheduleReminders();
  const remindersOn = reminderIds.length > 0;

  const sync = async (on: boolean) => {                              // replaces the whole set, so it never doubles up
    const r = await replaceReminders(reminderIds, on ? remindersFor(upcoming) : []).catch(() => ({ ok: false as const, reason: 'Could not set reminders. Try again.' }));
    if (!r.ok) { setNote(r.reason); return; }
    saveReminderIds(r.ids); setReminderIds(r.ids);
    setNote(on ? (r.ids.length ? `${r.ids.length} reminder${r.ids.length > 1 ? 's' : ''} set: 7 days and 1 day before, at 8 am.` : 'No upcoming dates to remind you about yet.') : 'Reminders turned off.');
  };
  // Dates added or removed while reminders are on: keep the phone's reminders in step.
  useEffect(() => { if (native && remindersOn) void sync(true); }, [saved.join(','), data?.notices.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  const calendar = () => {
    const blob = new Blob([toIcs(upcoming, new Date())], { type: 'text/calendar' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'zedpath-journey.ics' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setNote('Calendar file downloaded. Open it to add the dates, each with alerts 7 days and 1 day before.');
  };

  if (!data || !view) return <><div className="skeleton" style={{ height: 160 }} /><div className="skeleton" /></>;
  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">Your journey</h1>
        <p className="subtitle">Every step from results to registration, in order. Dates you add from Alerts get reminders.</p>
      </div>

      {view.next ? (
        <section className="hero aurora" aria-label="Next deadline" style={{ gap: 6 }}>
          <span className="eyebrow">Next deadline</span>
          <h1>{view.next.daysLeft === 0 ? 'Closes today' : `Closes ${inDays(view.next.daysLeft)}`}</h1>
          <span className="meta">{view.next.title}</span>
          <span className="meta num">{longDate(view.next.due)}</span>
        </section>
      ) : (
        <div className="card stack">
          <Megaphone size={26} aria-hidden="true" style={{ color: 'var(--brand-500)' }} />
          <p className="subtitle">No dated deadlines yet. Add exam and intake dates from <b>Alerts</b>, and they appear here with reminders.</p>
          <button className="btn tonal" onClick={() => go('/alerts')}>Open Alerts<ChevronRight size={18} aria-hidden="true" /></button>
        </div>
      )}

      {upcoming.length > 0 && (native
        ? <button className={`btn ${remindersOn ? 'tonal' : 'filled'}`} onClick={() => void sync(!remindersOn)}>
            {remindersOn ? <><BellOff size={18} aria-hidden="true" />Turn reminders off</> : <><BellRing size={18} aria-hidden="true" />Remind me 7 days and 1 day before</>}</button>
        : <button className="btn filled" onClick={calendar}><CalendarPlus size={18} aria-hidden="true" />Add these dates to my calendar</button>)}
      {note && <p className="helper" role="status">{note}</p>}

      {upcoming.length > 0 && (<>
        <p className="section-label">Your dates</p>
        <Stagger className="list-card">
          {upcoming.map(it => (
            <motion.div key={it.id} variants={rise} className="item" style={{ cursor: 'default' }}>
              <span className="strip LIKELY" aria-hidden="true" />
              <span className="grow"><span className="t">{it.title}</span><span className="s num">{longDate(it.due)} · {inDays(Math.max(0, Math.round((Date.parse(it.due) - Date.parse(t)) / 864e5)))}</span>
                <span className="m">{it.source}</span></span>
              <button className="icon-btn" aria-label={`Remove ${it.title} from my journey`} onClick={() => setSaved(saved.filter(id => `notice:${id}` !== it.id))}><Trash2 size={18} /></button>
            </motion.div>))}
        </Stagger>
      </>)}

      <p className="section-label">University admission, step by step</p>
      <ol className="timeline">
        {view.steps.map((s, i) => (
          <li key={s.id} className="timeline-step">
            <span className="timeline-dot num" aria-hidden="true">{i + 1}</span>
            <div className="stack" style={{ gap: 6 }}>
              <span className="title-m">{s.title}</span>
              <span className="pill band-NOT_ENOUGH_DATA" style={{ alignSelf: 'flex-start' }}><Clock size={13} aria-hidden="true" />{s.when}</span>
              <span className="body-m">{s.detail}</span>
              {s.courses.length > 0 && <ul className="body-m" style={{ margin: 0, paddingLeft: 18 }}>{s.courses.map(c => <li key={c}>{c}</li>)}</ul>}
              <details className="exact">
                <summary className="source-link"><ScrollText size={14} aria-hidden="true" />{data.handbook}, p.{s.page}</summary>
                <p className="body-m">“{s.quote}”</p>
              </details>
            </div>
          </li>))}
      </ol>
      {list.length === 0 && <button className="btn text" style={{ alignSelf: 'flex-start' }} onClick={() => go('/list')}><Route size={18} aria-hidden="true" />Build My list to see aptitude-test steps</button>}

      {view.past.length > 0 && (<>
        <p className="section-label">Done or closed</p>
        <div className="list-card">{view.past.map(it => (
          <div key={it.id} className="item" style={{ cursor: 'default', opacity: .7 }}>
            <CheckCircle2 size={20} aria-hidden="true" style={{ color: 'var(--safe)', flex: 'none' }} />
            <span className="grow"><span className="t">{it.title}</span><span className="s num">{longDate(it.due)}</span></span>
          </div>))}</div>
      </>)}
      <p className="footer-note">UGC dates are announced each year in press notices; ZedPath shows the official rule for each step until then. Always confirm on ugc.ac.lk.</p>
    </>
  );
}
