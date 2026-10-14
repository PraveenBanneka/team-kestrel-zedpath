// GRP-001..: group chat logic, added on top of worker/groups.test.ts (only NEW behaviours here).
//  - shared/groups.ts cleanMessage: contact details blocked (group rule 3), normal text untouched, limits, empties.
//  - GROUP_RULES_VERSION / GROUP_RULE_COUNT against the D1 CHECKs (0009, 0010) and the phone's wording (gr.rule.N).
//  - shared/group-samples.ts: every sample labelled as sample, no contact details, no verified badges.
//  - worker/groups.ts on the real migrations: members ordering and badges, stale rules version, leave then rejoin,
//    the identity headers the Worker hands to the room, sample ids not reportable, cross-site writes refused.
// Former gaps in the contact filter (GRP-012..016) were pinned with it.fails; closed by audit lead 16 and now plain tests;
// see tools/e2e/results/groups.md. When the filter is tightened, flip them to plain it().
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import app from './index.ts';
import { createTestD1 } from './testing/d1-sqlite.ts';
import { GROUP_RULE_COUNT, GROUP_RULES_VERSION, MESSAGE_MAX, POPULAR_COURSES, cleanMessage, type GroupSummary, type GroupsResponse } from '../shared/groups.ts';
import { SAMPLE_KEYS, sampleKey, samplesFor } from '../shared/group-samples.ts';
import type { ProfileInput } from '../shared/api.ts';
import { CONSENT_VERSION } from '../shared/contact.ts';

const root = new URL('../', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), 'utf8');
const CONTACT_ERR = /phone numbers and email addresses/;
const blocked = (s: string) => { const r = cleanMessage(s); return !r.ok && CONTACT_ERR.test(r.error); };
const passes = (s: string) => { const r = cleanMessage(s); return r.ok ? r.body : null; };

// ------------------------------------------------------------------------------------------------ cleanMessage
describe('GRP cleanMessage: contact details (group rule 3)', () => {
  it('GRP-001 blocks a plain Sri Lankan mobile number (07X XXXXXXX) for every operator prefix', () => {
    for (const p of ['070', '071', '072', '074', '075', '076', '077', '078']) expect(blocked(`${p}1234567`), p).toBe(true);
  });
  it('GRP-002 blocks spaced, hyphenated and one-digit-per-space mobiles', () => {
    for (const s of ['077 123 4567', '077-123-4567', '077 1234 567', '0 7 7 1 2 3 4 5 6 7', '0-7-7-1-2-3-4-5-6-7', '077  123  4567', '077\t123\t4567'])
      expect(blocked(s), s).toBe(true);
  });
  it('GRP-003 blocks international forms: +94, +94 spaced, +94 hyphenated, 94 without the plus', () => {
    for (const s of ['+94771234567', '+94 77 123 4567', '+94-77-123-4567', '+ 94 771234567', '94771234567', '94 77 123 4567'])
      expect(blocked(s), s).toBe(true);
  });
  it('GRP-004 blocks landlines (011, 081 ...) and numbers inside a sentence, also in Sinhala and Tamil text', () => {
    for (const s of ['call 0112345678 now', 'Kandy office 081 222 3344', 'මට කතා කරන්න 0771234567', 'என்னை அழைக்கவும் 0771234567 நன்றி', 'num:0771234567.', '(0771234567)'])
      expect(blocked(s), s).toBe(true);
  });
  it('GRP-005 blocks email addresses in common shapes', () => {
    for (const s of ['kasun@gmail.com', 'mail me: Kasun.Perera+ugc@Yahoo.CO.UK', 'a@b.lk', 'first_last@uni.ac.lk thanks', 'x@sub.domain.org'])
      expect(blocked(s), s).toBe(true);
  });
  it('GRP-006 blocks WhatsApp click-to-chat links that carry a number', () => {
    for (const s of ['wa.me/94771234567', 'https://wa.me/94771234567', 'https://wa.me/0771234567', 'https://api.whatsapp.com/send?phone=94771234567'])
      expect(blocked(s), s).toBe(true);
  });
  it('GRP-007 leaves normal student text untouched: Z-scores, cut-offs, years, index numbers, course codes, Sinhala/Tamil', () => {
    for (const s of ['My Z is 1.8234, cut-off was 2.1345 in 2025', 'Index no 12345678', '2025/2026 intake, course 012 at F',
      'I got 3 A passes and rank 1234 in the district', 'Engineering @ Moratuwa?', 'ගණිත අංශය, කුරුණෑගල', 'கணிதப் பிரிவு, யாழ்ப்பாணம்',
      'Is 07 weeks enough to prepare?', 'Room 101, hostel B', 'Score: 94 out of 100'])
      expect(passes(s), s).toBe(s);
  });
});

