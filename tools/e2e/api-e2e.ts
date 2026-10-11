// ZedPath end-to-end API test harness (black box, over HTTP), run against a LOCAL server only (wrangler dev --local).
// Uses the same sign-up flow and password stretching (shared/kdf.ts) as the app. Creates 3-4 throwaway accounts
// (e2e_<run>_<x>) and deletes every one at the end (try/finally), checking that each deleted login returns 401.
// Ask is only called with inputs the server refuses before any model is reached (no AI quota used).
// Run from the repo root:  node tools/e2e/api-e2e.ts [http://localhost:8899]
// Writes tools/e2e/results/api-results.json + api-results.md. Never point this at the production URL.
import { deriveKey } from '../../shared/kdf.ts';
import { CONSENT_VERSION } from '../../shared/contact.ts';
import { GROUP_RULES_VERSION } from '../../shared/groups.ts';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] ?? 'http://localhost:8899').replace(/\/$/, '');
if (!['localhost', '127.0.0.1'].includes(new URL(BASE).hostname)) throw new Error('Local server only. Never run this against production.');
const SERVER_LABEL = 'local (wrangler dev --local)';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'results');
const ORIGIN = BASE;
const TIMEOUT_MS = 20_000;
// A per-run client IP for the rate-limiter keys (keeps this run's counts apart from other local test runs).
const IP = `10.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200) + 1}`;

