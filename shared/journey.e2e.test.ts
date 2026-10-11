// E2E-style logic tests for the Journey checklist (CR-006) and reminders (FR-404/405). Pure functions only; no network.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFS, JOURNEY_STEP_IDS, PREP_STEPS, REMINDER_DAYS, REMINDER_HOUR, isStepId, noticeTickable, readPrefs,
  reminderTimes, stepWindow, toIcs, type DatedItem, type JourneyResponse, type JourneyStep, type JourneyStepId,
} from './journey.ts';
import { todayLk } from '../worker/my-journey.ts';
import journeyJson from '../worker/generated/journey-2025-2026.json' with { type: 'json' };

const real = journeyJson as unknown as JourneyResponse;
const UGC_IDS = JOURNEY_STEP_IDS.filter(id => !(PREP_STEPS as readonly string[]).includes(id));
const step = (id: string, opensOn?: string | null): JourneyStep =>
  ({ id, kind: 'UGC_APPLICATION_CLOSE', title: id, detail: '', when: '', page: 1, quote: '', opensOn });
const OPEN_DATE = '2026-11-14';
const dated = (id: string, opensOn: string | null | undefined) => UGC_IDS.map(s => step(s, s === id ? opensOn : null));

describe('stepWindow: preparation steps', () => {
  for (const id of PREP_STEPS) {
    it(`JRN-001 ${id} is open any time, even with no steps and a far-past date`, () => {
      expect(stepWindow(id, [], '1999-01-01')).toEqual({ open: true, opensOn: null });
      expect(stepWindow(id, real.steps, '2026-10-12')).toEqual({ open: true, opensOn: null });
      // a stray dated entry with the same id is ignored: prep steps never take a date
      expect(stepWindow(id, [step(id, '2099-01-01')], '2026-10-12')).toEqual({ open: true, opensOn: null });
    });
  }
});

describe('stepWindow: UGC steps', () => {
  for (const id of UGC_IDS) {
    it(`JRN-002 ${id} is closed while opensOn is null, undefined or the step is missing`, () => {
      expect(stepWindow(id, dated(id, null), '2030-01-01')).toEqual({ open: false, opensOn: null });
      expect(stepWindow(id, dated(id, undefined), '2030-01-01')).toEqual({ open: false, opensOn: null });
      expect(stepWindow(id, [], '2030-01-01')).toEqual({ open: false, opensOn: null });
    });
    it(`JRN-003 ${id} opens exactly on opensOn (closed the day before, open on the day and after)`, () => {
      const steps = dated(id, OPEN_DATE);
      expect(stepWindow(id, steps, '2026-11-13')).toEqual({ open: false, opensOn: OPEN_DATE });
      expect(stepWindow(id, steps, OPEN_DATE)).toEqual({ open: true, opensOn: OPEN_DATE });
      expect(stepWindow(id, steps, '2026-11-15')).toEqual({ open: true, opensOn: OPEN_DATE });
      expect(stepWindow(id, steps, '2027-02-01')).toEqual({ open: true, opensOn: OPEN_DATE });
    });
  }
  it('JRN-004 one step\'s date never opens another step', () => {
    const steps = dated('UGC_APPLY', '2026-01-01');
    for (const id of UGC_IDS.filter(x => x !== 'UGC_APPLY')) expect(stepWindow(id, steps, '2030-01-01').open).toBe(false);
  });
  it('JRN-005 date comparison crosses month and year boundaries correctly', () => {
    const steps = [step('UGC_ORDER', '2027-01-01')];
    expect(stepWindow('UGC_ORDER', steps, '2026-12-31').open).toBe(false);
    expect(stepWindow('UGC_ORDER', steps, '2027-01-01').open).toBe(true);
    const feb = [step('UGC_REGISTER', '2027-03-01')];
    expect(stepWindow('UGC_REGISTER', feb, '2027-02-28').open).toBe(false);
    expect(stepWindow('UGC_REGISTER', feb, '2027-03-01').open).toBe(true);
  });
  it('JRN-006 shipped 2025/26 read model: every UGC step is closed (no dates announced yet, none invented)', () => {
    expect(real.steps.map(s => s.id).sort()).toEqual([...UGC_IDS].sort());
    for (const id of UGC_IDS) expect(stepWindow(id, real.steps, '2026-10-12')).toEqual({ open: false, opensOn: null });
  });
});

