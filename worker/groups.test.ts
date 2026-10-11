// Course groups (CR-002): the database rules (migrations 0005, 0006) and the API (worker/groups.ts, the senior parts of
// worker/account.ts), end to end on the real migrations. The GroupRoom Durable Object is replaced by a recorder, so
// these tests check what the Worker asks the room to do (hide, purge) without a Workers runtime.
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import app from './index.ts';
import { createTestD1 } from './testing/d1-sqlite.ts';
import type { MeResponse } from '../shared/account.ts';
import { GROUP_RULES_VERSION, POPULAR_COURSES, type GroupSummary, type GroupsResponse } from '../shared/groups.ts';
import type { ProfileInput } from '../shared/api.ts';
import { CONSENT_VERSION } from '../shared/contact.ts';
const CONTACT = { fullName: 'Test Student', email: 'student@example.com', mobile: '0712345678', birthDate: '2006-05-01' };

const key = (s: string) => createHash('sha256').update(s).digest('hex');
const PROFILE: ProfileInput = { stream: 'PHYS', district: 'KUR', zE4: 14821, al: { CMATH: 'B', PHY: 'C', ICT: 'A' } };
const EXTRAS = { achievements: [], interests: [] };
const CODE = 'ABCD-EFGH-JKLM-NPQR';
const MSG = 'a'.repeat(32), MSG2 = 'b'.repeat(32);

let env: Env, raw: ReturnType<typeof createTestD1>['raw'], roomCalls: { room: string; path: string; body: unknown }[];
beforeEach(() => {
  const t = createTestD1();
  raw = t.raw; roomCalls = [];
  const allow = { limit: async () => ({ success: true }) };
  const GROUP_ROOM = {
    idFromName: (n: string) => n,
    get: (room: string) => ({ fetch: async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname;
      roomCalls.push({ room, path, body: init?.body ? JSON.parse(String(init.body)) : null });
      return path === '/exists' ? Response.json({ exists: true }) : new Response(null, { status: 204 });
    } }),
  };
  env = { DB: t.d1, PEPPER: 'p', AUTH_LIMITER: allow, IP_LIMITER: allow, GROUP_ROOM } as unknown as Env;
});

