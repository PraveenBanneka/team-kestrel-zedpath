// Journey and Alerts (CR-002, FR-401 to FR-405, FR-408). Pure functions shared by the phone and the tests.
// - Journey = the student's own timeline: the UGC steps in order (from the handbook, dates set by press notices),
//   aptitude-test steps for courses on their list (FR-403), and dated items they added from Alerts.
// - Alerts = official notices with a closing date (Gazette job exams, other intakes). Eligibility is checked HERE, on
//   the phone, so the student's results and date of birth never leave it.
import type { ProfileInput } from './api.ts';

export type StepKind = 'UGC_APPLICATION_CLOSE' | 'PREFERENCE_CHANGE_CLOSE' | 'APTITUDE_APPLICATION' | 'CUTOFF_RELEASE' | 'REGISTRATION_CLOSE';
export interface JourneyStep { id: string; kind: StepKind; title: string; detail: string; when: string; page: number; quote: string;
  /** CR-006: the day the step's window opens, from the UGC press notice; absent or null = not announced yet. */
  opensOn?: string | null }
export interface Notice {
  routeId: string; kind: 'JOB_EXAM_CLOSE' | 'ROUTE_INTAKE'; title: string; provider: string;
  opensOn: string | null; closesOn: string;
  age: { min: number | null; max: number | null; asOf: string; quote: string } | null;
  al: { passes: number; subjects: { all: string[]; oneOf: string[] } | null; quote: string } | null;
  ol: string | null;
  sourceLocator: string; sourceUrl: string; officialUrl: string | null; retrievedOn: string;
}
export interface JourneyResponse { academicYear: string; handbook: string; steps: JourneyStep[]; notices: Notice[] }

/**
 * CR-006 (Praveen 2026-10-11): the Journey is the student's own checklist, saved on the account. Every step starts
 * unticked; the student ticks it. A step can be ticked only once its window is open: the three preparation steps are
 * open at any time; the UGC steps open on the date in their press notice, so while the date is not announced they
 * cannot be ticked (ZedPath never invents a date). Mirrored by the CHECK on journey_step.step_id (migration 0010).
 */
export const PREP_STEPS = ['RESULTS', 'LIST', 'COMPARE'] as const;
export const JOURNEY_STEP_IDS = ['RESULTS', 'LIST', 'COMPARE', 'UGC_APPLY', 'UGC_ORDER', 'APTITUDE', 'UGC_SELECTION', 'UGC_REGISTER'] as const;
export type JourneyStepId = typeof JOURNEY_STEP_IDS[number];
export const isStepId = (x: unknown): x is JourneyStepId => (JOURNEY_STEP_IDS as readonly unknown[]).includes(x);

/** Whether a step can be ticked today, and why not. */
export function stepWindow(id: JourneyStepId, steps: JourneyStep[], today: string): { open: boolean; opensOn: string | null } {
  if ((PREP_STEPS as readonly string[]).includes(id)) return { open: true, opensOn: null };
  const opensOn = steps.find(s => s.id === id)?.opensOn ?? null;
  return { open: opensOn !== null && opensOn <= today, opensOn };
}
/** "I applied" can be ticked once a followed notice is open (a notice with no opening date is open on publication). */
export const noticeTickable = (n: { opensOn: string | null } | undefined, today: string) => !n || n.opensOn === null || n.opensOn <= today;

/** The Journey saved on the account. */
export interface MyJourney {
  courses: { uniCode: string; followedAt: string }[];
  notices: { routeId: string; followedAt: string; appliedAt: string | null }[];
  steps: { stepId: JourneyStepId; doneAt: string }[];
}

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);
/** Whole days from `today` to `date` (both YYYY-MM-DD, calendar days, no time zones involved). */
export const daysUntil = (date: string, today: string) => Math.round((Date.parse(date) - Date.parse(today)) / DAY);

export type Check = 'MEETS' | 'NOT_MET' | 'UNKNOWN' | 'NOT_NEEDED';
export interface NoticeCheck { status: 'OPEN' | 'CLOSED' | 'UPCOMING'; daysLeft: number; al: Check; age: Check; forYou: boolean }

/** Age in whole years on `asOf` for someone born on `dob` (both YYYY-MM-DD). */
export function ageOn(dob: string, asOf: string): number {
  const [y, m, d] = dob.split('-').map(Number), [Y, M, D] = asOf.split('-').map(Number);
  return Y - y - (M < m || (M === m && D < d) ? 1 : 0);
}

/** Checks one notice against the student's A/L results and (optional) date of birth. O/L rules are never checked. */
export function checkNotice(n: Notice, profile: ProfileInput | null, dob: string | null, today: string): NoticeCheck {
  const daysLeft = daysUntil(n.closesOn, today);
  const status = daysLeft < 0 ? 'CLOSED' : n.opensOn && daysUntil(n.opensOn, today) > 0 ? 'UPCOMING' : 'OPEN';
  let al: Check = 'NOT_NEEDED';
  if (n.al) {
    if (!profile) al = 'UNKNOWN';
    else {
      const passed = Object.keys(profile.al);                  // every grade ZedPath accepts (A, B, C, S) is a pass
      const subjectsOk = !n.al.subjects || (n.al.subjects.all.every(s => passed.includes(s))
        && (n.al.subjects.oneOf.length === 0 || n.al.subjects.oneOf.some(s => passed.includes(s))));
      al = passed.length >= n.al.passes && subjectsOk ? 'MEETS' : 'NOT_MET';
    }
  }
  let age: Check = 'NOT_NEEDED';
  if (n.age) {
    if (!dob) age = 'UNKNOWN';
    else {
      const a = ageOn(dob, n.age.asOf);
      age = (n.age.min === null || a >= n.age.min) && (n.age.max === null || a <= n.age.max) ? 'MEETS' : 'NOT_MET';
    }
  }
  return { status, daysLeft, al, age, forYou: status !== 'CLOSED' && al !== 'NOT_MET' && age !== 'NOT_MET' };
}

