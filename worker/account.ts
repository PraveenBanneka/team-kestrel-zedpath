// Student accounts API (CR-001, approved 2026-10-05). Mounted under /api by worker/index.ts.
//   POST /auth/salt     {username}             -> {salt, kdf}   (same answer shape for unknown usernames)
//   POST /auth/signup   {username, key, profile, extras} -> 201 {username, recoveryCode} + session cookie
//   POST /auth/login    {username, key}        -> MeResponse + session cookie
//   POST /auth/recover  {username, code, key}  -> {username, recoveryCode} + session cookie (all other sessions end)
//   POST /auth/logout | /auth/logout-all       -> 204
//   GET /me | PUT /me {profile, extras} | DELETE /me (deletes the account and every row under it)
// Security model: the password never reaches the server (the phone sends key = PBKDF2(password, salt, 600000));
// the server stores SHA-256(key), so a login costs microseconds of CPU (Free plan: 10 ms per request).
// Which account a request acts on comes ONLY from the session cookie, never from the request body.
import { Hono, type Context, type Next } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import type { ApiError, ProfileInput } from '../shared/api.ts';
import {
  ACHIEVEMENT_KINDS, ACTIVITY_MAX, INTERESTS, KDF, KEY_HEX_RE, LEVELS, MAX_ACHIEVEMENTS, PLACES, RECOVERY_RE, SESSION_DAYS,
  USERNAME_RE, normaliseUsername, type Achievement, type Extras, type MeResponse, type SaltResponse, type SignupResponse,
} from '../shared/account.ts';
import { parseProfile } from './rulebook.ts';

type AppEnv = { Bindings: Env; Variables: { accountId: number; username: string; tokenHash: string } };
type C = Context<AppEnv>;