// ------------------------------------------------------------------ HTTP helpers
interface Res { status: number; body: any; text: string; headers: Headers; setCookie: string[] }
async function http(method: string, path: string, opts: { body?: unknown; raw?: string; cookie?: string | null; origin?: string | null; headers?: Record<string, string> } = {}): Promise<Res> {
  const headers: Record<string, string> = { 'CF-Connecting-IP': IP, ...(opts.headers ?? {}) };
  if (opts.body !== undefined || opts.raw !== undefined) headers['Content-Type'] = 'application/json';
  const origin = opts.origin === undefined ? (method === 'GET' ? null : ORIGIN) : opts.origin;
  if (origin) headers.Origin = origin;
  if (opts.cookie) headers.Cookie = `zp_session=${opts.cookie}`;
  const r = await fetch(`${BASE}/api${path}`, { method, headers, signal: AbortSignal.timeout(TIMEOUT_MS),
    body: opts.raw !== undefined ? opts.raw : opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
  const text = await r.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { status: r.status, body, text, headers: r.headers, setCookie: r.headers.getSetCookie?.() ?? [] };
}
const sessionFrom = (r: Res) => r.setCookie.map(c => c.match(/^zp_session=([0-9a-f]{64})/)?.[1]).find(Boolean) ?? null;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ------------------------------------------------------------------ case runner
interface Case { id: string; area: string; title: string; trace: string; expected: string; actual: string; result: 'PASS' | 'FAIL' | 'SKIP'; ms: number }
const cases: Case[] = [];
let n = 0;
class Check extends Error {}
/** Runs one case. `fn` returns the "actual" description; expect() throws Check on a mismatch. */
async function t(area: string, title: string, trace: string, expected: string, fn: () => Promise<string>) {
  const id = `E2E-API-${String(++n).padStart(3, '0')}`, start = performance.now();
  let actual = '', result: Case['result'] = 'PASS';
  try { actual = await fn(); }
  catch (e) {
    result = 'FAIL';
    actual = e instanceof Check ? e.message : `ERROR: ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`;
  }
  const ms = Math.round(performance.now() - start);
  cases.push({ id, area, title, trace, expected, actual, result, ms });
  console.log(`${result} ${id} [${area}] ${title} (${ms} ms)${result === 'FAIL' ? `\n     expected: ${expected}\n     actual:   ${actual}` : ''}`);
}
function skip(area: string, title: string, trace: string, expected: string, why: string) {
  const id = `E2E-API-${String(++n).padStart(3, '0')}`;
  cases.push({ id, area, title, trace, expected, actual: `SKIPPED: ${why}`, result: 'SKIP', ms: 0 });
  console.log(`SKIP ${id} [${area}] ${title}: ${why}`);
}
function expect(cond: unknown, actual: string): asserts cond { if (!cond) throw new Check(actual); }
const desc = (r: Res) => `${r.status}${r.body?.error ? ` "${r.body.error}"` : ''}${r.body?.field ? ` field=${r.body.field}` : ''}${r.status >= 500 && !r.body?.error ? ` body="${r.text.slice(0, 120).replace(/\s+/g, ' ')}"` : ''}`;
async function status(r: Promise<Res> | Res, want: number, field?: string): Promise<string> {
  const x = await r;
  expect(x.status === want && (field === undefined || x.body?.field === field), desc(x));
  return desc(x);
}

// ------------------------------------------------------------------ fixtures
const STAMP = Date.now().toString(36);
const uname = (k: string) => `e2e_${STAMP}_${k}`.slice(0, 24);
const PROFILES: Record<string, { stream: string; district: string; zE4: number; al: Record<string, string> }> = {
  PHYS: { stream: 'PHYS', district: 'KUR', zE4: 14200, al: { CMATH: 'B', PHY: 'C', CHEM: 'C' } },
  BIO: { stream: 'BIO', district: 'COL', zE4: 15000, al: { BIO: 'A', CHEM: 'B', PHY: 'B' } },
  COMMERCE: { stream: 'COMMERCE', district: 'GAL', zE4: 9000, al: { ECON: 'A', ACC: 'B', BSTUD: 'B' } },
  ARTS: { stream: 'ARTS', district: 'JAF', zE4: 5000, al: { GEOG: 'B', HIST: 'B', POLSCI: 'C' } },
  ET: { stream: 'ET', district: 'MTR', zE4: 8000, al: { ET: 'A', SFT: 'B', ICT: 'B' } },
  BST: { stream: 'BST', district: 'ANU', zE4: 7000, al: { BST: 'B', SFT: 'C', AGRI: 'C' } },
};
const contact = (o: Partial<Record<string, string>> = {}) => ({ fullName: 'Test Student', email: 'e2e.student@example.com', mobile: '0771234567', birthDate: '2006-03-14', ...o });
const EXTRAS = { achievements: [{ id: 'a1', activity: 'School science day', kind: 'COMPETITION', level: 'NATIONAL', place: 'SECOND', year: 2024 }], interests: ['Maths'] };
const signupBody = (username: string, key: string, o: Record<string, unknown> = {}) =>
  ({ username, key, consent: CONSENT_VERSION, profile: PROFILES.PHYS, extras: EXTRAS, contact: contact(), ...o });
const FAKE_KEY = 'ab'.repeat(32);
const yearsAgo = (y: number, dayShift = 0) => { const d = new Date(); d.setUTCFullYear(d.getUTCFullYear() - y); d.setUTCDate(d.getUTCDate() + dayShift); return d.toISOString().slice(0, 10); };

interface Acct { username: string; key: string; cookie: string | null; recovery: string; deleted: boolean }
const accounts: Acct[] = [];
async function keyFor(username: string, password: string) {
  const s = await http('POST', '/auth/salt', { body: { username } });
  if (s.status !== 200) throw new Error(`salt ${desc(s)}`);
  return deriveKey(password, s.body.salt);
}
/** Signs up (one retry after 61 s if the limiter says 429). Registers the account for cleanup. */
async function signup(username: string, password: string, o: Record<string, unknown> = {}) {
  const key = await keyFor(username, password);
  let r = await http('POST', '/auth/signup', { body: signupBody(username, key, o) });
  if (r.status === 429) { console.log('  (429 from the sign-up limiter: waiting 61 s, one retry)'); await sleep(61_000); r = await http('POST', '/auth/signup', { body: signupBody(username, key, o) }); }
  const acct: Acct = { username: r.body?.username ?? username, key, cookie: sessionFrom(r), recovery: r.body?.recoveryCode ?? '', deleted: false };
  if (r.status === 201) accounts.push(acct);
  return { r, acct };
}
let ASK_OFF = false;
const login = (username: string, key: string) => http('POST', '/auth/login', { body: { username, key } });

// ------------------------------------------------------------------ suites
async function metaSuite() {
  const A = 'Meta & static data';
  await t(A, 'GET /health returns ok and the academic year', 'NFR-040', '200 {ok:true, academicYear:"2025/2026"}', async () => {
    const r = await http('GET', '/health'); expect(r.status === 200 && r.body?.ok === true && r.body.academicYear === '2025/2026', desc(r) + ' ' + r.text.slice(0, 80));
    return `200 ok=${r.body.ok} rules=${r.body.rules}`;
  });
  let etag = '';
  await t(A, 'GET /meta lists the 6 A/L streams', 'BR-010', '200, 6 streams', async () => {
    const r = await http('GET', '/meta'); etag = r.headers.get('ETag') ?? '';
    expect(r.status === 200 && r.body?.streams?.length === 6, `${r.status} streams=${r.body?.streams?.length}`); return `200 streams=${r.body.streams.map((s: any) => s.code).join(',')}`;
  });
  await t(A, 'GET /meta lists the 25 districts', 'BR-006', '25 districts', async () => {
    const r = await http('GET', '/meta'); expect(r.body?.districts?.length === 25, `districts=${r.body?.districts?.length}`); return `districts=${r.body.districts.length}`;
  });
  await t(A, 'GET /meta lists cited sources', 'FR-209, NFR-050', 'sources non-empty', async () => {
    const r = await http('GET', '/meta'); const s = r.body?.sources; const list = Array.isArray(s) ? s : Object.values(s ?? {});
    expect(list.length > 0, `sources=${JSON.stringify(s)?.slice(0, 80)}`); return `${list.length} sources`;
  });
  await t(A, 'GET /meta lists subjects', 'BR-012', 'subjects > 40', async () => {
    const r = await http('GET', '/meta'); expect(r.body?.subjects?.length > 40, `subjects=${r.body?.subjects?.length}`); return `subjects=${r.body.subjects.length}`;
  });
  await t(A, 'GET /meta with matching If-None-Match -> 304', 'NFR-003', '304, ETag present', async () => {
    expect(etag, 'no ETag header on /meta');
    const r = await http('GET', '/meta', { headers: { 'If-None-Match': etag } }); expect(r.status === 304, desc(r)); return '304';
  });
  await t(A, 'GET /routes lists every other route with an openNow flag', 'FR-501, FR-503', '200, each id R### with boolean openNow', async () => {
    const r = await http('GET', '/routes');
    expect(r.status === 200 && Array.isArray(r.body) && r.body.length > 0 && r.body.every((x: any) => /^R\d{3}$/.test(x.id) && typeof x.openNow === 'boolean'), `${r.status} len=${r.body?.length}`);
    return `200 routes=${r.body.length}, open now=${r.body.filter((x: any) => x.openNow).length}`;
  });
  await t(A, 'GET /routes is cacheable for 5 minutes', 'NFR-011', 'Cache-Control has max-age=300', async () => {
    const r = await http('GET', '/routes'); const cc = r.headers.get('Cache-Control') ?? ''; expect(cc.includes('max-age=300'), `Cache-Control="${cc}"`); return cc;
  });
  let jEtag = '';
  await t(A, 'GET /journey returns steps and notices (no build stamp)', 'BR-060, FR-401', '200, steps + notices arrays, no builtAt', async () => {
    const r = await http('GET', '/journey'); jEtag = r.headers.get('ETag') ?? '';
    expect(r.status === 200 && Array.isArray(r.body?.steps) && Array.isArray(r.body?.notices), desc(r));
    expect(!('builtAt' in r.body), 'builtAt leaked into the response');
    return `200 steps=${r.body.steps.length} notices=${r.body.notices.length}`;
  });
  await t(A, 'GET /journey with matching If-None-Match -> 304', 'NFR-003', '304', async () => status(http('GET', '/journey', { headers: { 'If-None-Match': jEtag } }), 304));
  await t(A, 'Unknown API route -> 404 JSON', 'n/a', '404 {error:"Not found"}', async () => {
    const r = await http('GET', '/does-not-exist'); expect(r.status === 404 && r.body?.error === 'Not found', desc(r)); return desc(r);
  });
  await t(A, 'Wrong method: POST /meta -> 404', 'n/a', '404', async () => status(http('POST', '/meta', { body: {} }), 404));
  await t(A, 'Wrong method: GET /results -> 404', 'n/a', '404', async () => status(http('GET', '/results'), 404));
  await t(A, 'Wrong method: DELETE /routes -> 404', 'n/a', '404', async () => status(http('DELETE', '/routes'), 404));
}

async function resultsSuite() {
  const A = 'Results & banding';
  const BANDS = new Set(['SAFE', 'LIKELY', 'REACH', 'OUT_OF_RANGE', 'NOT_ENOUGH_DATA']);
  for (const [stream, p] of Object.entries(PROFILES)) {
    await t(A, `POST /results for a ${stream} profile`, 'FR-201, FR-205', '200; every offering has one valid band; counts add up', async () => {
      const r = await http('POST', '/results', { body: p });
      expect(r.status === 200, desc(r));
      const offs = r.body.offerings as any[]; const total = Object.values(r.body.counts as Record<string, number>).reduce((a, b) => a + b, 0);
      expect(offs.every(o => BANDS.has(o.band)) && total === offs.length, `bands ok=${offs.every(o => BANDS.has(o.band))} total=${total} offerings=${offs.length}`);
      return `200 offerings=${offs.length} hidden=${r.body.hidden.length} counts=${JSON.stringify(r.body.counts)}`;
    });
  }
  await t(A, 'ARTS profile hides science-only courses with the rule quoted', 'FR-204', 'hidden > 0, each with reason + page', async () => {
    const r = await http('POST', '/results', { body: PROFILES.ARTS });
    expect(r.body?.hidden?.length > 0 && r.body.hidden.every((h: any) => typeof h.reason === 'string' && h.page != null), `hidden=${r.body?.hidden?.length}`);
    return `hidden=${r.body.hidden.length}`;
  });
  await t(A, 'Very high Z (+3.0000, PHYS) gives Safe offerings', 'BR-032', 'counts.SAFE > 0', async () => {
    const r = await http('POST', '/results', { body: { ...PROFILES.PHYS, zE4: 30000 } }); expect(r.body?.counts?.SAFE > 0, JSON.stringify(r.body?.counts)); return JSON.stringify(r.body.counts);
  });
  await t(A, 'Very low Z (-3.0000, PHYS) gives no Safe offering', 'BR-032', 'counts.SAFE = 0', async () => {
    const r = await http('POST', '/results', { body: { ...PROFILES.PHYS, zE4: -30000 } }); expect(r.body?.counts?.SAFE === 0, JSON.stringify(r.body?.counts)); return JSON.stringify(r.body.counts);
  });
  await t(A, 'Banded offerings carry the latest cut-off and the gap', 'FR-206, FR-208', 'latestE4 and gapToLatestE4 integers where banded', async () => {
    const r = await http('POST', '/results', { body: PROFILES.PHYS });
    const banded = (r.body.offerings as any[]).filter(o => o.band !== 'NOT_ENOUGH_DATA');
    expect(banded.length > 0 && banded.every(o => Number.isInteger(o.latestE4) && Number.isInteger(o.gapToLatestE4)), `banded=${banded.length} sample=${JSON.stringify(banded[0])?.slice(0, 120)}`);
    return `banded=${banded.length}, sample gap=${banded[0].gapToLatestE4}`;
  });
  await t(A, 'computedAt is an ISO time; no "guarantee" wording', 'FR-207', 'ISO date; no "guarantee" in body', async () => {
    const r = await http('POST', '/results', { body: PROFILES.BIO });
    expect(!Number.isNaN(Date.parse(r.body.computedAt)) && !/guarantee/i.test(r.text), `computedAt=${r.body.computedAt}`); return `computedAt=${r.body.computedAt}`;
  });
  await t(A, 'Edge Z = +4.0000 accepted', 'BR-005, FR-102', '200', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, zE4: 40000 } }), 200));
  await t(A, 'Edge Z = -4.0000 accepted', 'BR-005, FR-102', '200', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, zE4: -40000 } }), 200));
  await t(A, 'Edge Z = 0.0000 accepted', 'BR-005', '200', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, zE4: 0 } }), 200));
  await t(A, 'Z = +4.0001 rejected', 'BR-005, FR-102', '400 field=zE4', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, zE4: 40001 } }), 400, 'zE4'));
  await t(A, 'Z = -4.0001 rejected', 'BR-005, FR-102', '400 field=zE4', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, zE4: -40001 } }), 400, 'zE4'));
  await t(A, 'Z with a fifth decimal (non-integer zE4) rejected', 'FR-102', '400 field=zE4', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, zE4: 1.5 } }), 400, 'zE4'));
  await t(A, 'Z sent as a string rejected', 'FR-102, NFR-035', '400 field=zE4', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, zE4: '1.2' } }), 400, 'zE4'));
  await t(A, 'Unknown stream rejected', 'BR-010, NFR-035', '400 field=stream', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, stream: 'MAGIC' } }), 400, 'stream'));
  await t(A, 'Unknown district rejected', 'BR-006, NFR-035', '400 field=district', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, district: 'XXX' } }), 400, 'district'));
  await t(A, 'Two subjects rejected', 'BR-001', '400 field=al', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, al: { BIO: 'A', CHEM: 'B' } } }), 400, 'al'));
  await t(A, 'Four subjects rejected', 'BR-001', '400 field=al', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, al: { BIO: 'A', CHEM: 'B', PHY: 'B', ICT: 'A' } } }), 400, 'al'));
  await t(A, 'Grade F rejected', 'BR-011', '400 field=al', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, al: { BIO: 'F', CHEM: 'B', PHY: 'B' } } }), 400, 'al'));
  await t(A, 'Malformed subject code rejected', 'NFR-035', '400 field=al', async () => status(http('POST', '/results', { body: { ...PROFILES.BIO, al: { 'bio;--': 'A', CHEM: 'B', PHY: 'B' } } }), 400, 'al'));
  await t(A, 'Invalid JSON body rejected', 'NFR-035', '400', async () => status(http('POST', '/results', { raw: '{not json' }), 400));
  await t(A, 'JSON null body rejected', 'NFR-035', '400', async () => status(http('POST', '/results', { raw: 'null' }), 400));
}

