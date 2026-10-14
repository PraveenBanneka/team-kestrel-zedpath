// CR-007: "Try the demo". One tap = a private throwaway account with the sample student, end to end on the real
// migrations (0011). Covers: the schema rules, isolation between visitors, the 24-hour clean-up, the read-only rules in
// groups (no creating groups, no reports, no posts), cross-site refusal, and that real accounts are untouched.
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import app from './index.ts';
import { createTestD1 } from './testing/d1-sqlite.ts';
import { CONSENT_VERSION } from '../shared/contact.ts';
import { DEMO_CONTACT, DEMO_PROFILE } from '../shared/demo-data.ts';
import { GROUP_RULES_VERSION } from '../shared/groups.ts';
import type { MeResponse } from '../shared/account.ts';
import type { MyJourney } from '../shared/journey.ts';

const key = (s: string) => createHash('sha256').update(s).digest('hex');
let env: Env, raw: ReturnType<typeof createTestD1>['raw'], liveHeaders: Headers | null;
beforeEach(() => {
  const t = createTestD1(); raw = t.raw; liveHeaders = null;
  const allow = { limit: async () => ({ success: true }) };
  const GROUP_ROOM = { idFromName: (n: string) => n, get: () => ({ fetch: async (input: Request | string, init?: RequestInit) => {
    liveHeaders = input instanceof Request ? input.headers : new Headers(init?.headers);
    return new Response(null, { status: 204 });
  } }) };
  env = { DB: t.d1, PEPPER: 'p', AUTH_LIMITER: allow, IP_LIMITER: allow, GROUP_ROOM } as unknown as Env;
});
const call = (method: string, p: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) =>
  app.request(`/api${p}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) }, env);
const cookieOf = (r: Response) => r.headers.get('set-cookie')!.split(';')[0];
const n = (sql: string) => (raw.prepare(sql).get() as { n: number }).n;
async function demo() { const r = await call('POST', '/auth/demo'); return { r, me: (await r.json()) as MeResponse, cookie: cookieOf(r) }; }
async function student(username: string) {
  const r = await call('POST', '/auth/signup', { username, key: key(username), profile: DEMO_PROFILE, extras: { achievements: [], interests: [] },
    contact: { ...DEMO_CONTACT, email: `${username}@example.com` }, consent: CONSENT_VERSION });
  return cookieOf(r);
}

describe('migration 0011', () => {
  it('a demo account expires after it was made, and only demo accounts are in the clean-up index', () => {
    expect(() => raw.exec(`INSERT INTO account (auth_subject, role, created_at, demo_expires_at) VALUES ('demo:x', 'STUDENT', '2026-10-15T10:00:00Z', '2026-10-15T09:00:00Z')`)).toThrow();
    raw.exec(`INSERT INTO account (auth_subject, role, created_at) VALUES ('local:x', 'STUDENT', 't')`);   // real account: NULL, as before
    const idx = raw.prepare(`SELECT sql FROM sqlite_master WHERE name = 'idx_account_demo_expires'`).get() as { sql: string };
    expect(idx.sql).toMatch(/WHERE demo_expires_at IS NOT NULL/);
  });
});

describe('Try the demo', () => {
  it('logs in at once with the sample student, results and contact filled, marked as a demo', async () => {
    const { r, me, cookie } = await demo();
    expect(r.status).toBe(201);
    expect(me).toMatchObject({ demo: true, role: 'STUDENT', profile: DEMO_PROFILE, contact: { fullName: DEMO_CONTACT.fullName } });
    expect(me.extras.achievements[0]).toMatchObject({ kind: 'SPORT', level: 'NATIONAL' });
    expect(me.username).toMatch(/^demo_[0-9a-f]{8}$/);
    expect(r.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    expect(((await (await call('GET', '/me', undefined, cookie)).json()) as MeResponse).demo).toBe(true);
  });
  it('gives every visitor their own copy: what one does is invisible to the next', async () => {
    const a = await demo(), b = await demo();
    expect(a.me.username).not.toBe(b.me.username);
    expect((await call('PUT', '/me/journey/courses/136L', undefined, a.cookie)).status).toBe(204);
    expect(((await (await call('GET', '/me/journey', undefined, b.cookie)).json()) as MyJourney).courses).toEqual([]);
  });
  it('cannot be logged into with a password (random verifier)', async () => {
    const { me } = await demo();
    expect((await call('POST', '/auth/login', { username: me.username, key: key(me.username) })).status).toBe(401);
  });
  it('deletes expired demo accounts and all their rows on a later tap, and never touches real accounts', async () => {
    const old = await demo();
    await call('PUT', '/me/journey/courses/136L', undefined, old.cookie);
    await student('real_kasun');
    raw.exec(`UPDATE account SET created_at = '2026-01-01T00:00:00Z', demo_expires_at = '2026-01-02T00:00:00Z' WHERE auth_subject LIKE 'demo:%'`);
    await demo();
    expect(n(`SELECT count(*) AS n FROM account WHERE demo_expires_at IS NOT NULL`)).toBe(1);   // only the fresh one
    expect(n(`SELECT count(*) AS n FROM journey_course`)).toBe(0);                              // cascaded
    expect(n(`SELECT count(*) AS n FROM account WHERE demo_expires_at IS NULL`)).toBe(1);       // the real student stays
    expect((await call('GET', '/me', undefined, old.cookie)).status).toBe(401);
  });
  it('real accounts are not demo accounts', async () => {
    const ck = await student('real_student');
    expect(((await (await call('GET', '/me', undefined, ck)).json()) as MeResponse).demo).toBe(false);
  });
  it('refuses a cross-site tap, and a "null" or malformed Origin gets 403, not a 500', async () => {
    expect((await call('POST', '/auth/demo', undefined, undefined, { Origin: 'https://evil.example' })).status).toBe(403);
    expect((await call('POST', '/auth/demo', undefined, undefined, { Origin: 'null' })).status).toBe(403);
    expect((await call('POST', '/auth/signup', {}, undefined, { Origin: 'not a url' })).status).toBe(403);
  });
});

describe('demo accounts in groups are read-only', () => {
  it('can join a group that already exists, but cannot create one', async () => {
    const real = await student('real_one');
    expect((await call('POST', '/groups/join', { kind: 'COURSE', courseCode: '013', acceptRules: GROUP_RULES_VERSION }, real)).status).toBe(200);
    const { cookie } = await demo();
    expect((await call('POST', '/groups/join', { kind: 'COURSE', courseCode: '013', acceptRules: GROUP_RULES_VERSION }, cookie)).status).toBe(200);
    expect((await call('POST', '/groups/join', { kind: 'COURSE', courseCode: '099', acceptRules: GROUP_RULES_VERSION }, cookie)).status).toBe(403);
    expect(n(`SELECT count(*) AS n FROM course_group WHERE course_code = '099'`)).toBe(0);
  });
  it('cannot report messages, and the live room is told it is read-only (the room refuses its posts)', async () => {
    const real = await student('real_two');
    const g = (await (await call('POST', '/groups/join', { kind: 'COURSE', courseCode: '013', acceptRules: GROUP_RULES_VERSION }, real)).json()) as { id: number };
    const { cookie } = await demo();
    await call('POST', '/groups/join', { kind: 'COURSE', courseCode: '013', acceptRules: GROUP_RULES_VERSION }, cookie);
    expect((await call('POST', `/groups/${g.id}/report`, { messageId: 'm1', reason: 'SPAM' }, cookie)).status).toBe(403);
    await call('GET', `/groups/${g.id}/live`, undefined, cookie, { Upgrade: 'websocket' });
    expect(liveHeaders?.get('X-ZP-ReadOnly')).toBe('1');
    await call('GET', `/groups/${g.id}/live`, undefined, real, { Upgrade: 'websocket' });
    expect(liveHeaders?.get('X-ZP-ReadOnly')).toBe('');
  });
});
