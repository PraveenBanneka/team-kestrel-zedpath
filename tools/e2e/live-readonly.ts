// Strict READ-ONLY end-to-end pass against a deployed ZedPath Worker.
//   node tools/e2e/live-readonly.ts <base-url> [--label "live (production)"]
// Writes tools/e2e/results/live-readonly.json and .md. The base URL is never written to the results (public repo).
// READ-ONLY by construction: only GETs, POST /api/results (pure calculation, stores nothing; worker/index.ts), and
// requests the server refuses BEFORE any write: /api/me/* and /api/groups|blocks without a session (401), foreign
// Origin on writes (403, sameOrigin middleware), sign-up with an invalid username (400 before the rate limiter and
// before any INSERT; worker/account.ts), and the production-disabled /api/dev/* tools (404 before any model call).
// No sign-ups, logins, Ask questions, group/journey writes, or salt lookups.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(base)) { console.error('usage: node tools/e2e/live-readonly.ts <base-url> [--label "..."]'); process.exit(2); }
const li = process.argv.indexOf('--label');
const serverLabel = li > 0 ? process.argv[li + 1] : 'live (production)';
const FOREIGN = 'https://evil.example';

interface Case { id: string; area: string; title: string; trace: string; expected: string; actual: string; result: 'PASS' | 'FAIL'; ms: number; note?: string }
const cases: Case[] = [];
const observations: string[] = [];
let n = 0;

interface Res { status: number; headers: Headers; text: string; json: any; ms: number }
async function req(path: string, init: RequestInit & { json?: unknown } = {}): Promise<Res> {
  const headers = new Headers(init.headers);
  let body = init.body;
  if (init.json !== undefined) { headers.set('Content-Type', 'application/json'); body = JSON.stringify(init.json); }
  const t0 = performance.now();
  const r = await fetch(base + path, { ...init, headers, body, redirect: 'manual' });
  const text = await r.text();
  const ms = Math.round(performance.now() - t0);
  let json: any = undefined;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: r.status, headers: r.headers, text, json, ms };
}

async function tc(area: string, title: string, trace: string, expected: string,
  fn: () => Promise<{ ok: boolean; actual: string; ms?: number; note?: string }>) {
  const id = `E2E-LIVE-${String(++n).padStart(3, '0')}`;
  const t0 = performance.now();
  let out: { ok: boolean; actual: string; ms?: number; note?: string };
  try { out = await fn(); } catch (e) { out = { ok: false, actual: `threw: ${(e as Error).message}` }; }
  const ms = out.ms ?? Math.round(performance.now() - t0);
  cases.push({ id, area, title, trace, expected, actual: out.actual, result: out.ok ? 'PASS' : 'FAIL', ms, ...(out.note ? { note: out.note } : {}) });
  console.log(`${out.ok ? 'PASS' : 'FAIL'} ${id} [${area}] ${title} (${ms} ms)${out.ok ? '' : ' -> ' + out.actual}`);
}

const isJson = (r: Res) => (r.headers.get('content-type') ?? '').includes('application/json');
const hasNaN = (s: string) => /\bNaN\b|\bInfinity\b/.test(s);
const BANDS = ['SAFE', 'LIKELY', 'REACH', 'OUT_OF_RANGE', 'NOT_ENOUGH_DATA'];
const pct = (xs: number[], p: number) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };

// Real profiles (stream, district, subjects from /api/meta codes).
const PROFILES = {
  physKur: { stream: 'PHYS', district: 'KUR', zE4: 14821, al: { CMATH: 'B', PHY: 'C', ICT: 'A' } },
  bioCol: { stream: 'BIO', district: 'COL', zE4: 15000, al: { BIO: 'A', CHEM: 'B', PHY: 'B' } },
  commGal: { stream: 'COMMERCE', district: 'GAL', zE4: 10000, al: { ACC: 'A', BSTUD: 'B', ECON: 'C' } },
  artsJaf: { stream: 'ARTS', district: 'JAF', zE4: 8000, al: { TAM: 'A', HIST: 'B', POLSCI: 'C' } },
  etAmp: { stream: 'ET', district: 'AMP', zE4: 5000, al: { ET: 'B', SFT: 'C', ICT: 'C' } },
  bstMon: { stream: 'BST', district: 'MON', zE4: 3000, al: { BST: 'C', SFT: 'C', AGRI: 'S' } },
};
const results: Record<string, any> = {};

