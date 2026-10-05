// Characterisation test for POST /api/results: pins today's exact output for a fixed student, so refactoring the
// eligibility code (shared with Ask ZedPath) cannot silently change anyone's results.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import app from './index.ts';
import type { ResultsResponse } from '../shared/api.ts';

const STUDENT = { stream: 'PHYS', district: 'KUR', zE4: 14821, al: { CMATH: 'B', PHY: 'C', ICT: 'A' } };

describe('POST /api/results (pinned)', () => {
  it('gives exactly the same answer as before the Ask refactor', async () => {
    const r = await app.request('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(STUDENT) }, {} as Env);
    expect(r.status).toBe(200);
    const body = await r.json() as ResultsResponse;
    expect(body.counts).toEqual({ SAFE: 38, LIKELY: 6, REACH: 9, OUT_OF_RANGE: 11, NOT_ENOUGH_DATA: 0 });
    const { computedAt: _ignored, ...stable } = body;
    expect(createHash('sha256').update(JSON.stringify(stable)).digest('hex')).toBe('2051143004f4bea58026fcd7721f315a8de200c7847799b7c294a4c32a553a10');
  });
});