async function offeringsSuite() {
  const A = 'Offerings';
  let etag = '';
  await t(A, 'GET /offerings/001A returns detail with a citation', 'FR-208, FR-209', '200, uniCode 001A, requirementCitation.page', async () => {
    const r = await http('GET', '/offerings/001A'); etag = r.headers.get('ETag') ?? '';
    expect(r.status === 200 && r.body.uniCode === '001A' && r.body.requirementCitation?.page != null, desc(r)); return `200 ${r.body.course} @ ${r.body.institution}`;
  });
  await t(A, 'Uni-Code lookup is case-insensitive (001a)', 'BR-015', '200 uniCode 001A', async () => {
    const r = await http('GET', '/offerings/001a'); expect(r.status === 200 && r.body.uniCode === '001A', desc(r)); return '200 001A';
  });
  await t(A, 'History without a district has null cut-offs', 'FR-208', 'every history zE4 null', async () => {
    const r = await http('GET', '/offerings/001A'); const h = (r.body.groups as any[]).flatMap(g => g.history);
    expect(h.length > 0 && h.every(x => x.zE4 === null), `history=${h.length}`); return `${h.length} years, all null`;
  });
  await t(A, 'History with ?district=COL has cut-offs, each year cited', 'FR-208, FR-209', 'some zE4 numeric; every year has a citation page', async () => {
    const r = await http('GET', '/offerings/001A?district=COL'); const h = (r.body.groups as any[]).flatMap(g => g.history);
    expect(h.some(x => typeof x.zE4 === 'number') && h.every(x => x.citation?.page != null), JSON.stringify(h).slice(0, 120));
    return `${h.length} years; first ${JSON.stringify(h[0]?.zE4)}`;
  });
  await t(A, 'Requirement lines (needs) present', 'FR-202', 'needs non-empty array', async () => {
    const r = await http('GET', '/offerings/001A'); expect(Array.isArray(r.body.needs) && r.body.needs.length > 0, `needs=${JSON.stringify(r.body.needs)}`); return `${r.body.needs.length} lines`;
  });
  await t(A, 'Unknown Uni-Code -> 404', 'BR-015', '404', async () => status(http('GET', '/offerings/999Z'), 404));
  await t(A, 'Injection-like Uni-Code -> 404', 'NFR-035', '404', async () => status(http('GET', `/offerings/${encodeURIComponent("1' OR 1=1")}`), 404));
  await t(A, 'Offering detail with matching If-None-Match -> 304', 'NFR-003', '304', async () => status(http('GET', '/offerings/001A', { headers: { 'If-None-Match': etag } }), 304));
}

/** Validation cases refused before the rate limiter (no account is made). */
async function signupValidationSuite() {
  const A = 'Auth: sign-up validation';
  const u = uname('v');
  const bad = (title: string, trace: string, field: string, o: Record<string, unknown>) =>
    t(A, title, trace, `400 field=${field}`, async () => status(http('POST', '/auth/signup', { body: signupBody(u, FAKE_KEY, o) }), 400, field));
  await bad('Username too short ("ab")', 'BR-050', 'username', { username: 'ab' });
  await bad('Username with illegal characters', 'BR-050', 'username', { username: 'bad name!' });
  await bad('Username too long (25 characters)', 'BR-050', 'username', { username: 'a'.repeat(25) });
  await bad('Key too short', 'NFR-036', 'key', { key: 'abcd' });
  await bad('Key in upper-case hex', 'NFR-036', 'key', { key: 'AB'.repeat(32) });
  await bad('Full name of 1 character', 'BR-052', 'fullName', { contact: contact({ fullName: 'A' }) });
  await bad('Full name over 80 characters', 'BR-052', 'fullName', { contact: contact({ fullName: 'A'.repeat(81) }) });
  await bad('Email without a domain', 'BR-053', 'email', { contact: contact({ email: 'student@' }) });
  await bad('Email with a space', 'BR-053', 'email', { contact: contact({ email: 'stu dent@example.com' }) });
  await bad('Mobile too short', 'BR-054', 'mobile', { contact: contact({ mobile: '12345' }) });
  await bad('Landline instead of a mobile', 'BR-054', 'mobile', { contact: contact({ mobile: '0112345678' }) });
  await bad('Birth date not a real date (2006-02-30)', 'BR-055', 'birthDate', { contact: contact({ birthDate: '2006-02-30' }) });
  await bad('Birth date in the wrong format', 'BR-055', 'birthDate', { contact: contact({ birthDate: '14/03/2006' }) });
  await bad('Under 13 (12 years old)', 'BR-055', 'birthDate', { contact: contact({ birthDate: yearsAgo(12) }) });
  await bad('Over 70 (71 years old)', 'BR-055', 'birthDate', { contact: contact({ birthDate: yearsAgo(71, -1) }) });
  await bad('Consent missing', 'BR-057, FR-121', 'consent', { consent: undefined });
  await bad('Consent of an old wording version', 'BR-057', 'consent', { consent: '2020-01-01' });
  await bad('Contact details missing', 'FR-116', 'fullName', { contact: undefined });
  await bad('Profile with an unknown stream', 'FR-117, NFR-035', 'stream', { profile: { ...PROFILES.PHYS, stream: 'X' } });
  await bad('Profile with an unknown subject (strict on save)', 'NFR-035', 'al', { profile: { ...PROFILES.PHYS, al: { CMATH: 'B', PHY: 'C', ZZZ: 'C' } } });
  await bad('Unknown interest', 'FR-612', 'interests', { extras: { achievements: [], interests: ['Flying'] } });
  await bad('Achievement with an unknown level', 'BR-080', 'achievements', { extras: { achievements: [{ activity: 'X', kind: 'COMPETITION', level: 'GALACTIC', place: 'FIRST', year: 2024 }], interests: [] } });
  await bad('Invite code in the wrong format', 'FR-707', 'inviteCode', { inviteCode: 'not-a-code' });
  await t(A, 'Age exactly 13 passes the birth-date rule', 'BR-055', 'not refused on birthDate', async () => {
    // Sent with an unknown (right-format) invite code, so the request stops before an account is made.
    const r = await http('POST', '/auth/signup', { body: signupBody(u, FAKE_KEY, { contact: contact({ birthDate: yearsAgo(13) }), inviteCode: 'AAAA-AAAA-AAAA-AAAA' }) });
    expect(r.status === 400 && r.body?.field === 'inviteCode', desc(r)); return `${desc(r)} (stopped at the invite check, after the birth-date rule)`;
  });
  await t(A, 'Valid-format but unknown invite code refused', 'FR-707, BR-076', '400 field=inviteCode', async () =>
    status(http('POST', '/auth/signup', { body: signupBody(u, FAKE_KEY, { inviteCode: 'BBBB-CCCC-DDDD-EEEE' }) }), 400, 'inviteCode'));
  await t(A, 'Sign-up with an invalid JSON body', 'NFR-035', '400', async () => status(http('POST', '/auth/signup', { raw: '{' }), 400));
}

async function sessionRequiredSuite() {
  const A = 'Auth: session required';
  const routes: [string, string, unknown?][] = [
    ['GET', '/me'], ['PUT', '/me', { profile: PROFILES.PHYS, extras: EXTRAS }], ['DELETE', '/me'],
    ['PUT', '/me/contact', { contact: contact(), consent: CONSENT_VERSION }], ['PUT', '/me/avatar', { avatar: 'a01' }],
    ['GET', '/me/journey'], ['PUT', '/me/journey/courses/001A'], ['DELETE', '/me/journey/courses/001A'],
    ['PUT', '/me/journey/notices/R001'], ['DELETE', '/me/journey/notices/R001'], ['PUT', '/me/journey/notices/R001/applied', { applied: true }],
    ['PUT', '/me/journey/steps/RESULTS', { done: true }], ['POST', '/auth/logout'], ['POST', '/auth/logout-all'],
    ['GET', '/groups'], ['POST', '/groups/join', { kind: 'COURSE', courseCode: '001' }], ['GET', '/groups/1'], ['GET', '/groups/1/members'],
    ['POST', '/groups/1/leave'], ['GET', '/blocks'], ['POST', '/blocks', { username: 'someone' }],
  ];
  for (const [m, p, b] of routes)
    await t(A, `${m} ${p} without a session -> 401`, 'FR-116, NFR-038', '401', async () => status(http(m, p, { body: b ?? (m === 'GET' ? undefined : {}) }), 401));
}

