import { describe, expect, it } from 'vitest';
import { LIST_MAX, addManyToList, addToList, listWarnings, missingEligible, move, uniCodesText, type ListEntry } from './list.ts';
import type { Band } from './banding.ts';

const e = (uniCode: string, band: Band): ListEntry => ({ uniCode, group: 'ALL', course: `Course ${uniCode}`, institution: 'Uni', band });

describe('My list (US-301..303)', () => {
  it('adds only eligible offerings, never twice, at most 125 (FR-302, FR-308)', () => {
    expect(addToList([], e('012F', 'SAFE'), false)).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' });
    const one = addToList([], e('012F', 'SAFE'), true);
    expect(one.ok && one.list.map(x => x.uniCode)).toEqual(['012F']);
    expect(addToList([e('012F', 'SAFE')], e('012F', 'SAFE'), true)).toEqual({ ok: false, reason: 'DUPLICATE' });
    const full = Array.from({ length: LIST_MAX }, (_, i) => e(`X${i}`, 'SAFE'));
    expect(addToList(full, e('012F', 'SAFE'), true)).toEqual({ ok: false, reason: 'FULL' });
    expect(LIST_MAX).toBe(125);
  });

  it('warns when a Safe course sits above a Likely or Reach one (BR-041)', () => {
    const w = listWarnings([e('A', 'REACH'), e('B', 'SAFE'), e('C', 'LIKELY'), e('D', 'SAFE')]);
    expect(w.safeAbove.map(x => x.uniCode)).toEqual(['B']);
    expect(listWarnings([e('A', 'REACH'), e('C', 'LIKELY'), e('B', 'SAFE')]).safeAbove).toEqual([]);
  });

  it('warns when there is no Safe course (BR-042), but not for an empty list', () => {
    expect(listWarnings([e('A', 'REACH'), e('B', 'LIKELY')]).noSafe).toBe(true);
    expect(listWarnings([e('A', 'SAFE')]).noSafe).toBe(false);
    expect(listWarnings([]).noSafe).toBe(false);
  });

  it('notes a Safe course above others but never changes the order (CR-011: the UGC follows the student\'s order)', () => {
    const l = [e('S1', 'SAFE'), e('R1', 'REACH'), e('L1', 'LIKELY')];
    const before = l.map(x => x.uniCode);
    expect(listWarnings(l).safeAbove.map(x => x.uniCode)).toEqual(['S1']);
    expect(l.map(x => x.uniCode)).toEqual(before);
  });

  it('copies Uni-Codes one per line in list order (FR-306) and moves entries', () => {
    expect(uniCodesText([e('012F', 'SAFE'), e('001A', 'REACH')])).toBe('012F\n001A');
    expect(move([e('A', 'SAFE'), e('B', 'SAFE'), e('C', 'SAFE')], 2, 0).map(x => x.uniCode)).toEqual(['C', 'A', 'B']);
    expect(move([e('A', 'SAFE')], 0, 5).map(x => x.uniCode)).toEqual(['A']);
  });
});

describe('missingEligible', () => {
  it('counts reachable courses not on the list, once per Uni-Code, ignoring out-of-range ones', () => {
    const offerings = [{ uniCode: 'A', band: 'SAFE' as Band }, { uniCode: 'B', band: 'LIKELY' as Band }, { uniCode: 'B', band: 'REACH' as Band },
      { uniCode: 'C', band: 'REACH' as Band }, { uniCode: 'D', band: 'OUT_OF_RANGE' as Band }, { uniCode: 'E', band: 'SAFE' as Band }];
    expect(missingEligible([e('A', 'SAFE')], offerings)).toEqual({ SAFE: 1, LIKELY: 1, REACH: 1 });
    expect(missingEligible([], [])).toEqual({ SAFE: 0, LIKELY: 0, REACH: 0 });
  });
});

describe('addManyToList (select several on Courses)', () => {
  const e = (u: string): ListEntry => ({ uniCode: u, group: 'ALL', course: 'C ' + u, institution: 'I', band: 'SAFE' });
  it('adds in order, skips ones already on the list, and stops at 125', () => {
    const r = addManyToList([e('001A')], [e('002A'), e('001A'), e('003A')]);
    expect(r.list.map(x => x.uniCode)).toEqual(['001A', '002A', '003A']);
    expect([r.added, r.already, r.full]).toEqual([2, 1, 0]);
    const nearlyFull = Array.from({ length: LIST_MAX - 1 }, (_, i) => e(`X${i}`));
    const f = addManyToList(nearlyFull, [e('100A'), e('101A')]);
    expect([f.added, f.full, f.list.length]).toEqual([1, 1, LIST_MAX]);
  });
});