/** Alerts order: open and upcoming first (soonest closing first), then closed ones (most recent first). */
export function sortNotices<T extends { n: Notice; c: NoticeCheck }>(xs: T[]): T[] {
  return [...xs].sort((a, b) => Number(a.c.status === 'CLOSED') - Number(b.c.status === 'CLOSED')
    || (a.c.status === 'CLOSED' ? b.n.closesOn.localeCompare(a.n.closesOn) : a.n.closesOn.localeCompare(b.n.closesOn)));
}

export interface DatedItem { id: string; title: string; detail: string; due: string; source: string }
export interface JourneyView {
  next: (DatedItem & { daysLeft: number }) | null;
  upcoming: (DatedItem & { daysLeft: number })[];
  past: DatedItem[];
  steps: (JourneyStep & { courses: string[] })[];
}

/** FR-401/403: the UGC steps in order (aptitude courses attached to the aptitude step; the step is left out when no
 *  course on the list has a test) and the dated items split into next, upcoming and past. */
export function buildJourney(steps: JourneyStep[], aptitudeCourses: string[], dated: DatedItem[], today: string): JourneyView {
  const withDays = dated.map(d => ({ ...d, daysLeft: daysUntil(d.due, today) })).sort((a, b) => a.due.localeCompare(b.due));
  const upcoming = withDays.filter(d => d.daysLeft >= 0);
  return {
    next: upcoming[0] ?? null,
    upcoming: upcoming.slice(1),
    past: withDays.filter(d => d.daysLeft < 0).reverse().map(({ daysLeft: _d, ...d }) => d),
    steps: steps.filter(s => s.kind !== 'APTITUDE_APPLICATION' || aptitudeCourses.length > 0)
      .map(s => ({ ...s, courses: s.kind === 'APTITUDE_APPLICATION' ? aptitudeCourses : [] })),
  };
}

/** The dated Journey item made from a notice the student added (FR-408). */
export const noticeItem = (n: Notice): DatedItem => ({ id: `notice:${n.routeId}`, title: n.title,
  detail: `Closing date · ${n.provider}`, due: n.closesOn, source: n.sourceLocator });

export const REMINDER_DAYS = [7, 1] as const;                // FR-404/405: 7 days and 1 day before
export const REMINDER_HOUR = 8;                              // 08:00 on the phone's clock

/** The student's notification settings (on this phone). The default is exactly the behaviour before settings existed. */
export interface NotifyPrefs { week: boolean; day: boolean; hour: 8 | 18; badge: boolean }
export const DEFAULT_PREFS: NotifyPrefs = { week: true, day: true, hour: REMINDER_HOUR, badge: true };
/** Settings read from storage: anything unknown falls back to the default, field by field. */
export function readPrefs(x: unknown): NotifyPrefs {
  const p = (x && typeof x === 'object' ? x : {}) as Partial<Record<keyof NotifyPrefs, unknown>>;
  return { week: typeof p.week === 'boolean' ? p.week : DEFAULT_PREFS.week, day: typeof p.day === 'boolean' ? p.day : DEFAULT_PREFS.day,
    hour: p.hour === 18 ? 18 : p.hour === 8 ? 8 : DEFAULT_PREFS.hour, badge: typeof p.badge === 'boolean' ? p.badge : DEFAULT_PREFS.badge };
}
const daysFor = (p: NotifyPrefs) => REMINDER_DAYS.filter(d => (d === 7 ? p.week : p.day));

/** When to remind about a dated item: by default 7 days and 1 day before, at 08:00 local time; only future times. */
export function reminderTimes(due: string, now: Date, prefs: NotifyPrefs = DEFAULT_PREFS): { daysBefore: number; at: Date }[] {
  const [y, m, d] = due.split('-').map(Number);
  return daysFor(prefs).map(daysBefore => ({ daysBefore, at: new Date(y, m - 1, d - daysBefore, prefs.hour, 0, 0) }))
    .filter(r => r.at.getTime() > now.getTime());
}

/** A stable notification id per (item, offset), so rescheduling replaces a reminder instead of adding a second. */
export function reminderId(itemId: string, daysBefore: number): number {
  let h = 2166136261;
  for (const ch of `${itemId}|${daysBefore}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return 1000 + ((h >>> 0) % 2_000_000_000);                // ids below 1000 are reserved (1 = the test notification)
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** FR-404: an iCalendar file of the dated items, each an all-day event with alarms 7 days and 1 day before. */
export function toIcs(items: DatedItem[], now: Date, prefs: NotifyPrefs = DEFAULT_PREFS): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Team Kestrel//ZedPath//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const it of items) {
    const start = it.due.replace(/-/g, ''), end = isoDay(new Date(Date.parse(it.due) + DAY)).replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${it.id.replace(/[^A-Za-z0-9:.-]/g, '-')}@zedpath`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`, `SUMMARY:${icsText(it.title)}`,
      `DESCRIPTION:${icsText(`${it.detail}\nSource: ${it.source}`)}`);
    // all-day event: by default the alarm is at the start of that day (as before settings); "evening" moves it to 18:00
    for (const d of daysFor(prefs)) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(it.title)}`,
      prefs.hour === 18 ? `TRIGGER:-P${d - 1}DT6H` : `TRIGGER:-P${d}D`, 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
