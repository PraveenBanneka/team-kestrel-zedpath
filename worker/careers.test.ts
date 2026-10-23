// TC-147: CR-013 Career-first mode. The curated map must point at real courses and paths, keep official names, and
// cite only checked, unblocked sources.
import { describe, expect, it } from 'vitest';
import book from '../worker/generated/rulebook-2025-2026.json' with { type: 'json' };
import type { Rulebook } from './rulebook.ts';
import type { OfferingSummary } from './api.ts';
import { CAREERS, careerPaths, findCareers } from './careers.ts';
import { BLOCKED_HOSTS } from '../worker/syllabi.ts';
import { en } from '../src/i18n/en.ts';
import { si } from '../src/i18n/si.ts';
import { ta } from '../src/i18n/ta.ts';

const rb = book as unknown as Rulebook & { courses: Record<string, { name: string }> };
const offering = (courseCode: string, band: OfferingSummary['band'], institution = 'U'): OfferingSummary =>
  ({ uniCode: `${courseCode}${institution}`, courseCode, course: rb.courses[courseCode].name, institution, group: 'ALL', groupLabel: null, band } as OfferingSummary);

describe('career-first mode (TC-147)', () => {
  it('maps twelve careers, each with an English, Sinhala and Tamil name', () => {
    expect(CAREERS.length).toBe(12);
    expect(new Set(CAREERS.map(c => c.id)).size).toBe(12);
    for (const c of CAREERS) for (const lang of [en, si, ta]) expect((lang as Record<string, string>)[`career.${c.id}`]?.length, c.id).toBeGreaterThan(1);
  });
  it('every course is a real UGC course, named exactly as the rulebook names it', () => {
    for (const c of CAREERS) {
      expect(c.courses.length, c.id).toBeGreaterThan(0);
      for (const x of c.courses) expect(rb.courses[x.code]?.name, `${c.id} ${x.code}`).toBe(x.name);
    }
  });
  it('every other path it names exists, and every career leads to at least one other path or a course', () => {
    const ids = new Set(rb.routes.map(r => r.id));
    for (const c of CAREERS) for (const id of c.routeIds) expect(ids.has(id), `${c.id} ${id}`).toBe(true);
    for (const c of CAREERS) expect(careerPaths(c, [], [], rb.routes).routes.length + c.courses.length, c.id).toBeGreaterThan(0);
  });
  it('licence steps cite a checked official page, never a blocked host, and only where verified', () => {
    for (const c of CAREERS.filter(x => x.licence)) {
      const u = new URL(c.licence!.url);
      expect(u.protocol, c.id).toBe('https:');
      expect(u.hostname.endsWith('.gov.lk'), c.id).toBe(true);
      expect(BLOCKED_HOSTS.has(u.hostname), c.id).toBe(false);
      expect(c.licence!.quote.length, c.id).toBeGreaterThan(20);
    }
    expect(CAREERS.filter(x => x.licence).map(x => x.id)).toEqual(['doctor', 'dentist']);
  });
  it('shows the student\'s courses best chance first, with the courses they cannot apply for, and the other paths', () => {
    const doctor = CAREERS.find(c => c.id === 'doctor')!;
    const found = careerPaths(doctor, [offering('001', 'REACH', 'Colombo'), offering('001', 'SAFE', 'Ruhuna'), offering('012', 'SAFE')],
      [{ uniCode: '001X', course: 'Medicine', institution: 'Jaffna', reason: 'Needs Biology', page: 50 }], rb.routes);
    expect(found.courses.map(o => [o.institution, o.band])).toEqual([['Ruhuna', 'SAFE'], ['Colombo', 'REACH']]);
    expect(found.closed.length).toBe(1);
    expect(found.routes.map(h => h.route.id)).toEqual(['R092', 'R051']);   // KDU fee-paying (MBBS), Cuba (Medicine)
  });
  it('finds careers by name or by the words students use, and lists them all for an empty query', () => {
    const label = (c: { id: string }) => (en as Record<string, string>)[`career.${c.id}`];
    expect(findCareers('', label).length).toBe(12);
    expect(findCareers('mbbs', label).map(c => c.id)).toEqual(['doctor']);
    expect(findCareers('soft', label).map(c => c.id)).toEqual(['software']);
    expect(findCareers('attorney', label).map(c => c.id)).toEqual(['lawyer']);
    expect(findCareers('zzqx', label)).toEqual([]);
  });
  it('the law career finds law degrees inside institutes\' programme lists', () => {
    const law = careerPaths(CAREERS.find(c => c.id === 'lawyer')!, [], [], rb.routes);
    expect(law.routes.some(h => h.programmes.includes('Bachelor of Laws Honours'))).toBe(true);
  });
});