describe('GRP cleanMessage: shape, limits, empties', () => {
  it('GRP-008 tidies whitespace: CRLF to LF, runs of spaces/tabs to one, at most one blank line, trimmed', () => {
    expect(passes('  hello \t\t world  ')).toBe('hello world');
    expect(passes('line 1\r\nline 2\rline 3')).toBe('line 1\nline 2\nline 3');
    expect(passes('a \n\n\n\n\n b')).toBe('a\n\nb');
  });
  it('GRP-009 length: exactly MESSAGE_MAX passes, one more is refused, surrounding spaces do not count', () => {
    expect(MESSAGE_MAX).toBe(500);
    expect(passes('a'.repeat(500))).toHaveLength(500);
    expect(passes(`   ${'a'.repeat(500)}   `)).toHaveLength(500);
    const r = cleanMessage('a'.repeat(501));
    expect(r).toEqual({ ok: false, error: 'Keep it under 500 characters' });
    // the D1/DO CHECK is length(body) BETWEEN 1 AND 500: what cleanMessage lets through always fits it
    expect(read('worker/group-room.ts')).toMatch(/length\(body\) BETWEEN 1 AND 500/);
  });
  it('GRP-010 refuses empty, whitespace-only and non-text messages', () => {
    for (const s of ['', '   ', '\n\n\t', '\r\n']) expect(cleanMessage(s), JSON.stringify(s)).toEqual({ ok: false, error: 'Write a message first' });
    for (const x of [null, undefined, 42, { body: 'hi' }, ['hi'], true]) expect(cleanMessage(x), String(x)).toEqual({ ok: false, error: 'Messages are text only' });
  });
  it('GRP-011 refuses control characters (but keeps new lines)', () => {
    for (const s of ['hi\u0000there', 'bell\u0007', 'esc\u001b[31mred', 'del\u007f']) expect(cleanMessage(s).ok, JSON.stringify(s)).toBe(false);
    expect(passes('two\nlines')).toBe('two\nlines');
  });
});

describe('GRP cleanMessage: former gaps in the contact filter, closed by audit lead 16 (2026-10-15)', () => {
  it('GRP-012-GAP blocks the 0094 international prefix (0094 77 123 4567)', () => { expect(blocked('0094771234567')).toBe(true); });
  it('GRP-013-GAP blocks numbers written with brackets or dots: (077) 123 4567, 077.123.4567', () => {
    expect(blocked('(077) 123 4567')).toBe(true); expect(blocked('077.123.4567')).toBe(true);
  });
  it('GRP-014-GAP blocks WhatsApp group invite links (chat.whatsapp.com/...)', () => { expect(blocked('join https://chat.whatsapp.com/AbCdEf123XyZ')).toBe(true); });
  it('GRP-015-GAP blocks a number glued to a letter (0771234567x) and full-width digits', () => {
    expect(blocked('0771234567x')).toBe(true); expect(blocked('０７７１２３４５６７')).toBe(true);
  });
  it('GRP-016-GAP blocks obfuscated emails (kasun [at] gmail [dot] com)', () => { expect(blocked('kasun [at] gmail [dot] com')).toBe(true); });
});

