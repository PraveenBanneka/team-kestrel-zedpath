// CR-011: My list explains the UGC's real rules instead of re-ordering the student's list. Every rule shown cites the UGC
// handbook 2025/26, and the old "move Very likely courses last" proposal is gone from the code.
import { describe, expect, it } from 'vitest';
import { LIST_GUIDE } from './list-guide.ts';
import { en } from './i18n/en.ts';
import { si } from './i18n/si.ts';
import { ta } from './i18n/ta.ts';
import * as list from '../shared/list.ts';

describe('My list: what you need to know (CR-011)', () => {
  it('shows six rules, each with a handbook page or section', () => {
    expect(LIST_GUIDE).toHaveLength(6);
    for (const g of LIST_GUIDE) expect(g.page ?? g.section).toBeTruthy();
  });
  it('has every rule in Sinhala, Tamil and English', () => {
    for (const g of LIST_GUIDE) for (const lang of [en, si, ta]) expect((lang as Record<string, string>)[g.key]?.length).toBeGreaterThan(20);
  });
  it('says to order by preference, never by chance', () => {
    expect(en['list.guide.order']).toMatch(/want them most, not by your chances/);
  });
  it('no longer proposes moving Very likely courses to the end (old FR-305, withdrawn)', () => {
    expect('proposeOrder' in list).toBe(false);
  });
});
