// Security audit run-1 hardening (leads 8, 10, 11, 12, 17 and the email-pattern gap), each proven on the real migrations.
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import app from './index.ts';
import { createTestD1 } from './testing/d1-sqlite.ts';
import { ipBucket } from './account.ts';
import { ALL_PER_DAY, FEEDBACK_PER_DAY, serviceOverDaily } from './ask.ts';
import { CONSENT_VERSION, parseContact } from '../shared/contact.ts';
import { DEMO_CONTACT, DEMO_PROFILE } from '../shared/demo-data.ts';

const key = (s: string) => createHash('sha256').update(s).digest('hex');
let env: Env, raw: ReturnType<typeof createTestD1>['raw'], d1: ReturnType<typeof createTestD1>['d1'], budget: Map<string, number>;
beforeEach(() => {
  const t = createTestD1(); raw = t.raw; d1 = t.d1; budget = new Map();
  const allow = { limit: async () => ({ success: true }) };
  // IP_LIMITER stand-in that really counts, so the per-account write budget can be exhausted in a test
  const counting = { limit: async ({ key: k }: { key: string }) => { const n = (budget.get(k) ?? 0) + 1; budget.set(k, n); return { success: !k.startsWith('acct:') || n <= 100 }; } };
  env = { DB: t.d1, PEPPER: 'p', AUTH_LIMITER: allow, IP_LIMITER: counting } as unknown as Env;
});
const call = (method: string, p: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) =>
  app.request(`/api${p}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) }, env);
async function student(username: string) {
  const r = await call('POST', '/auth/signup', { username, key: key(username), profile: DEMO_PROFILE, extras: { achievements: [], interests: [] },
    contact: { ...DEMO_CONTACT, email: `${username}@example.com` }, consent: CONSENT_VERSION });
  return r.headers.get('set-cookie')!.split(';')[0];
}

describe('audit hardening', () => {
  it('lead 12: IPv6 clients are limited per /64 network, IPv4 per address', () => {
    expect(ipBucket('2402:4000:1234:5678:aaaa:bbbb:cccc:dddd')).toBe(ipBucket('2402:4000:1234:5678:1:2:3:4'));
    expect(ipBucket('2402:4000:1234:5678::1')).not.toBe(ipBucket('2402:4000:1234:9999::1'));
    expect(ipBucket('203.0.113.7')).toBe('203.0.113.7');
  });
  it('lead 8: a signed-in account gets 100 writes a minute, then 429', async () => {
    const ck = await student('budget_one');
    for (let i = 0; i < 100; i++) expect((await call('PUT', '/me/avatar', { avatar: 'a01' }, ck)).status).toBe(200);
    expect((await call('PUT', '/me/avatar', { avatar: 'a01' }, ck)).status).toBe(429);
    expect((await call('GET', '/me', undefined, ck)).status).toBe(200);          // reading is not limited
  });
  it('lead 12: the whole service stops answering past the daily total', async () => {
    const day = '2026-10-15';
    raw.prepare(`INSERT INTO ask_quota (day, scope, client, used) VALUES (?, 'DEVICE', ?, ?)`).run(day, 'a'.repeat(64), ALL_PER_DAY);
    expect(await serviceOverDaily(d1, day)).toBe(false);
    raw.prepare(`INSERT INTO ask_quota (day, scope, client, used) VALUES (?, 'DEVICE', ?, 1)`).run(day, 'b'.repeat(64));
    expect(await serviceOverDaily(d1, day)).toBe(true);
  });
  it('lead 10: answer feedback has a daily cap and drops rows older than a year', async () => {
    const now = new Date().toISOString(), old = new Date(Date.now() - 400 * 86_400_000).toISOString();
    raw.prepare(`INSERT INTO answer_feedback (rating, question, answer, pages, note, lang, created_at) VALUES ('WRONG', 'qq', 'a', '[]', NULL, 'en', ?)`).run(old);
    const ins = raw.prepare(`INSERT INTO answer_feedback (rating, question, answer, pages, note, lang, created_at) VALUES ('HELPFUL', 'qq', 'a', '[]', NULL, 'en', ?)`);
    for (let i = 0; i < FEEDBACK_PER_DAY; i++) ins.run(now);
    const body = { rating: 'HELPFUL', question: 'Can I study IT?', answer: 'Yes', pages: [], lang: 'en' };
    expect((await call('POST', '/ask/feedback', body)).status).toBe(429);
    raw.exec(`DELETE FROM answer_feedback WHERE created_at >= '${now.slice(0, 10)}'`);
    expect((await call('POST', '/ask/feedback', body)).status).toBe(204);
    expect((raw.prepare(`SELECT count(*) AS n FROM answer_feedback WHERE created_at < ?`).get(now.slice(0, 10)) as { n: number }).n).toBe(0);
  });
  it('lead 11: at most 500 live demo accounts, and expired ones are cleaned up 50 per tap', async () => {
    const ins = raw.prepare(`INSERT INTO account (auth_subject, role, created_at, demo_expires_at) VALUES (?, 'STUDENT', '2026-01-01T00:00:00Z', ?)`);
    for (let i = 0; i < 500; i++) ins.run(`demo:live${i}`, '2999-01-01T00:00:00Z');
    expect((await call('POST', '/auth/demo')).status).toBe(503);
    raw.exec(`DELETE FROM account WHERE auth_subject LIKE 'demo:live%'`);
    for (let i = 0; i < 120; i++) ins.run(`demo:old${i}`, '2026-01-02T00:00:00Z');
    expect((await call('POST', '/auth/demo')).status).toBe(201);
    expect((raw.prepare(`SELECT count(*) AS n FROM account WHERE auth_subject LIKE 'demo:old%'`).get() as { n: number }).n).toBe(70);   // 50 removed
  });
  it('lead 17: developer tools refuse a cross-site call even on localhost with DEV_TOOLS on', async () => {
    const devEnv = { ...env, DEV_TOOLS: '1' } as Env;
    const r = await app.request('http://localhost/api/dev/search', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{"q":"x"}' }, devEnv);
    expect(r.status).toBe(404);
  });
  it('email: an oversized address is refused by length before the pattern runs', () => {
    const t0 = performance.now();
    const r = parseContact({ ...DEMO_CONTACT, email: `${'a@'.repeat(50_000)}x` }, CONSENT_VERSION, '2026-10-15');
    expect(r.ok).toBe(false);
    expect(performance.now() - t0).toBeLessThan(50);
  });
});