// ------------------------------------------------------------------------------------------------ rules version
describe('GRP rules version and count', () => {
  it('GRP-017 GROUP_RULES_VERSION is the only value the D1 CHECKs allow (0009 group_member, 0010 group_rules_acceptance)', () => {
    expect(GROUP_RULES_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(GROUP_RULES_VERSION))).toBe(false);
    const m10 = read('migrations/0010_journey_avatars_rules.sql').match(/rules_version\s+TEXT\s+NOT NULL\s+CHECK \(rules_version IN \(([^)]*)\)\)/);
    const m09 = read('migrations/0009_group_rules.sql').match(/CHECK \(rules_version IS NULL OR rules_version IN \(([^)]*)\)\)/);
    expect(m10?.[1]).toBe(`'${GROUP_RULES_VERSION}'`);
    expect(m09?.[1]).toBe(`'${GROUP_RULES_VERSION}'`);
    // and the CHECK is live on the real migrations: current version accepted, anything else refused
    const { raw } = createTestD1();
    raw.exec(`INSERT INTO account (auth_subject, role, created_at) VALUES ('local:v', 'STUDENT', 't')`);
    raw.exec(`INSERT INTO group_rules_acceptance VALUES (1, '${GROUP_RULES_VERSION}', 't')`);
    for (const bad of ['2026-10-10', '2026-10-12', '', '2026-10-11 ']) expect(() => raw.exec(`INSERT INTO group_rules_acceptance VALUES (1, '${bad}', 't')`), bad).toThrow();
  });
  it('GRP-018 GROUP_RULE_COUNT matches gr.rule.1..N in every language, with no extra rule', () => {
    expect(GROUP_RULE_COUNT).toBe(6);
    for (const lang of ['en', 'si', 'ta']) {
      const src = read(`src/i18n/${lang}.ts`);
      const nums = [...src.matchAll(/'gr\.rule\.(\d+)'\s*:\s*'([^']+)'/g)].map(m => [Number(m[1]), m[2]] as const);
      expect(nums.map(n => n[0]).sort((a, b) => a - b), lang).toEqual(Array.from({ length: GROUP_RULE_COUNT }, (_, i) => i + 1));
      expect(nums.every(n => n[1].trim().length > 10), lang).toBe(true);
    }
  });
});