async function askSuite() {
  const A = 'Ask (validation only, no model call)';
  const q = (body: unknown, raw?: string) => http('POST', '/ask', raw !== undefined ? { raw } : { body });
  // Availability probe (not a case). Retried on a 5xx: see the "Network connection lost" note in the report.
  let probe = await q({ question: '' });
  for (let i = 0; i < 3 && probe.status >= 500 && probe.status !== 503; i++) probe = await q({ question: '' });
  if (probe.status === 503 && /not available/i.test(probe.body?.error ?? '')) {
    ASK_OFF = true;
    const why = 'Ask is switched off on this local server (503 "Ask ZedPath is not available yet": AI / Vectorize / key bindings absent); that check runs before validation by design';
    for (const title of ['Empty question -> 400', 'One-character question -> 400', 'Whitespace-only question -> 400', 'Question over 500 characters -> 400',
      'Question that is not a string -> 400', 'Invalid JSON body -> 400', 'Valid question with an invalid profile -> 400 (before any model)', 'Valid question with invalid extras -> 400 (before any model)'])
      skip(A, title, 'NFR-035', '400', why);
    await t(A, 'Ask switched off answers 503 with a clear message (safe default)', 'NFR-040', '503 "Ask ZedPath is not available yet"', async () => desc(probe));
  } else {
  await t(A, 'Empty question -> 400', 'FR-601, NFR-035', '400', async () => status(q({ question: '' }), 400));
  await t(A, 'One-character question -> 400', 'NFR-035', '400', async () => status(q({ question: 'a' }), 400));
  await t(A, 'Whitespace-only question -> 400', 'NFR-035', '400', async () => status(q({ question: '      ' }), 400));
  await t(A, 'Question over 500 characters -> 400', 'NFR-035', '400', async () => status(q({ question: 'x'.repeat(501) }), 400));
  await t(A, 'Question that is not a string -> 400', 'NFR-035', '400', async () => status(q({ question: 42 }), 400));
  await t(A, 'Invalid JSON body -> 400', 'NFR-035', '400', async () => status(q(null, '{oops'), 400));
  await t(A, 'Valid question with an invalid profile -> 400 (before any model)', 'FR-602, NFR-035', '400', async () => status(q({ question: 'Can I do medicine?', profile: { ...PROFILES.BIO, zE4: 99999 } }), 400));
  await t(A, 'Valid question with invalid extras -> 400 (before any model)', 'FR-612, NFR-035', '400', async () => status(q({ question: 'Can I do medicine?', extras: { interests: ['Flying'] } }), 400));
  }
  await t(A, 'Feedback with an unknown rating -> 400', 'FR-611', '400', async () => status(http('POST', '/ask/feedback', { body: { question: 'abc?', answer: 'x', rating: 'MEH' } }), 400));
  await t(A, 'Feedback with nothing to report -> 400', 'FR-611', '400', async () => status(http('POST', '/ask/feedback', { body: { question: '', answer: '', rating: 'WRONG' } }), 400));
}

async function signupFlowSuite() {
  const A = 'Auth: sign-up';
  const out: Record<string, Acct> = {};
  await t(A, 'Valid sign-up -> 201 with a recovery code and a session', 'FR-114, FR-118', '201 {username, recoveryCode XXXX-XXXX-XXXX-XXXX} + cookie', async () => {
    const { r, acct } = await signup(uname('a'), 'e2e-Passw0rd-a');
    expect(r.status === 201 && /^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/.test(r.body.recoveryCode) && acct.cookie, desc(r)); out.A = acct; return '201, recovery code in base32 groups, cookie set';
  });
  await t(A, 'Duplicate username -> 409', 'BR-050, FR-114', '409 field=username', async () =>
    status(http('POST', '/auth/signup', { body: signupBody(out.A?.username ?? uname('a'), FAKE_KEY) }), 409, 'username'));
  await t(A, 'Mixed-case username is stored in lower case', 'BR-050', '201, username lower-case', async () => {
    const { r, acct } = await signup(`E2E_${STAMP}_B`.slice(0, 24), 'e2e-Passw0rd-b', { profile: PROFILES.COMMERCE });
    expect(r.status === 201 && r.body.username === r.body.username.toLowerCase(), desc(r)); out.B = acct; return `201 ${r.body.username}`;
  });
  await t(A, 'Sign-up without results (profile null) is allowed', 'FR-116', '201; /me profile null', async () => {
    const { r, acct } = await signup(uname('c'), 'e2e-Passw0rd-c', { profile: null, extras: undefined });
    expect(r.status === 201, desc(r)); out.C = acct;
    const me = await http('GET', '/me', { cookie: acct.cookie }); expect(me.body.profile === null, JSON.stringify(me.body.profile)); return '201, profile null';
  });
  return out;
}

async function authSuite(A1: Acct) {
  const A = 'Auth: salt / login / sessions';
  await t(A, 'Salt for a valid username: 32 hex + KDF name', 'BR-050, NFR-036', '200 {salt: 32 hex, kdf: PBKDF2-SHA256-600000}', async () => {
    const r = await http('POST', '/auth/salt', { body: { username: A1.username } });
    expect(r.status === 200 && /^[0-9a-f]{32}$/.test(r.body.salt) && r.body.kdf === 'PBKDF2-SHA256-600000', desc(r)); return `200 kdf=${r.body.kdf}`;
  });
  await t(A, 'Salt is stable and the same shape for an unknown username', 'NFR-036', '200 twice, same salt', async () => {
    const x = await http('POST', '/auth/salt', { body: { username: uname('ghost') } }), y = await http('POST', '/auth/salt', { body: { username: uname('ghost') } });
    expect(x.status === 200 && x.body.salt === y.body.salt && /^[0-9a-f]{32}$/.test(x.body.salt), `${desc(x)} / ${desc(y)}`); return '200, stable salt';
  });
  await t(A, 'Salt with an invalid username -> 400', 'BR-050', '400 field=username', async () => status(http('POST', '/auth/salt', { body: { username: 'a' } }), 400, 'username'));
  await t(A, 'Login with the right password returns the profile', 'FR-115', '200, username + contact + profile', async () => {
    const r = await login(A1.username, A1.key);
    expect(r.status === 200 && r.body.username === A1.username && r.body.contact?.fullName && r.body.profile?.stream === 'PHYS' && sessionFrom(r), desc(r));
    return `200 role=${r.body.role}`;
  });
  await t(A, 'Username is case-insensitive at login', 'BR-050', '200', async () => status(login(A1.username.toUpperCase(), A1.key), 200));
  await t(A, 'Session cookie is HttpOnly, Secure, SameSite=Lax, Path=/api, 30 days', 'NFR-036, BR-058', 'all flags present, Max-Age=2592000', async () => {
    const r = await login(A1.username, A1.key); const c = r.setCookie.find(x => x.startsWith('zp_session=')) ?? '';
    expect(/HttpOnly/i.test(c) && /Secure/i.test(c) && /SameSite=Lax/i.test(c) && /Path=\/api/i.test(c) && /Max-Age=2592000/i.test(c), c.replace(/=[0-9a-f]{64}/, '=<token>'));
    return c.replace(/=[0-9a-f]{64}/, '=<token>');
  });
  await t(A, 'Login with a wrong password -> 401', 'FR-115', '401', async () => status(login(A1.username, await keyFor(A1.username, 'wrong-password-1')), 401));
  await t(A, 'Login for an unknown username -> 401 with the same message', 'FR-115', '401 "Wrong username or password"', async () => {
    const r = await login(uname('nobody'), FAKE_KEY); expect(r.status === 401 && r.body.error === 'Wrong username or password', desc(r)); return desc(r);
  });
  await t(A, 'Login with a malformed key -> 401', 'NFR-035', '401', async () => status(login(A1.username, 'xyz'), 401));
  await t(A, 'Logout ends that session (204, then /me 401)', 'BR-058', '204 then 401', async () => {
    const s = sessionFrom(await login(A1.username, A1.key));
    const r = await http('POST', '/auth/logout', { cookie: s }); expect(r.status === 204, `logout ${desc(r)}`);
    const me = await http('GET', '/me', { cookie: s }); expect(me.status === 401, `me after logout ${desc(me)}`); return '204, then 401';
  });
  await t(A, 'Logout-all ends every session of the account', 'BR-058', '204; another session then 401', async () => {
    const s1 = sessionFrom(await login(A1.username, A1.key)), s2 = sessionFrom(await login(A1.username, A1.key));
    const r = await http('POST', '/auth/logout-all', { cookie: s1 }); expect(r.status === 204, `logout-all ${desc(r)}`);
    const me = await http('GET', '/me', { cookie: s2 }); expect(me.status === 401, `other session ${desc(me)}`);
    A1.cookie = sessionFrom(await login(A1.username, A1.key)); return '204, other session 401';
  });
  await t(A, 'Recover with a wrong recovery code -> 401', 'FR-118', '401', async () =>
    status(http('POST', '/auth/recover', { body: { username: A1.username, code: 'AAAA-BBBB-CCCC-DDDD', key: FAKE_KEY } }), 401));
  await t(A, 'Recover with a malformed code -> 401', 'FR-118', '401', async () =>
    status(http('POST', '/auth/recover', { body: { username: A1.username, code: '1234', key: FAKE_KEY } }), 401));
  await t(A, 'Recover with the right code (typed lower-case, no dashes): new password, new code, old sessions end', 'FR-118', '200 + new code; old session 401; new password logs in', async () => {
    const old = A1.cookie;
    const newKey = await keyFor(A1.username, 'e2e-New-Passw0rd');
    const r = await http('POST', '/auth/recover', { body: { username: A1.username, code: A1.recovery.toLowerCase().replace(/-/g, ''), key: newKey } });
    expect(r.status === 200 && /^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/.test(r.body.recoveryCode) && r.body.recoveryCode !== A1.recovery, desc(r));
    A1.recovery = r.body.recoveryCode; A1.key = newKey; A1.cookie = sessionFrom(r);
    const me = await http('GET', '/me', { cookie: old }); expect(me.status === 401, `old session ${desc(me)}`);
    const l = await login(A1.username, newKey); expect(l.status === 200, `login new password ${desc(l)}`); return '200, old session 401, new login 200';
  });
  await t(A, 'A garbage session cookie -> 401', 'NFR-035', '401', async () => status(http('GET', '/me', { cookie: 'zz' }), 401));
  await t(A, 'A well-formed but unknown session token -> 401', 'BR-058', '401', async () => status(http('GET', '/me', { cookie: 'ab'.repeat(32) }), 401));
}

