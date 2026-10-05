// Student accounts (CR-001): the database rules (migration 0003) and the API (worker/account.ts), end to end on the
// real migrations. Covers: constraints, cascade delete, own-data isolation, atomic saves, sessions, recovery,
// cross-site refusal, rate limiting and the safe default (no database -> app unchanged).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import app from './index.ts';
import { createTestD1 } from './testing/d1-sqlite.ts';
import { INTERESTS, RECOVERY_RE, type Extras, type MeResponse, type SignupResponse } from '../shared/account.ts';
import type { ProfileInput } from '../shared/api.ts';

const key = (s: string) => createHash('sha256').update(s).digest('hex');      // stands in for the phone's PBKDF2 key
const PROFILE: ProfileInput = { stream: 'PHYS', district: 'KUR', zE4: 14821, al: { CMATH: 'B', PHY: 'C', ICT: 'A' } };
const EXTRAS: Extras = {
  achievements: [{ id: 'x1', activity: 'Chess', kind: 'COMPETITION', level: 'NATIONAL', place: 'SECOND', year: 2024 }],
  interests: ['Maths', 'Building apps'],
};

let env: Env, raw: ReturnType<typeof createTestD1>['raw'], allow = true;
beforeEach(() => {
  const t = createTestD1();
  raw = t.raw; allow = true;
  env = { DB: t.d1, PEPPER: 'test-pepper', AUTH_LIMITER: { limit: async () => ({ success: allow }) } } as unknown as Env;
});