const COOKIE = 'zp_session';
const COOKIE_OPTS = { httpOnly: true, secure: true, sameSite: 'Lax', path: '/api' } as const;
const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...(b instanceof Uint8Array ? b : new Uint8Array(b))].map(x => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string) => new Uint8Array((h.match(/../g) ?? []).map(x => parseInt(x, 16)));
const randomHex = (bytes: number) => hex(crypto.getRandomValues(new Uint8Array(bytes)));
const sha256Hex = async (data: Uint8Array) => hex(await crypto.subtle.digest('SHA-256', data));
const nowIso = () => new Date().toISOString();
async function hmacHex(secret: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}
/** Constant-time comparison of two hex strings of equal length. */
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
/** 80 random bits as XXXX-XXXX-XXXX-XXXX (RFC 4648 base32: letters A-Z and digits 2-7 only). */
function newRecoveryCode(): string {
  let bits = 0, val = 0, out = '';
  for (const x of crypto.getRandomValues(new Uint8Array(10))) {
    val = ((val << 8) | x) & 0xfff; bits += 8;
    while (bits >= 5) { out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  return out.match(/.{4}/g)!.join('-');
}
/** Typed-back codes: case, spaces and dashes do not matter, and the digits 0, 1 and 8 (never in a code) are read as
 *  the letters they get mistaken for: O, I and B. */
export const normaliseCode = (s: string) => (s.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/0/g, 'O').replace(/1/g, 'I')
  .replace(/8/g, 'B').match(/.{1,4}/g) ?? []).join('-');
const saltFor = async (pepper: string, username: string) => (await hmacHex(pepper, `salt:${username}`)).slice(0, 32);
const err = (c: C, status: 400 | 401 | 403 | 404 | 409 | 429 | 503, error: string, field?: string) =>
  c.json({ error, ...(field ? { field } : {}) } satisfies ApiError, status);
const body = async (c: C) => (await c.req.json().catch(() => null)) as Record<string, unknown> | null;

export const accountRoutes = new Hono<AppEnv>();

// The feature is off until the database and the server secret exist (safe default: the app works without accounts).
const ready = async (c: C, next: Next) => {
  if (!c.env.DB || !c.env.PEPPER) return err(c, 503, 'Accounts are not available yet');
  await next();
};
// Writes from other websites are refused (browsers always send Origin on cross-site POST/PUT/DELETE).
const sameOrigin = async (c: C, next: Next) => {
  if (!['GET', 'HEAD'].includes(c.req.method)) {
    const origin = c.req.header('Origin');
    if (origin && new URL(origin).host !== new URL(c.req.url).host) return err(c, 403, 'Cross-site request refused');
  }
  await next();
};
/** Two limits: 10/min per action + IP + username (guessing one account) and 100/min per IP (floods). Never per IP
 *  alone at the low limit: a school lab or a home Wi-Fi puts many students behind one IP. */
const limited = async (c: C, action: string, username: string) => {
  const checks = [c.env.AUTH_LIMITER?.limit({ key: `${action}:${ip(c)}:${username}` }), c.env.IP_LIMITER?.limit({ key: `ip:${ip(c)}` })];
  return (await Promise.all(checks)).some(r => r && !r.success);
};
const ip = (c: C) => c.req.header('CF-Connecting-IP') ?? 'local';

const requireSession = async (c: C, next: Next) => {
  const token = getCookie(c, COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return err(c, 401, 'Please log in');
  const tokenHash = await sha256Hex(fromHex(token));
  const row = await c.env.DB.prepare(`SELECT s.account_id AS accountId, p.username AS username FROM session s
      JOIN password_login p USING (account_id) WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(tokenHash, nowIso()).first<{ accountId: number; username: string }>();
  if (!row) { deleteCookie(c, COOKIE, COOKIE_OPTS); return err(c, 401, 'Please log in'); }
  c.set('accountId', row.accountId); c.set('username', row.username); c.set('tokenHash', tokenHash);
  await next();
};

for (const p of ['/auth/*', '/me']) accountRoutes.use(p, ready, sameOrigin);
accountRoutes.use('/auth/logout', requireSession);
accountRoutes.use('/auth/logout-all', requireSession);
accountRoutes.use('/me', requireSession);

// ---------------------------------------------------------------- validation
export function parseExtras(x: unknown): Extras | ApiError {
  const e = (x ?? {}) as Partial<Extras>;
  const ach = e.achievements ?? [], ints = e.interests ?? [];
  if (!Array.isArray(ach) || !Array.isArray(ints)) return { error: 'Achievements and interests must be lists' };
  if (ach.length > MAX_ACHIEVEMENTS) return { error: `At most ${MAX_ACHIEVEMENTS} achievements`, field: 'achievements' };
  const achievements: Achievement[] = [];
  for (const a of ach as Partial<Achievement>[]) {
    const activity = typeof a?.activity === 'string' ? a.activity.trim() : '';
    if (!activity || activity.length > ACTIVITY_MAX) return { error: `Each achievement needs a name of up to ${ACTIVITY_MAX} characters`, field: 'achievements' };
    if (!(ACHIEVEMENT_KINDS as readonly unknown[]).includes(a.kind) || !(LEVELS as readonly unknown[]).includes(a.level)
      || !(PLACES as readonly unknown[]).includes(a.place) || !Number.isInteger(a.year) || a.year! < 2000 || a.year! > 2100)
      return { error: 'An achievement has an unknown type, level, result or year', field: 'achievements' };
    achievements.push({ id: '', activity, kind: a.kind!, level: a.level!, place: a.place!, year: a.year! });
  }
  if (!ints.every(i => (INTERESTS as readonly unknown[]).includes(i)) || new Set(ints).size !== ints.length)
    return { error: 'Unknown interest', field: 'interests' };
  return { achievements, interests: ints as string[] };
}

/** Statements that replace the student's profile and extras. `id` is SQL yielding the account_id plus its args. */
function saveStatements(db: D1Database, id: { sql: string; args: unknown[] }, p: ProfileInput | null, e: Extras, now: string) {
  const s = (sql: string, ...args: unknown[]) => db.prepare(sql).bind(...id.args, ...args);
  const out: D1PreparedStatement[] = [];
  if (p) {
    out.push(s(`INSERT INTO student_profile (account_id, stream_code, district_code, z_e4, updated_at) VALUES (${id.sql}, ?, ?, ?, ?)
      ON CONFLICT (account_id) DO UPDATE SET stream_code = excluded.stream_code, district_code = excluded.district_code,
      z_e4 = excluded.z_e4, updated_at = excluded.updated_at`, p.stream, p.district, p.zE4, now));
    out.push(s(`DELETE FROM student_subject WHERE account_id = ${id.sql}`));
    Object.entries(p.al).forEach(([code, grade], i) =>
      out.push(s(`INSERT INTO student_subject (account_id, position, subject_code, grade) VALUES (${id.sql}, ?, ?, ?)`, i + 1, code, grade)));
  }
  out.push(s(`DELETE FROM student_achievement WHERE account_id = ${id.sql}`));
  e.achievements.forEach((a, i) => out.push(s(`INSERT INTO student_achievement (account_id, position, activity, kind, level, place, year)
    VALUES (${id.sql}, ?, ?, ?, ?, ?, ?)`, i + 1, a.activity, a.kind, a.level, a.place, a.year)));
  out.push(s(`DELETE FROM student_interest WHERE account_id = ${id.sql}`));
  e.interests.forEach(t => out.push(s(`INSERT INTO student_interest (account_id, interest) VALUES (${id.sql}, ?)`, t)));
  return out;
}

async function loadMe(db: D1Database, accountId: number, username: string): Promise<MeResponse> {
  const [p, subs, ach, ints] = await db.batch([
    db.prepare('SELECT stream_code, district_code, z_e4 FROM student_profile WHERE account_id = ?').bind(accountId),
    db.prepare('SELECT subject_code, grade FROM student_subject WHERE account_id = ? ORDER BY position').bind(accountId),
    db.prepare('SELECT achievement_id, activity, kind, level, place, year FROM student_achievement WHERE account_id = ? ORDER BY position').bind(accountId),
    db.prepare('SELECT interest FROM student_interest WHERE account_id = ?').bind(accountId),
  ]);
  const prof = (p.results as { stream_code: ProfileInput['stream']; district_code: string; z_e4: number }[])[0];
  const al = Object.fromEntries((subs.results as { subject_code: string; grade: string }[]).map(r => [r.subject_code, r.grade]));
  const order = (t: string) => (INTERESTS as readonly string[]).indexOf(t);
  return {
    username,
    profile: prof ? { stream: prof.stream_code, district: prof.district_code, zE4: prof.z_e4, al: al as ProfileInput['al'] } : null,
    extras: {
      achievements: (ach.results as (Omit<Achievement, 'id'> & { achievement_id: number })[])
        .map(({ achievement_id, ...a }) => ({ id: `a${achievement_id}`, ...a })),
      interests: (ints.results as { interest: string }[]).map(r => r.interest).sort((a, b) => order(a) - order(b)),
    },
  };
}

function sessionStatement(db: D1Database, idSql: string, idArgs: unknown[], tokenHash: string) {
  const now = new Date(), exp = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  return db.prepare(`INSERT INTO session (token_hash, account_id, created_at, expires_at) VALUES (?, ${idSql}, ?, ?)`)
    .bind(tokenHash, ...idArgs, now.toISOString(), exp.toISOString());
}
const setSessionCookie = (c: C, token: string) => setCookie(c, COOKIE, token, { ...COOKIE_OPTS, maxAge: SESSION_DAYS * 86_400 });

// ---------------------------------------------------------------- routes
accountRoutes.post('/auth/salt', async c => {
  const b = await body(c);
  const username = normaliseUsername(String(b?.username ?? ''));
  if (!USERNAME_RE.test(username)) return err(c, 400, 'Usernames are 3 to 24 characters: letters, numbers, dot or underscore', 'username');
  if (await limited(c, 'salt', username)) return err(c, 429, 'Too many tries. Wait a minute and try again');
  const derived = await saltFor(c.env.PEPPER, username);                  // computed every time: same cost either way
  const row = await c.env.DB.prepare('SELECT salt FROM password_login WHERE username = ?').bind(username).first<{ salt: string }>();
  return c.json({ salt: row?.salt ?? derived, kdf: KDF } satisfies SaltResponse);
});

accountRoutes.post('/auth/signup', async c => {
  const b = await body(c);
  const username = normaliseUsername(String(b?.username ?? ''));
  const key = String(b?.key ?? '');
  if (!USERNAME_RE.test(username)) return err(c, 400, 'Usernames are 3 to 24 characters: letters, numbers, dot or underscore', 'username');
  if (!KEY_HEX_RE.test(key)) return err(c, 400, 'Malformed sign-up request', 'key');
  const profile = b?.profile == null ? null : parseProfile(b.profile, true);
  if (profile && 'error' in profile) return c.json(profile, 400);
  const extras = parseExtras(b?.extras);
  if ('error' in extras) return c.json(extras, 400);
  if (await limited(c, 'signup', username)) return err(c, 429, 'Too many tries. Wait a minute and try again');

  const db = c.env.DB, now = nowIso(), subject = `local:${randomHex(16)}`;
  const id = { sql: '(SELECT account_id FROM account WHERE auth_subject = ?)', args: [subject] };
  const code = newRecoveryCode(), token = randomHex(32);
  try {
    await db.batch([
      db.prepare(`INSERT INTO account (auth_subject, role, created_at) VALUES (?, 'STUDENT', ?)`).bind(subject, now),
      db.prepare(`INSERT INTO password_login (account_id, username, salt, verifier, kdf, updated_at) VALUES (${id.sql}, ?, ?, ?, ?, ?)`)
        .bind(subject, username, await saltFor(c.env.PEPPER, username), await sha256Hex(fromHex(key)), KDF, now),
      db.prepare(`INSERT INTO recovery_code (account_id, code_hash, created_at) VALUES (${id.sql}, ?, ?)`)
        .bind(subject, await sha256Hex(enc.encode(code)), now),
      sessionStatement(db, id.sql, id.args, await sha256Hex(fromHex(token))),
      ...saveStatements(db, id, profile, extras, now),
    ]);
  } catch (e) {
    if (String(e).includes('password_login.username')) return err(c, 409, 'That username is taken. Try another', 'username');
    throw e;
  }
  setSessionCookie(c, token);
  return c.json({ username, recoveryCode: code } satisfies SignupResponse, 201);
});

accountRoutes.post('/auth/login', async c => {
  const b = await body(c);
  const username = normaliseUsername(String(b?.username ?? ''));
  const key = String(b?.key ?? '');
  if (!USERNAME_RE.test(username) || !KEY_HEX_RE.test(key)) return err(c, 401, 'Wrong username or password');
  if (await limited(c, 'login', username)) return err(c, 429, 'Too many tries. Wait a minute and try again');
  const row = await c.env.DB.prepare('SELECT account_id, verifier FROM password_login WHERE username = ?').bind(username)
    .first<{ account_id: number; verifier: string }>();
  const given = await sha256Hex(fromHex(key));
  const ok = sameHex(given, row?.verifier ?? '0'.repeat(64)) && !!row;   // compare even when unknown: same timing
  if (!ok || !row) return err(c, 401, 'Wrong username or password');
  const token = randomHex(32);
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM session WHERE account_id = ? AND expires_at <= ?').bind(row.account_id, nowIso()),
    sessionStatement(c.env.DB, '?', [row.account_id], await sha256Hex(fromHex(token))),
  ]);
  setSessionCookie(c, token);
  return c.json(await loadMe(c.env.DB, row.account_id, username));
});

accountRoutes.post('/auth/recover', async c => {
  const b = await body(c);
  const username = normaliseUsername(String(b?.username ?? ''));
  const code = normaliseCode(String(b?.code ?? ''));
  const key = String(b?.key ?? '');
  const wrong = () => err(c, 401, 'That username and recovery code do not match');
  if (!USERNAME_RE.test(username) || !RECOVERY_RE.test(code) || !KEY_HEX_RE.test(key)) return wrong();
  if (await limited(c, 'recover', username)) return err(c, 429, 'Too many tries. Wait a minute and try again');
  const row = await c.env.DB.prepare(`SELECT p.account_id, r.code_hash FROM password_login p JOIN recovery_code r USING (account_id)
    WHERE p.username = ?`).bind(username).first<{ account_id: number; code_hash: string }>();
  const ok = sameHex(await sha256Hex(enc.encode(code)), row?.code_hash ?? '0'.repeat(64)) && !!row;
  if (!ok || !row) return wrong();
  const fresh = newRecoveryCode(), token = randomHex(32), now = nowIso(), db = c.env.DB;
  await db.batch([
    db.prepare('UPDATE password_login SET verifier = ?, updated_at = ? WHERE account_id = ?').bind(await sha256Hex(fromHex(key)), now, row.account_id),
    db.prepare('UPDATE recovery_code SET code_hash = ?, created_at = ? WHERE account_id = ?').bind(await sha256Hex(enc.encode(fresh)), now, row.account_id),
    db.prepare('DELETE FROM session WHERE account_id = ?').bind(row.account_id),     // a reset logs out every device
    sessionStatement(db, '?', [row.account_id], await sha256Hex(fromHex(token))),
  ]);
  setSessionCookie(c, token);
  return c.json({ username, recoveryCode: fresh } satisfies SignupResponse);
});

accountRoutes.post('/auth/logout', async c => {
  await c.env.DB.prepare('DELETE FROM session WHERE token_hash = ?').bind(c.get('tokenHash')).run();
  deleteCookie(c, COOKIE, COOKIE_OPTS);
  return c.body(null, 204);
});

accountRoutes.post('/auth/logout-all', async c => {
  await c.env.DB.prepare('DELETE FROM session WHERE account_id = ?').bind(c.get('accountId')).run();
  deleteCookie(c, COOKIE, COOKIE_OPTS);
  return c.body(null, 204);
});

accountRoutes.get('/me', async c => c.json(await loadMe(c.env.DB, c.get('accountId'), c.get('username'))));

accountRoutes.put('/me', async c => {
  const b = await body(c);
  const profile = parseProfile(b?.profile, true);
  if ('error' in profile) return c.json(profile, 400);
  const extras = parseExtras(b?.extras);
  if ('error' in extras) return c.json(extras, 400);
  const id = c.get('accountId');
  await c.env.DB.batch(saveStatements(c.env.DB, { sql: '?', args: [id] }, profile, extras, nowIso()));
  return c.json(await loadMe(c.env.DB, id, c.get('username')));
});

accountRoutes.delete('/me', async c => {
  await c.env.DB.prepare('DELETE FROM account WHERE account_id = ?').bind(c.get('accountId')).run();   // cascades to every student row
  deleteCookie(c, COOKIE, COOKIE_OPTS);
  return c.body(null, 204);
});
