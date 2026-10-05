// The student's details on this device (FR-104, NFR-030). Without an account nothing here is stored on a server;
// with an account (CR-001) the same details are also kept in the account so they follow the student between devices.
import type { ProfileInput } from '../shared/api.ts';
import type { Extras } from '../shared/account.ts';
import type { ListEntry } from '../shared/list.ts';
export { INTERESTS, type Achievement, type Extras, type Level, type Place } from '../shared/account.ts';

const KEYS = { profile: 'zedpath.profile.v1', extras: 'zedpath.extras.v1', onboarded: 'zedpath.onboarded.v1', lang: 'zedpath.lang.v1',
  pendingSync: 'zedpath.pendingSync.v1', list: 'zedpath.list.v1', compare: 'zedpath.compare.v1' };
const read = <T,>(k: string): T | null => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : null; } catch { return null; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

export const loadProfile = () => read<ProfileInput>(KEYS.profile);
export const saveProfile = (p: ProfileInput) => write(KEYS.profile, p);
export const loadExtras = (): Extras => read<Extras>(KEYS.extras) ?? { achievements: [], interests: [] };
export const saveExtras = (e: Extras) => write(KEYS.extras, e);
export const isOnboarded = () => read<boolean>(KEYS.onboarded) === true;
export const setOnboarded = () => write(KEYS.onboarded, true);
export const loadLang = () => read<'si' | 'ta' | 'en'>(KEYS.lang) ?? 'en';
export const saveLang = (l: 'si' | 'ta' | 'en') => write(KEYS.lang, l);
/** My list (US-301): kept on this device only (ZP-DOC-05 scope). */
export const loadList = (): ListEntry[] => read<ListEntry[]>(KEYS.list) ?? [];
export const saveList = (l: ListEntry[]) => write(KEYS.list, l);
/** Courses picked for the comparer (Uni-Codes, at most 3). */
export const loadCompare = (): string[] => read<string[]>(KEYS.compare) ?? [];
export const saveCompare = (c: string[]) => write(KEYS.compare, c);
/** Set when a save could not reach the account (offline); the phone's copy is then newer and is pushed, not replaced. */
export const isPendingSync = () => read<boolean>(KEYS.pendingSync) === true;
export const setPendingSync = (v: boolean) => write(KEYS.pendingSync, v);
export function clearEverything() {                                                      // FR-106
  try { Object.values(KEYS).forEach(k => localStorage.removeItem(k)); } catch { /* nothing stored */ }
}

/**
 * Special intake hint (handbook 2025/26 Section 6, printed p.166 to p.167): up to 0.5% of places per course for
 * 1st/2nd/3rd places at national level or achievements at international level between 01.01.2023 and 31.12.2025,
 * for candidates within a Z-score of 0.2000 of their district cut-off; extra places for elite sportspeople in
 * Sports Science and Physical Education. ZedPath only flags that it MAY apply and links the section.
 */
export function specialIntakeHint(e: Extras): { applies: boolean; sport: boolean } {
  const recent = e.achievements.filter(a => a.year >= 2023 && a.year <= 2025);
  const qualifying = recent.filter(a => a.level === 'INTERNATIONAL' || (a.level === 'NATIONAL' && a.place !== 'TAKING_PART'));
  return { applies: qualifying.length > 0, sport: qualifying.some(a => a.kind === 'SPORT') };
}
