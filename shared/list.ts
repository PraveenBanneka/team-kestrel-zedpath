// My list: the student's ordered preference list for the UGC application (US-301..303). Pure functions, shared by the
// app and the tests. The list lives on the student's device (ZP-DOC-05 scope); nothing here touches the server.
import type { Band } from './banding.ts';

export const LIST_MAX = 125;                                  // BR-043 / BR-017: at most 125 Uni-Codes

export interface ListEntry { uniCode: string; group: string; course: string; institution: string; band: Band }
export type AddResult = { ok: true; list: ListEntry[] } | { ok: false; reason: 'NOT_ELIGIBLE' | 'DUPLICATE' | 'FULL' };

const NOT_SAFE: Band[] = ['LIKELY', 'REACH'];

/** FR-301/302/308: add only an eligible offering, never twice, never beyond 125. */
export function addToList(list: ListEntry[], entry: ListEntry, eligible: boolean): AddResult {
  if (!eligible) return { ok: false, reason: 'NOT_ELIGIBLE' };
  if (list.some(e => e.uniCode === entry.uniCode)) return { ok: false, reason: 'DUPLICATE' };
  if (list.length >= LIST_MAX) return { ok: false, reason: 'FULL' };
  return { ok: true, list: [...list, entry] };
}

export interface ListWarnings {
  /** BR-041: Safe entries listed above at least one Likely or Reach entry (those below are unlikely to be reached). */
  safeAbove: ListEntry[];
  /** BR-042: no Safe entry at all, so the student may not be placed anywhere. */
  noSafe: boolean;
}

export function listWarnings(list: ListEntry[]): ListWarnings {
  const lastRisky = list.map(e => NOT_SAFE.includes(e.band)).lastIndexOf(true);
  return {
    safeAbove: list.filter((e, i) => e.band === 'SAFE' && i < lastRisky),
    noSafe: list.length > 0 && !list.some(e => e.band === 'SAFE'),
  };
}

/** FR-305: keep the student's own order among the courses they are reaching for, and move Safe ones to the end
 *  (still in the student's order). Bands other than Safe/Likely/Reach keep their place relative to the risky ones. */
export function proposeOrder(list: ListEntry[]): ListEntry[] {
  return [...list.filter(e => e.band !== 'SAFE'), ...list.filter(e => e.band === 'SAFE')];
}

/** FR-306: Uni-Codes one per line, in list order (for pasting into the UGC application). */
export const uniCodesText = (list: ListEntry[]) => list.map(e => e.uniCode).join('\n');

export function move(list: ListEntry[], from: number, to: number): ListEntry[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
