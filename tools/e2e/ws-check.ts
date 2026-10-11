// GRP-WS: local-only WebSocket check of a group room (never point this at production).
// Usage: node tools/e2e/ws-check.ts [http://127.0.0.1:8899]
// 1. signs up a throwaway account grp_<ts>   2. joins an EXISTING group only (never creates one)
// 3. opens /api/groups/:id/live: expects a history frame, "ping" -> "pong" (runtime auto-response),
//    and a post containing a phone number answered by an error frame (cleanMessage blocks it before moderation,
//    so no Workers AI call is made)   4. deletes the account (DELETE /api/me) and checks the session is gone.
// Exit 0 = all checks passed, 1 = a check failed, 3 = skipped (server not reachable / no existing group).
import { createHash } from 'node:crypto';
import WebSocket from 'ws';
import { CONSENT_VERSION } from '../../shared/contact.ts';
import { GROUP_RULES_VERSION, type GroupSummary, type GroupsResponse } from '../../shared/groups.ts';

const BASE = (process.argv[2] ?? 'http://127.0.0.1:8899').replace(/\/+$/, '');
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) { console.error('local servers only (http://127.0.0.1:<port>)'); process.exit(2); }
const ORIGIN = BASE;
const results: { id: string; ok: boolean; note: string }[] = [];
const check = (id: string, ok: boolean, note: string) => { results.push({ id, ok, note }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${note}`); };

async function api(method: string, path: string, body?: unknown, cookie?: string) {
  return fetch(`${BASE}/api${path}`, { method, signal: AbortSignal.timeout(10_000),
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
}

async function main() {
  try { await api('GET', '/me'); } catch (e) { console.log(`SKIP server not reachable at ${BASE}: ${(e as Error).name}`); process.exit(3); }
  const username = `grp_${Date.now()}`;
  const su = await api('POST', '/auth/signup', { username, key: createHash('sha256').update(`${username}:ws-check`).digest('hex'),
    profile: null, extras: { achievements: [], interests: [] }, consent: CONSENT_VERSION,
    contact: { fullName: 'Ws Check', email: `${username}@example.com`, mobile: '0712345678', birthDate: '2006-05-01' } });
  check('GRP-WS-01', su.status === 201, `sign-up of throwaway account -> ${su.status}`);
  if (su.status !== 201) process.exit(1);
  const cookie = su.headers.get('set-cookie')!.split(';')[0];
  let code = 0;
  try {
    const list = await (await api('GET', '/groups', undefined, cookie)).json() as GroupsResponse;
    const existing = [...list.groups, ...list.popular].find(g => g.kind === 'COURSE' && g.id !== null);
    if (!existing) { console.log('SKIP no existing course group to join (this check never creates one)'); process.exitCode = 3; return; }
    const j = await api('POST', '/groups/join', { kind: 'COURSE', courseCode: existing.courseCode, acceptRules: GROUP_RULES_VERSION }, cookie);
    const g = await j.json() as GroupSummary;
    check('GRP-WS-02', j.status === 200 && g.id === existing.id, `joined existing group (course ${existing.courseCode}) -> ${j.status}`);

    const ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}/api/groups/${g.id}/live`, { headers: { Cookie: cookie, Origin: ORIGIN } });
    const frames: string[] = [];
    const waitFor = (pred: (s: string) => boolean, ms = 8_000) => new Promise<string | null>(res => {
      const hit = frames.find(pred); if (hit) return res(hit);
      const t = setTimeout(() => { ws.off('message', on); res(null); }, ms);
      const on = (d: WebSocket.RawData) => { const s = d.toString(); if (pred(s)) { clearTimeout(t); ws.off('message', on); res(s); } };
      ws.on('message', on);
    });
    ws.on('message', d => frames.push(d.toString()));
    const opened = await new Promise<boolean>(res => { ws.once('open', () => res(true)); ws.once('error', () => res(false)); setTimeout(() => res(false), 10_000); });
    check('GRP-WS-03', opened, 'WebSocket upgrade accepted for a member');
    if (opened) {
      const hist = await waitFor(s => s.includes('"type":"history"'));
      const h = hist ? JSON.parse(hist) as { messages: { sample?: boolean; author: string }[] } : null;
      check('GRP-WS-04', !!h && h.messages.filter(m => m.sample).every(m => m.author.startsWith('Sample')), `history frame received (${h?.messages.length ?? 0} messages, samples labelled)`);
      ws.send('ping');
      check('GRP-WS-05', (await waitFor(s => s === 'pong')) === 'pong', 'ping -> pong auto-response');
      const before = frames.length;
      ws.send(JSON.stringify({ type: 'post', body: 'call me on 077 123 4567' }));
      const e = await waitFor(s => s.includes('"type":"error"'));
      check('GRP-WS-06', !!e && /phone numbers and email addresses/.test(e), `phone-number post refused: ${e ?? 'no error frame'}`);
      await new Promise(r => setTimeout(r, 1_000));
      check('GRP-WS-07', !frames.slice(before).some(s => s.includes('"type":"message"')), 'no message broadcast for the refused post');
      ws.close();
    }
  } finally {
    const del = await api('DELETE', '/me', undefined, cookie);
    const me = await api('GET', '/me', undefined, cookie);
    check('GRP-WS-08', del.status === 204 && me.status === 401, `throwaway account deleted (${del.status}), session gone (${me.status})`);
  }
  if (!code && results.some(r => !r.ok)) code = 1;
  process.exitCode = code;
}
main().catch(e => { console.log(`FAIL ${(e as Error).message}`); process.exit(1); });
