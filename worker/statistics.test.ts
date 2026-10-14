// UGC "Sri Lanka University Statistics 2024" on the course page: the compiled facts equal the verified extracts, every
// fact cites an official ugc.ac.lk table and page, the report's caveats survive as flags, and the API serves them.
// Spot values were also checked by hand against the PDFs on 2026-10-15 (Colombo hostels 5152 / 38.5 %, Colombo admitted
// 3728, Sabaragamuwa undergraduates 9736).
import { describe, expect, it } from 'vitest';
import app from './index.ts';
import stats from './generated/statistics-2024.json' with { type: 'json' };
import type { StatisticsFile } from '../shared/statistics.ts';
import type { OfferingDetail } from '../shared/api.ts';

const S = stats as StatisticsFile;
const fact = (letter: string, kind: string) => S.institutions[letter]?.find(f => f.kind === kind);
const env = {} as Env;

describe('UGC statistics 2024 facts', () => {
  it('match the hand-checked printed values', () => {
    expect(fact('A', 'HOSTEL')).toMatchObject({ value: 5152, share: 38.5, source: { table: '7.1' } });
    expect(fact('A', 'ADMITTED')).toMatchObject({ value: 3728, source: { table: '2.2' } });
    expect(fact('L', 'STUDENTS')).toMatchObject({ value: 9736, source: { table: '3.1(a)' } });
  });
  it('keep the report caveats: provisional 2024, incomplete counts, campuses included, and no number where none was submitted', () => {
    expect(fact('A', 'GRADUATES')?.flags).toEqual(['PROVISIONAL', 'INCOMPLETE']);   // Colombo: some faculties "Information not submitted"
    expect(fact('L', 'GRADUATES')?.flags).toEqual(['PROVISIONAL']);
    expect(fact('U', 'GRADUATES')).toBeUndefined();                                 // Uva Wellassa submitted nothing: no zero shown
    expect(fact('A', 'WELFARE')?.flags).toContain('INCLUDES_CAMPUSES');
  });
  it('cites an official https ugc.ac.lk page for every fact', () => {
    const all = Object.values(S.institutions).flat();
    expect(all.length).toBeGreaterThan(80);
    for (const f of all) {
      expect(f.source.url).toMatch(/^https:\/\/www\.ugc\.ac\.lk\/downloads\/statistics\/stat_2024\/Chapter%20\d\.pdf#page=\d+$/);
      expect(Number.isInteger(f.value) && f.value >= 0).toBe(true);
    }
  });
  it('serves the facts of the offering institution on the course page', async () => {
    const d = (await (await app.request('/api/offerings/136L', {}, env)).json()) as OfferingDetail;   // 136L = Sabaragamuwa (L)
    expect(d.facts.map(f => f.kind).sort()).toEqual(['ADMITTED', 'GRADUATES', 'HOSTEL', 'STUDENTS', 'WELFARE']);
  });
  it('answers 304 to the weak ETag a browser sends back after compression (D-05)', async () => {
    const first = await app.request('/api/offerings/136L', {}, env);
    const tag = first.headers.get('ETag')!;
    expect((await app.request('/api/offerings/136L', { headers: { 'If-None-Match': `W/${tag}` } }, env)).status).toBe(304);
    expect((await app.request('/api/offerings/136L', { headers: { 'If-None-Match': tag } }, env)).status).toBe(304);
    expect((await app.request('/api/offerings/136L', { headers: { 'If-None-Match': 'W/"other"' } }, env)).status).toBe(200);
  });
});
