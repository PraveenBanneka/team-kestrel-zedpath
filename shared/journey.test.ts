import { describe, expect, it } from 'vitest';
import journey from '../worker/generated/journey-2025-2026.json' with { type: 'json' };
import type { ProfileInput } from './api.ts';
import { DEFAULT_PREFS, readPrefs } from './journey.ts';
import { ageOn, buildJourney, checkNotice, daysUntil, noticeItem, reminderId, reminderTimes, sortNotices, toIcs, type JourneyResponse, type Notice } from './journey.ts';

const J = journey as unknown as JourneyResponse;
const customs = J.notices.find(n => n.routeId === 'R043')!;      // 3 A/L passes in one sitting; age 18-24 on 2026-10-12
const ndt = J.notices.find(n => n.routeId === 'R027')!;          // Physics + Chemistry + (C. Maths or H. Maths); below 24 on 2025-12-31
const naita = J.notices.find(n => n.routeId === 'R041')!;        // no A/L rule
const PHYS: ProfileInput = { stream: 'PHYS', district: 'KUR', zE4: 14821, al: { CMATH: 'B', PHY: 'C', CHEM: 'S' } };
const ICT: ProfileInput = { stream: 'PHYS', district: 'KUR', zE4: 14821, al: { CMATH: 'B', PHY: 'C', ICT: 'A' } };

describe('the bundled notices and steps', () => {
  it('are the official ones, with sources', () => {
    expect(J.steps.map(s => s.id)).toEqual(['UGC_APPLY', 'UGC_ORDER', 'APTITUDE', 'UGC_SELECTION', 'UGC_REGISTER']);
    expect(customs.closesOn).toBe('2026-10-12');
    for (const n of J.notices) expect(n.sourceLocator).toMatch(/\S/);
  });
});

describe('dates and ages', () => {
  it('counts calendar days', () => { expect(daysUntil('2026-10-12', '2026-10-11')).toBe(1); expect(daysUntil('2026-10-10', '2026-10-11')).toBe(-1); });
  it('computes age on a date, birthday included', () => {
    expect(ageOn('2002-10-12', '2026-10-12')).toBe(24);
    expect(ageOn('2002-10-13', '2026-10-12')).toBe(23);
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
  });
});

describe('checkNotice (eligibility, on the phone)', () => {
  it('meets the Customs exam with 3 passes and the right age, and says when it closes', () => {
    expect(checkNotice(customs, PHYS, '2006-05-01', '2026-10-11')).toEqual({ status: 'OPEN', daysLeft: 1, al: 'MEETS', age: 'MEETS', forYou: true });
  });
  it('uses the official age bounds inclusively: 24 on the closing date is in, 25 is out', () => {
    expect(checkNotice(customs, PHYS, '2002-10-12', '2026-10-11').age).toBe('MEETS');
    expect(checkNotice(customs, PHYS, '2001-10-12', '2026-10-11')).toMatchObject({ age: 'NOT_MET', forYou: false });
  });
  it('checks named subjects: NDT needs Physics, Chemistry and C. Maths or H. Maths', () => {
    expect(checkNotice(ndt, PHYS, null, '2026-10-11')).toMatchObject({ al: 'MEETS', age: 'UNKNOWN', forYou: true });
    expect(checkNotice(ndt, ICT, null, '2026-10-11')).toMatchObject({ al: 'NOT_MET', forYou: false });
  });
  it('says UNKNOWN (never a guess) without results or a birth date, and NOT_NEEDED where no A/L rule exists', () => {
    expect(checkNotice(customs, null, null, '2026-10-11')).toMatchObject({ al: 'UNKNOWN', age: 'UNKNOWN', forYou: true });
    expect(checkNotice(naita, PHYS, null, '2026-10-11').al).toBe('NOT_NEEDED');
  });
  it('marks closed and not-yet-open notices', () => {
    expect(checkNotice(customs, PHYS, null, '2026-10-13')).toMatchObject({ status: 'CLOSED', forYou: false });
    expect(checkNotice({ ...customs, opensOn: '2026-10-20', closesOn: '2026-11-01' } as Notice, PHYS, null, '2026-10-11').status).toBe('UPCOMING');
  });
  it('sorts open ones by closing date first, closed ones last', () => {
    const xs = J.notices.map(n => ({ n, c: checkNotice(n, PHYS, null, '2026-10-11') }));
    expect(sortNotices(xs).map(x => x.n.routeId)).toEqual(['R043', 'R040', 'R041', 'R027', 'R023', 'R044']);
  });
  it('OUSL Software Engineering (refresh of 23 Oct): upcoming before 15 Oct, open to 7 Nov, needs 3 A/L passes and no age rule', () => {
    const ousl = J.notices.find(n => n.routeId === 'R023')!;
    expect([ousl.opensOn, ousl.closesOn, ousl.age]).toEqual(['2026-10-15', '2026-11-07', null]);
    expect(checkNotice(ousl, PHYS, null, '2026-10-11').status).toBe('UPCOMING');
    expect(checkNotice(ousl, PHYS, null, '2026-10-23')).toMatchObject({ status: 'OPEN', al: 'MEETS', age: 'NOT_NEEDED', forYou: true });
    expect(checkNotice(ousl, PHYS, null, '2026-11-08').status).toBe('CLOSED');
  });
});

