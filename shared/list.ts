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

/** Several courses at once (press-and-hold selection on Courses): each goes through addToList, in the order given, so the
 *  same rules hold (eligible only, never twice, never beyond 125). Reports how many were added and why others were not. */
export function addManyToList(list: ListEntry[], entries: ListEntry[]): { list: ListEntry[]; added: number; already: number; full: number } {
  let out = list, added = 0, already = 0, full = 0;
  for (const e of entries) {
    const r = addToList(out, e, true);
    if (r.ok) { out = r.list; added++; } else if (r.reason === 'DUPLICATE') already++; else full++;
  }
  return { list: out, added, already, full };
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

/** Courses the student can reach (Safe, Likely or Reach) that are not on the list yet, counted per band. The handbook
 *  advises applying for as many eligible courses as possible (p.10); this tells the student how many they are leaving out. */
export function missingEligible(list: ListEntry[], offerings: { uniCode: string; band: Band }[]): Record<'SAFE' | 'LIKELY' | 'REACH', number> {
  const listed = new Set(list.map(e => e.uniCode));
  const out = { SAFE: 0, LIKELY: 0, REACH: 0 };
  const seen = new Set<string>();
  for (const o of offerings) {
    if (listed.has(o.uniCode) || seen.has(o.uniCode) || !(o.band === 'SAFE' || o.band === 'LIKELY' || o.band === 'REACH')) continue;
    seen.add(o.uniCode);                                       // a Uni-Code split into two selection groups counts once
    out[o.band]++;
  }
  return out;
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
