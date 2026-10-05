import { describe, expect, it } from 'vitest';
import { LIST_MAX, addToList, listWarnings, move, proposeOrder, uniCodesText, type ListEntry } from './list.ts';
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

  it('proposes an order that keeps the student\'s wishes first and Safe ones last (FR-305)', () => {
    const fixed = proposeOrder([e('S1', 'SAFE'), e('R1', 'REACH'), e('S2', 'SAFE'), e('L1', 'LIKELY')]);
    expect(fixed.map(x => x.uniCode)).toEqual(['R1', 'L1', 'S1', 'S2']);
    expect(listWarnings(fixed).safeAbove).toEqual([]);
  });

  it('copies Uni-Codes one per line in list order (FR-306) and moves entries', () => {
    expect(uniCodesText([e('012F', 'SAFE'), e('001A', 'REACH')])).toBe('012F\n001A');
    expect(move([e('A', 'SAFE'), e('B', 'SAFE'), e('C', 'SAFE')], 2, 0).map(x => x.uniCode)).toEqual(['C', 'A', 'B']);
    expect(move([e('A', 'SAFE')], 0, 5).map(x => x.uniCode)).toEqual(['A']);
  });
});