describe('noticeTickable', () => {
  it('JRN-007 before / on / after the opening date', () => {
    const n = { opensOn: '2026-10-20' };
    expect(noticeTickable(n, '2026-10-19')).toBe(false);
    expect(noticeTickable(n, '2026-10-20')).toBe(true);
    expect(noticeTickable(n, '2026-10-21')).toBe(true);
  });
  it('JRN-008 a notice with no opening date is open on publication; an unknown notice is not blocked here', () => {
    expect(noticeTickable({ opensOn: null }, '1999-01-01')).toBe(true);
    expect(noticeTickable(undefined, '2026-10-12')).toBe(true);
  });
  it('JRN-009 shipped notices: tickable exactly from their own opensOn', () => {
    for (const n of real.notices) {
      if (n.opensOn === null) { expect(noticeTickable(n, '2000-01-01')).toBe(true); continue; }
      const prev = new Date(Date.parse(n.opensOn) - 86_400_000).toISOString().slice(0, 10);
      expect(noticeTickable(n, prev)).toBe(false);
      expect(noticeTickable(n, n.opensOn)).toBe(true);
    }
  });
});

describe('isStepId and the D1 CHECK list', () => {
  it('JRN-010 accepts every listed id', () => {
    for (const id of JOURNEY_STEP_IDS) expect(isStepId(id)).toBe(true);
  });
  it('JRN-011 rejects wrong case, padding, unknown ids and non-strings', () => {
    for (const x of ['results', 'Results', ' RESULTS', 'RESULTS ', 'UGC_APPLY;', 'UGC', '', 'APTITUDE_APPLICATION',
      'UGC_APPLICATION_CLOSE', null, undefined, 0, 1, true, {}, ['RESULTS'], new String('RESULTS')])
      expect(isStepId(x)).toBe(false);
  });
  it('JRN-012 JOURNEY_STEP_IDS matches the journey_step CHECK in migration 0010 exactly (same ids, same order)', () => {
    const sql = fs.readFileSync(path.join(process.cwd(), 'migrations', '0010_journey_avatars_rules.sql'), 'utf8');
    const table = sql.match(/CREATE TABLE journey_step \(([\s\S]*?)\) STRICT/);
    expect(table).not.toBeNull();
    const check = table![1].match(/step_id\s+TEXT\s+NOT NULL\s+CHECK \(step_id IN \(([^)]*)\)\)/);
    expect(check).not.toBeNull();
    const ids = check![1].split(',').map(s => s.trim().replace(/^'|'$/g, ''));
    expect(ids).toEqual([...JOURNEY_STEP_IDS]);
  });
  it('JRN-013 PREP_STEPS are a prefix of JOURNEY_STEP_IDS and ids are unique', () => {
    expect(JOURNEY_STEP_IDS.slice(0, PREP_STEPS.length)).toEqual([...PREP_STEPS]);
    expect(new Set(JOURNEY_STEP_IDS).size).toBe(JOURNEY_STEP_IDS.length);
  });
});

