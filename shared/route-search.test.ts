// TC-146: search inside each group of other paths, on the real compiled catalogue.
import { describe, expect, it } from 'vitest';
import book from '../worker/generated/rulebook-2025-2026.json' with { type: 'json' };
import type { Rulebook } from './rulebook.ts';
import { acronyms, searchRoutes } from './route-search.ts';

const routes = (book as unknown as Rulebook).routes;
const group = (g: string) => routes.filter(r => r.group === g);
const names = (hits: { route: { name: string } }[]) => hits.map(h => h.route.name);

describe('searchRoutes (TC-146)', () => {
  it('an empty query keeps the whole list, in order', () => {
    expect(searchRoutes('  ', group('PROFESSIONAL')).map(h => h.route)).toEqual(group('PROFESSIONAL'));
  });
  it('finds institutes by name or short name, ignoring case', () => {
    expect(searchRoutes('sliit', group('PRIVATE_DEGREE')).every(h => /SLIIT|Sri Lanka Institute of Information Technology/.test(`${h.route.name} ${h.route.provider}`))).toBe(true);
    expect(searchRoutes('SLIIT', group('PRIVATE_DEGREE')).length).toBeGreaterThanOrEqual(4);   // loan courses, Ministry-recognised, LJMU
    expect(names(searchRoutes('acca', group('PROFESSIONAL')))).toEqual(['ACCA Qualification (Chartered Certified Accountant)', 'ACCA Foundations in Accountancy (FIA)']);
  });
  it('derives the short names students type from the provider', () => {
    expect(acronyms('Sri Lanka Institute of Information Technology')).toEqual(['SLIIT']);
    expect(acronyms('The Open University of Sri Lanka (Faculty of Engineering Technology, Dept. of Electrical and Computer Engineering)')[0]).toBe('OUSL');
    expect(acronyms('Department of Technical Education and Training (DTET)')).toContain('DTET');
    expect(names(searchRoutes('nsbm', group('PRIVATE_DEGREE'))).length).toBeGreaterThanOrEqual(5);
  });
  it('finds subjects inside programme lists and says which programmes matched', () => {
    const law = searchRoutes('law', group('PRIVATE_DEGREE'));
    const sliit = law.find(h => h.route.name === "Bachelor's degrees at SLIIT (Ministry-recognised)")!;
    expect(sliit.programmes).toEqual(['Bachelor of Laws Honours']);
    expect(law.length).toBeGreaterThan(5);
    const soft = searchRoutes('sliit software', group('PRIVATE_DEGREE'));
    expect(soft.some(h => h.programmes.includes('Bachelor of Science Honours in Software Engineering'))).toBe(true);
  });
  it('lists paths matched by name before paths matched only through a programme', () => {
    const hits = searchRoutes('psychology', group('PRIVATE_DEGREE'));
    const firstVia = hits.findIndex(h => h.programmes.length > 0);
    expect(firstVia).toBeGreaterThanOrEqual(0);
    expect(hits.slice(firstVia).every(h => h.programmes.length > 0)).toBe(true);
  });
  it('matches group words and short forms, and nothing for nonsense', () => {
    expect(searchRoutes('hnd', group('DIPLOMA')).length).toBe(group('DIPLOMA').length);
    expect(searchRoutes('zzqx', routes)).toEqual([]);
  });
});