const call = (method: string, p: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) =>
  app.request(`/api${p}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) }, env);
const cookieOf = (r: Response) => r.headers.get('set-cookie')!.split(';')[0];
async function signup(username: string, extra: Record<string, unknown> = {}, profile: ProfileInput | null = PROFILE) {
  const r = await call('POST', '/auth/signup', { username, key: key(username), profile, extras: EXTRAS, contact: CONTACT, consent: CONSENT_VERSION, ...extra });
  return { r, cookie: r.status === 201 ? cookieOf(r) : '' };
}
function invite(code = CODE, opts: { course?: string; letter?: string; expires?: string } = {}) {
  raw.prepare(`INSERT INTO senior_invite (code_hash, course_code, institution_letter, study_year, created_at, expires_at) VALUES (?, ?, ?, 2, ?, ?)`)
    .run(key(code), opts.course ?? '012', opts.letter ?? 'F', '2019-01-01T00:00:00Z', opts.expires ?? '2099-01-01T00:00:00Z');
}
const n = (sql: string) => (raw.prepare(sql).get() as { n: number }).n;

describe('migrations 0005 and 0006: database rules', () => {
  it('loads the 2025/26 courses and institutions, campuses with their parent', () => {
    expect(n('SELECT count(*) AS n FROM course')).toBe(121);
    expect(n('SELECT count(*) AS n FROM institution')).toBe(20);
    expect(raw.prepare(`SELECT parent_letter AS p FROM institution WHERE letter = 'S'`).get()).toEqual({ p: 'A' });
  });
  it('refuses malformed groups, duplicate groups and self-blocks', () => {
    raw.exec(`INSERT INTO account (auth_subject, role, created_at) VALUES ('local:a', 'STUDENT', 't')`);
    raw.exec(`INSERT INTO course_group (kind, course_code, created_at) VALUES ('COURSE', '012', 't')`);
    for (const bad of [
      `INSERT INTO course_group (kind, course_code, created_at) VALUES ('COURSE', '012', 't')`,              // duplicate course group
      `INSERT INTO course_group (kind, created_at) VALUES ('COURSE', 't')`,                                   // course group without course
      `INSERT INTO course_group (kind, course_code, stream_code, created_at) VALUES ('COURSE', '013', 'PHYS', 't')`,
      `INSERT INTO course_group (kind, stream_code, created_at) VALUES ('BATCH', 'PHYS', 't')`,              // batch without district
      `INSERT INTO course_group (kind, course_code, created_at) VALUES ('COURSE', '999', 't')`,              // unknown course
      `INSERT INTO account_block VALUES (1, 1, 't')`,
      `INSERT INTO message_report VALUES (1, 'short', 1, 'SPAM', 't')`,
    ]) expect(() => raw.exec(bad), bad).toThrow();
  });
  it('lets only a SENIOR account of the right institution redeem an invite, once', () => {
    invite();
    raw.exec(`INSERT INTO account (auth_subject, role, created_at) VALUES ('local:s', 'STUDENT', 't')`);
    raw.exec(`INSERT INTO account (auth_subject, role, verified_for_letter, created_at) VALUES ('local:w', 'SENIOR', 'A', 't')`);
    raw.exec(`INSERT INTO account (auth_subject, role, verified_for_letter, created_at) VALUES ('local:r', 'SENIOR', 'F', 't')`);
    const redeem = (id: number) => raw.exec(`UPDATE senior_invite SET redeemed_by = ${id}, redeemed_at = 't'`);
    expect(() => redeem(1)).toThrow();          // a student
    expect(() => redeem(2)).toThrow();          // a senior of another institution
    redeem(3);
    expect(() => redeem(3)).toThrow();          // never twice
  });
});

describe('senior sign-up with an invite code', () => {
  it('creates a verified SENIOR account that stores no A/L results', async () => {
    invite();
    const { r, cookie } = await signup('senior_one', { inviteCode: 'abcd efgh jklm npqr' });   // typed loosely: normalised
    expect(r.status).toBe(201);
    const me = await (await call('GET', '/me', undefined, cookie)).json() as MeResponse;
    expect(me.role).toBe('SENIOR');
    expect(me.senior).toEqual({ course: expect.stringMatching(/computer science/i), institution: 'UNIVERSITY OF RUHUNA', year: 2 });
    expect(me.profile).toBeNull();
    expect((await call('PUT', '/me', { profile: PROFILE, extras: EXTRAS }, cookie)).status).toBe(403);
    expect(n('SELECT count(*) AS n FROM student_profile')).toBe(0);
  });
  it('refuses a used, expired, unknown or malformed code and creates nothing', async () => {
    invite();
    invite('WXYZ-WXYZ-WXYZ-WXYZ', { expires: '2020-01-01T00:00:00Z' });
    expect((await signup('first', { inviteCode: CODE })).r.status).toBe(201);
    for (const code of [CODE, 'WXYZ-WXYZ-WXYZ-WXYZ', 'AAAA-BBBB-CCCC-DDDD', 'nope'])
      expect((await signup(`late_${code.length}_${code.slice(0, 2).toLowerCase()}`, { inviteCode: code })).r.status, code).toBe(400);
    expect(n('SELECT count(*) AS n FROM account')).toBe(1);
  });
  it('keeps students as students (safe default: no code, no change)', async () => {
    const { cookie } = await signup('student_one');
    const me = await (await call('GET', '/me', undefined, cookie)).json() as MeResponse;
    expect([me.role, me.senior, me.profile?.district]).toEqual(['STUDENT', null, 'KUR']);
  });
});

describe('groups API', () => {
  it('needs a session', async () => {
    expect((await call('GET', '/groups')).status).toBe(401);
    expect((await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '012' })).status).toBe(401);
  });
  it('suggests the asked-for course groups and the batch, creates a group on first join, shares it on the second', async () => {
    const a = (await signup('nimal')).cookie, b = (await signup('kamal')).cookie;
    const list = await (await call('GET', '/groups?courses=012,999,abc', undefined, a)).json() as GroupsResponse;
    expect(list.groups.map(g => [g.kind, g.courseCode, g.id, g.joined])).toEqual([['BATCH', null, null, false], ['COURSE', '012', null, false]]);
    const g1 = await (await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '012' }, a)).json() as GroupSummary;
    const g2 = await (await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '012' }, b)).json() as GroupSummary;
    expect([g2.id, g2.members, g2.joined]).toEqual([g1.id, 2, true]);
    expect((await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '012' }, b)).status).toBe(200);   // joining twice is harmless
    expect(n('SELECT count(*) AS n FROM group_member')).toBe(2);
    const batch = await (await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'BATCH' }, a)).json() as GroupSummary;
    expect(batch.title).toMatch(/Physical Science · Kurunegala/i);
  });
  it('CR-005: joins only with the current rules accepted, records them, and keeps the room shut without them', async () => {
    const a = (await signup('nimal')).cookie;
    expect((await call('POST', '/groups/join', { kind: 'COURSE', courseCode: '012' }, a)).status).toBe(400);                       // no acceptance
    expect((await call('POST', '/groups/join', { kind: 'COURSE', courseCode: '012', acceptRules: '2020-01-01' }, a)).status).toBe(400);   // old version
    expect(n('SELECT count(*) AS n FROM group_member')).toBe(0);
    const g = await (await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '012' }, a)).json() as GroupSummary;
    expect(g.rulesAccepted).toBe(true);
    expect(raw.prepare('SELECT rules_version AS v FROM group_member').get()).toEqual({ v: GROUP_RULES_VERSION });
    raw.exec('UPDATE group_member SET rules_version = NULL');                     // a member from before the rules
    expect((await call('GET', `/groups/${g.id}/live`, undefined, a, { Upgrade: 'websocket' })).status).toBe(403);
    expect(((await (await call('GET', `/groups/${g.id}`, undefined, a)).json()) as GroupSummary).rulesAccepted).toBe(false);
    await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '012' }, a);   // accepting again re-opens it
    expect(raw.prepare('SELECT rules_version AS v FROM group_member').get()).toEqual({ v: GROUP_RULES_VERSION });
    expect(() => raw.exec(`UPDATE group_member SET rules_version = 'whatever'`)).toThrow();    // the CHECK holds
  });
  it('lists the popular course groups for everyone, without repeating ones already suggested', async () => {
    const a = (await signup('nimal')).cookie;
    const r = await (await call('GET', '/groups?courses=001', undefined, a)).json() as GroupsResponse;
    expect(r.popular.map(g => g.courseCode)).toEqual(POPULAR_COURSES.filter(c => c !== '001'));
    expect(r.groups.some(g => g.courseCode === '001')).toBe(true);
    expect((await call('GET', '/groups/999999', undefined, a)).status).toBe(404);
  });
  it('refuses unknown courses, and batch groups for accounts without saved results', async () => {
    const s = (await signup('noprofile', {}, null)).cookie;
    expect((await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '999' }, s)).status).toBe(400);
    expect((await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'BATCH' }, s)).status).toBe(403);
    expect((await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'NOPE' }, s)).status).toBe(400);
  });
  it('lets only members open the live room or report, and leaving ends membership', async () => {
    const a = (await signup('nimal')).cookie, b = (await signup('kamal')).cookie;
    const g = await (await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '012' }, a)).json() as GroupSummary;
    expect((await call('GET', `/groups/${g.id}/live`, undefined, b, { Upgrade: 'websocket' })).status).toBe(403);
    expect((await call('POST', `/groups/${g.id}/report`, { messageId: MSG, reason: 'SPAM' }, b)).status).toBe(403);
    expect((await call('GET', `/groups/${g.id}/live`, undefined, a)).status).toBe(400);           // no WebSocket upgrade
    expect((await call('POST', `/groups/${g.id}/leave`, undefined, a)).status).toBe(204);
    expect((await call('GET', `/groups/${g.id}/live`, undefined, a, { Upgrade: 'websocket' })).status).toBe(403);
  });
  it('hides a message once three different members report it, never on repeats by one member', async () => {
    const cookies = [];
    for (const u of ['m_one', 'm_two', 'm_three']) cookies.push((await signup(u)).cookie);
    let id = 0;
    for (const ck of cookies) id = (await (await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '012' }, ck)).json() as GroupSummary).id!;
    expect((await call('POST', `/groups/${id}/report`, { messageId: MSG, reason: 'BAD' }, cookies[0])).status).toBe(400);
    for (let i = 0; i < 3; i++) expect((await call('POST', `/groups/${id}/report`, { messageId: MSG, reason: 'SPAM' }, cookies[0])).status).toBe(204);
    await call('POST', `/groups/${id}/report`, { messageId: MSG, reason: 'HARMFUL' }, cookies[1]);
    expect(roomCalls.filter(c => c.path === '/hide')).toHaveLength(0);
    await call('POST', `/groups/${id}/report`, { messageId: MSG, reason: 'WRONG_INFO' }, cookies[2]);
    expect(roomCalls.filter(c => c.path === '/hide')).toEqual([{ room: `group:${id}`, path: '/hide', body: { messageId: MSG } }]);
    await call('POST', `/groups/${id}/report`, { messageId: MSG2, reason: 'SPAM' }, cookies[2]);
    expect(n('SELECT count(*) AS n FROM message_report')).toBe(4);
  });
  it('blocks and unblocks by username', async () => {
    const a = (await signup('nimal')).cookie;
    await signup('kamal');
    expect((await call('POST', '/blocks', { username: 'nimal' }, a)).status).toBe(400);              // not yourself
    expect((await call('POST', '/blocks', { username: 'ghost' }, a)).status).toBe(404);
    expect((await call('POST', '/blocks', { username: 'Kamal' }, a)).status).toBe(204);
    expect(await (await call('GET', '/blocks', undefined, a)).json()).toEqual({ blocked: ['kamal'] });
    expect((await call('DELETE', '/blocks/kamal', undefined, a)).status).toBe(204);
    expect(await (await call('GET', '/blocks', undefined, a)).json()).toEqual({ blocked: [] });
  });
});

describe('deleting an account (wipe check)', () => {
  it('removes its memberships, reports and blocks, and tells each group to delete its messages', async () => {
    const a = (await signup('nimal')).cookie, b = (await signup('kamal')).cookie;
    const g = await (await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '012' }, a)).json() as GroupSummary;
    await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'BATCH' }, a);
    await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '012' }, b);
    await call('POST', `/groups/${g.id}/report`, { messageId: MSG, reason: 'SPAM' }, a);
    await call('POST', '/blocks', { username: 'kamal' }, a);
    await call('POST', '/blocks', { username: 'nimal' }, b);
    expect((await call('DELETE', '/me', undefined, a)).status).toBe(204);
    expect([n('SELECT count(*) AS n FROM group_member'), n('SELECT count(*) AS n FROM message_report'), n('SELECT count(*) AS n FROM account_block')]).toEqual([1, 0, 0]);
    expect(roomCalls.filter(c => c.path === '/purge').map(c => c.room).sort()).toEqual([`group:${g.id}`, `group:${g.id! + 1}`]);
  });
});
