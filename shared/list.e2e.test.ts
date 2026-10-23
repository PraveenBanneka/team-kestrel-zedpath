// E2E-style cases for My list (US-301..303) and the comparer selection (up to 3 courses), added on 2026-10-12.
// Only NEW cases: shared/list.test.ts already covers the basic add/duplicate/full, the simple BR-041/042 warnings,
// proposeOrder, uniCodesText, a basic move and a basic addManyToList.
// Limits under test: BR-017 / BR-043 (docs/03-requirements, ZP-DOC-03): at most 125 Uni-Codes, no duplicates (FR-308).
// Compare: COMPARE_MAX = 3 (src/screens/Compare.tsx). The selection rules live inline in the UI (App.tsx Courses:
// `picked.slice(0, COMPARE_MAX)`; DegreeDetails / Ask: append only when not already picked and fewer than 3), so the
// helpers below mirror those expressions exactly; if the UI changes, update these mirrors.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LIST_MAX, addManyToList, addToList, listWarnings, move, uniCodesText, type ListEntry } from './list.ts';
import type { Band } from './banding.ts';
import { COMPARE_MAX } from '../src/screens/Compare.tsx';
import { clearEverything, loadCompare, loadList, saveCompare, saveList } from '../src/storage.ts';

const e = (uniCode: string, band: Band = 'SAFE'): ListEntry => ({ uniCode, group: 'ALL', course: `Course ${uniCode}`, institution: 'Uni', band });
const codes = (l: ListEntry[]) => l.map(x => x.uniCode);
const fill = (n: number, band: Band = 'SAFE') => Array.from({ length: n }, (_, i) => e(`X${String(i).padStart(3, '0')}`, band));

// Mirrors of the inline UI compare rules (see header comment).
const pickToCompare = (picked: string[]) => picked.slice(0, COMPARE_MAX);
const addToCompare = (compare: string[], code: string) =>
  compare.includes(code) || compare.length >= COMPARE_MAX ? compare : [...compare, code];

// Minimal in-memory localStorage (vitest runs in node here, no DOM).
class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
let mem: MemStorage;
beforeEach(() => { mem = new MemStorage(); (globalThis as { localStorage?: unknown }).localStorage = mem; });
afterEach(() => { delete (globalThis as { localStorage?: unknown }).localStorage; });

describe('LST add: eligibility, duplicates, FULL at 125 (BR-017, BR-043, FR-302, FR-308)', () => {
  it('LST-001 ineligible is refused even on an empty list and the input list is not mutated', () => {
    const list = [e('001A')];
    expect(addToList(list, e('002A'), false)).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' });
    expect(codes(list)).toEqual(['001A']);
  });

  it('LST-002 NOT_ELIGIBLE wins over DUPLICATE and FULL (eligibility checked first)', () => {
    expect(addToList([e('001A')], e('001A'), false)).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' });
    expect(addToList(fill(LIST_MAX), e('NEW1'), false)).toEqual({ ok: false, reason: 'NOT_ELIGIBLE' });
  });

  it('LST-003 DUPLICATE wins over FULL when the list is full and the code is already on it', () => {
    const full = fill(LIST_MAX);
    expect(addToList(full, e(full[60].uniCode), true)).toEqual({ ok: false, reason: 'DUPLICATE' });
  });

  it('LST-004 duplicate is detected by Uni-Code only, even with a different band or group', () => {
    const r = addToList([e('016C', 'SAFE')], { ...e('016C', 'REACH'), group: 'G2', course: 'Other' }, true);
    expect(r).toEqual({ ok: false, reason: 'DUPLICATE' });
  });

  it('LST-005 the 125th entry is accepted (124 -> 125) and the 126th is FULL', () => {
    const r = addToList(fill(LIST_MAX - 1), e('LAST'), true);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.list).toHaveLength(125);
    expect(r.list[124].uniCode).toBe('LAST');
    expect(addToList(r.list, e('ONEMORE'), true)).toEqual({ ok: false, reason: 'FULL' });
  });

  it('LST-006 a successful add returns a new array and leaves the original untouched', () => {
    const list = [e('001A')];
    const r = addToList(list, e('002A'), true);
    expect(r.ok && r.list).not.toBe(list);
    expect(list).toHaveLength(1);
  });

  it('LST-007 Uni-Code comparison is exact (case-sensitive): 016c is not a duplicate of 016C', () => {
    const r = addToList([e('016C')], e('016c'), true);
    expect(r.ok).toBe(true);
  });
});