async function csrfSuite(A1: Acct) {
  const A = 'Origin (CSRF) checks';
  const evil = 'https://evil.example';
  await t(A, 'PUT /me/avatar from another site -> 403', 'NFR-035', '403', async () => status(http('PUT', '/me/avatar', { body: { avatar: 'a02' }, cookie: A1.cookie, origin: evil }), 403));
  await t(A, 'POST /auth/login from another site -> 403', 'NFR-035', '403', async () => status(http('POST', '/auth/login', { body: { username: A1.username, key: A1.key }, origin: evil }), 403));
  await t(A, 'DELETE /me from another site -> 403 and the account is kept', 'NFR-035, FR-119', '403, then /me 200', async () => {
    const r = await http('DELETE', '/me', { cookie: A1.cookie, origin: evil }); expect(r.status === 403, desc(r));
    const me = await http('GET', '/me', { cookie: A1.cookie }); expect(me.status === 200, `me ${desc(me)}`); return '403; account still there';
  });
  await t(A, 'PUT /me/journey/courses from another site -> 403', 'NFR-035', '403', async () => status(http('PUT', '/me/journey/courses/001A', { cookie: A1.cookie, origin: evil }), 403));
  await t(A, 'POST /groups/join from another site -> 403', 'NFR-035', '403', async () => status(http('POST', '/groups/join', { body: { kind: 'COURSE', courseCode: '001' }, cookie: A1.cookie, origin: evil }), 403));
  if (ASK_OFF) skip(A, 'POST /ask from another site -> 403 (before any model)', 'NFR-035', '403', 'Ask is switched off on this local server (its 503 comes first)');
  else await t(A, 'POST /ask from another site -> 403 (before any model)', 'NFR-035', '403', async () => status(http('POST', '/ask', { body: { question: 'hi there' }, origin: evil }), 403));
  await t(A, 'Write without an Origin header is allowed (documented design: browsers always send it cross-site)', 'NFR-035', '200', async () =>
    status(http('PUT', '/me/avatar', { body: { avatar: null }, cookie: A1.cookie, origin: null }), 200));
}

async function meSuite(A1: Acct) {
  const A = 'Me: profile / contact / avatar';
  await t(A, 'GET /me returns contact, profile and extras; mobile normalised', 'FR-117, NFR-070, BR-054', '200; contact.mobile +94771234567', async () => {
    const r = await http('GET', '/me', { cookie: A1.cookie });
    expect(r.status === 200 && r.body.contact?.mobile === '+94771234567' && r.body.profile?.zE4 === 14200 && r.body.extras?.interests?.[0] === 'Maths', JSON.stringify(r.body).slice(0, 160));
    return `200 mobile=${r.body.contact.mobile}`;
  });
  await t(A, 'PUT /me saves a new profile and extras', 'FR-117, FR-105', '200 with stream BIO, no achievements', async () => {
    const r = await http('PUT', '/me', { body: { profile: PROFILES.BIO, extras: { achievements: [], interests: ['Teaching', 'Maths'] } }, cookie: A1.cookie });
    expect(r.status === 200 && r.body.profile.stream === 'BIO' && r.body.extras.achievements.length === 0, desc(r)); return `200 stream=${r.body.profile.stream}`;
  });
  await t(A, 'Interests come back in the fixed app order', 'FR-612', '["Maths","Teaching"]', async () => {
    const r = await http('GET', '/me', { cookie: A1.cookie }); expect(JSON.stringify(r.body.extras.interests) === '["Maths","Teaching"]', JSON.stringify(r.body.extras.interests)); return JSON.stringify(r.body.extras.interests);
  });
  await t(A, 'PUT /me with an out-of-range Z -> 400', 'FR-102', '400 field=zE4', async () => status(http('PUT', '/me', { body: { profile: { ...PROFILES.BIO, zE4: 50000 }, extras: {} }, cookie: A1.cookie }), 400, 'zE4'));
  await t(A, 'PUT /me with an unknown subject -> 400', 'NFR-035', '400 field=al', async () => status(http('PUT', '/me', { body: { profile: { ...PROFILES.BIO, al: { BIO: 'A', CHEM: 'B', NOPE: 'B' } }, extras: {} }, cookie: A1.cookie }), 400, 'al'));
  await t(A, 'PUT /me without a profile -> 400', 'NFR-035', '400', async () => status(http('PUT', '/me', { body: { extras: {} }, cookie: A1.cookie }), 400));
  await t(A, 'PUT /me with duplicate interests -> 400', 'NFR-035', '400 field=interests', async () => status(http('PUT', '/me', { body: { profile: PROFILES.BIO, extras: { interests: ['Maths', 'Maths'] } }, cookie: A1.cookie }), 400, 'interests'));
  await t(A, 'PUT /me with 31 achievements -> 400', 'NFR-035', '400 field=achievements', async () => {
    const ach = Array.from({ length: 31 }, () => EXTRAS.achievements[0]);
    return status(http('PUT', '/me', { body: { profile: PROFILES.BIO, extras: { achievements: ach, interests: [] } }, cookie: A1.cookie }), 400, 'achievements');
  });
  await t(A, 'PUT /me/contact updates and normalises name, email and mobile', 'FR-120, BR-052, BR-053, BR-054', '200; trimmed name, lower-case email, +94712345678', async () => {
    const r = await http('PUT', '/me/contact', { body: { contact: contact({ email: '  E2E.New@Example.COM ', mobile: '+94 71 234 5678', fullName: '  Test   Student  ' }), consent: CONSENT_VERSION }, cookie: A1.cookie });
    expect(r.status === 200 && r.body.contact.email === 'e2e.new@example.com' && r.body.contact.mobile === '+94712345678' && r.body.contact.fullName === 'Test Student', JSON.stringify(r.body?.contact ?? r.body));
    return JSON.stringify(r.body.contact);
  });
  await t(A, 'PUT /me/contact with a bad email -> 400', 'BR-053', '400 field=email', async () => status(http('PUT', '/me/contact', { body: { contact: contact({ email: 'nope' }), consent: CONSENT_VERSION }, cookie: A1.cookie }), 400, 'email'));
  await t(A, 'PUT /me/contact without consent -> 400', 'BR-057', '400 field=consent', async () => status(http('PUT', '/me/contact', { body: { contact: contact() }, cookie: A1.cookie }), 400, 'consent'));
  for (let i = 1; i <= 12; i++) {
    const a = `a${String(i).padStart(2, '0')}`;
    await t(A, `Avatar preset ${a} accepted`, 'FR-122, BR-077', `200 avatar=${a}`, async () => {
      const r = await http('PUT', '/me/avatar', { body: { avatar: a }, cookie: A1.cookie }); expect(r.status === 200 && r.body.avatar === a, desc(r)); return `200 avatar=${r.body.avatar}`;
    });
  }
  await t(A, 'Avatar null (initials) accepted', 'FR-122, BR-077', '200 avatar=null', async () => {
    const r = await http('PUT', '/me/avatar', { body: { avatar: null }, cookie: A1.cookie }); expect(r.status === 200 && r.body.avatar === null, desc(r)); return '200 avatar=null';
  });
  for (const bad of ['a13', 'a00', 'A01', 5, 'https://x.example/y.png'])
    await t(A, `Avatar ${JSON.stringify(bad)} rejected`, 'BR-077', '400 field=avatar', async () => status(http('PUT', '/me/avatar', { body: { avatar: bad }, cookie: A1.cookie }), 400, 'avatar'));
}