describe('readPrefs', () => {
  it('JRN-014 pinned defaults: week + day on, 08:00, badge on', () => {
    expect(DEFAULT_PREFS).toEqual({ week: true, day: true, hour: 8, badge: true });
    expect(REMINDER_HOUR).toBe(8);
    expect([...REMINDER_DAYS]).toEqual([7, 1]);
  });
  it('JRN-015 non-object input falls back to the defaults', () => {
    for (const x of [null, undefined, 'x', 42, true, '{"week":false}']) expect(readPrefs(x)).toEqual(DEFAULT_PREFS);
  });
  it('JRN-016 corrupted fields fall back field by field; valid ones are kept', () => {
    expect(readPrefs({ week: 'false', day: 0, hour: '18', badge: null })).toEqual(DEFAULT_PREFS);
    expect(readPrefs({ week: false, day: 1, hour: 12, badge: false })).toEqual({ week: false, day: true, hour: 8, badge: false });
    expect(readPrefs({ hour: 18 })).toEqual({ ...DEFAULT_PREFS, hour: 18 });
    expect(readPrefs({ hour: 8, extra: 'ignored' })).toEqual(DEFAULT_PREFS);
  });
});

describe('reminderTimes', () => {
  const now = new Date(2026, 9, 1, 12, 0, 0);
  it('JRN-017 default: 7 days and 1 day before, at 08:00 local', () => {
    expect(reminderTimes('2026-10-20', now)).toEqual([
      { daysBefore: 7, at: new Date(2026, 9, 13, 8, 0, 0) },
      { daysBefore: 1, at: new Date(2026, 9, 19, 8, 0, 0) },
    ]);
  });
  it('JRN-018 prefs: week off, day off, evening hour', () => {
    expect(reminderTimes('2026-10-20', now, { ...DEFAULT_PREFS, week: false }).map(r => r.daysBefore)).toEqual([1]);
    expect(reminderTimes('2026-10-20', now, { ...DEFAULT_PREFS, day: false }).map(r => r.daysBefore)).toEqual([7]);
    expect(reminderTimes('2026-10-20', now, { ...DEFAULT_PREFS, week: false, day: false })).toEqual([]);
    expect(reminderTimes('2026-10-20', now, { ...DEFAULT_PREFS, hour: 18 })[0].at).toEqual(new Date(2026, 9, 13, 18, 0, 0));
  });
  it('JRN-019 only future times; exactly-now is dropped; month rollover handled', () => {
    expect(reminderTimes('2026-10-05', now).map(r => r.daysBefore)).toEqual([1]);       // 7-day mark already passed
    expect(reminderTimes('2026-10-02', new Date(2026, 9, 1, 8, 0, 0))).toEqual([]);      // 1-day mark == now
    expect(reminderTimes('2026-09-01', now)).toEqual([]);
    expect(reminderTimes('2026-11-03', now)[0].at).toEqual(new Date(2026, 9, 27, 8, 0, 0));
  });
});