describe('LST addManyToList: partial success, ordering', () => {
  it('LST-008 keeps the given order and appends after existing entries', () => {
    const r = addManyToList([e('B'), e('A')], [e('Z'), e('C'), e('Y')]);
    expect(codes(r.list)).toEqual(['B', 'A', 'Z', 'C', 'Y']);
    expect([r.added, r.already, r.full]).toEqual([3, 0, 0]);
  });

  it('LST-009 a duplicate inside the batch itself is added once and counted as already', () => {
    const r = addManyToList([], [e('A'), e('B'), e('A')]);
    expect(codes(r.list)).toEqual(['A', 'B']);
    expect([r.added, r.already, r.full]).toEqual([2, 1, 0]);
  });

  it('LST-010 at capacity: fills up to 125 in order, the rest count as full', () => {
    const r = addManyToList(fill(LIST_MAX - 2), [e('P1'), e('P2'), e('P3'), e('P4')]);
    expect(r.list).toHaveLength(LIST_MAX);
    expect(codes(r.list).slice(-2)).toEqual(['P1', 'P2']);
    expect([r.added, r.already, r.full]).toEqual([2, 0, 2]);
  });

  it('LST-011 on a full list, duplicates still count as already (not full)', () => {
    const full = fill(LIST_MAX);
    const r = addManyToList(full, [e(full[0].uniCode), e('NEW')]);
    expect([r.added, r.already, r.full]).toEqual([0, 1, 1]);
    expect(r.list).toBe(full);
  });

  it('LST-012 empty batch is a no-op and returns the same list', () => {
    const list = [e('A')];
    const r = addManyToList(list, []);
    expect(r.list).toBe(list);
    expect([r.added, r.already, r.full]).toEqual([0, 0, 0]);
  });

  it('LST-013 added + already + full always equals the batch size', () => {
    const batch = [e('A'), e('X001'), e('B'), e('A'), e('C'), e('D')];
    const r = addManyToList(fill(LIST_MAX - 2), batch);
    expect(r.added + r.already + r.full).toBe(batch.length);
  });
});

describe('LST remove and reorder', () => {
  it('LST-014 removing an entry (filter by Uni-Code, as MyList does) frees a slot on a full list', () => {
    const full = fill(LIST_MAX);
    const after = full.filter(x => x.uniCode !== full[10].uniCode);
    expect(after).toHaveLength(124);
    expect(addToList(after, e('NEW'), true).ok).toBe(true);
    expect(addToList(after, e(full[10].uniCode), true).ok).toBe(true);   // a removed code can be re-added
  });

  it('LST-015 move down: first to last', () => {
    expect(codes(move([e('A'), e('B'), e('C'), e('D')], 0, 3))).toEqual(['B', 'C', 'D', 'A']);
  });

  it('LST-016 move by one (the up/down arrows) swaps neighbours', () => {
    const l = [e('A'), e('B'), e('C')];
    expect(codes(move(l, 1, 0))).toEqual(['B', 'A', 'C']);
    expect(codes(move(l, 1, 2))).toEqual(['A', 'C', 'B']);
  });

  it('LST-017 invalid moves return the same list instance (no-op)', () => {
    const l = [e('A'), e('B')];
    expect(move(l, 1, 1)).toBe(l);
    expect(move(l, -1, 0)).toBe(l);
    expect(move(l, 0, -1)).toBe(l);
    expect(move(l, 2, 0)).toBe(l);
    expect(move([], 0, 0)).toEqual([]);
  });

  it('LST-018 a valid move does not mutate the input and keeps length and members', () => {
    const l = [e('A'), e('B'), e('C')];
    const m = move(l, 2, 0);
    expect(codes(l)).toEqual(['A', 'B', 'C']);
    expect([...codes(m)].sort()).toEqual(['A', 'B', 'C']);
  });

  it('LST-019 reordering is reflected in the copied Uni-Code text (FR-306)', () => {
    expect(uniCodesText(move([e('012F'), e('001A'), e('016C')], 2, 0))).toBe('016C\n012F\n001A');
    expect(uniCodesText([])).toBe('');
  });
});