async function journeySuite(A1: Acct) {
  const A = 'My Journey';
  const c = A1.cookie;
  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);   // Sri Lanka date, as the server uses
  const pub = (await http('GET', '/journey')).body as { steps: { id: string; opensOn: string | null }[]; notices: { routeId: string; opensOn: string | null }[] };
  await t(A, 'GET /me/journey starts empty', 'FR-409, FR-411', '200 {courses:[], notices:[], steps:[]}', async () => {
    const r = await http('GET', '/me/journey', { cookie: c });
    expect(r.status === 200 && r.body.courses.length === 0 && r.body.notices.length === 0 && r.body.steps.length === 0, r.text.slice(0, 120)); return '200 empty';
  });
  await t(A, 'Follow course 001A', 'FR-416', '204', async () => status(http('PUT', '/me/journey/courses/001A', { cookie: c }), 204));
  await t(A, 'Following the same course again is idempotent', 'FR-416', '204, listed once', async () => {
    await status(http('PUT', '/me/journey/courses/001A', { cookie: c }), 204);
    const r = await http('GET', '/me/journey', { cookie: c }); expect(r.body.courses.filter((x: any) => x.uniCode === '001A').length === 1, JSON.stringify(r.body.courses)); return '204, listed once';
  });
  await t(A, 'Follow lower-case Uni-Code (001a) -> 404', 'BR-015', '404', async () => status(http('PUT', '/me/journey/courses/001a', { cookie: c }), 404));
  await t(A, 'Follow unknown Uni-Code 999Z -> 404', 'BR-015', '404', async () => status(http('PUT', '/me/journey/courses/999Z', { cookie: c }), 404));
  await t(A, 'Follow malformed Uni-Code -> 404', 'NFR-035', '404', async () => status(http('PUT', '/me/journey/courses/ABCD', { cookie: c }), 404));
  await t(A, 'Followed course appears in GET /me/journey', 'FR-411', 'courses contains 001A with followedAt', async () => {
    const r = await http('GET', '/me/journey', { cookie: c }); const x = r.body.courses.find((k: any) => k.uniCode === '001A');
    expect(x && !Number.isNaN(Date.parse(x.followedAt)), JSON.stringify(r.body.courses)); return JSON.stringify(x);
  });
  await t(A, 'Unfollow course 001A', 'FR-416', '204 and gone', async () => {
    await status(http('DELETE', '/me/journey/courses/001A', { cookie: c }), 204);
    const r = await http('GET', '/me/journey', { cookie: c }); expect(r.body.courses.length === 0, JSON.stringify(r.body.courses)); return '204, gone';
  });
  await t(A, 'Follow notice R001', 'FR-414', '204', async () => status(http('PUT', '/me/journey/notices/R001', { cookie: c }), 204));
  await t(A, 'Follow unknown notice R999 -> 404', 'FR-414', '404', async () => status(http('PUT', '/me/journey/notices/R999', { cookie: c }), 404));
  await t(A, 'Follow malformed notice id -> 404', 'NFR-035', '404', async () => status(http('PUT', '/me/journey/notices/X1', { cookie: c }), 404));
  await t(A, '"I applied" without a flag -> 400', 'FR-415', '400 field=applied', async () => status(http('PUT', '/me/journey/notices/R001/applied', { body: {}, cookie: c }), 400, 'applied'));
  await t(A, '"I applied" on a notice not followed -> 404', 'FR-415, BR-062', '404 "Follow it first"', async () => status(http('PUT', '/me/journey/notices/R002/applied', { body: { applied: true }, cookie: c }), 404));
  const open = pub.notices.find(x => x.opensOn !== null && x.opensOn <= today);
  if (open) await t(A, `"I applied" on followed, already-open notice ${open.routeId}`, 'FR-415, BR-062', '204 and appliedAt set', async () => {
    await status(http('PUT', `/me/journey/notices/${open.routeId}`, { cookie: c }), 204);
    await status(http('PUT', `/me/journey/notices/${open.routeId}/applied`, { body: { applied: true }, cookie: c }), 204);
    const r = await http('GET', '/me/journey', { cookie: c }); const x = r.body.notices.find((k: any) => k.routeId === open.routeId);
    expect(x?.appliedAt, JSON.stringify(x)); return `204, appliedAt=${x.appliedAt}`;
  });
  else skip(A, '"I applied" on an open notice', 'FR-415', '204', 'no notice with a past opening date in the data');
  const future = pub.notices.find(x => x.opensOn !== null && x.opensOn > today);
  if (future) await t(A, `"I applied" before notice ${future.routeId} opens -> 409`, 'BR-062', '409', async () => {
    await status(http('PUT', `/me/journey/notices/${future.routeId}`, { cookie: c }), 204);
    return status(http('PUT', `/me/journey/notices/${future.routeId}/applied`, { body: { applied: true }, cookie: c }), 409);
  });
  else skip(A, '"I applied" before the notice opens -> 409', 'BR-062', '409', `every dated notice in the 2025/26 data has already opened (today ${today}), so the 409 path cannot be reached over HTTP; covered by worker/my-journey.test.ts`);
  await t(A, 'Un-tick "I applied" (applied:false)', 'FR-415', '204', async () => status(http('PUT', '/me/journey/notices/R001/applied', { body: { applied: false }, cookie: c }), 204));
  await t(A, 'Unfollow notice R001', 'FR-414', '204', async () => status(http('DELETE', '/me/journey/notices/R001', { cookie: c }), 204));
  for (const step of ['RESULTS', 'LIST', 'COMPARE'])
    await t(A, `Preparation step ${step} can be ticked any time`, 'BR-061, FR-410', '204', async () => status(http('PUT', `/me/journey/steps/${step}`, { body: { done: true }, cookie: c }), 204));
  for (const step of ['UGC_APPLY', 'UGC_ORDER', 'APTITUDE', 'UGC_SELECTION', 'UGC_REGISTER']) {
    const s = pub.steps.find(x => x.id === step); const isOpen = !!s?.opensOn && s.opensOn <= today;
    await t(A, `UGC step ${step} ${isOpen ? 'is open: tick accepted' : 'has no open window: tick refused'}`, 'BR-061, FR-410', isOpen ? '204' : '409',
      async () => status(http('PUT', `/me/journey/steps/${step}`, { body: { done: true }, cookie: c }), isOpen ? 204 : 409));
  }
  await t(A, 'Un-tick a UGC step (done:false) is always allowed', 'FR-409', '204', async () => status(http('PUT', '/me/journey/steps/UGC_APPLY', { body: { done: false }, cookie: c }), 204));
  await t(A, 'Unknown step id -> 404', 'BR-060', '404 "No such step"', async () => status(http('PUT', '/me/journey/steps/FOO', { body: { done: true }, cookie: c }), 404));
  await t(A, 'Step with a non-boolean done flag -> 400', 'FR-410', '400 field=done', async () => status(http('PUT', '/me/journey/steps/RESULTS', { body: { done: 'yes' }, cookie: c }), 400, 'done'));
  await t(A, 'GET /me/journey shows exactly the 3 ticked preparation steps', 'FR-409, FR-411', 'COMPARE,LIST,RESULTS', async () => {
    const r = await http('GET', '/me/journey', { cookie: c }); const ids = r.body.steps.map((s: any) => s.stepId).sort().join(',');
    expect(ids === 'COMPARE,LIST,RESULTS', ids); return ids;
  });
  await t(A, 'Un-tick a preparation step', 'FR-409', '204 and removed', async () => {
    await status(http('PUT', '/me/journey/steps/COMPARE', { body: { done: false }, cookie: c }), 204);
    const r = await http('GET', '/me/journey', { cookie: c }); expect(!r.body.steps.some((s: any) => s.stepId === 'COMPARE'), JSON.stringify(r.body.steps)); return '204, removed';
  });
}