// ------------------------------------------------------------------------------------------------ sample threads
describe('GRP sample threads (trust rule: sample data is labelled as sample)', () => {
  const all = SAMPLE_KEYS.flatMap(k => samplesFor(k).map(m => ({ k, m })));
  it('GRP-019 every sample message is labelled: sample flag, "Sample" author, sample- id, no "verified" badge', () => {
    expect(all.length).toBeGreaterThan(20);
    for (const { k, m } of all) {
      expect(m.sample, k).toBe(true);
      expect(m.author, k).toMatch(/^Sample /);
      expect(m.id, k).toMatch(new RegExp(`^sample-${k}-\\d+$`));
      expect(m.id).not.toMatch(/^[0-9a-f]{32}$/);                                  // never a real (reportable) message id
      if (m.badge !== null) expect(m.badge, k).toMatch(/^Sample senior · /);
      expect(`${m.author} ${m.badge ?? ''}`.toLowerCase(), k).not.toContain('verified');
    }
  });
  it('GRP-020 no sample contains contact details, and every one would pass the room filter as typed', () => {
    for (const { k, m } of all) {
      expect(cleanMessage(m.body), `${k}: ${m.body}`).toEqual({ ok: true, body: m.body });
      expect(m.body, k).not.toMatch(/https?:|www\.|wa\.me|whatsapp|@/i);
      expect(m.body.length).toBeLessThanOrEqual(MESSAGE_MAX);
    }
  });
  it('GRP-021 samples state no cut-off figure or date, and are dated in order before the feature went live', () => {
    for (const k of SAMPLE_KEYS) {
      const msgs = samplesFor(k);
      for (const m of msgs) expect(m.body, k).not.toMatch(/\d\.\d{3,4}|\b20\d\d\b|\b\d{1,2}(st|nd|rd|th)? (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
      const t = msgs.map(m => Date.parse(m.at));
      expect(t, k).toEqual([...t].sort((a, b) => a - b));
      expect(Math.max(...t)).toBeLessThan(Date.parse('2026-10-11T00:00:00Z'));
    }
  });
  it('GRP-022 every Popular course has its own thread; unknown courses and keys fall back to the generic one', () => {
    for (const c of POPULAR_COURSES) expect(sampleKey('COURSE', c)).toBe(`COURSE:${c}`);
    expect(sampleKey('COURSE', '999')).toBe('COURSE');
    expect(sampleKey('COURSE', null)).toBe('COURSE');
    expect(sampleKey('BATCH', '001')).toBe('BATCH');
    expect(samplesFor('nonsense').map(m => m.body)).toEqual(samplesFor('COURSE').map(m => m.body));
  });
});

// ------------------------------------------------------------------------------------------------ API (new cases)
const key = (s: string) => createHash('sha256').update(s).digest('hex');
const PROFILE: ProfileInput = { stream: 'PHYS', district: 'KUR', zE4: 14821, al: { CMATH: 'B', PHY: 'C', ICT: 'A' } };
const CONTACT = { fullName: 'Secret Fullname', email: 'secret.person@example.com', mobile: '0712345678', birthDate: '2006-05-01' };
const CODE = 'ABCD-EFGH-JKLM-NPQR';

let env: Env, raw: ReturnType<typeof createTestD1>['raw'], liveReqs: { room: string; headers: Headers }[];
beforeEach(() => {
  const t = createTestD1();
  raw = t.raw; liveReqs = [];
  const allow = { limit: async () => ({ success: true }) };
  // A recorder room that also accepts the Request object the Worker passes for /live (the stub in groups.test.ts
  // only takes URL strings), so the identity headers handed to the Durable Object can be checked.
  const GROUP_ROOM = {
    idFromName: (n: string) => n,
    get: (room: string) => ({ fetch: async (input: string | Request) => {
      const url = new URL(typeof input === 'string' ? input : input.url);
      if (url.pathname === '/live' && typeof input !== 'string') liveReqs.push({ room, headers: input.headers });
      return url.pathname === '/exists' ? Response.json({ exists: true }) : new Response(null, { status: 204 });
    } }),
  };
  env = { DB: t.d1, PEPPER: 'p', AUTH_LIMITER: allow, IP_LIMITER: allow, GROUP_ROOM } as unknown as Env;
});
const call = (method: string, p: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) =>
  app.request(`http://localhost/api${p}`, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body) }, env);
async function signup(username: string, extra: Record<string, unknown> = {}) {
  const r = await call('POST', '/auth/signup', { username, key: key(username), profile: PROFILE, extras: { achievements: [], interests: [] }, contact: CONTACT, consent: CONSENT_VERSION, ...extra });
  expect(r.status, username).toBe(201);
  return r.headers.get('set-cookie')!.split(';')[0];
}
const join = async (cookie: string, body: Record<string, unknown>) =>
  (await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, ...body }, cookie)).json() as Promise<GroupSummary>;
const n = (sql: string) => (raw.prepare(sql).get() as { n: number }).n;
function invite(code = CODE, course = '012') {
  raw.prepare(`INSERT INTO senior_invite (code_hash, course_code, institution_letter, study_year, created_at, expires_at) VALUES (?, ?, 'F', 2, ?, ?)`)
    .run(key(code), course, '2019-01-01T00:00:00Z', '2099-01-01T00:00:00Z');
}

