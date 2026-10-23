// Other paths (Praveen 23 Oct): a published cost of zero is shown as "Free", never "Rs 0", and every route keeps the
// date it was checked against its official source, which the list shows instead of a fixed date.
import { describe, expect, it } from 'vitest';
import book from './generated/rulebook-2025-2026.json' with { type: 'json' };
import type { Rulebook } from '../shared/rulebook.ts';

const routes = (book as unknown as Rulebook).routes;

describe('other paths: cost and checked date', () => {
  it('never shows "Rs 0": zero-cost routes are marked free with no cost text', () => {
    expect(routes.some(r => r.costText === 'Rs 0')).toBe(false);
    for (const r of routes.filter(x => x.free)) expect(r.costText).toBeNull();
    expect(routes.filter(r => r.free).length).toBeGreaterThan(0);          // SLIATE and DTET full-time courses are free
  });
  it('keeps an ISO checked-on date for every route', () => {
    for (const r of routes) expect(r.retrievedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
