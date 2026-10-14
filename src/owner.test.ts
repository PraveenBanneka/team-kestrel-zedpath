// Security audit run-1, lead 7: one student's local data must not flow into the next account on the same phone.
// The phone remembers whose data it holds; App's adopt() clears it when a different username logs in.
import { beforeEach, describe, expect, it } from 'vitest';

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0,
};
const S = await import('./storage.ts');

describe('local data has an owner', () => {
  beforeEach(() => store.clear());
  it('remembers the owner and clears only that student\'s data (language stays)', () => {
    S.setOwner('nimal');
    store.set('zedpath.profile.v1', '{"stream":"PHYS"}'); store.set('zedpath.list.v1', '[]'); store.set('zedpath.lang.v1', '"si"');
    expect(S.loadOwner()).toBe('nimal');
    S.clearStudentData();
    expect(store.has('zedpath.profile.v1') || store.has('zedpath.list.v1')).toBe(false);
    expect(store.get('zedpath.lang.v1')).toBe('"si"');
  });
  it('"clear this phone" also forgets the owner', () => {
    S.setOwner('nimal');
    S.clearEverything();
    expect(S.loadOwner()).toBeNull();
  });
});