describe('GRP groups API: new behaviours', () => {
  it('GRP-023 members list: seniors first with their badge, then students in join order; no names, emails or mobiles', async () => {
    const s1 = await signup('stu_first'), s2 = await signup('stu_second');
    invite(); const sen = await signup('senior_late', { inviteCode: CODE });
    const g = await join(s1, { kind: 'COURSE', courseCode: '012' });
    raw.exec(`UPDATE group_member SET joined_at = '2026-01-01T00:00:00Z'`);   // make join order explicit
    await join(s2, { kind: 'COURSE', courseCode: '012' });
    raw.exec(`UPDATE group_member SET joined_at = '2026-01-02T00:00:00Z' WHERE account_id = 2`);
    await join(sen, { kind: 'COURSE', courseCode: '012' });                   // joined last, still listed first
    const m = await (await call('GET', `/groups/${g.id}/members`, undefined, s2)).json() as { username: string; badge: string | null }[];
    expect(m.map(x => x.username)).toEqual(['senior_late', 'stu_first', 'stu_second']);
    expect(m[0].badge).toMatch(/^Verified senior · Computer Science.*, year 2$/i);
    expect(m.slice(1).map(x => x.badge)).toEqual([null, null]);
    const text = JSON.stringify(m);
    for (const secret of ['Secret Fullname', 'secret.person@example.com', '0712345678']) expect(text).not.toContain(secret);
  });
  it('GRP-024 a stale or junk acceptRules after accepting the current rules still joins, and records nothing extra', async () => {
    const a = await signup('nimal');
    await join(a, { kind: 'COURSE', courseCode: '012' });
    for (const stale of ['2020-01-01', '', 123, null]) {
      const r = await call('POST', '/groups/join', { kind: 'COURSE', courseCode: '001', acceptRules: stale }, a);
      expect(r.status, String(stale)).toBe(200);
    }
    expect(raw.prepare('SELECT rules_version AS v FROM group_rules_acceptance').all()).toEqual([{ v: GROUP_RULES_VERSION }]);
    expect(n('SELECT count(*) AS n FROM group_member')).toBe(2);
  });
  it('GRP-025 leave then rejoin: same group, no new rules prompt, members count goes 2 -> 1 -> 2, live works again', async () => {
    const a = await signup('nimal'), b = await signup('kamal');
    const g = await join(a, { kind: 'COURSE', courseCode: '012' });
    await join(b, { kind: 'COURSE', courseCode: '012' });
    expect((await call('POST', `/groups/${g.id}/leave`, undefined, a)).status).toBe(204);
    const after = await (await call('GET', `/groups/${g.id}`, undefined, a)).json() as GroupSummary;
    expect([after.members, after.joined]).toEqual([1, false]);
    expect((await call('GET', `/groups/${g.id}/members`, undefined, a)).status).toBe(403);
    const back = await (await call('POST', '/groups/join', { kind: 'COURSE', courseCode: '012' }, a)).json() as GroupSummary;   // no acceptRules
    expect([back.id, back.members, back.joined, back.rulesAccepted]).toEqual([g.id, 2, true, true]);
    expect(n('SELECT count(*) AS n FROM course_group')).toBe(1);
    expect(n('SELECT count(*) AS n FROM group_rules_acceptance')).toBe(2);
    await call('GET', `/groups/${g.id}/live`, undefined, a, { Upgrade: 'websocket' });
    expect(liveReqs).toHaveLength(1);
  });
  it('GRP-026 leaving is idempotent and safe: not a member -> 204 and nothing changes; bad ids -> 404', async () => {
    const a = await signup('nimal'), b = await signup('kamal');
    const g = await join(a, { kind: 'COURSE', courseCode: '012' });
    expect((await call('POST', `/groups/${g.id}/leave`, undefined, b)).status).toBe(204);
    expect(n('SELECT count(*) AS n FROM group_member')).toBe(1);
    for (const bad of ['0', '-1', 'abc', '1.5']) expect((await call('POST', `/groups/${bad}/leave`, undefined, a)).status, bad).toBe(404);
  });
  it('GRP-027 live: the room gets the right identity, sample thread, blocked list and senior badge headers', async () => {
    const a = await signup('nimal'), b = await signup('kamal');
    invite(); const sen = await signup('senior_one', { inviteCode: CODE });
    await call('POST', '/blocks', { username: 'kamal' }, a);
    const med = await join(a, { kind: 'COURSE', courseCode: '001' });
    const other = await join(a, { kind: 'COURSE', courseCode: '002' });
    const batch = await join(a, { kind: 'BATCH' });
    const cs = await join(sen, { kind: 'COURSE', courseCode: '012' });
    await join(b, { kind: 'COURSE', courseCode: '001' });
    for (const [ck, g] of [[a, med], [a, other], [a, batch], [sen, cs]] as const)
      await call('GET', `/groups/${g.id}/live`, undefined, ck, { Upgrade: 'websocket' });
    const h = liveReqs.map(r => r.headers);
    expect(h.map(x => x.get('X-ZP-Sample'))).toEqual(['COURSE:001', 'COURSE', 'BATCH', 'COURSE:012']);
    expect(h[0].get('X-ZP-Author')).toBe('nimal');
    expect(JSON.parse(h[0].get('X-ZP-Blocked')!)).toEqual([2]);
    expect(h[0].get('X-ZP-Badge')).toBe('');
    expect(decodeURIComponent(h[3].get('X-ZP-Badge')!)).toMatch(/^Verified senior · Computer Science.*, year 2$/i);
    expect(liveReqs.map(r => r.room)).toEqual([`group:${med.id}`, `group:${other.id}`, `group:${batch.id}`, `group:${cs.id}`]);
  });
  it('GRP-028 a sample message cannot be reported (its id is not a real message id)', async () => {
    const a = await signup('nimal');
    const g = await join(a, { kind: 'COURSE', courseCode: '001' });
    for (const m of samplesFor('COURSE:001')) expect((await call('POST', `/groups/${g.id}/report`, { messageId: m.id, reason: 'SPAM' }, a)).status, m.id).toBe(400);
    expect(n('SELECT count(*) AS n FROM message_report')).toBe(0);
  });
  it('GRP-029 group writes from another website are refused (join, leave, report, block)', async () => {
    const a = await signup('nimal'); await signup('kamal');
    const g = await join(a, { kind: 'COURSE', courseCode: '012' });
    const evil = { Origin: 'https://evil.example' };
    expect((await call('POST', '/groups/join', { acceptRules: GROUP_RULES_VERSION, kind: 'COURSE', courseCode: '001' }, a, evil)).status).toBe(403);
    expect((await call('POST', `/groups/${g.id}/leave`, undefined, a, evil)).status).toBe(403);
    expect((await call('POST', `/groups/${g.id}/report`, { messageId: 'a'.repeat(32), reason: 'SPAM' }, a, evil)).status).toBe(403);
    expect((await call('POST', '/blocks', { username: 'kamal' }, a, evil)).status).toBe(403);
    expect([n('SELECT count(*) AS n FROM group_member'), n('SELECT count(*) AS n FROM message_report'), n('SELECT count(*) AS n FROM account_block')]).toEqual([1, 0, 0]);
    // same origin still works
    expect((await call('POST', `/groups/${g.id}/leave`, undefined, a, { Origin: 'http://localhost' })).status).toBe(204);
  });
  it('GRP-030 group list: joined groups sort first, and after leaving a group shows as not joined with the right count', async () => {
    const a = await signup('nimal'), b = await signup('kamal');
    const g = await join(b, { kind: 'COURSE', courseCode: '012' });
    await join(a, { kind: 'COURSE', courseCode: '012' });
    let list = await (await call('GET', '/groups?courses=001,012', undefined, a)).json() as GroupsResponse;
    expect(list.groups[0]).toMatchObject({ courseCode: '012', joined: true, members: 2 });
    await call('POST', `/groups/${g.id}/leave`, undefined, a);
    list = await (await call('GET', '/groups?courses=001,012', undefined, a)).json() as GroupsResponse;
    expect(list.groups.find(x => x.courseCode === '012')).toMatchObject({ id: g.id, joined: false, members: 1 });
    expect(list.groups.every(x => !x.joined)).toBe(true);
    expect(list.popular.some(x => x.courseCode === '001' || x.courseCode === '012')).toBe(false);   // never repeated under Popular
  });
});
