// CR-015 (23 Oct 2026): the "Scholarships and loans" group of other paths. The real entries (ids R103 onwards) are being
// researched and fact-checked separately, so the rules are tested on a TEST FIXTURE catalogue below: every name and
// note in it is made up and says so. The same rules run on the real compiled rulebook, so they hold when the verified
// entries are appended to data/routes/ with no code change.
import { describe, expect, it } from 'vitest';
import book from './generated/rulebook-2025-2026.json' with { type: 'json' };
import type { Rulebook } from '../shared/rulebook.ts';
import { ALSO_LISTS, ROUTE_GROUP_CODES, groupSections } from '../shared/route-groups.ts';
import { GROUP_WORDS, searchRoutes } from '../shared/route-search.ts';
import { catalogueErrors, compileRoutes, type CatalogueRoute } from '../tools/rulebook/compile-routes.ts';
import { routePassages } from '../tools/ask/route-passages.ts';
import { en } from '../src/i18n/en.ts';
import { si } from '../src/i18n/si.ts';
import { ta } from '../src/i18n/ta.ts';

const real = (book as unknown as Rulebook).routes;
const SCH = '\u0dc1\u0dd2\u0dc2\u0dca\u200d\u0dba\u0dad\u0dca\u0dc0';   // "scholarship" in Sinhala, as usually typed (with a joiner)

/** TEST FIXTURE, not real data: two ordinary paths, one study-abroad scholarship and two scholarship or loan entries. */
const base = { duration: null, intake_timing: null, entry_requirements_text: null, official_url: null, source_url: null,
  source_locator: 'TEST FIXTURE, no source', retrieved_on: '2026-10-23' };
const FIXTURE: CatalogueRoute[] = [
  { ...base, id: 'R901', route_group: 'PRIVATE_DEGREE', name: 'TEST FIXTURE private degree', provider: 'Fixture Campus', cost_min_lkr: 100000, cost_max_lkr: 200000 },
  { ...base, id: 'R902', route_group: 'DIPLOMA', name: 'TEST FIXTURE diploma', provider: 'Fixture Institute', cost_min_lkr: 0, cost_max_lkr: 0 },
  { ...base, id: 'R903', route_group: 'SCHOLARSHIP_ABROAD', name: 'TEST FIXTURE scholarship abroad', provider: 'Fixture Ministry', cost_min_lkr: null, cost_max_lkr: null },
  { ...base, id: 'R904', route_group: 'SCHOLARSHIP_LOAN', name: 'TEST FIXTURE loan (Interest Free Student Loan Scheme)', provider: 'Fixture Ministry',
    cost_min_lkr: null, cost_max_lkr: null, notes: 'TEST FIXTURE: not a real amount or condition.', for_routes: ['R901', 'R902'] },
  { ...base, id: 'R905', route_group: 'SCHOLARSHIP_LOAN', name: 'TEST FIXTURE grant', provider: 'Fixture Trust',
    cost_min_lkr: null, cost_max_lkr: null, notes: 'TEST FIXTURE: not a real amount.', for_routes: ['R901'] },
];
const compiled = compileRoutes(FIXTURE);
const byId = (id: string) => compiled.find(r => r.id === id)!;
const withRoute = (patch: Partial<CatalogueRoute>, i = 3) => FIXTURE.map((r, k) => k === i ? { ...r, ...patch } : r);

