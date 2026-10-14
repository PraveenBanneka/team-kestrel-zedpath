// The student's details on this device (FR-104, NFR-030). Without an account nothing here is stored on a server;
// with an account (CR-001) the same details are also kept in the account so they follow the student between devices.
import type { ProfileInput } from '../shared/api.ts';
import type { Extras } from '../shared/account.ts';
import type { ListEntry } from '../shared/list.ts';
import { readPrefs, type NotifyPrefs } from '../shared/journey.ts';
export { INTERESTS, specialIntakeHint, type Achievement, type Extras, type Level, type Place } from '../shared/account.ts';

const KEYS = { profile: 'zedpath.profile.v1', extras: 'zedpath.extras.v1', onboarded: 'zedpath.onboarded.v1', lang: 'zedpath.lang.v1',
  pendingSync: 'zedpath.pendingSync.v1', list: 'zedpath.list.v1', compare: 'zedpath.compare.v1',
  journey: 'zedpath.journey.v1', dob: 'zedpath.dob.v1' /* pre-CR-003 phone-only birthday: kept so clearEverything removes it */, alertsSeen: 'zedpath.alertsSeen.v1', reminders: 'zedpath.reminders.v1', demo: 'zedpath.demo' /* audit lead 5: cleared with the phone */,
  notify: 'zedpath.notify.v1' };
const read = <T,>(k: string): T | null => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : null; } catch { return null; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

export const loadProfile = () => read<ProfileInput>(KEYS.profile);
export const saveProfile = (p: ProfileInput) => write(KEYS.profile, p);
export const loadExtras = (): Extras => read<Extras>(KEYS.extras) ?? { achievements: [], interests: [] };
export const saveExtras = (e: Extras) => write(KEYS.extras, e);
export const isOnboarded = () => read<boolean>(KEYS.onboarded) === true;
export const setOnboarded = () => write(KEYS.onboarded, true);
/** Back to the Welcome screen while logged out (keeps results, list and language on the phone). */
export const clearOnboarded = () => { try { localStorage.removeItem(KEYS.onboarded); } catch { /* private mode */ } };
export const loadLang = () => read<'si' | 'ta' | 'en'>(KEYS.lang) ?? 'en';
export const saveLang = (l: 'si' | 'ta' | 'en') => write(KEYS.lang, l);
/** My list (US-301): kept on this device only (ZP-DOC-05 scope). */
export const loadList = (): ListEntry[] => read<ListEntry[]>(KEYS.list) ?? [];
export const saveList = (l: ListEntry[]) => write(KEYS.list, l);
/** Courses picked for the comparer (Uni-Codes, at most 3). */
export const loadCompare = (): string[] => read<string[]>(KEYS.compare) ?? [];
export const saveCompare = (c: string[]) => write(KEYS.compare, c);
/** Journey (CR-002): notices the student added (route ids). On this device only. */
export const loadJourney = (): string[] => read<string[]>(KEYS.journey) ?? [];
export const saveJourney = (ids: string[]) => write(KEYS.journey, ids);
/** Alerts the student has seen (route ids), for the unread count on the bell. */
export const loadAlertsSeen = (): string[] => read<string[]>(KEYS.alertsSeen) ?? [];
export const saveAlertsSeen = (ids: string[]) => write(KEYS.alertsSeen, ids);
/** Reminder ids currently scheduled on this phone (so a change cancels the old ones first). */
export const loadReminderIds = (): number[] => read<number[]>(KEYS.reminders) ?? [];
export const saveReminderIds = (ids: number[]) => write(KEYS.reminders, ids);
/** Notification settings (video 2): on this phone only, like the reminders they control. */
export const loadNotifyPrefs = (): NotifyPrefs => readPrefs(read<unknown>(KEYS.notify));
export const saveNotifyPrefs = (p: NotifyPrefs) => write(KEYS.notify, p);
/** Set when a save could not reach the account (offline); the phone's copy is then newer and is pushed, not replaced. */
export const isPendingSync = () => read<boolean>(KEYS.pendingSync) === true;
export const setPendingSync = (v: boolean) => write(KEYS.pendingSync, v);
export function clearEverything() {                                                      // FR-106
  try { Object.values(KEYS).forEach(k => localStorage.removeItem(k)); } catch { /* nothing stored */ }
}
