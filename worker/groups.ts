// Course groups API (CR-002). Mounted under /api by worker/index.ts. Every route needs a session; which account acts
// comes only from the session cookie. Group rows, members, reports and blocks are in D1 (migration 0006); messages are
// in each group's GroupRoom Durable Object.
//   GET  /groups?courses=045,046     -> GroupsResponse: the groups for those courses + the student's batch + joined ones
//   POST /groups/join {kind, courseCode?, acceptRules} -> GroupSummary (creates the group on first join; CR-005: the
//                                    current GROUP_RULES_VERSION must be sent, and is recorded on the membership)
//   GET  /groups/:id                 -> GroupSummary (name and members, for the room's header)
//   POST /groups/:id/leave           -> 204
//   GET  /groups/:id/live            -> WebSocket into the room (members only)
//   POST /groups/:id/report {messageId, reason} -> 204; REPORTS_TO_HIDE distinct reports hide the message
//   GET  /blocks | POST /blocks {username} | DELETE /blocks/:username
import { Hono, type Context } from 'hono';
import { GROUP_RULES_VERSION, POPULAR_COURSES, REPORT_REASONS, REPORTS_TO_HIDE, seniorBadge, type GroupSummary, type GroupsResponse } from '../shared/groups.ts';
import { sampleKey } from '../shared/group-samples.ts';
import { normaliseUsername, USERNAME_RE } from '../shared/account.ts';
import { book } from './rulebook.ts';
import { err, ready, requireSession, sameOrigin, type AppEnv } from './account.ts';
import { tidyName as titleCaseName } from './ask.ts';

type C = Context<AppEnv>;
const nowIso = () => new Date().toISOString();
const COURSE_RE = /^\d{3}$/;

export const groupRoutes = new Hono<AppEnv>();
for (const p of ['/groups', '/groups/*', '/blocks', '/blocks/*']) groupRoutes.use(p, ready, sameOrigin, requireSession);

const room = (c: C, groupId: number) => c.env.GROUP_ROOM.get(c.env.GROUP_ROOM.idFromName(`group:${groupId}`));
const streamName = (code: string) => book.streams.find(s => s.code === code)?.name ?? code;
const districtName = (code: string) => titleCaseName(book.districts.find(d => d.code === code)?.name ?? code);

interface GroupRow { group_id: number; kind: 'COURSE' | 'BATCH'; course_code: string | null; stream_code: string | null; district_code: string | null; members: number; joined: number; rules_ok: number }
function summary(r: Pick<GroupRow, 'kind' | 'course_code' | 'stream_code' | 'district_code'> & { group_id: number | null; members: number; joined: number; rules_ok?: number }): GroupSummary {
  const rulesAccepted = r.rules_ok === 1;
  if (r.kind === 'COURSE') {
    const n = book.offerings.filter(o => o.courseCode === r.course_code).length;
    const name = titleCaseName(book.courses[r.course_code!]?.name ?? r.course_code!);
    return { id: r.group_id, kind: 'COURSE', courseCode: r.course_code, title: `Waiting for ${name}`, name, universities: n,
      subtitle: `Course ${r.course_code} · ${n} universit${n === 1 ? 'y' : 'ies'}`, members: r.members, joined: r.joined === 1, rulesAccepted };
  }
  const name = `${streamName(r.stream_code!)} · ${districtName(r.district_code!)}`;
  return { id: r.group_id, kind: 'BATCH', courseCode: null, title: name, name, universities: 0,
    subtitle: 'Your A/L batch: same stream, same district', members: r.members, joined: r.joined === 1, rulesAccepted };
}

const GROUP_SELECT = `SELECT g.group_id, g.kind, g.course_code, g.stream_code, g.district_code,
    (SELECT count(*) FROM group_member m WHERE m.group_id = g.group_id) AS members,
    mine.account_id IS NOT NULL AS joined, coalesce(mine.rules_version = '${GROUP_RULES_VERSION}', 0) AS rules_ok
  FROM course_group g LEFT JOIN group_member mine ON mine.group_id = g.group_id AND mine.account_id = ?`;