describe('LST order warnings (BR-041, BR-042)', () => {
  it('LST-020 SAFE above a REACH warns; SAFE above a LIKELY warns', () => {
    expect(codes(listWarnings([e('S', 'SAFE'), e('R', 'REACH')]).safeAbove)).toEqual(['S']);
    expect(codes(listWarnings([e('S', 'SAFE'), e('L', 'LIKELY')]).safeAbove)).toEqual(['S']);
  });

  it('LST-021 every SAFE above the LAST risky entry is flagged, SAFE after it is not', () => {
    const w = listWarnings([e('S1', 'SAFE'), e('S2', 'SAFE'), e('L', 'LIKELY'), e('S3', 'SAFE'), e('R', 'REACH'), e('S4', 'SAFE')]);
    expect(codes(w.safeAbove)).toEqual(['S1', 'S2', 'S3']);
    expect(w.noSafe).toBe(false);
  });

  it('LST-022 no warning when the order is fine (risky first, Safe last) or all Safe', () => {
    expect(listWarnings([e('R', 'REACH'), e('L', 'LIKELY'), e('S', 'SAFE')])).toEqual({ safeAbove: [], noSafe: false });
    expect(listWarnings([e('S1', 'SAFE'), e('S2', 'SAFE')])).toEqual({ safeAbove: [], noSafe: false });
    expect(listWarnings([])).toEqual({ safeAbove: [], noSafe: false });
  });

  it('LST-023 OUT_OF_RANGE / NO_DATA below a Safe entry do not trigger the ordering warning', () => {
    const w = listWarnings([e('S', 'SAFE'), e('O', 'OUT_OF_RANGE' as Band), e('N', 'NO_DATA' as Band)]);
    expect(w.safeAbove).toEqual([]);
  });

  it('LST-024 moving the Safe entry to the bottom clears the note (the student moves it; ZedPath never does, CR-011)', () => {
    const l = [e('S', 'SAFE'), e('R', 'REACH'), e('L', 'LIKELY')];
    expect(listWarnings(l).safeAbove).toHaveLength(1);
    expect(listWarnings(move(l, 0, 2)).safeAbove).toEqual([]);
  });

  it('LST-025 only Likely/Reach entries: no ordering warning, but the coverage warning (no Safe)', () => {
    expect(listWarnings([e('L', 'LIKELY'), e('R', 'REACH')])).toEqual({ safeAbove: [], noSafe: true });
  });
});

describe('LST compare selection (max 3, in selection order)', () => {
  it('LST-026 COMPARE_MAX is 3', () => {
    expect(COMPARE_MAX).toBe(3);
  });

  it('LST-027 multi-select keeps the first 3 picked, in the order picked', () => {
    expect(pickToCompare(['C', 'A', 'D', 'B'])).toEqual(['C', 'A', 'D']);
    expect(pickToCompare(['B'])).toEqual(['B']);
  });

  it('LST-028 adding one at a time appends in order, ignores a repeat, and stops at 3', () => {
    let c: string[] = [];
    for (const u of ['016C', '001A', '016C', '012F', '099Z']) c = addToCompare(c, u);
    expect(c).toEqual(['016C', '001A', '012F']);
  });
});

describe('LST storage round-trip (src/storage.ts, on-device only)', () => {
  it('LST-029 list round-trips with order and all fields intact', () => {
    const l = [e('016C', 'REACH'), e('001A', 'LIKELY'), e('012F', 'SAFE')];
    saveList(l);
    expect(loadList()).toEqual(l);
  });

  it('LST-030 compare round-trips in selection order', () => {
    saveCompare(['B', 'A', 'C']);
    expect(loadCompare()).toEqual(['B', 'A', 'C']);
  });

  it('LST-031 nothing stored -> empty list and empty compare (safe default)', () => {
    expect(loadList()).toEqual([]);
    expect(loadCompare()).toEqual([]);
  });

  it('LST-032 corrupted JSON -> safe default, no throw', () => {
    mem.setItem('zedpath.list.v1', '{not json');
    mem.setItem('zedpath.compare.v1', '["A",');
    expect(loadList()).toEqual([]);
    expect(loadCompare()).toEqual([]);
  });

  it('LST-033 storage unavailable (private mode / getItem throws) -> safe default; save does not throw', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('denied'); },
    };
    expect(loadList()).toEqual([]);
    expect(() => saveList([e('A')])).not.toThrow();
    expect(() => clearEverything()).not.toThrow();
  });

  it('LST-034 a full 125-entry list survives the round-trip', () => {
    const full = fill(LIST_MAX);
    saveList(full);
    expect(loadList()).toHaveLength(LIST_MAX);
    expect(codes(loadList())).toEqual(codes(full));
  });

  it('LST-035 clearEverything removes the list and the compare picks', () => {
    saveList([e('A')]); saveCompare(['A']);
    clearEverything();
    expect(loadList()).toEqual([]);
    expect(loadCompare()).toEqual([]);
  });

  // KNOWN GAP (documented, not fixed: app code is out of scope for this task). `read` only catches JSON parse errors;
  // valid JSON of the wrong shape (e.g. an object or a string) is returned as-is, so loadList() is not an array.
  it('LST-036 valid JSON of the wrong shape gives an empty list (D-12, fixed 2026-10-15)', () => {
    mem.setItem('zedpath.list.v1', '{"a":1}');
    expect(Array.isArray(loadList())).toBe(true);
  });
});
