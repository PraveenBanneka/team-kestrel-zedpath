// Desktop side menu (Praveen 2026-10-21): open by default, remembered per device when collapsed, forgotten with the phone.
import { beforeEach, describe, expect, it } from 'vitest';

const store = new Map<string, string>();
let broken = false;
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => { if (broken) throw new Error('blocked'); return store.get(k) ?? null; },
  setItem: (k: string, v: string) => { if (broken) throw new Error('blocked'); store.set(k, String(v)); },
  removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0,
};
const S = await import('./storage.ts');

describe('desktop side menu preference', () => {
  beforeEach(() => { store.clear(); broken = false; });
  it('is open by default (pinned safe default)', () => {
    expect(S.loadNavOpen()).toBe(true);
  });
  it('remembers collapsed and open', () => {
    S.saveNavOpen(false);
    expect(S.loadNavOpen()).toBe(false);
    S.saveNavOpen(true);
    expect(S.loadNavOpen()).toBe(true);
  });
  it('stays open when storage is blocked (private mode), and saving never throws', () => {
    broken = true;
    expect(S.loadNavOpen()).toBe(true);
    expect(() => S.saveNavOpen(false)).not.toThrow();
  });
  it('"clear this phone" forgets it, but clearing student data keeps it (like the language)', () => {
    S.saveNavOpen(false);
    S.clearStudentData();
    expect(S.loadNavOpen()).toBe(false);
    S.clearEverything();
    expect(S.loadNavOpen()).toBe(true);
  });
});
