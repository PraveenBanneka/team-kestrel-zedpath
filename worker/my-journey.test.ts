// CR-006: the Journey saved on the account, and avatars, end to end on the real migrations (0010).
// Covers: session required, follow/unfollow with real foreign keys, the "cannot tick before it opens" rule on the
// server, cascade on account delete, the avatar CHECK, and the data carried over from 0009 (group rules).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import app from './index.ts';
import { createTestD1 } from './testing/d1-sqlite.ts';
import { todayLk } from './my-journey.ts';
import { CONSENT_VERSION } from '../shared/contact.ts';
import { JOURNEY_STEP_IDS, stepWindow, noticeTickable, type MyJourney } from '../shared/journey.ts';
import type { MeResponse } from '../shared/account.ts';

const CONTACT = { fullName: 'Test Student', email: 'student@example.com', mobile: '0712345678', birthDate: '2006-05-01' };
const PROFILE = { stream: 'PHYS', district: 'KUR', zE4: 14200, al: { CMATH: 'B', PHY: 'C', CHEM: 'C' } };
const key = (s: string) => createHash('sha256').update(s).digest('hex');
let env: Env, raw: ReturnType<typeof createTestD1>['raw'];
beforeEach(() => {
  const t = createTestD1(); raw = t.raw;
  const allow = { limit: async () => ({ success: true }) };
  env = { DB: t.d1, PEPPER: 'p', AUTH_LIMITER: allow, IP_LIMITER: allow } as unknown as Env;
});
const call = (method: string, p: string, body?: unknown, cookie?: string) => app.request(`/api${p}`, { method,
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }, env);
async function signup(username: string) {
  const r = await call('POST', '/auth/signup', { username, key: key(username), profile: PROFILE, extras: { achievements: [], interests: [] }, contact: CONTACT, consent: CONSENT_VERSION });
  return r.headers.get('set-cookie')!.split(';')[0];
}
const n = (sql: string) => (raw.prepare(sql).get() as { n: number }).n;
const journey = async (ck: string) => (await (await call('GET', '/me/journey', undefined, ck)).json()) as MyJourney;

describe('migration 0010', () => {
  it('fills OFFERING with the 255 Uni-Codes of 2025/26, so a followed course has a real foreign key', () => {
    expect(n('SELECT count(*) AS n FROM offering')).toBe(255);
    raw.exec(`INSERT INTO account (auth_subject, role, created_at) VALUES ('local:x', 'STUDENT', 't')`);
    expect(() => raw.exec(`INSERT INTO journey_course VALUES (1, '999', 'A', 't')`)).toThrow();          // not an offering
    expect(() => raw.exec(`INSERT INTO journey_notice VALUES (1, 'X1', 't', NULL)`)).toThrow();          // bad route id shape
    expect(() => raw.exec(`INSERT INTO journey_notice VALUES (1, 'R043', 't2', 't1')`)).toThrow();       // applied before followed
    expect(() => raw.exec(`INSERT INTO journey_step VALUES (1, 'MADE_UP', 't')`)).toThrow();             // unknown step
    expect(() => raw.exec(`UPDATE account SET avatar = 'a13'`)).toThrow();                               // not a preset
  });
  it('the step list in shared code is the one the CHECK allows (they cannot drift apart)', () => {
    raw.exec(`INSERT INTO account (auth_subject, role, created_at) VALUES ('local:x', 'STUDENT', 't')`);
    for (const s of JOURNEY_STEP_IDS) raw.exec(`INSERT INTO journey_step VALUES (1, '${s}', 't')`);
    expect(n('SELECT count(*) AS n FROM journey_step')).toBe(JOURNEY_STEP_IDS.length);
  });
  it('carries over rules accepted under 0009 and drops the per-membership column', () => {
    const dir = path.resolve(import.meta.dirname, '..', 'migrations'), all = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
    const t = createTestD1(all.filter(f => f < '0010'));                          // the database as it was before 0010
    t.raw.exec(`INSERT INTO account (auth_subject, role, created_at) VALUES ('local:a', 'STUDENT', 't')`);
    t.raw.exec(`INSERT INTO course_group (kind, course_code, created_at) VALUES ('COURSE', '012', 't')`);
    t.raw.exec(`INSERT INTO course_group (kind, course_code, created_at) VALUES ('COURSE', '001', 't')`);
    t.raw.exec(`INSERT INTO group_member VALUES (1, 1, '2026-10-11T08:00:00Z', '2026-10-11'), (2, 1, '2026-10-11T09:00:00Z', '2026-10-11')`);
    t.raw.exec(fs.readFileSync(path.join(dir, '0010_journey_avatars_rules.sql'), 'utf8'));
    expect(t.raw.prepare('SELECT * FROM group_rules_acceptance').all()).toEqual([{ account_id: 1, rules_version: '2026-10-11', accepted_at: '2026-10-11T08:00:00Z' }]);
    expect(t.raw.prepare('PRAGMA table_info(group_member)').all().map(c => (c as { name: string }).name)).not.toContain('rules_version');
    expect(t.raw.prepare('SELECT count(*) AS n FROM group_member').get()).toEqual({ n: 2 });          // memberships kept
  });
});