groupRoutes.get('/groups', async c => {
  const me = c.get('accountId'), db = c.env.DB;
  const courses = [...new Set((c.req.query('courses') ?? '').split(',').map(s => s.trim()).filter(s => COURSE_RE.test(s) && book.courses[s]))].slice(0, 30);
  const acc = await db.prepare(`SELECT a.role, p.stream_code, p.district_code FROM account a LEFT JOIN student_profile p USING (account_id)
    WHERE a.account_id = ?`).bind(me).first<{ role: string; stream_code: string | null; district_code: string | null }>();
  const existing = (await db.prepare(`${GROUP_SELECT} WHERE EXISTS (SELECT 1 FROM group_member m WHERE m.group_id = g.group_id AND m.account_id = ?)
      OR (g.kind = 'COURSE' AND g.course_code IN (SELECT value FROM json_each(?)))
      OR (g.kind = 'BATCH' AND g.stream_code = ? AND g.district_code = ?)`)
    .bind(me, me, JSON.stringify(courses), acc?.stream_code ?? null, acc?.district_code ?? null).all<GroupRow>()).results;
  const out = existing.map(summary);
  for (const code of courses) if (!existing.some(g => g.kind === 'COURSE' && g.course_code === code))
    out.push(summary({ group_id: null, kind: 'COURSE', course_code: code, stream_code: null, district_code: null, members: 0, joined: 0 }));
  if (acc?.stream_code && !existing.some(g => g.kind === 'BATCH' && g.stream_code === acc.stream_code && g.district_code === acc.district_code))
    out.push(summary({ group_id: null, kind: 'BATCH', course_code: null, stream_code: acc.stream_code, district_code: acc.district_code, members: 0, joined: 0 }));
  out.sort((a, b) => Number(b.joined) - Number(a.joined) || Number(a.kind === 'COURSE') - Number(b.kind === 'COURSE') || b.members - a.members);
  // Popular course groups for everyone (video 2), except those already listed above.
  const listed = new Set(out.filter(g => g.kind === 'COURSE').map(g => g.courseCode));
  const popCodes = POPULAR_COURSES.filter(code => !listed.has(code));
  const popRows = popCodes.length ? (await db.prepare(`${GROUP_SELECT} WHERE g.kind = 'COURSE' AND g.course_code IN (SELECT value FROM json_each(?))`)
    .bind(me, JSON.stringify(popCodes)).all<GroupRow>()).results : [];
  const popular = popCodes.map(code => { const r = popRows.find(x => x.course_code === code);
    return r ? summary(r) : summary({ group_id: null, kind: 'COURSE', course_code: code, stream_code: null, district_code: null, members: 0, joined: 0 }); });
  return c.json({ groups: out, popular, role: acc?.role === 'SENIOR' ? 'SENIOR' : acc?.role === 'STUDENT' ? 'STUDENT' : 'OTHER' } satisfies GroupsResponse);
});

groupRoutes.post('/groups/join', async c => {
  const me = c.get('accountId'), db = c.env.DB, now = nowIso();
  const b = (await c.req.json().catch(() => null)) as { kind?: unknown; courseCode?: unknown; acceptRules?: unknown } | null;
  if (b?.acceptRules !== GROUP_RULES_VERSION) return err(c, 400, 'Read and accept the group rules to join', 'acceptRules');
  let where: string, args: unknown[], insert: D1PreparedStatement;
  if (b?.kind === 'COURSE') {
    const code = String(b.courseCode ?? '');
    if (!COURSE_RE.test(code) || !book.courses[code]) return err(c, 400, 'Unknown course', 'courseCode');
    where = `kind = 'COURSE' AND course_code = ?`; args = [code];
    insert = db.prepare(`INSERT OR IGNORE INTO course_group (kind, course_code, created_at) VALUES ('COURSE', ?, ?)`).bind(code, now);
  } else if (b?.kind === 'BATCH') {
    const p = await db.prepare('SELECT stream_code, district_code FROM student_profile WHERE account_id = ?').bind(me)
      .first<{ stream_code: string; district_code: string }>();
    if (!p) return err(c, 403, 'Batch groups are for students who saved their results to their account');
    where = `kind = 'BATCH' AND stream_code = ? AND district_code = ?`; args = [p.stream_code, p.district_code];
    insert = db.prepare(`INSERT OR IGNORE INTO course_group (kind, stream_code, district_code, created_at) VALUES ('BATCH', ?, ?, ?)`).bind(p.stream_code, p.district_code, now);
  } else return err(c, 400, 'Choose a course group or your batch group', 'kind');
  await db.batch([insert,
    db.prepare(`INSERT INTO group_member (group_id, account_id, joined_at, rules_version) SELECT group_id, ?, ?, ? FROM course_group WHERE ${where}
      ON CONFLICT (group_id, account_id) DO UPDATE SET rules_version = excluded.rules_version`).bind(me, now, GROUP_RULES_VERSION, ...args)]);
  const row = await db.prepare(`${GROUP_SELECT} WHERE ${where.replace(/\b(kind|course_code|stream_code|district_code)\b/g, 'g.$1')}`).bind(me, ...args).first<GroupRow>();
  return c.json(summary(row!));
});

const groupId = (c: C) => { const n = Number(c.req.param('id')); return Number.isInteger(n) && n > 0 ? n : null; };
const isMember = (c: C, id: number) => c.env.DB.prepare('SELECT 1 FROM group_member WHERE group_id = ? AND account_id = ?').bind(id, c.get('accountId')).first();

groupRoutes.get('/groups/:id', async c => {
  const id = groupId(c);
  const row = id ? await c.env.DB.prepare(`${GROUP_SELECT} WHERE g.group_id = ?`).bind(c.get('accountId'), id).first<GroupRow>() : null;
  return row ? c.json(summary(row)) : err(c, 404, 'No such group');
});

groupRoutes.post('/groups/:id/leave', async c => {
  const id = groupId(c);
  if (!id) return err(c, 404, 'No such group');
  await c.env.DB.prepare('DELETE FROM group_member WHERE group_id = ? AND account_id = ?').bind(id, c.get('accountId')).run();
  return c.body(null, 204);
});

