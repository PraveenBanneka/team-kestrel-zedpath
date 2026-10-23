// The three dictionaries stay in step: every key, every {placeholder} and every <b> kept, nothing left in English by
// accident, and t() fills values and falls back safely.
import { describe, expect, it } from 'vitest';
import { en, type Key } from './en.ts';
import { si } from './si.ts';
import { ta } from './ta.ts';
import { setLang, t } from './index.ts';

const keys = Object.keys(en) as Key[];
const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
const bolds = (s: string) => (s.match(/<\/?b>/g) ?? []).length;
// Words that are the same in every language (names, codes) may legitimately match the English.
const SAME_OK = new Set<Key>(['intro.count', 'about.stepOf', 'rg.DIPLOMA.sub', 'rg.PROFESSIONAL.sub', 'rg.VOCATIONAL.sub',
  'apply.ph.address' /* CR-012: an example address; the UGC form is filled in English */]);

for (const [name, dict] of [['Sinhala', si], ['Tamil', ta]] as const) {
  describe(`${name} dictionary`, () => {
    it('has exactly the English keys', () => expect(Object.keys(dict).sort()).toEqual([...keys].sort()));
    it('keeps every placeholder and bold tag, and has no empty text', () => {
      for (const k of keys) {
        expect(dict[k].trim(), k).not.toBe('');
        expect(holes(dict[k]), k).toEqual(holes(en[k]));
        expect(bolds(dict[k]), k).toBe(bolds(en[k]));
      }
    });
    it('is actually translated (in that script), not English left in place', () => {
      const script = name === 'Sinhala' ? /[඀-෿]/ : /[஀-௿]/;
      const untranslated = keys.filter(k => !SAME_OK.has(k) && /[a-z]{3}/i.test(en[k]) && !script.test(dict[k]));
      expect(untranslated).toEqual([]);
    });
  });
}

describe('t()', () => {
  it('fills placeholders, switches language and leaves unknown placeholders visible', () => {
    setLang('en');
    expect(t('paths.reach', { n: 40 })).toBe('40 courses within your reach');
    expect(t('paths.reach')).toBe('{n} courses within your reach');
    setLang('si');
    expect(t('nav.paths')).toBe(si['nav.paths']);
    setLang('ta');
    expect(t('paths.reach', { n: 40 })).toContain('40');
    setLang('en');
  });
});
