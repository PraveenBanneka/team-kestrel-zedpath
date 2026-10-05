// Everything about the student lives only on this device (FR-104, NFR-030). Nothing here is sent for storage.
import type { ProfileInput } from '../shared/api.ts';

export type Level = 'SCHOOL' | 'ZONAL' | 'DISTRICT' | 'PROVINCIAL' | 'NATIONAL' | 'INTERNATIONAL';
export type Place = 'FIRST' | 'SECOND' | 'THIRD' | 'TAKING_PART';
export interface Achievement { id: string; activity: string; kind: 'SPORT' | 'COMPETITION' | 'CLUB' | 'ARTS' | 'OTHER'; level: Level; place: Place; year: number }
export interface Extras { achievements: Achievement[]; interests: string[] }

const KEYS = { profile: 'zedpath.profile.v1', extras: 'zedpath.extras.v1', onboarded: 'zedpath.onboarded.v1', lang: 'zedpath.lang.v1' };
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

export const INTERESTS = ['Building apps', 'Maths', 'Science and labs', 'Working with people', 'Business and money', 'Teaching',
  'Health and caring', 'Art and design', 'Languages', 'Law and society', 'Nature and farming', 'Making and engineering', 'Sport'];
