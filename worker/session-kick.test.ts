// Security audit run-1, lead 2: an open group-chat socket must not outlive the session or the membership that opened it.
// The Worker tells each room to close the right sockets: one device on logout, every device on logout-all and recovery,
// and the left group's sockets on leave. Also: Ask's own Origin checks refuse "null" with 403 instead of crashing.
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import app from './index.ts';
import { createTestD1 } from './testing/d1-sqlite.ts';
import { CONSENT_VERSION } from '../shared/contact.ts';
import { DEMO_CONTACT, DEMO_PROFILE } from '../shared/demo-data.ts';
import { GROUP_RULES_VERSION } from '../shared/groups.ts';

const key = (s: string) => createHash('sha256').update(s).digest('hex');
let env: Env, calls: { room: string; path: string; body: { accountId?: number; session?: string } | null; headers: Headers }[];
beforeEach(() => {
  const t = createTestD1(); calls = [];
  const allow = { limit: async () => ({ success: true }) };
  const GROUP_ROOM = { idFromName: (n: string) => n, get: (room: string) => ({ fetch: async (input: Request | string, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const body = req.method === 'POST' ? await req.json().catch(() => null) : null;
    calls.push({ room, path: new URL(req.url).pathname, body, headers: req.headers });
    return new Response(null, { status: 204 });
  } }) };
  env = { DB: t.d1, PEPPER: 'p', AUTH_LIMITER: allow, IP_LIMITER: allow, GROUP_ROOM } as unknown as Env;
});
const call = (method: string, p: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) =>
  app.request(`/api${p}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) }, env);
const cookieOf = (r: Response) => r.headers.get('set-cookie')!.split(';')[0];
async function student(username: string) {
  const r = await call('POST', '/auth/signup', { username, key: key(username), profile: DEMO_PROFILE, extras: { achievements: [], interests: [] },
    contact: { ...DEMO_CONTACT, email: `${username}@example.com` }, consent: CONSENT_VERSION });
  return cookieOf(r);
}
const join = async (ck: string, code: string) =>
  ((await (await call('POST', '/groups/join', { kind: 'COURSE', courseCode: code, acceptRules: GROUP_RULES_VERSION }, ck)).json()) as { id: number }).id;
const kicks = () => calls.filter(c => c.path === '/kick');

describe('group sockets close when the session or membership ends', () => {
  it('logout closes only this device: the room gets the session that opened the socket', async () => {
    const ck = await student('kick_one');
    const g = await join(ck, '013');
    await call('GET', `/groups/${g}/live`, undefined, ck, { Upgrade: 'websocket' });
    const session = calls.find(c => c.path === '/live')!.headers.get('X-ZP-Session');
    expect(session).toMatch(/^[0-9a-f]{64}$/);
    await call('POST', '/auth/logout', undefined, ck);
    expect(kicks()).toEqual([expect.objectContaining({ room: `group:${g}`, body: expect.objectContaining({ session }) })]);
  });
  it('logout-all and recovery close every device in every group the account is in', async () => {
    const ck = await student('kick_two');
    const g1 = await join(ck, '013'), g2 = await join(ck, '012');
    await call('POST', '/auth/logout-all', undefined, ck);
    expect(kicks().map(k => k.room).sort()).toEqual([`group:${g1}`, `group:${g2}`].sort());
    expect(kicks().every(k => k.body?.session === undefined)).toBe(true);
  });
  it('leaving a group closes the sockets in that group only', async () => {
    const ck = await student('kick_three');
    const g1 = await join(ck, '013'); await join(ck, '012');
    await call('POST', `/groups/${g1}/leave`, undefined, ck);
    expect(kicks().map(k => k.room)).toEqual([`group:${g1}`]);
  });
});

describe('Ask Origin checks', () => {
  it('refuse a "null" or malformed Origin with 403, not a 500', async () => {
    for (const o of ['null', 'not a url', 'https://evil.example'])
      expect((await call('POST', '/ask/feedback', { rating: 'UP' }, undefined, { Origin: o })).status).toBe(403);
  });
});