groupRoutes.get('/groups/:id/live', async c => {
  const id = groupId(c), me = c.get('accountId');
  const m = id ? await c.env.DB.prepare(`SELECT g.kind, g.course_code, mb.rules_version FROM group_member mb JOIN course_group g USING (group_id)
    WHERE mb.group_id = ? AND mb.account_id = ?`).bind(id, me).first<{ kind: 'COURSE' | 'BATCH'; course_code: string | null; rules_version: string | null }>() : null;
  if (!id || !m) return err(c, 403, 'Join the group first');
  if (m.rules_version !== GROUP_RULES_VERSION) return err(c, 403, 'Accept the group rules first', 'acceptRules');   // CR-005
  if (c.req.header('Upgrade') !== 'websocket') return err(c, 400, 'Expected a WebSocket');
  if (!c.env.GROUP_ROOM) return err(c, 503, 'Groups are not available yet');
  const [senior, blocked] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT c.name_en AS course, v.study_year AS year FROM senior_invite v JOIN course c USING (course_code)
      JOIN account a ON a.account_id = v.redeemed_by WHERE v.redeemed_by = ? AND a.role = 'SENIOR'`).bind(me),
    c.env.DB.prepare('SELECT blocked_id FROM account_block WHERE blocker_id = ?').bind(me),
  ]);
  const s = (senior.results as { course: string; year: number }[])[0];
  const headers = new Headers(c.req.raw.headers);
  headers.set('X-ZP-Account', String(me));
  headers.set('X-ZP-Author', c.get('username'));                // usernames are [a-z0-9_.] only
  headers.set('X-ZP-Badge', s ? encodeURIComponent(seniorBadge(titleCaseName(s.course), s.year)) : '');   // headers are ASCII-only
  headers.set('X-ZP-Sample', sampleKey(m.kind, m.course_code));    // which labelled sample thread the room shows first
  headers.set('X-ZP-Blocked', JSON.stringify((blocked.results as { blocked_id: number }[]).map(r => r.blocked_id)));
  return room(c, id).fetch(new Request('https://room/live', { headers }));
});

groupRoutes.post('/groups/:id/report', async c => {
  const id = groupId(c), me = c.get('accountId');
  if (!id || !(await isMember(c, id))) return err(c, 403, 'Join the group first');
  const b = (await c.req.json().catch(() => null)) as { messageId?: unknown; reason?: unknown } | null;
  const messageId = String(b?.messageId ?? ''), reason = String(b?.reason ?? '');
  if (!/^[0-9a-f]{32}$/.test(messageId)) return err(c, 400, 'Unknown message', 'messageId');
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) return err(c, 400, 'Choose a reason', 'reason');
  if (c.env.GROUP_ROOM) {
    const known = await room(c, id).fetch('https://room/exists', { method: 'POST', body: JSON.stringify({ messageId }) }).then(r => r.json<{ exists: boolean }>());
    if (!known.exists) return err(c, 404, 'That message is no longer there');
  }
  await c.env.DB.prepare(`INSERT OR IGNORE INTO message_report (group_id, message_id, reporter_id, reason, created_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, messageId, me, reason, nowIso()).run();
  const n = await c.env.DB.prepare('SELECT count(*) AS n FROM message_report WHERE group_id = ? AND message_id = ?').bind(id, messageId).first<number>('n');
  if ((n ?? 0) >= REPORTS_TO_HIDE && c.env.GROUP_ROOM)
    await room(c, id).fetch('https://room/hide', { method: 'POST', body: JSON.stringify({ messageId }) });
  return c.body(null, 204);
});

groupRoutes.get('/blocks', async c => {
  const rows = await c.env.DB.prepare(`SELECT p.username FROM account_block b JOIN password_login p ON p.account_id = b.blocked_id
    WHERE b.blocker_id = ? ORDER BY p.username`).bind(c.get('accountId')).all<{ username: string }>();
  return c.json({ blocked: rows.results.map(r => r.username) });
});

groupRoutes.post('/blocks', async c => {
  const b = (await c.req.json().catch(() => null)) as { username?: unknown } | null;
  const username = normaliseUsername(String(b?.username ?? ''));
  if (!USERNAME_RE.test(username) || username === c.get('username')) return err(c, 400, 'Choose someone else to block', 'username');
  const r = await c.env.DB.prepare(`INSERT OR IGNORE INTO account_block (blocker_id, blocked_id, created_at)
    SELECT ?, account_id, ? FROM password_login WHERE username = ?`).bind(c.get('accountId'), nowIso(), username).run();
  if (!r.meta.changes && !(await c.env.DB.prepare('SELECT 1 FROM password_login WHERE username = ?').bind(username).first()))
    return err(c, 404, 'No such member');
  return c.body(null, 204);
});

groupRoutes.delete('/blocks/:username', async c => {
  await c.env.DB.prepare(`DELETE FROM account_block WHERE blocker_id = ? AND blocked_id = (SELECT account_id FROM password_login WHERE username = ?)`)
    .bind(c.get('accountId'), normaliseUsername(c.req.param('username'))).run();
  return c.body(null, 204);
});