describe('Journey on the account (CR-006)', () => {
  it('needs a session', async () => {
    expect((await call('GET', '/me/journey')).status).toBe(401);
    expect((await call('PUT', '/me/journey/steps/RESULTS', { done: true })).status).toBe(401);
  });
  it('starts empty: nothing is ticked for the student (safe default)', async () => {
    expect(await journey(await signup('nimal'))).toEqual({ courses: [], notices: [], steps: [] });
  });
  it('follows and unfollows real courses and notices only, never twice', async () => {
    const a = await signup('nimal');
    expect((await call('PUT', '/me/journey/courses/136L', undefined, a)).status).toBe(204);
    expect((await call('PUT', '/me/journey/courses/136L', undefined, a)).status).toBe(204);          // idempotent
    expect((await call('PUT', '/me/journey/courses/999Z', undefined, a)).status).toBe(404);
    expect((await call('PUT', '/me/journey/notices/R043', undefined, a)).status).toBe(204);
    expect((await call('PUT', '/me/journey/notices/R999', undefined, a)).status).toBe(404);
    const j = await journey(a);
    expect(j.courses.map(c => c.uniCode)).toEqual(['136L']);
    expect(j.notices.map(x => [x.routeId, x.appliedAt])).toEqual([['R043', null]]);
    await call('DELETE', '/me/journey/courses/136L', undefined, a);
    expect((await journey(a)).courses).toEqual([]);
  });
  it('lets a step or notice be ticked only once it is open, and checks it on the server', async () => {
    const a = await signup('nimal');
    expect((await call('PUT', '/me/journey/steps/RESULTS', { done: true }, a)).status).toBe(204);    // preparation: open any time
    expect((await call('PUT', '/me/journey/steps/UGC_APPLY', { done: true }, a)).status).toBe(409); // date not announced
    expect((await call('PUT', '/me/journey/steps/NOPE', { done: true }, a)).status).toBe(404);
    expect((await call('PUT', '/me/journey/steps/RESULTS', {}, a)).status).toBe(400);
    expect((await call('PUT', '/me/journey/notices/R043/applied', { applied: true }, a)).status).toBe(404);   // not followed
    await call('PUT', '/me/journey/notices/R043', undefined, a);
    expect((await call('PUT', '/me/journey/notices/R043/applied', { applied: true }, a)).status).toBe(204);   // opened 14 Sep 2026
    expect((await journey(a)).steps.map(s => s.stepId)).toEqual(['RESULTS']);
    expect((await call('PUT', '/me/journey/steps/RESULTS', { done: false }, a)).status).toBe(204);
    expect((await journey(a)).steps).toEqual([]);
  });
  it('is deleted with the account', async () => {
    const a = await signup('nimal');
    await call('PUT', '/me/journey/courses/136L', undefined, a); await call('PUT', '/me/journey/notices/R043', undefined, a);
    await call('PUT', '/me/journey/steps/LIST', { done: true }, a);
    expect((await call('DELETE', '/me', undefined, a)).status).toBe(204);
    expect(n('SELECT (SELECT count(*) FROM journey_course) + (SELECT count(*) FROM journey_notice) + (SELECT count(*) FROM journey_step) AS n')).toBe(0);
  });
});

describe('window rules (shared, also used by the phone)', () => {
  const steps = [{ id: 'UGC_APPLY', opensOn: '2026-12-20' }] as never;
  it('opens preparation steps any time, and UGC steps only from their announced date', () => {
    expect(stepWindow('LIST', steps, '2026-10-11').open).toBe(true);
    expect(stepWindow('UGC_APPLY', steps, '2026-12-19').open).toBe(false);
    expect(stepWindow('UGC_APPLY', steps, '2026-12-20').open).toBe(true);
    expect(stepWindow('UGC_ORDER', steps, '2027-01-01')).toEqual({ open: false, opensOn: null });     // not announced
    expect(noticeTickable({ opensOn: '2026-10-20' }, '2026-10-19')).toBe(false);
    expect(noticeTickable({ opensOn: null }, '2026-10-19')).toBe(true);
  });
  it('uses the Sri Lanka date (UTC+05:30)', () => {
    expect(todayLk(Date.parse('2026-10-11T18:31:00Z'))).toBe('2026-10-12');
    expect(todayLk(Date.parse('2026-10-11T18:29:00Z'))).toBe('2026-10-11');
  });
});

describe('avatar (CR-006)', () => {
  it('accepts a preset or null, nothing else', async () => {
    const a = await signup('nimal');
    expect(((await (await call('PUT', '/me/avatar', { avatar: 'a07' }, a)).json()) as MeResponse).avatar).toBe('a07');
    expect((await call('PUT', '/me/avatar', { avatar: 'https://evil.example/x.png' }, a)).status).toBe(400);
    expect(((await (await call('PUT', '/me/avatar', { avatar: null }, a)).json()) as MeResponse).avatar).toBeNull();
    expect(((await (await call('GET', '/me', undefined, a)).json()) as MeResponse).avatar).toBeNull();      // default: initials
  });
});
