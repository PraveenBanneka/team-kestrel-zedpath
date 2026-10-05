import { describe, expect, it } from 'vitest';
import app from './index.ts';
import { SYLLABI, SYLLABI_VERSION } from './syllabi.ts';
import type { OfferingDetail } from '../shared/api.ts';

const get = (u: string) => app.request(`/api/offerings/${u}?district=KUR`, {}, {} as Env);

describe('degree syllabi', () => {
  it('serves the official curriculum with its source on the course API', async () => {
    const d = await (await get('026G')).json() as OfferingDetail;
    expect(d.syllabus?.years.length).toBeGreaterThan(0);
    expect(d.syllabus?.sourceUrls.every(u => new URL(u).hostname.endsWith('uom.lk'))).toBe(true);
    expect(d.syllabus?.retrievedOn).toBe('2026-10-05');
  });

  it('never serves or links the unreadable / suspicious Dental source', async () => {
    expect(SYLLABI.has('002B')).toBe(false);
    expect((await (await get('002B')).json() as OfferingDetail).syllabus).toBeNull();
    expect(JSON.stringify([...SYLLABI])).not.toContain('dental.pdn.ac.lk');
    // the published data file itself carries no addresses on that host either (public repo)
    const raw = await import('../data/degrees/syllabi-2026-10-05.json');
    expect(JSON.stringify(raw)).not.toContain('dental.pdn.ac.lk');
  });

  it('returns null for courses not yet researched', async () => {
    expect((await (await get('012F')).json() as OfferingDetail).syllabus).toBeNull();
  });

  it('ties the cache key to the syllabus data, so phones refetch when it changes', async () => {
    const r = await get('026G');
    expect(r.headers.get('ETag')).toContain(`sy-${SYLLABI_VERSION}`);
  });
});
