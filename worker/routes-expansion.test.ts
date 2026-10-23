// Other paths, expansion of 23 Oct 2026 (Praveen: "more and more private degrees and professional bodies", "put all"):
// every Ministry-recognised institute, foreign degrees taught in Sri Lanka, KDU fee-paying, and more professional bodies.
// The labels must stay honest: "Ministry-recognised" only for the Section 25A register, foreign degrees always say so.
import { describe, expect, it } from 'vitest';
import book from './generated/rulebook-2025-2026.json' with { type: 'json' };
import type { Rulebook } from '../shared/rulebook.ts';
import { COST_BASES } from '../shared/api.ts';
import { en } from '../src/i18n/en.ts';
import { si } from '../src/i18n/si.ts';
import { ta } from '../src/i18n/ta.ts';

const routes = (book as unknown as Rulebook).routes;
const REGISTER = 'www.mohe.gov.lk';
const recognised = routes.filter(r => r.name.endsWith('(Ministry-recognised)'));
const foreign = routes.filter(r => /foreign degree, not on the Ministry list/.test(r.name));

describe('other paths: expansion (TC-144)', () => {
  it('holds 102 routes: 43 more private-degree paths after the loan courses and 7 more professional ones', () => {
    expect(routes.length).toBe(102);
    expect(routes.filter(r => r.group === 'PRIVATE_DEGREE').length).toBe(17 + 43);
    expect(routes.filter(r => r.group === 'PROFESSIONAL').length).toBe(4 + 7);
  });
  it('lists every Section 25A institute that awards bachelor\'s degrees (31), each citing the register and its programmes', () => {
    expect(recognised.length).toBe(31);
    for (const r of recognised) {
      expect(r.sourceLocator, r.id).toMatch(/Section 25A register \(Last Update: 23 October 2026\), row \d+/);
      expect(r.programmes.length, r.id).toBeGreaterThan(0);
      expect(r.officialUrl === null || !new URL(r.officialUrl).hostname.endsWith('esoft.lk'), r.id).toBe(true);   // host pending Praveen's decision
    }
    expect(recognised.filter(r => new URL(r.sourceUrl!).hostname === REGISTER).length).toBeGreaterThan(5);   // register-only entries
  });
  it('never calls a foreign degree Ministry-recognised, and always names the awarding university', () => {
    expect(foreign.length).toBe(11);   // IIT x2, ICBT, APIIT, NSBM x2, SLIIT, NIBM, RIC, BCAS, ACBT
    for (const r of foreign) {
      expect(r.name, r.id).not.toMatch(/Ministry-recognised/);
      expect(r.name, r.id).toMatch(/^(University of|Robert Gordon|Cardiff|Liverpool|Coventry|London South Bank|Edith Cowan|Victoria)/);
      expect(r.programmes.length, r.id).toBeGreaterThan(0);
    }
  });
  it('programme titles are non-empty and never repeated within a route', () => {
    for (const r of routes) {
      expect(r.programmes.every(p => p.trim().length > 3), r.id).toBe(true);
      expect(new Set(r.programmes).size, r.id).toBe(r.programmes.length);
    }
  });
  it('an unpublished entry rule is null (the screen says so in three languages), never a made-up sentence', () => {
    const none = routes.filter(r => r.requirements === null);
    expect(none.length).toBeGreaterThan(5);
    for (const r of none) expect(r.sourceLocator.length, r.id).toBeGreaterThan(10);
    for (const lang of [en, si, ta]) for (const k of ['routes.reqNone', 'routes.source', 'routes.progs'] as const) expect(lang[k]?.length, k).toBeGreaterThan(5);
    expect(en['routes.progs']).toContain('{n}');
  });
  it('fees shown are only published figures: KDU 1.5M to 17.5M, CA BSc 930k to 1.04M, NSBM-Plymouth 2.6M', () => {
    const cost = (s: RegExp) => routes.find(r => s.test(r.name))!.costText;
    expect(cost(/at KDU$/)).toBe('Rs 1,500,000 to Rs 17,500,000');
    expect(cost(/CA Sri Lanka \(SAB Campus\)/)).toBe('Rs 930,000 to Rs 1,040,000');
    expect(cost(/University of Plymouth degrees at NSBM/)).toBe('Rs 2,600,000');
    expect(routes.filter(r => r.group === 'PROFESSIONAL' && r.free)).toEqual([]);
  });
});

// Praveen 23 Oct: "With real costs for each". A fee is shown with what it covers, so a semester fee or a registration fee
// is never read as the cost of a whole degree.
describe('other paths: what each cost covers (TC-145)', () => {
  it('every route has a known cost basis, and a basis other than TOTAL only comes with a published amount', () => {
    for (const r of routes) {
      expect(COST_BASES, r.id).toContain(r.costBasis);
      if (r.costBasis !== 'TOTAL') expect(r.costText !== null && !r.free, r.id).toBe(true);
    }
  });
  it('every basis is labelled in English, Sinhala and Tamil, both on the route page and in the list', () => {
    for (const b of COST_BASES.filter(x => x !== 'TOTAL')) for (const lang of [en, si, ta]) {
      expect((lang as Record<string, string>)[`routes.cost.${b}`]?.length, `${b} label`).toBeGreaterThan(3);
      expect((lang as Record<string, string>)[`routes.per.${b}`], `${b} line`).toContain('{c}');
    }
  });
  it('shows the published figures with their basis: SLIIT per semester, NIBM per year, CA and AAT to register', () => {
    const by = (s: RegExp) => routes.find(r => s.test(r.name))!;
    expect([by(/^Bachelor's degrees at SLIIT/).costText, by(/^Bachelor's degrees at SLIIT/).costBasis]).toEqual(['Rs 345,000 to Rs 460,000', 'PER_SEMESTER']);
    expect(by(/degrees at NIBM/).costBasis).toBe('PER_YEAR');
    expect([by(/^Chartered Accountancy/).costText, by(/^Chartered Accountancy/).costBasis]).toEqual(['Rs 6,100', 'TO_REGISTER']);
    expect(by(/^AAT Sri Lanka/).costBasis).toBe('TO_REGISTER');
    expect(by(/^Bachelor's degrees at NSBM/).costText).toBe('Rs 2,800,000 to Rs 3,200,000');
  });
  it('never shows an ICBT figure (its only prices are hidden placeholders)', () => {
    for (const r of routes.filter(x => /ICBT/.test(x.name))) expect(r.costText, r.id).toBeNull();
  });
});