async function groupsSuite(A1: Acct, B: Acct, C: Acct) {
  const A = 'Groups';
  let popular: any[] = [];
  await t(A, 'GET /groups lists the popular course groups; rules not yet accepted', 'FR-715, FR-714', '200, 6 popular course codes, rulesAccepted=false, role STUDENT', async () => {
    const r = await http('GET', '/groups', { cookie: A1.cookie });
    popular = r.body?.popular ?? [];
    const courseCodes = new Set([...popular, ...(r.body?.groups ?? [])].filter((g: any) => g.kind === 'COURSE').map((g: any) => g.courseCode));
    expect(r.status === 200 && courseCodes.size >= 6 && r.body.rulesAccepted === false && r.body.role === 'STUDENT', desc(r) + ' ' + r.text.slice(0, 120));
    return `200 popular=${popular.map(p => p.courseCode).join(',')}`;
  });
  await t(A, 'GET /groups?courses= lists asked course groups and ignores unknown codes', 'FR-705', '012 listed; 999 not', async () => {
    const r = await http('GET', '/groups?courses=012,999,abc', { cookie: A1.cookie });
    const codes = [...r.body.groups, ...r.body.popular].map((g: any) => g.courseCode); expect(codes.includes('012') && !codes.includes('999'), codes.join(',')); return codes.join(',');
  });
  const target: string = popular[0]?.courseCode ?? '001';
  const second: string = popular.find(p => p.courseCode !== target)?.courseCode ?? '008';
  await t(A, 'Join without accepting the rules (first join) -> 400', 'FR-714, BR-075', '400 field=acceptRules', async () => status(http('POST', '/groups/join', { body: { kind: 'COURSE', courseCode: target }, cookie: A1.cookie }), 400, 'acceptRules'));
  await t(A, 'Join with an old rules version -> 400', 'BR-075', '400 field=acceptRules', async () => status(http('POST', '/groups/join', { body: { kind: 'COURSE', courseCode: target, acceptRules: '2000-01-01' }, cookie: A1.cookie }), 400, 'acceptRules'));
  await t(A, 'Join an unknown course group -> 400', 'BR-070', '400 field=courseCode', async () => status(http('POST', '/groups/join', { body: { kind: 'COURSE', courseCode: '999', acceptRules: GROUP_RULES_VERSION }, cookie: A1.cookie }), 400, 'courseCode'));
  await t(A, 'Join with an unknown kind -> 400', 'BR-070', '400 field=kind', async () => status(http('POST', '/groups/join', { body: { kind: 'CLUB', acceptRules: GROUP_RULES_VERSION }, cookie: A1.cookie }), 400, 'kind'));
  let gid = 0;
  await t(A, `Join course group ${target}, accepting the rules (first join)`, 'FR-705, FR-714, BR-075', '200 joined=true rulesAccepted=true', async () => {
    const r = await http('POST', '/groups/join', { body: { kind: 'COURSE', courseCode: target, acceptRules: GROUP_RULES_VERSION }, cookie: A1.cookie });
    expect(r.status === 200 && r.body.joined === true && r.body.rulesAccepted === true && r.body.id > 0, desc(r)); gid = r.body.id; return `200 group id=${gid} members=${r.body.members}`;
  });
  await t(A, 'Joining the same group twice keeps one membership', 'BR-070', '200, same id, member count unchanged', async () => {
    const before = (await http('GET', `/groups/${gid}`, { cookie: A1.cookie })).body?.members;
    const r = await http('POST', '/groups/join', { body: { kind: 'COURSE', courseCode: target }, cookie: A1.cookie });
    expect(r.status === 200 && r.body.id === gid && r.body.members === before, `${desc(r)} members ${before}->${r.body?.members}`); return `200 members=${r.body.members}`;
  });
  await t(A, `Second group ${second}: the rules are not asked again`, 'FR-714, BR-075', '200 without acceptRules', async () => {
    const r = await http('POST', '/groups/join', { body: { kind: 'COURSE', courseCode: second }, cookie: A1.cookie });
    expect(r.status === 200 && r.body.joined === true, desc(r)); return `200 group id=${r.body.id}`;
  });
  await t(A, 'GET /groups now says rules accepted and lists joined groups first', 'FR-714', 'rulesAccepted=true; first group joined', async () => {
    const r = await http('GET', '/groups', { cookie: A1.cookie }); expect(r.body.rulesAccepted === true && r.body.groups[0]?.joined === true, r.text.slice(0, 160)); return `joined=${r.body.groups.filter((g: any) => g.joined).length}`;
  });
  await t(A, 'Join own batch group (results saved on the account)', 'BR-071, FR-705', '200 kind=BATCH', async () => {
    const r = await http('POST', '/groups/join', { body: { kind: 'BATCH' }, cookie: A1.cookie }); expect(r.status === 200 && r.body.kind === 'BATCH', desc(r)); return `200 "${r.body.title}"`;
  });
  await t(A, 'Batch group for an account without saved results -> 403', 'BR-071', '403', async () => status(http('POST', '/groups/join', { body: { kind: 'BATCH', acceptRules: GROUP_RULES_VERSION }, cookie: C.cookie }), 403));
  await t(A, 'GET /groups/:id returns the summary', 'FR-717', '200 with a title', async () => {
    const r = await http('GET', `/groups/${gid}`, { cookie: A1.cookie }); expect(r.status === 200 && r.body.title, desc(r)); return `200 "${r.body.title}"`;
  });
  await t(A, 'GET /groups/abc -> 404', 'NFR-035', '404', async () => status(http('GET', '/groups/abc', { cookie: A1.cookie }), 404));
  await t(A, 'Member list for a non-member -> 403', 'FR-718', '403', async () => status(http('GET', `/groups/${gid}/members`, { cookie: B.cookie }), 403));
  await t(A, 'Second account joins; member list has both usernames and no contact details', 'FR-718, NFR-071', '200; both usernames; keys only username/avatar/badge', async () => {
    const j = await http('POST', '/groups/join', { body: { kind: 'COURSE', courseCode: target, acceptRules: GROUP_RULES_VERSION }, cookie: B.cookie }); expect(j.status === 200, `join ${desc(j)}`);
    const r = await http('GET', `/groups/${gid}/members`, { cookie: A1.cookie }); const names = (r.body as any[]).map(m => m.username);
    expect(r.status === 200 && names.includes(A1.username) && names.includes(B.username), desc(r) + ' ' + names.join(','));
    expect(!/fullName|email|mobile|birth|Test Student|example\.com|\+947/i.test(r.text), 'contact data present in the member list');
    expect((r.body as any[]).every(m => Object.keys(m).sort().join(',') === 'avatar,badge,username'), JSON.stringify(r.body[0]));
    return `200 ${names.length} members, keys=username,avatar,badge`;
  });
  await t(A, 'Room connection without a WebSocket upgrade -> 400 (member)', 'FR-719', '400 "Expected a WebSocket"', async () => status(http('GET', `/groups/${gid}/live`, { cookie: A1.cookie }), 400));
  await t(A, 'Room connection for a non-member -> 403', 'FR-705', '403', async () => status(http('GET', `/groups/${gid}/live`, { cookie: C.cookie }), 403));
  await t(A, 'Report with a malformed message id -> 400', 'FR-710', '400 field=messageId', async () => status(http('POST', `/groups/${gid}/report`, { body: { messageId: 'x', reason: 'HARMFUL' }, cookie: A1.cookie }), 400, 'messageId'));
  await t(A, 'Message containing a phone number is refused by the room (WebSocket)', 'FR-712, BR-074', 'error frame about phone numbers / emails; nothing posted', async () => {
    const WS = (globalThis as any).WebSocket; expect(WS, 'no WebSocket in this Node');
    const ws = new WS(`${BASE.replace(/^http/, 'ws')}/api/groups/${gid}/live`, { headers: { Cookie: `zp_session=${A1.cookie}`, Origin: ORIGIN, 'CF-Connecting-IP': IP } });
    const frames: any[] = [];
    const got = await new Promise<string>(resolve => {
      const done = (s: string) => { clearTimeout(timer); try { ws.close(); } catch { /* already closed */ } resolve(s); };
      const timer = setTimeout(() => done(`timeout; frames=${JSON.stringify(frames).slice(0, 200)}`), 10_000);
      ws.onmessage = (e: any) => {
        const f = JSON.parse(String(e.data)); frames.push(f);
        if (f.type === 'history') ws.send(JSON.stringify({ type: 'post', body: 'call me on 077 123 4567' }));
        if (f.type === 'error') done(`error frame: ${f.error}`);
        if (f.type === 'message' && /077/.test(JSON.stringify(f))) done('POSTED (the phone number went through)');
      };
      ws.onerror = (e: any) => done(`socket error ${e?.message ?? ''}`);
    });
    expect(/phone numbers and email addresses/.test(got), got); return got;
  });
  await t(A, 'Block another member; the block list shows them', 'FR-711', '204 then listed', async () => {
    await status(http('POST', '/blocks', { body: { username: B.username }, cookie: A1.cookie }), 204);
    const r = await http('GET', '/blocks', { cookie: A1.cookie }); expect(r.body.blocked.includes(B.username), JSON.stringify(r.body)); return '204, listed';
  });
  await t(A, 'Block yourself -> 400', 'FR-711', '400', async () => status(http('POST', '/blocks', { body: { username: A1.username }, cookie: A1.cookie }), 400));
  await t(A, 'Block an unknown username -> 404', 'FR-711', '404', async () => status(http('POST', '/blocks', { body: { username: uname('nobody2') }, cookie: A1.cookie }), 404));
  await t(A, 'Unblock', 'FR-711', '204 and gone', async () => {
    await status(http('DELETE', `/blocks/${B.username}`, { cookie: A1.cookie }), 204);
    const r = await http('GET', '/blocks', { cookie: A1.cookie }); expect(!r.body.blocked.includes(B.username), JSON.stringify(r.body)); return '204, gone';
  });
  await t(A, 'Leave the group, then the member list -> 403', 'FR-705', '204 then 403', async () => {
    await status(http('POST', `/groups/${gid}/leave`, { cookie: B.cookie }), 204);
    return `204 then ${await status(http('GET', `/groups/${gid}/members`, { cookie: B.cookie }), 403)}`;
  });
  await t(A, 'Leave with an invalid group id -> 404', 'NFR-035', '404', async () => status(http('POST', '/groups/0/leave', { cookie: A1.cookie }), 404));
}

