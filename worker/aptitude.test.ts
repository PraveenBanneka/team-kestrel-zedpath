// Aptitude / practical tests on the course page (data/aptitude/aptitude-2025-2026.json; every date re-read on the official
// page on 2026-10-15). Proves: every offering that needs a test gets its official notice (or the joint-test notices),
// last intake's dates are marked past and never shown as upcoming, and every link is an official https university page.
import { describe, expect, it } from 'vitest';
import app from './index.ts';
import book from './generated/rulebook-2025-2026.json' with { type: 'json' };
import apt from '../data/aptitude/aptitude-2025-2026.json' with { type: 'json' };
import type { OfferingDetail } from '../shared/api.ts';

const env = {} as Env;
const detail = async (u: string) => (await (await app.request(`/api/offerings/${u}`, {}, env)).json()) as OfferingDetail;
const needing = (book as { offerings: { uniCode: string; hasAptitudeTest: boolean }[] }).offerings.filter(o => o.hasAptitudeTest).map(o => o.uniCode);
// University of Moratuwa publishes on uom.lk (its own domain); every other notice is on the university's *.ac.lk site.
const OFFICIAL = /^https:\/\/([a-z0-9-]+\.)*(ac\.lk|uom\.lk)\//;

describe('aptitude tests', () => {
  it('covers all 24 offerings that need a test, with an official notice or the joint-test notices', async () => {
    expect(needing).toHaveLength(24);
    for (const u of needing) {
      const a = (await detail(u)).aptitude;
      expect(a, u).not.toBeNull();
      expect(a!.officialUrl !== '' || a!.joint.length > 0, u).toBe(true);
    }
  });
  it('shows last intake as past (Moratuwa Architecture: closed 6 May, test 6 June 2026)', async () => {
    expect((await detail('023G')).aptitude).toMatchObject({ academicYear: '2025/2026', registrationCloses: '2026-05-06', testDate: '2026-06-06', past: true });
  });
  it('points Sabaragamuwa PE and Sports Science to the joint practical test at the other universities', async () => {
    for (const u of ['081L', '082L']) {
      const a = (await detail(u)).aptitude!;
      expect(a.officialUrl).toBe('');
      expect(a.joint.length).toBe(3);
    }
  });
  it('gives no aptitude card to a course without a test', async () => {
    expect((await detail('136L')).aptitude).toBeNull();
  });
  it('links only official https university pages, and never a date it could not read', () => {
    for (const t of apt.tests) {
      expect(t.officialUrl, t.institution).toMatch(OFFICIAL);
      for (const d of [t.registrationOpens, t.registrationCloses, t.testDate]) if (d !== null) expect(d).toMatch(/^2026-\d\d-\d\d$/);
    }
    expect(apt.tests.find(t => t.uniCodes.includes('100D'))?.testDate).toBeNull();   // "28th May" printed without a year
  });
});