describe('CR-015 scholarships and loans: the group (TC-149)', () => {
  it('accepts the SCHOLARSHIP_LOAN group code and keeps every earlier code', () => {
    expect(ROUTE_GROUP_CODES).toContain('SCHOLARSHIP_LOAN');
    for (const g of ['PRIVATE_DEGREE', 'DIPLOMA', 'PROFESSIONAL', 'VOCATIONAL', 'JOB_EXAM', 'SCHOLARSHIP_ABROAD', 'RETRY']) expect(ROUTE_GROUP_CODES).toContain(g);
    expect(byId('R904').group).toBe('SCHOLARSHIP_LOAN');
    expect(catalogueErrors(FIXTURE)).toEqual([]);
  });
  it('rejects a group code the app does not know', () => {
    expect(catalogueErrors(withRoute({ route_group: 'SCHOLARSHIPS' }, 0))).toEqual(['R901: unknown route_group SCHOLARSHIPS']);
  });
  it('labels every group code, and every cross-listed section, in English, Sinhala and Tamil', () => {
    const sinhala = /[඀-෿]/, tamil = /[஀-௿]/;
    const keys = [...ROUTE_GROUP_CODES.flatMap(g => [`rg.${g}`, `rg.${g}.sub`]), ...Object.values(ALSO_LISTS).map(g => `routes.also.${g}`),
      'routes.waysToPay', 'routes.paysFor', 'routes.award'] as (keyof typeof en)[];
    for (const k of keys) {
      expect(en[k]?.length, k).toBeGreaterThan(3);
      expect((si[k] ?? '').trim(), `si ${k}`).not.toBe('');                // some subtitles are acronyms (SLIATE HNDs, OUSL)
      expect((ta[k] ?? '').trim(), `ta ${k}`).not.toBe('');
      if (/SCHOLARSHIP|waysToPay|paysFor|award/.test(k)) {
        expect(sinhala.test(si[k]), `si ${k}`).toBe(true);
        expect(tamil.test(ta[k]), `ta ${k}`).toBe(true);
      }
    }
    expect([en['rg.SCHOLARSHIP_LOAN'], en['rg.SCHOLARSHIP_LOAN.sub']]).toEqual(['Scholarships and loans', 'Ways to pay for your next step']);
    expect(en['routes.also.SCHOLARSHIP_ABROAD']).toBe('Study abroad scholarships');
  });
  it('cross-lists the study-abroad scholarships (R046 to R051) on its screen without copying them, even with no entries of its own', () => {
    const sec = groupSections('SCHOLARSHIP_LOAN', real);
    expect(sec.also?.group).toBe('SCHOLARSHIP_ABROAD');
    expect(sec.also!.routes.map(r => r.id)).toEqual(['R046', 'R047', 'R048', 'R049', 'R050', 'R051']);
    expect(sec.also!.routes.every(r => real.includes(r))).toBe(true);                      // the same objects, not copies
    expect(sec.own.every(r => r.group === 'SCHOLARSHIP_LOAN')).toBe(true);
    expect(real.filter(r => r.group === 'SCHOLARSHIP_ABROAD').length).toBe(6);            // still listed once in the data
    expect(groupSections('SCHOLARSHIP_LOAN', compiled).own.map(r => r.id)).toEqual(['R904', 'R905']);
    for (const g of ROUTE_GROUP_CODES.filter(x => x !== 'SCHOLARSHIP_LOAN')) expect(groupSections(g, real).also, g).toBeNull();
  });
});

describe('CR-015 for_routes is checked when the rulebook is built (TC-150)', () => {
  it('rejects an id that is not in the catalogue, and the build stops', () => {
    const bad = withRoute({ for_routes: ['R901', 'R999'] });
    expect(catalogueErrors(bad)).toEqual(['R904: for_routes names R999, which is not in the catalogue']);
    expect(() => compileRoutes(bad)).toThrow(/R999/);
  });
  it('rejects for_routes on any group other than SCHOLARSHIP_LOAN', () => {
    for (const g of ROUTE_GROUP_CODES.filter(x => x !== 'SCHOLARSHIP_LOAN'))
      expect(catalogueErrors(withRoute({ for_routes: ['R902'] }, 0).map((r, k) => k === 0 ? { ...r, route_group: g } : r)), g)
        .toEqual(['R901: for_routes is allowed only on SCHOLARSHIP_LOAN routes']);
  });
  it('rejects pointing at itself or at another scholarship or loan, repeating an id, or a value that is not a list', () => {
    expect(catalogueErrors(withRoute({ for_routes: ['R904'] }))).toEqual(['R904: for_routes names R904, a scholarship or loan, not a path it pays for']);
    expect(catalogueErrors(withRoute({ for_routes: ['R905'] }))).toEqual(['R904: for_routes names R905, a scholarship or loan, not a path it pays for']);
    expect(catalogueErrors(withRoute({ for_routes: ['R901', 'R901'] }))).toEqual(['R904: for_routes repeats an id']);
    expect(catalogueErrors(withRoute({ for_routes: 'R901' as unknown as string[] }))).toEqual(['R904: for_routes must be a list of route ids']);
  });
  it('a scholarship or loan may list nothing it pays for (e.g. one for state-university students)', () => {
    const none = compileRoutes(withRoute({ for_routes: undefined }));
    expect(none.find(r => r.id === 'R904')!.forRoutes).toBeUndefined();
  });
  it('the real catalogue passes: for_routes only on SCHOLARSHIP_LOAN, every id real', () => {
    const ids = new Set(real.map(r => r.id));
    for (const r of real) if (r.forRoutes) {
      expect(r.group, r.id).toBe('SCHOLARSHIP_LOAN');
      for (const id of r.forRoutes) expect(ids.has(id), `${r.id} -> ${id}`).toBe(true);
    }
  });
});