async function deleteSuite(C: Acct) {
  const A = 'Account delete (cascade)';
  await t(A, 'Before delete: account C follows a course, a notice and ticks a step', 'FR-411', '204 x3', async () => {
    await status(http('PUT', '/me/journey/courses/001A', { cookie: C.cookie }), 204);
    await status(http('PUT', '/me/journey/notices/R001', { cookie: C.cookie }), 204);
    return status(http('PUT', '/me/journey/steps/RESULTS', { body: { done: true }, cookie: C.cookie }), 204);
  });
  await t(A, 'DELETE /me -> 204 and clears the cookie', 'FR-119, NFR-075', '204, zp_session cookie expired', async () => {
    const r = await http('DELETE', '/me', { cookie: C.cookie }); const ck = r.setCookie.find(x => x.startsWith('zp_session=')) ?? '';
    expect(r.status === 204 && /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(ck), `${desc(r)} cookie="${ck}"`); C.deleted = true; return '204, cookie cleared';
  });
  await t(A, 'After delete: old session -> 401', 'FR-119', '401', async () => status(http('GET', '/me', { cookie: C.cookie }), 401));
  await t(A, 'After delete: the journey cannot be read -> 401', 'NFR-075', '401', async () => status(http('GET', '/me/journey', { cookie: C.cookie }), 401));
  await t(A, 'After delete: login -> 401', 'FR-119', '401', async () => status(login(C.username, C.key), 401));
  await t(A, 'After delete: the recovery code no longer works -> 401', 'NFR-075', '401', async () =>
    status(http('POST', '/auth/recover', { body: { username: C.username, code: C.recovery, key: C.key } }), 401));
  await t(A, 'The deleted username can be signed up again (login row gone); then deleted', 'FR-119, NFR-075', '201 then 204', async () => {
    const { r, acct } = await signup(C.username, 'e2e-Passw0rd-c2', { profile: null });
    expect(r.status === 201, desc(r));
    const d = await http('DELETE', '/me', { cookie: acct.cookie }); expect(d.status === 204, `delete ${desc(d)}`); acct.deleted = true; return '201, then 204';
  });
}

/** Runs after cleanup, so it covers every deleted test account. One SELECT of scalar subqueries (local D1 caps compound SELECTs). */
async function orphanCheck() {
  const A = 'Account delete (cascade)';
  await t(A, 'No orphan rows under any deleted account (local D1 query, after cleanup)', 'NFR-075', '0 orphan rows in every account table', async () => {
    const tables = ['journey_course', 'journey_notice', 'journey_step', 'student_profile', 'student_subject', 'student_contact', 'student_interest', 'student_achievement', 'session', 'recovery_code', 'password_login', 'group_member', 'group_rules_acceptance'];
    const sql = 'SELECT ' + tables.map(tb => `(SELECT count(*) FROM ${tb} WHERE account_id NOT IN (SELECT account_id FROM account)) AS ${tb}`).join(', ');
    const r = spawnSync(`npx wrangler d1 execute zedpath --local --json --command "${sql}"`, { encoding: 'utf8', shell: true, timeout: 90_000 });
    const at = r.stdout?.indexOf('[') ?? -1; expect(at >= 0, `wrangler output: ${(r.stdout + r.stderr).slice(0, 200)}`);
    const parsed = JSON.parse(r.stdout.slice(at)); expect(Array.isArray(parsed) && parsed[0]?.results?.[0], `wrangler output: ${r.stdout.slice(0, 200)}`);
    const row = parsed[0].results[0] as Record<string, number>;
    const bad = Object.entries(row).filter(([, v]) => v > 0); expect(bad.length === 0, `orphans: ${JSON.stringify(bad)}`); return `${tables.length} tables checked, 0 orphans`;
  });
}

async function cleanup() {
  const A = 'Cleanup';
  for (const a of accounts.filter(x => !x.deleted)) {
    await t(A, `Delete test account ${a.username.replace(STAMP, '<run>')}; login then 401`, 'FR-119', '204 then login 401', async () => {
      let cookie = a.cookie;
      if ((await http('GET', '/me', { cookie })).status !== 200) cookie = sessionFrom(await login(a.username, a.key));
      const d = await http('DELETE', '/me', { cookie }); expect(d.status === 204, `delete ${desc(d)}`); a.deleted = true;
      return `204, then ${await status(login(a.username, a.key), 401)}`;
    });
  }
}

// ------------------------------------------------------------------ main
const started = new Date(), t0 = performance.now();
console.log(`ZedPath API E2E -> server: ${SERVER_LABEL}\n`);
let aborted = '';
try {
  const ping = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch(e => e as Error);
  if (ping instanceof Error) throw new Error(`server not responding: ${ping.message}`);
  await metaSuite();
  await resultsSuite();
  await offeringsSuite();
  await signupValidationSuite();
  await sessionRequiredSuite();
  await askSuite();
  const acc = await signupFlowSuite();
  if (!acc.A || !acc.B || !acc.C) throw new Error('could not create the test accounts; the account suites were not run');
  await authSuite(acc.A);
  await csrfSuite(acc.A);
  await meSuite(acc.A);
  await journeySuite(acc.A);
  await groupsSuite(acc.A, acc.B, acc.C);
  await deleteSuite(acc.C);
} catch (e) {
  aborted = e instanceof Error ? e.message : String(e);
  console.log(`\nRUN ABORTED: ${aborted}`);
} finally {
  await cleanup().catch(e => console.log(`cleanup error: ${e}`));
  if (!aborted) await orphanCheck();
}

// ------------------------------------------------------------------ reports
const ms = Math.round(performance.now() - t0);
const passed = cases.filter(c => c.result === 'PASS').length, failed = cases.filter(c => c.result === 'FAIL').length, skipped = cases.filter(c => c.result === 'SKIP').length;
const executed = passed + failed;
const summary = { suite: 'ZedPath API end-to-end', server: SERVER_LABEL, startedAt: started.toISOString(), durationMs: ms,
  total: cases.length, executed, passed, failed, skipped, aborted: aborted || null, accountsCreated: accounts.length, accountsLeft: accounts.filter(a => !a.deleted).length };
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'api-results.json'), JSON.stringify({ summary, cases }, null, 2));
const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const md = [
  '# ZedPath API end-to-end results', '',
  '| Item | Value |', '|---|---|',
  `| Date/time (UTC) | ${started.toISOString().replace('T', ' ').slice(0, 19)} |`, `| Server | ${SERVER_LABEL} |`,
  `| Total cases | ${cases.length} |`, `| Executed | ${executed} |`, `| Passed | ${passed} |`, `| Failed | ${failed} |`, `| Skipped | ${skipped} |`,
  `| Duration | ${(ms / 1000).toFixed(1)} s |`, `| Test accounts created / left behind | ${accounts.length} / ${summary.accountsLeft} |`,
  ...(aborted ? [`| Run aborted | ${esc(aborted)} |`] : []), '',
  'Generated by `node tools/e2e/api-e2e.ts`. Do not edit by hand.', '',
  '| ID | Area | Title | Trace | Expected | Actual | Result | ms |', '|---|---|---|---|---|---|---|---|',
  ...cases.map(c => `| ${c.id} | ${esc(c.area)} | ${esc(c.title)} | ${c.trace} | ${esc(c.expected)} | ${esc(c.actual)} | ${c.result === 'FAIL' ? '**FAIL**' : c.result} | ${c.ms} |`), '',
].join('\n');
writeFileSync(join(OUT_DIR, 'api-results.md'), md);
console.log(`\n${executed} executed: ${passed} passed, ${failed} failed, ${skipped} skipped in ${(ms / 1000).toFixed(1)} s. Results: tools/e2e/results/api-results.{json,md}`);
process.exitCode = failed || aborted ? 1 : 0;