async function call(method: string, p: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) {
  return app.request(`/api${p}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) }, env);
}
const cookieOf = (r: Response) => r.headers.get('set-cookie')!.split(';')[0];
async function signup(username = 'nimal_99', pw = 'pw-one', profile: ProfileInput | null = PROFILE, extras = EXTRAS) {
  const r = await call('POST', '/auth/signup', { username, key: key(pw), profile, extras });
  return { r, cookie: r.status === 201 ? cookieOf(r) : '', body: await r.json() as SignupResponse };
}
const count = (table: string) => (raw.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

describe('migration 0003: database rules', () => {
  it('loads the reference data the student rows point at', () => {
    expect([count('stream'), count('district'), count('subject')]).toEqual([6, 25, 59]);
  });
  it('keeps the interest CHECK list identical to shared INTERESTS', () => {
    const sql = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'migrations', '0003_student_accounts.sql'), 'utf8');
    const list = sql.match(/interest IN \(([^)]*)\)/)![1].match(/'([^']+)'/g)!.map(s => s.slice(1, -1));
    expect(list).toEqual([...INTERESTS]);
  });
  it('refuses bad data at the database level', () => {
    raw.exec(`INSERT INTO account (auth_subject, role, created_at) VALUES ('local:s', 'STUDENT', 't'), ('local:c', 'CURATOR', 't')`);
    const bad = [
      `INSERT INTO account (auth_subject, role, created_at) VALUES ('x', 'ADMIN', 't')`,
      `INSERT INTO password_login VALUES (1, 'Has Caps', '${'a'.repeat(32)}', '${'b'.repeat(64)}', 'PBKDF2-SHA256-600000', 't')`,
      `INSERT INTO password_login VALUES (1, 'ok_name', '${'a'.repeat(32)}', 'short', 'PBKDF2-SHA256-600000', 't')`,
      `INSERT INTO password_login VALUES (1, 'ok_name', '${'a'.repeat(32)}', '${'b'.repeat(64)}', 'MD5', 't')`,
      `INSERT INTO student_profile VALUES (1, 'PHYS', 'KUR', 40001, 't')`,
      `INSERT INTO student_profile VALUES (1, 'MAGIC', 'KUR', 100, 't')`,
      `INSERT INTO student_profile VALUES (1, 'PHYS', 'XXX', 100, 't')`,
      `INSERT INTO student_profile VALUES (2, 'PHYS', 'KUR', 100, 't')`,                    // CURATOR: trigger refuses
      `INSERT INTO session VALUES ('${'c'.repeat(64)}', 1, '2026-10-05', '2026-10-04')`,
      `INSERT INTO student_achievement (account_id, position, activity, kind, level, place, year) VALUES (1, 1, '  ', 'SPORT', 'ZONAL', 'FIRST', 2024)`,
      `INSERT INTO student_achievement (account_id, position, activity, kind, level, place, year) VALUES (1, 1, 'Run', 'SPORT', 'GALACTIC', 'FIRST', 2024)`,
      `INSERT INTO student_interest VALUES (1, 'Napping')`,
      `INSERT INTO student_interest VALUES (2, 'Maths')`,                                   // CURATOR: trigger refuses
    ];
    for (const s of bad) expect(() => raw.exec(s), s).toThrow();
    raw.exec(`INSERT INTO student_profile VALUES (1, 'PHYS', 'KUR', 14821, 't')`);
    const badSubjects = [
      `INSERT INTO student_subject VALUES (1, 4, 'CHEM', 'A')`,           // a fourth subject
      `INSERT INTO student_subject VALUES (1, 1, 'NOPE', 'A')`,           // unknown subject
      `INSERT INTO student_subject VALUES (1, 1, 'PHY', 'D')`,            // no such grade
    ];
    for (const s of badSubjects) expect(() => raw.exec(s), s).toThrow();
    raw.exec(`INSERT INTO student_subject VALUES (1, 1, 'PHY', 'A')`);
    expect(() => raw.exec(`INSERT INTO student_subject VALUES (1, 2, 'PHY', 'B')`)).toThrow();   // same subject twice
  });
});

describe('accounts API', () => {
  it('signs up, sets a session cookie, shows the recovery code once and stores the profile', async () => {
    const { r, cookie, body } = await signup();
    expect(r.status).toBe(201);
    expect(r.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    expect(r.headers.get('set-cookie')).toMatch(/SameSite=Lax/i);
    expect(body.recoveryCode).toMatch(RECOVERY_RE);
    const me = await (await call('GET', '/me', undefined, cookie)).json() as MeResponse;
    expect(me.username).toBe('nimal_99');
    expect(me.profile).toEqual({ stream: 'PHYS', district: 'KUR', zE4: 14821, al: { CMATH: 'B', PHY: 'C', ICT: 'A' } });
    expect(me.extras.achievements.map(({ id, ...a }) => a)).toEqual([{ activity: 'Chess', kind: 'COMPETITION', level: 'NATIONAL', place: 'SECOND', year: 2024 }]);
    expect(me.extras.interests).toEqual(['Building apps', 'Maths']);        // canonical order
    expect(JSON.stringify(raw.prepare('SELECT * FROM password_login').all())).not.toContain(key('pw-one'));   // only a hash
  });

  it('allows an account with no profile yet', async () => {
    const { r, cookie } = await signup('later', 'pw', null, { achievements: [], interests: [] });
    expect(r.status).toBe(201);
    expect((await (await call('GET', '/me', undefined, cookie)).json() as MeResponse).profile).toBeNull();
  });

  it('refuses a taken username, whatever the letter case', async () => {
    await signup('nimal_99');
    const again = await signup('NIMAL_99');
    expect(again.r.status).toBe(409);
    expect(count('account')).toBe(1);                                     // nothing half-created
  });

  it('validates input on the server', async () => {
    expect((await signup('a!')).r.status).toBe(400);
    expect((await signup('ok_name', 'pw', { ...PROFILE, al: { CMATH: 'B', PHY: 'C' } })).r.status).toBe(400);
    expect((await signup('ok_name', 'pw', { ...PROFILE, al: { CMATH: 'B', PHY: 'C', NOPE: 'A' } })).r.status).toBe(400);
    expect((await signup('ok_name', 'pw', PROFILE, { achievements: [], interests: ['Napping'] })).r.status).toBe(400);
    const r = await call('POST', '/auth/signup', { username: 'ok_name', key: 'not-hex', profile: null });
    expect(r.status).toBe(400);
    expect(count('account')).toBe(0);
  });

  it('gives a stable salt, and the same answer shape for unknown usernames', async () => {
    await signup('nimal_99');
    const s1 = await (await call('POST', '/auth/salt', { username: 'nimal_99' })).json() as { salt: string };
    const s2 = await (await call('POST', '/auth/salt', { username: 'Nimal_99' })).json() as { salt: string };
    const u1 = await (await call('POST', '/auth/salt', { username: 'nobody_here' })).json() as { salt: string; kdf: string };
    const u2 = await (await call('POST', '/auth/salt', { username: 'nobody_else' })).json() as { salt: string };
    expect(s1.salt).toBe(s2.salt);
    expect(s1.salt).toBe((raw.prepare('SELECT salt FROM password_login').get() as { salt: string }).salt);
    expect(u1.salt).toMatch(/^[0-9a-f]{32}$/);
    expect(u1.salt).not.toBe(u2.salt);
    expect(u1.kdf).toBe('PBKDF2-SHA256-600000');
  });

  it('logs in with the right key only, with one message for every failure', async () => {
    await signup('nimal_99', 'pw-one');
    const wrong = await call('POST', '/auth/login', { username: 'nimal_99', key: key('nope') });
    const unknown = await call('POST', '/auth/login', { username: 'ghost', key: key('pw-one') });
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    expect(await wrong.json()).toEqual(await unknown.json());
    const ok = await call('POST', '/auth/login', { username: 'NIMAL_99', key: key('pw-one') });
    expect(ok.status).toBe(200);
    expect((await ok.json() as MeResponse).profile?.district).toBe('KUR');
  });

  it('only ever reads or changes the logged-in student’s own rows', async () => {
    const a = await signup('alice', 'pa');
    const b = await signup('bimal', 'pb', { ...PROFILE, district: 'COL', zE4: 10000 });
    const bBefore = await (await call('GET', '/me', undefined, b.cookie)).json();
    const put = await call('PUT', '/me', { accountId: 2, username: 'bimal', profile: { ...PROFILE, zE4: 20000 }, extras: EXTRAS }, a.cookie);
    expect(put.status).toBe(200);
    expect((await put.json() as MeResponse).username).toBe('alice');
    expect(await (await call('GET', '/me', undefined, b.cookie)).json()).toEqual(bBefore);
  });

  it('saves profile and extras together, atomically (no partial write on a bad save)', async () => {
    const { cookie } = await signup();
    const next: Extras = { achievements: [
      { id: 'n1', activity: 'Volleyball', kind: 'SPORT', level: 'PROVINCIAL', place: 'FIRST', year: 2025 },
      { id: 'n2', activity: 'Debate', kind: 'CLUB', level: 'SCHOOL', place: 'TAKING_PART', year: 2023 }], interests: ['Sport'] };
    const ok = await call('PUT', '/me', { profile: { ...PROFILE, al: { CHEM: 'A', PHY: 'A', CMATH: 'A' } }, extras: next }, cookie);
    const me = await ok.json() as MeResponse;
    expect(me.profile?.al).toEqual({ CHEM: 'A', PHY: 'A', CMATH: 'A' });
    expect(me.extras.achievements.map(a => a.activity)).toEqual(['Volleyball', 'Debate']);
    expect(me.extras.interests).toEqual(['Sport']);
    const bad = await call('PUT', '/me', { profile: { ...PROFILE, al: { CHEM: 'A', PHY: 'A', NOPE: 'A' } }, extras: EXTRAS }, cookie);
    expect(bad.status).toBe(400);
    expect(await (await call('GET', '/me', undefined, cookie)).json()).toEqual(me);
  });

  it('ends sessions on log out, and on every device with log out everywhere', async () => {
    const { cookie } = await signup('nimal_99', 'pw');
    const second = cookieOf(await call('POST', '/auth/login', { username: 'nimal_99', key: key('pw') }));
    expect((await call('POST', '/auth/logout', undefined, cookie)).status).toBe(204);
    expect((await call('GET', '/me', undefined, cookie)).status).toBe(401);
    expect((await call('GET', '/me', undefined, second)).status).toBe(200);
    expect((await call('POST', '/auth/logout-all', undefined, second)).status).toBe(204);
    expect((await call('GET', '/me', undefined, second)).status).toBe(401);
  });

  it('refuses an expired session', async () => {
    const { cookie } = await signup();
    raw.exec(`UPDATE session SET created_at = '2020-01-01T00:00:00Z', expires_at = '2020-01-02T00:00:00Z'`);
    expect((await call('GET', '/me', undefined, cookie)).status).toBe(401);
  });

  it('recovers with the one-time code: new password, new code, every old session ended', async () => {
    const { cookie, body } = await signup('nimal_99', 'old-pw');
    const wrong = await call('POST', '/auth/recover', { username: 'nimal_99', code: 'AAAA-AAAA-AAAA-AAAA', key: key('new-pw') });
    expect(wrong.status).toBe(401);
    const typed = body.recoveryCode.toLowerCase().replace(/-/g, ' ');           // typed back loosely still works
    const ok = await call('POST', '/auth/recover', { username: 'nimal_99', code: typed, key: key('new-pw') });
    expect(ok.status).toBe(200);
    const fresh = (await ok.json() as SignupResponse).recoveryCode;
    expect(fresh).toMatch(RECOVERY_RE);
    expect(fresh).not.toBe(body.recoveryCode);
    expect((await call('GET', '/me', undefined, cookie)).status).toBe(401);
    expect((await call('POST', '/auth/login', { username: 'nimal_99', key: key('old-pw') })).status).toBe(401);
    expect((await call('POST', '/auth/login', { username: 'nimal_99', key: key('new-pw') })).status).toBe(200);
    expect((await call('POST', '/auth/recover', { username: 'nimal_99', code: body.recoveryCode, key: key('x') })).status).toBe(401);
  });

  it('deletes the account and every row under it, and nothing of anyone else', async () => {
    const a = await signup('alice', 'pa');
    await signup('bimal', 'pb');
    const tables = ['account', 'password_login', 'session', 'recovery_code', 'student_profile', 'student_subject', 'student_achievement', 'student_interest'];
    const before = tables.map(count);
    expect((await call('DELETE', '/me', undefined, a.cookie)).status).toBe(204);
    expect(tables.map(count)).toEqual(before.map(n => n / 2));
    expect((await call('GET', '/me', undefined, a.cookie)).status).toBe(401);
    expect((await call('POST', '/auth/login', { username: 'bimal', key: key('pb') })).status).toBe(200);
  });

  it('refuses writes from other websites', async () => {
    const r = await call('POST', '/auth/signup', { username: 'evil', key: key('x'), profile: null }, undefined, { Origin: 'https://evil.example' });
    expect(r.status).toBe(403);
    expect(count('account')).toBe(0);
  });

  it('rate-limits sign-up and log-in', async () => {
    allow = false;
    expect((await signup()).r.status).toBe(429);
    expect((await call('POST', '/auth/login', { username: 'nimal_99', key: key('x') })).status).toBe(429);
  });
});

describe('safe default: no database or secret means no accounts, and nothing else changes', () => {
  it('answers 503 for account routes and still gives results with no cookie', async () => {
    env = {} as Env;
    expect((await call('POST', '/auth/signup', { username: 'x_x', key: key('x'), profile: null })).status).toBe(503);
    expect((await call('GET', '/me')).status).toBe(503);
    const res = await call('POST', '/results', PROFILE);
    expect(res.status).toBe(200);
    expect((await res.json() as { counts: Record<string, number> }).counts.SAFE).toBeGreaterThan(0);
  });
});