describe('buildJourney (FR-401, FR-403)', () => {
  const items = [noticeItem(ndt), noticeItem(customs), { ...noticeItem(customs), id: 'old', due: '2026-09-01' }];
  it('puts the soonest open date first, then the rest, then past ones', () => {
    const v = buildJourney(J.steps, [], items, '2026-10-11');
    expect(v.next?.id).toBe('notice:R043');
    expect(v.next?.daysLeft).toBe(1);
    expect(v.upcoming.map(i => i.id)).toEqual(['notice:R027']);
    expect(v.past.map(i => i.id)).toEqual(['old']);
  });
  it('shows the aptitude step only when a listed course has a test, with those courses', () => {
    expect(buildJourney(J.steps, [], [], '2026-10-11').steps.map(s => s.id)).not.toContain('APTITUDE');
    const v = buildJourney(J.steps, ['Architecture, Moratuwa'], [], '2026-10-11');
    expect(v.steps.find(s => s.id === 'APTITUDE')?.courses).toEqual(['Architecture, Moratuwa']);
  });
});

describe('reminders (FR-404, FR-405)', () => {
  it('reminds 7 days and 1 day before at 08:00 local time, future times only', () => {
    const r = reminderTimes('2026-10-19', new Date(2026, 9, 11, 9, 0));
    expect(r.map(x => [x.daysBefore, x.at.getDate(), x.at.getHours()])).toEqual([[7, 12, 8], [1, 18, 8]]);
    expect(reminderTimes('2026-10-12', new Date(2026, 9, 11, 9, 0))).toEqual([]);     // both moments already passed
  });
  it('gives each reminder a stable id above the reserved range', () => {
    expect(reminderId('notice:R043', 7)).toBe(reminderId('notice:R043', 7));
    expect(reminderId('notice:R043', 7)).not.toBe(reminderId('notice:R043', 1));
    expect(reminderId('x', 1)).toBeGreaterThanOrEqual(1000);
  });
  it('writes a valid calendar file with two alarms per date', () => {
    const ics = toIcs([noticeItem(customs)], new Date('2026-10-11T00:00:00Z'));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261012\r\nDTEND;VALUE=DATE:20261013');
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain('TRIGGER:-P7D');
    expect(ics).toContain('SUMMARY:Inspector of Customs\\, Grade II: open competitive exam');   // commas escaped
  });
});

describe('notification settings (video 2)', () => {
  it('defaults to the behaviour before settings existed: 7 days and 1 day before, 08:00, bell count on', () => {
    expect(DEFAULT_PREFS).toEqual({ week: true, day: true, hour: 8, badge: true });
    expect(readPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(readPrefs({ week: 'yes', hour: 7, badge: false })).toEqual({ ...DEFAULT_PREFS, badge: false });   // field by field
  });
  it('follows the chosen days and hour, in reminders and in the calendar file', () => {
    const now = new Date(2026, 9, 1, 9, 0);
    expect(reminderTimes('2026-10-19', now, { ...DEFAULT_PREFS, week: false, hour: 18 }).map(r => [r.daysBefore, r.at.getHours()])).toEqual([[1, 18]]);
    expect(reminderTimes('2026-10-19', now, { ...DEFAULT_PREFS, week: false, day: false })).toEqual([]);
    const item = { id: 'notice:R1', title: 'X', detail: 'd', due: '2026-10-19', source: 's' };
    expect(toIcs([item], now).match(/TRIGGER:[^\r]+/g)).toEqual(['TRIGGER:-P7D', 'TRIGGER:-P1D']);   // unchanged default
    expect(toIcs([item], now, { ...DEFAULT_PREFS, week: false, hour: 18 }).match(/TRIGGER:[^\r]+/g)).toEqual(['TRIGGER:-P0DT6H']);   // 18:00 the day before
  });
});
