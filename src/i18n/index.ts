// Interface language (CR-002: Sinhala and Tamil). English is the source text; si.ts and ta.ts must define every key
// (TypeScript refuses a missing one) and keep every {placeholder} (src/i18n/i18n.test.ts). Official data (course and
// university names, handbook quotes, Gazette notices) is shown as published, in English, and the app says so.
// The App owns the language state and calls setLang(); changing it re-renders the whole tree, so screens just call t().
import { en, type Key } from './en.ts';
import { si } from './si.ts';
import { ta } from './ta.ts';

export type Lang = 'en' | 'si' | 'ta';
export const LANGS: { code: Lang; name: string }[] = [{ code: 'si', name: 'සිංහල' }, { code: 'ta', name: 'தமிழ்' }, { code: 'en', name: 'English' }];
const DICTS: Record<Lang, Record<Key, string>> = { en, si, ta };

let current: Lang = 'en';
export const getLang = () => current;
export function setLang(l: Lang) {
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

/** The text for `key` in the current language, with {name} placeholders filled from `vars`. */
export function t(key: Key, vars: Record<string, string | number> = {}): string {
  const s = DICTS[current][key] ?? en[key];
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Numbers and dates in the current language's conventions (digits stay Western in all three, as on results sheets). */
export const locale = () => (current === 'si' ? 'si-LK' : current === 'ta' ? 'ta-LK' : 'en-GB');
export type { Key };