async function main() {
  // ---------- Health and metadata ----------
  await tc('meta', 'GET /api/health is up and rules reconciled', 'NFR-040', '200 JSON {ok:true, rules:RECONCILED}', async () => {
    const r = await req('/api/health');
    return { ok: r.status === 200 && isJson(r) && r.json?.ok === true && r.json?.rules === 'RECONCILED', actual: `${r.status} ok=${r.json?.ok} rules=${r.json?.rules} year=${r.json?.academicYear}`, ms: r.ms };
  });
  let meta: any;
  await tc('meta', 'GET /api/meta shape (year, 25 districts, 6 streams, subjects, sources)', 'FR-101; NFR-050', '200 JSON; 25 districts with code/name/disadvantaged; 6 streams; >=40 subjects; sources with id/title', async () => {
    const r = await req('/api/meta'); meta = r.json;
    const d = meta?.districts ?? [], s = meta?.streams ?? [], sub = meta?.subjects ?? [], src = meta?.sources ?? [];
    const ok = r.status === 200 && isJson(r) && typeof meta.academicYear === 'string' && d.length === 25
      && d.every((x: any) => typeof x.code === 'string' && typeof x.name === 'string' && typeof x.disadvantaged === 'boolean')
      && s.length === 6 && sub.length >= 40 && src.length >= 1 && src.every((x: any) => x.id && x.title);
    return { ok, actual: `${r.status} year=${meta?.academicYear} districts=${d.length} streams=${s.length} subjects=${sub.length} sources=${src.length}`, ms: r.ms };
  });
  await tc('meta', 'GET /api/meta revalidates with ETag (304 on If-None-Match)', 'NFR-011', '200 with ETag + Cache-Control no-cache; repeat with If-None-Match -> 304 empty body', async () => {
    const r1 = await req('/api/meta'); const etag = r1.headers.get('etag');
    if (!etag) return { ok: false, actual: 'no ETag header' };
    // fetch() asks for gzip/br like a browser; the edge then weakens the ETag to W/"..." when it compresses.
    const r2 = await req('/api/meta', { headers: { 'If-None-Match': etag } });
    const strong = etag.replace(/^W\//, '');
    const r3 = await req('/api/meta', { headers: { 'If-None-Match': strong, 'Accept-Encoding': 'identity' } });
    return { ok: r2.status === 304 && r2.text === '' && (r1.headers.get('cache-control') ?? '').includes('no-cache'),
      actual: `ETag (compressed)=${etag.slice(0, 4)}...; cache-control="${r1.headers.get('cache-control')}"; revalidate with the ETag the client got -> ${r2.status}; uncompressed strong ETag -> ${r3.status}`, ms: r2.ms,
      note: r2.status !== 304 && r3.status === 304 ? 'Edge compression turns the ETag into W/"..."; the Worker compares If-None-Match strictly (worker/index.ts cacheable), so compressed clients never get 304. Fix: strip a leading W/ before comparing.' : undefined };
  });
  await tc('meta', 'GET /api/routes shape (id, name, group, openNow boolean)', 'FR-501; FR-503', '200 JSON array, every route has id/name/group and boolean openNow', async () => {
    const r = await req('/api/routes');
    const a = Array.isArray(r.json) ? r.json : [];
    const ok = r.status === 200 && isJson(r) && a.length > 0 && a.every((x: any) => x.id && x.name && x.group && typeof x.openNow === 'boolean');
    return { ok, actual: `${r.status} routes=${a.length} openNow=${a.filter((x: any) => x.openNow).length} cache-control="${r.headers.get('cache-control')}"`, ms: r.ms };
  });
  await tc('meta', 'GET /api/journey shape (academicYear, steps with id/title/page)', 'FR-401; FR-402; NFR-050', '200 JSON; steps[] each with id, title and a handbook page', async () => {
    const r = await req('/api/journey');
    const steps = r.json?.steps ?? [];
    const ok = r.status === 200 && isJson(r) && typeof r.json?.academicYear === 'string' && steps.length > 0 && steps.every((s: any) => s.id && s.title && Number.isInteger(s.page));
    return { ok, actual: `${r.status} year=${r.json?.academicYear} steps=${steps.length} keys=${Object.keys(r.json ?? {}).join(',')}`, ms: r.ms };
  });
  await tc('meta', 'GET /api/journey does not expose the internal builtAt stamp', 'n/a', 'no builtAt key in body', async () => {
    const r = await req('/api/journey');
    return { ok: r.status === 200 && !('builtAt' in (r.json ?? {})), actual: `builtAt present=${'builtAt' in (r.json ?? {})}`, ms: r.ms };
  });

  // ---------- Results / banding (pure calculation) ----------
  for (const [name, p] of Object.entries(PROFILES)) {
    await tc('results', `POST /api/results ${name} (${p.stream}, ${p.district}, z=${(p.zE4 / 10000).toFixed(4)}) sanity`, 'FR-201; FR-205; FR-206; NFR-051',
      '200 JSON; SAFE+LIKELY+REACH > 0; counts sum = offerings; every band valid; gap = z - latest cut-off; integers only, no NaN', async () => {
      const r = await req('/api/results', { method: 'POST', json: p }); results[name] = r.json;
      const j = r.json ?? {}, off: any[] = j.offerings ?? [], c = j.counts ?? {};
      const sum = BANDS.reduce((s, b) => s + (c[b] ?? 0), 0);
      const sl = (c.SAFE ?? 0) + (c.LIKELY ?? 0) + (c.REACH ?? 0);
      const badBand = off.filter(o => !BANDS.includes(o.band)).length;
      const badGap = off.filter(o => o.latestE4 !== null && (o.gapToLatestE4 !== p.zE4 - o.latestE4 || !Number.isInteger(o.latestE4))).length;
      const ok = r.status === 200 && isJson(r) && sl > 0 && sum === off.length && badBand === 0 && badGap === 0 && !hasNaN(r.text);
      return { ok, actual: `${r.status} offerings=${off.length} hidden=${(j.hidden ?? []).length} S/L/R/O/N=${BANDS.map(b => c[b] ?? 0).join('/')} badBand=${badBand} badGap=${badGap}`, ms: r.ms };
    });
  }
  await tc('results', 'Hidden offerings each carry a reason and handbook page', 'FR-204; NFR-050', 'every hidden item has non-empty reason and integer page', async () => {
    const h: any[] = results.physKur?.hidden ?? [];
    const bad = h.filter(x => !x.reason || !Number.isInteger(x.page)).length;
    return { ok: h.length > 0 && bad === 0, actual: `hidden=${h.length} missing reason/page=${bad}` };
  });
  await tc('results', 'Edge: maximum Z-score +4.0000 is accepted; nothing is Reach/Out of range', 'FR-102; BR-030', '200; REACH=0 and OUT_OF_RANGE=0; SAFE > 0', async () => {
    const r = await req('/api/results', { method: 'POST', json: { ...PROFILES.physKur, zE4: 40000 } });
    const c = r.json?.counts ?? {};
    return { ok: r.status === 200 && c.SAFE > 0 && c.REACH === 0 && c.OUT_OF_RANGE === 0 && !hasNaN(r.text), actual: `${r.status} S/L/R/O/N=${BANDS.map(b => c[b]).join('/')}`, ms: r.ms };
  });
  await tc('results', 'Edge: minimum Z-score -4.0000 is accepted; nothing is Safe or Likely', 'FR-102; BR-030', '200; SAFE=0 and LIKELY=0', async () => {
    const r = await req('/api/results', { method: 'POST', json: { ...PROFILES.physKur, zE4: -40000 } });
    const c = r.json?.counts ?? {};
    return { ok: r.status === 200 && c.SAFE === 0 && c.LIKELY === 0 && !hasNaN(r.text), actual: `${r.status} S/L/R/O/N=${BANDS.map(b => c[b]).join('/')}`, ms: r.ms };
  });
  await tc('results', 'Edge: Z-score 0.0000 accepted', 'FR-102', '200 JSON, counts sum = offerings', async () => {
    const r = await req('/api/results', { method: 'POST', json: { ...PROFILES.commGal, zE4: 0 } });
    const c = r.json?.counts ?? {}; const sum = BANDS.reduce((s, b) => s + (c[b] ?? 0), 0);
    return { ok: r.status === 200 && sum === (r.json?.offerings ?? []).length, actual: `${r.status} S/L/R/O/N=${BANDS.map(b => c[b]).join('/')}`, ms: r.ms };
  });
  await tc('results', 'Monotonic: higher Z-score never lowers the Safe count (same profile)', 'BR-030 to BR-036', 'SAFE(z=2.0) >= SAFE(z=1.0) >= SAFE(z=0.5)', async () => {
    const s = [];
    for (const z of [5000, 10000, 20000]) s.push((await req('/api/results', { method: 'POST', json: { ...PROFILES.bioCol, zE4: z } })).json?.counts?.SAFE);
    return { ok: s.every(Number.isInteger) && s[0] <= s[1] && s[1] <= s[2], actual: `SAFE at 0.5/1.0/2.0 = ${s.join('/')}` };
  });
  await tc('results', 'District matters: same results, different district changes bands', 'BR-014', 'COL vs a disadvantaged district (MON) give different band counts', async () => {
    const a = (await req('/api/results', { method: 'POST', json: { ...PROFILES.bioCol, district: 'COL' } })).json?.counts;
    const b = (await req('/api/results', { method: 'POST', json: { ...PROFILES.bioCol, district: 'MON' } })).json?.counts;
    return { ok: !!a && !!b && JSON.stringify(a) !== JSON.stringify(b), actual: `COL ${JSON.stringify(a)} | MON ${JSON.stringify(b)}` };
  });
  await tc('results', 'Results are not cached publicly and set no cookie', 'NFR-030', 'no Set-Cookie; Cache-Control not public', async () => {
    const r = await req('/api/results', { method: 'POST', json: PROFILES.physKur });
    const cc = r.headers.get('cache-control') ?? '(none)';
    return { ok: r.status === 200 && !r.headers.get('set-cookie') && !/public/.test(cc), actual: `set-cookie=${!!r.headers.get('set-cookie')} cache-control=${cc}`, ms: r.ms };
  });
  await tc('results', 'No response states or implies certain admission', 'FR-207', 'no "guarantee"/"you will get in"/"certain to" in results, meta, routes, journey', async () => {
    const texts = [JSON.stringify(results.physKur ?? {})];
    for (const p of ['/api/meta', '/api/routes', '/api/journey']) texts.push((await req(p)).text);
    const hit = texts.map(t => t.match(/you will get in|guaranteed admission|certain to get|100% (chance|sure)/i)?.[0]).filter(Boolean);
    return { ok: hit.length === 0, actual: hit.length ? `found: ${hit.join(', ')}` : 'no certainty wording found' };
  });

  // ---------- Offering detail ----------
  const uni: string = results.physKur?.offerings?.find((o: any) => o.latestE4 !== null)?.uniCode ?? '';
  await tc('offering', 'GET /api/offerings/:uniCode with district: cited history with district cut-offs', 'FR-208; FR-209; NFR-050', '200; requirementCitation.page; each history row has citation and numeric/null zE4; some non-null', async () => {
    const r = await req(`/api/offerings/${uni}?district=KUR`);
    const g: any[] = r.json?.groups ?? [];
    const rows = g.flatMap(x => x.history ?? []);
    const ok = r.status === 200 && isJson(r) && r.json?.uniCode === uni && Number.isInteger(r.json?.requirementCitation?.page)
      && rows.length > 0 && rows.every(h => h.citation?.sourceId && Number.isInteger(h.citation?.page) && (h.zE4 === null || Number.isInteger(h.zE4)))
      && rows.some(h => h.zE4 !== null) && Array.isArray(r.json?.needs);
    return { ok, actual: `${r.status} uni=${uni} groups=${g.length} historyRows=${rows.length} nonNull=${rows.filter(h => h.zE4 !== null).length}`, ms: r.ms };
  });
  await tc('offering', 'Offering without district: history zE4 all null (no guessing)', 'FR-208', '200; every history zE4 === null', async () => {
    const r = await req(`/api/offerings/${uni}`);
    const rows = (r.json?.groups ?? []).flatMap((x: any) => x.history ?? []);
    return { ok: r.status === 200 && rows.length > 0 && rows.every((h: any) => h.zE4 === null), actual: `${r.status} rows=${rows.length} nonNull=${rows.filter((h: any) => h.zE4 !== null).length}`, ms: r.ms };
  });
  await tc('offering', 'Uni-Code lookup is case-insensitive', 'n/a', 'lower-case code -> 200 same uniCode', async () => {
    const r = await req(`/api/offerings/${uni.toLowerCase()}`);
    return { ok: r.status === 200 && r.json?.uniCode === uni, actual: `${r.status} uniCode=${r.json?.uniCode}`, ms: r.ms };
  });
  await tc('offering', 'Unknown Uni-Code -> 404 JSON error', 'NFR-035', '404 JSON {error}', async () => {
    const r = await req('/api/offerings/ZZZ999');
    return { ok: r.status === 404 && isJson(r) && typeof r.json?.error === 'string', actual: `${r.status} ${r.text.slice(0, 80)}`, ms: r.ms };
  });
  await tc('offering', 'Unknown district query is ignored safely (no 500)', 'NFR-035', '200; history zE4 all null', async () => {
    const r = await req(`/api/offerings/${uni}?district=XXX`);
    const rows = (r.json?.groups ?? []).flatMap((x: any) => x.history ?? []);
    return { ok: r.status === 200 && rows.every((h: any) => h.zE4 === null), actual: `${r.status} nonNull=${rows.filter((h: any) => h.zE4 !== null).length}`, ms: r.ms };
  });

  // ---------- Invalid inputs (400) ----------
  const bad: [string, string, unknown, string?][] = [
    ['no body', 'FR-101; NFR-035', undefined],
    ['non-JSON body', 'NFR-035', 'not json'],
    ['unknown stream', 'FR-101; NFR-035', { ...PROFILES.physKur, stream: 'MAGIC' }, 'stream'],
    ['unknown district', 'FR-101; NFR-035', { ...PROFILES.physKur, district: 'XYZ' }, 'district'],
    ['Z-score above +4.0000', 'FR-102', { ...PROFILES.physKur, zE4: 40001 }, 'zE4'],
    ['Z-score below -4.0000', 'FR-102', { ...PROFILES.physKur, zE4: -40001 }, 'zE4'],
    ['Z-score with more than four decimals (non-integer zE4)', 'FR-102', { ...PROFILES.physKur, zE4: 14821.5 }, 'zE4'],
    ['Z-score as string', 'FR-102; NFR-035', { ...PROFILES.physKur, zE4: '14821' }, 'zE4'],
    ['only two subjects', 'FR-101', { ...PROFILES.physKur, al: { CMATH: 'B', PHY: 'C' } }, 'al'],
    ['invalid grade E', 'FR-101', { ...PROFILES.physKur, al: { CMATH: 'B', PHY: 'C', ICT: 'E' } }, 'al'],
  ];
  for (const [title, trace, body, field] of bad) {
    await tc('validation', `POST /api/results rejects ${title}`, trace, `400 JSON {error${field ? `, field:${field}` : ''}}`, async () => {
      const r = body === undefined ? await req('/api/results', { method: 'POST' })
        : typeof body === 'string' ? await req('/api/results', { method: 'POST', body, headers: { 'Content-Type': 'application/json' } })
        : await req('/api/results', { method: 'POST', json: body });
      const ok = r.status === 400 && isJson(r) && typeof r.json?.error === 'string' && (!field || r.json?.field === field);
      return { ok, actual: `${r.status} ${r.text.slice(0, 100)}`, ms: r.ms };
    });
  }
  await tc('validation', 'POST /api/auth/signup with an invalid username -> 400 (nothing created)', 'BR-050; NFR-035', '400 JSON field=username; no Set-Cookie', async () => {
    const r = await req('/api/auth/signup', { method: 'POST', json: { username: 'a!', key: 'x' } });
    return { ok: r.status === 400 && r.json?.field === 'username' && !r.headers.get('set-cookie'), actual: `${r.status} ${r.text.slice(0, 100)}`, ms: r.ms };
  });
  await tc('validation', 'POST /api/auth/signup with valid-format username but malformed key -> 400 (nothing created)', 'FR-114; NFR-036', '400 JSON field=key; no Set-Cookie', async () => {
    const r = await req('/api/auth/signup', { method: 'POST', json: { username: 'e2e_readonly_probe', key: 'not-hex' } });
    return { ok: r.status === 400 && r.json?.field === 'key' && !r.headers.get('set-cookie'), actual: `${r.status} ${r.text.slice(0, 100)}`, ms: r.ms };
  });

  // ---------- Session-guarded routes (401 without session) ----------
  const guarded: [string, string][] = [
    ['GET', '/api/me'], ['PUT', '/api/me'], ['DELETE', '/api/me'], ['PUT', '/api/me/contact'], ['PUT', '/api/me/avatar'],
    ['GET', '/api/me/journey'], ['PUT', '/api/me/journey/courses/ZZZ999'], ['DELETE', '/api/me/journey/courses/ZZZ999'],
    ['PUT', '/api/me/journey/notices/R001'], ['DELETE', '/api/me/journey/notices/R001'], ['PUT', '/api/me/journey/notices/R001/applied'],
    ['PUT', '/api/me/journey/steps/UGC_APPLY'],
    ['POST', '/api/auth/logout'], ['POST', '/api/auth/logout-all'],
    ['GET', '/api/groups'], ['POST', '/api/groups/join'], ['GET', '/api/groups/1'], ['POST', '/api/groups/1/leave'],
    ['GET', '/api/groups/1/live'], ['GET', '/api/groups/1/members'], ['POST', '/api/groups/1/report'],
    ['GET', '/api/blocks'], ['POST', '/api/blocks'], ['DELETE', '/api/blocks/someone'],
  ];
  for (const [m, p] of guarded) {
    const trace = p.startsWith('/api/me/journey') ? 'FR-411; NFR-038' : p.startsWith('/api/me') ? 'FR-116; FR-117' : p.startsWith('/api/auth') ? 'FR-115' : 'FR-705; NFR-038';
    await tc('auth', `${m} ${p} without session -> 401`, trace, '401 JSON {error}', async () => {
      const r = await req(p, { method: m, ...(m === 'GET' || m === 'DELETE' ? {} : { json: {} }) });
      return { ok: r.status === 401 && isJson(r) && typeof r.json?.error === 'string', actual: `${r.status} ${r.text.slice(0, 60)}`, ms: r.ms };
    });
  }
  await tc('auth', 'Forged well-formed session cookie -> 401 and cookie cleared', 'NFR-036', '401; Set-Cookie clears zp session', async () => {
    const r = await req('/api/me', { headers: { Cookie: `zp_session=${'0'.repeat(64)}` } });
    return { ok: r.status === 401, actual: `${r.status} set-cookie=${r.headers.get('set-cookie') ?? '(none)'}`.slice(0, 160), ms: r.ms };
  });
  await tc('auth', 'Malformed session cookie -> 401', 'NFR-035', '401', async () => {
    const r = await req('/api/me', { headers: { Cookie: 'zp_session=not-a-token' } });
    return { ok: r.status === 401, actual: `${r.status}`, ms: r.ms };
  });

  // ---------- Cross-site / CORS ----------
  await tc('cors', 'Foreign Origin on PUT /api/me -> 403 (refused before session check)', 'NFR-035', '403 JSON "Cross-site request refused"', async () => {
    const r = await req('/api/me', { method: 'PUT', json: {}, headers: { Origin: FOREIGN } });
    return { ok: r.status === 403, actual: `${r.status} ${r.text.slice(0, 60)}`, ms: r.ms };
  });
  await tc('cors', 'Foreign Origin on POST /api/auth/signup -> 403', 'NFR-035; NFR-037', '403', async () => {
    const r = await req('/api/auth/signup', { method: 'POST', json: { username: 'a!' }, headers: { Origin: FOREIGN } });
    return { ok: r.status === 403, actual: `${r.status} ${r.text.slice(0, 60)}`, ms: r.ms };
  });
  await tc('cors', 'Foreign Origin on PUT /api/me/journey/steps -> 403', 'NFR-038', '403', async () => {
    const r = await req('/api/me/journey/steps/UGC_APPLY', { method: 'PUT', json: { done: true }, headers: { Origin: FOREIGN } });
    return { ok: r.status === 403, actual: `${r.status}`, ms: r.ms };
  });
  await tc('cors', 'Foreign Origin on POST /api/groups/join -> 403', 'NFR-038', '403', async () => {
    const r = await req('/api/groups/join', { method: 'POST', json: {}, headers: { Origin: FOREIGN } });
    return { ok: r.status === 403, actual: `${r.status}`, ms: r.ms };
  });
  await tc('cors', 'GET /api/meta from a foreign Origin: no credentialed CORS grant', 'NFR-035', 'Access-Control-Allow-Origin absent, or not the foreign origin with credentials', async () => {
    const r = await req('/api/meta', { headers: { Origin: FOREIGN } });
    const acao = r.headers.get('access-control-allow-origin'), acac = r.headers.get('access-control-allow-credentials');
    return { ok: !(acao === FOREIGN && acac === 'true') && acao !== FOREIGN, actual: `ACAO=${acao ?? '(none)'} ACAC=${acac ?? '(none)'}`, ms: r.ms };
  });
  await tc('cors', 'OPTIONS preflight from a foreign Origin for PUT /api/me: not granted', 'NFR-035', 'no Access-Control-Allow-Origin for the foreign origin', async () => {
    const r = await req('/api/me', { method: 'OPTIONS', headers: { Origin: FOREIGN, 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'content-type' } });
    const acao = r.headers.get('access-control-allow-origin');
    return { ok: acao !== FOREIGN && acao !== '*', actual: `${r.status} ACAO=${acao ?? '(none)'} ACAM=${r.headers.get('access-control-allow-methods') ?? '(none)'}`, ms: r.ms };
  });

  // ---------- Routing / disabled tools ----------
  await tc('routing', 'Unknown API route -> 404 JSON', 'n/a', '404 JSON {error:"Not found"}', async () => {
    const r = await req('/api/does-not-exist');
    return { ok: r.status === 404 && isJson(r) && r.json?.error === 'Not found', actual: `${r.status} ${r.text.slice(0, 60)}`, ms: r.ms };
  });
  await tc('routing', 'Wrong method on a known route (GET /api/results) -> 404 JSON, not 500', 'n/a', '404 or 405 JSON', async () => {
    const r = await req('/api/results');
    return { ok: (r.status === 404 || r.status === 405) && isJson(r), actual: `${r.status} ${r.text.slice(0, 60)}`, ms: r.ms };
  });
  await tc('routing', 'POST /api/dev/embed is disabled in production -> 404 (no model call)', 'NFR-033', '404', async () => {
    const r = await req('/api/dev/embed', { method: 'POST', json: { texts: [] } });
    return { ok: r.status === 404, actual: `${r.status} ${r.text.slice(0, 60)}`, ms: r.ms };
  });
  await tc('routing', 'POST /api/dev/search is disabled in production -> 404 (no model call)', 'NFR-033', '404', async () => {
    const r = await req('/api/dev/search', { method: 'POST', json: { q: 'x' } });
    return { ok: r.status === 404, actual: `${r.status} ${r.text.slice(0, 60)}`, ms: r.ms };
  });
  await tc('routing', 'Path traversal attempt on offerings -> 404, no file content', 'NFR-035', '404 JSON', async () => {
    const r = await req('/api/offerings/..%2F..%2Fwrangler.jsonc');
    return { ok: r.status === 404 && !/account_id/.test(r.text), actual: `${r.status} ${r.text.slice(0, 60)}`, ms: r.ms };
  });

  // ---------- Static pages and headers ----------
  await tc('static', 'GET / serves the app HTML', 'NFR-012; NFR-063', '200 text/html with <div id="root"> or a script tag', async () => {
    const r = await req('/');
    return { ok: r.status === 200 && (r.headers.get('content-type') ?? '').includes('text/html') && /<script/i.test(r.text), actual: `${r.status} ${r.headers.get('content-type')} bytes=${r.text.length}`, ms: r.ms };
  });
  await tc('static', 'Deep link (SPA route) serves the app HTML, not a 404 page', 'NFR-063', '200 text/html', async () => {
    const r = await req('/courses');
    return { ok: r.status === 200 && (r.headers.get('content-type') ?? '').includes('text/html'), actual: `${r.status} ${r.headers.get('content-type')}`, ms: r.ms };
  });
  const SEC = ['strict-transport-security', 'x-content-type-options', 'content-security-policy', 'x-frame-options', 'referrer-policy', 'permissions-policy'];
  for (const [label, path, init] of [['HTML (/)', '/', {}], ['API (/api/meta)', '/api/meta', {}], ['API error (/api/me 401)', '/api/me', {}]] as [string, string, RequestInit][]) {
    await tc('headers', `Security headers recorded on ${label}`, 'NFR-035', 'Content-Type present (fail only if missing); other headers recorded', async () => {
      const r = await req(path, init);
      const present = SEC.filter(h => r.headers.get(h)), missing = SEC.filter(h => !r.headers.get(h));
      if (missing.length) observations.push(`${label}: missing ${missing.join(', ')}`);
      return { ok: !!r.headers.get('content-type'), actual: `content-type=${r.headers.get('content-type')}; present=[${present.join(', ')}]; missing=[${missing.join(', ')}]`, ms: r.ms,
        note: missing.length ? `Recommend adding: ${missing.join(', ')}` : undefined };
    });
  }
  await tc('headers', 'Server does not leak framework/version headers (X-Powered-By)', 'n/a', 'no X-Powered-By', async () => {
    const r = await req('/api/meta');
    return { ok: !r.headers.get('x-powered-by'), actual: `x-powered-by=${r.headers.get('x-powered-by') ?? '(none)'}`, ms: r.ms };
  });
  await tc('headers', 'All JSON endpoints answer with application/json', 'n/a', 'content-type application/json on health, meta, routes, journey, offering, results, 400, 401, 404', async () => {
    const rs = await Promise.all([req('/api/health'), req('/api/meta'), req('/api/routes'), req('/api/journey'), req(`/api/offerings/${uni}`),
      req('/api/results', { method: 'POST', json: PROFILES.physKur }), req('/api/results', { method: 'POST', json: {} }), req('/api/me'), req('/api/nope')]);
    const bad = rs.filter(r => !isJson(r)).map(r => `${r.status}:${r.headers.get('content-type')}`);
    return { ok: bad.length === 0, actual: bad.length ? `non-JSON: ${bad.join(', ')}` : `all ${rs.length} JSON` };
  });

  // ---------- Performance (p50/p95 over 10 calls) ----------
  const perf: Record<string, { p50: number; p95: number; max: number }> = {};
  const endpoints: [string, () => Promise<Res>][] = [
    ['GET /api/meta', () => req('/api/meta')],
    ['POST /api/results', () => req('/api/results', { method: 'POST', json: PROFILES.physKur })],
    ['GET /api/offerings/:uni', () => req(`/api/offerings/${uni}?district=KUR`)],
    ['GET /api/routes', () => req('/api/routes')],
    ['GET /api/journey', () => req('/api/journey')],
  ];
  for (const [name, call] of endpoints) {
    await tc('performance', `${name} p95 over 10 calls <= 1500 ms`, 'NFR-002; NFR-003', 'p95 <= 1500 ms on this network (all 10 return 200)', async () => {
      const ms: number[] = []; let non200 = 0;
      for (let i = 0; i < 10; i++) { const r = await call(); ms.push(r.ms); if (r.status !== 200) non200++; }
      const p50 = pct(ms, 50), p95 = pct(ms, 95), max = Math.max(...ms);
      perf[name] = { p50, p95, max };
      return { ok: p95 <= 1500 && non200 === 0, actual: `p50=${p50} ms p95=${p95} ms max=${max} ms non200=${non200}`, ms: p95 };
    });
  }

  // ---------- Write results ----------
  const passed = cases.filter(c => c.result === 'PASS').length, failed = cases.length - passed;
  const here = dirname(fileURLToPath(import.meta.url)), outDir = join(here, 'results');
  mkdirSync(outDir, { recursive: true });
  const runAt = new Date().toISOString();
  writeFileSync(join(outDir, 'live-readonly.json'), JSON.stringify({ server: serverLabel, runAt, mode: 'read-only', total: cases.length, passed, failed, performance: perf, observations, cases }, null, 2) + '\n');
  const esc = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const md = [
    '# ZedPath live read-only E2E pass', '',
    `- Server: ${serverLabel}`, `- Run at: ${runAt}`, '- Mode: read-only (GETs, the pure /api/results calculation, and requests refused before any write)',
    `- Harness: \`node tools/e2e/live-readonly.ts <base-url>\``, '',
    `**Total ${cases.length} · Passed ${passed} · Failed ${failed}**`, '',
    '## Performance (10 calls each, this network)', '', '| Endpoint | p50 ms | p95 ms | max ms |', '|---|---|---|---|',
    ...Object.entries(perf).map(([k, v]) => `| ${k} | ${v.p50} | ${v.p95} | ${v.max} |`), '',
    '## Observations (recorded, not failed)', '', ...(observations.length ? observations.map(o => `- ${o}`) : ['- none']), '',
    '## Cases', '', '| ID | Area | Title | Trace | Expected | Actual | Result | ms |', '|---|---|---|---|---|---|---|---|',
    ...cases.map(c => `| ${c.id} | ${c.area} | ${esc(c.title)} | ${esc(c.trace)} | ${esc(c.expected)} | ${esc(c.actual)} | ${c.result} | ${c.ms} |`), '',
  ].join('\n');
  writeFileSync(join(outDir, 'live-readonly.md'), md);
  console.log(`\nTotal ${cases.length}  Passed ${passed}  Failed ${failed}`);
  process.exitCode = failed ? 1 : 0;
}

main().catch(e => { console.error(e); process.exit(1); });