describe('toIcs', () => {
  const now = new Date(Date.UTC(2026, 9, 12, 3, 4, 5, 678));
  const item: DatedItem = { id: 'notice:R043', title: 'Exam; part 1, \\ draft', detail: 'Closing date\nline 2', due: '2026-12-31', source: 'Gazette p.4' };
  it('JRN-020 valid VCALENDAR envelope with CRLF line endings and no bare LF', () => {
    const ics = toIcs([item], now);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Team Kestrel//ZedPath//EN\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    const lines = ics.split('\r\n').slice(0, -1);
    expect(lines.filter(l => l === 'BEGIN:VEVENT').length).toBe(1);
    expect(lines.filter(l => l === 'BEGIN:VALARM').length).toBe(lines.filter(l => l === 'END:VALARM').length);
    for (const l of lines) expect(l).toMatch(/^[A-Z-]+[;:]/);
  });
  it('JRN-021 all-day event across the year boundary; UTC stamp without separators or millis; safe UID', () => {
    const lines = toIcs([item], now).split('\r\n');
    expect(lines).toContain('DTSTAMP:20261012T030405Z');
    expect(lines).toContain('DTSTART;VALUE=DATE:20261231');
    expect(lines).toContain('DTEND;VALUE=DATE:20270101');
    expect(lines).toContain('UID:notice:R043@zedpath');
    expect(toIcs([{ ...item, id: 'a b/c@d' }], now)).toContain('UID:a-b-c-d@zedpath');
  });
  it('JRN-022 TEXT escaping of backslash, semicolon, comma and newlines', () => {
    const lines = toIcs([item], now).split('\r\n');
    expect(lines).toContain('SUMMARY:Exam\\; part 1\\, \\\\ draft');
    expect(lines).toContain('DESCRIPTION:Closing date\\nline 2\\nSource: Gazette p.4');
    expect(toIcs([{ ...item, title: 'a\r\nb' }], now)).toContain('SUMMARY:a\\nb');
  });
  it('JRN-023 alarms follow prefs: default start of day 7 and 1 days before; evening = 18:00 the day before', () => {
    const trig = (p = DEFAULT_PREFS) => toIcs([item], now, p).split('\r\n').filter(l => l.startsWith('TRIGGER:'));
    expect(trig()).toEqual(['TRIGGER:-P7D', 'TRIGGER:-P1D']);
    expect(trig({ ...DEFAULT_PREFS, hour: 18 })).toEqual(['TRIGGER:-P6DT6H', 'TRIGGER:-P0DT6H']);
    expect(trig({ ...DEFAULT_PREFS, week: false })).toEqual(['TRIGGER:-P1D']);
    expect(trig({ ...DEFAULT_PREFS, week: false, day: false })).toEqual([]);
  });
  it('JRN-024 empty list = a valid empty calendar; several items = one VEVENT each', () => {
    expect(toIcs([], now)).toBe('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Team Kestrel//ZedPath//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nEND:VCALENDAR\r\n');
    const ics = toIcs([item, { ...item, id: 'x2', due: '2027-01-15' }], now);
    expect(ics.split('\r\n').filter(l => l === 'BEGIN:VEVENT').length).toBe(2);
  });
});

describe('todayLk (Sri Lanka date, UTC+05:30)', () => {
  it('JRN-025 Sri Lanka midnight is 18:30 UTC the day before', () => {
    expect(todayLk(Date.parse('2026-10-11T18:29:59.999Z'))).toBe('2026-10-11');
    expect(todayLk(Date.parse('2026-10-11T18:30:00.000Z'))).toBe('2026-10-12');
  });
  it('JRN-026 UTC midnight is already 05:30 the same day in Sri Lanka', () => {
    expect(todayLk(Date.parse('2026-10-12T00:00:00Z'))).toBe('2026-10-12');
    expect(todayLk(Date.parse('2026-10-11T23:59:59Z'))).toBe('2026-10-12');
  });
  it('JRN-027 year and leap-day boundaries', () => {
    expect(todayLk(Date.parse('2026-12-31T18:29:59Z'))).toBe('2026-12-31');
    expect(todayLk(Date.parse('2026-12-31T18:30:00Z'))).toBe('2027-01-01');
    expect(todayLk(Date.parse('2028-02-28T18:30:00Z'))).toBe('2028-02-29');
  });
  it('JRN-028 end to end: a step opening on 14 Nov becomes tickable at Sri Lanka midnight, not UTC midnight', () => {
    const steps = [step('UGC_APPLY', OPEN_DATE)];
    expect(stepWindow('UGC_APPLY', steps, todayLk(Date.parse('2026-11-13T18:29:00Z'))).open).toBe(false);
    expect(stepWindow('UGC_APPLY', steps, todayLk(Date.parse('2026-11-13T18:30:00Z'))).open).toBe(true);
    expect(noticeTickable({ opensOn: OPEN_DATE }, todayLk(Date.parse('2026-11-13T18:30:00Z')))).toBe(true);
  });
  it('JRN-029 default argument uses the current clock (format check)', () => {
    expect(todayLk()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// Type-level guard: every id here must be a JourneyStepId.
const _typed: JourneyStepId[] = [...UGC_IDS];
void _typed;