describe('CR-015 "Ways to pay" on the route page, computed in the build (TC-151)', () => {
  it('links each path to the scholarships and loans that list it, in catalogue order', () => {
    expect(byId('R901').waysToPay).toEqual(['R904', 'R905']);
    expect(byId('R902').waysToPay).toEqual(['R904']);
    expect(byId('R904').forRoutes).toEqual(['R901', 'R902']);
  });
  it('adds nothing to a path no scholarship lists, so other paths are unchanged', () => {
    expect('waysToPay' in byId('R903')).toBe(false);
    expect('forRoutes' in byId('R901')).toBe(false);
  });
  it('in the real rulebook, waysToPay is exactly the reverse of forRoutes', () => {
    for (const r of real) {
      const payers = real.filter(s => s.forRoutes?.includes(r.id)).map(s => s.id);
      expect(r.waysToPay ?? [], r.id).toEqual(payers);
    }
  });
});

describe('CR-015 a scholarship or loan never shows a cost or "Free" (TC-152)', () => {
  it('a null cost is not free and has no cost text', () => {
    for (const id of ['R904', 'R905']) expect([byId(id).free, byId(id).costText], id).toEqual([false, null]);
    expect([byId('R902').free, byId('R901').costText]).toEqual([true, 'Rs 100,000 to Rs 200,000']);   // pinned: other paths unchanged
  });
  it('rejects a cost on a scholarship or loan: what it gives goes in notes', () => {
    expect(catalogueErrors(withRoute({ cost_min_lkr: 0, cost_max_lkr: 0 }))).toEqual(['R904: a scholarship or loan has no cost; put the amount it gives in notes']);
    expect(catalogueErrors(withRoute({ cost_max_lkr: 50000 }))).toHaveLength(1);
    expect(byId('R904').warning).toBe('TEST FIXTURE: not a real amount or condition.');
  });
  it('holds in the real rulebook too', () => {
    for (const r of real.filter(x => x.group === 'SCHOLARSHIP_LOAN')) expect([r.free, r.costText], r.id).toEqual([false, null]);
  });
});

describe('CR-015 search finds scholarships and loans (TC-153)', () => {
  const screen = [...compiled.filter(r => r.group === 'SCHOLARSHIP_LOAN'), ...real.filter(r => r.group === 'SCHOLARSHIP_ABROAD')];
  const ids = (q: string, list = screen) => searchRoutes(q, list).map(h => h.route.id);
  it('by the words students type, in English', () => {
    for (const q of ['scholarship', 'Mahapola', 'bursary', 'loan', 'loans', 'interest free', 'grant'])
      expect(ids(q), q).toEqual(expect.arrayContaining(['R904', 'R905']));
    expect(ids('IFSLS')).toEqual(['R904']);                                    // the short name, from the path's own name
  });
  it('in Sinhala and Tamil, with or without the zero-width joiner', () => {
    for (const q of [SCH, SCH.replace('\u200d', ''), 'ණය', 'මහපොළ', 'புலமைப்பரிசில்', 'கடன்', 'மகாபொல'])
      expect(ids(q), q).toEqual(expect.arrayContaining(['R904', 'R905']));
    expect(ids(SCH)).toEqual(expect.arrayContaining(['R046', 'R051']));          // the abroad section too
    expect(ids('புலமைப்பரிசில்')).toEqual(expect.arrayContaining(['R046']));
  });
  it('does not match unrelated paths or nonsense', () => {
    expect(ids('mahapola', real.filter(r => r.group === 'PROFESSIONAL'))).toEqual([]);
    expect(ids('zzqx')).toEqual([]);
    expect(GROUP_WORDS.SCHOLARSHIP_ABROAD.startsWith('study abroad scholarship foreign')).toBe(true);   // pinned: English words unchanged
  });
});

describe('CR-015 Ask corpus includes scholarships and what they pay for (TC-154)', () => {
  const passages = routePassages(FIXTURE as Parameters<typeof routePassages>[0]);
  const text = (id: string) => passages.find(p => p.id === `route-${id}`)!.text;
  it('a scholarship or loan says what it gives and what it pays for', () => {
    expect(text('R904')).toContain('(scholarship loan), offered by Fixture Ministry.');
    expect(text('R904')).toContain('What it gives and its conditions: TEST FIXTURE: not a real amount or condition.');
    expect(text('R904')).toContain('Pays for: TEST FIXTURE private degree (Fixture Campus); TEST FIXTURE diploma (Fixture Institute).');
  });
  it('a path names its ways to pay; a path nobody pays for has no such line', () => {
    expect(text('R901')).toContain('Ways to pay: TEST FIXTURE loan (Interest Free Student Loan Scheme) (Fixture Ministry); TEST FIXTURE grant (Fixture Trust).');
    expect(text('R903')).not.toContain('Ways to pay');
    expect(text('R903')).not.toContain('What it gives');
  });
  it('keeps one passage per route with its source, as before', () => {
    expect(passages.map(p => p.id)).toEqual(FIXTURE.map(r => `route-${r.id}`));
    expect(passages.every(p => p.kind === 'ROUTE' && p.source.startsWith('TEST FIXTURE'))).toBe(true);
  });
});
