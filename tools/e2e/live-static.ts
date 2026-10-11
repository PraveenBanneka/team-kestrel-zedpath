// Read-only live test pass of the ZedPath static site / PWA (Workers static assets).
// Usage: node tools/e2e/live-static.ts <base-url>
// Only GET requests. No sign-ups, no writes. Results: tools/e2e/results/live-static.{json,md}.
// The base URL is never written to the results (public repo): they say "server: live (production)".
import https from 'node:https';
import http from 'node:http';
import zlib from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!/^https:\/\//.test(BASE)) { console.error('usage: node tools/e2e/live-static.ts https://<host>'); process.exit(2); }
const HOST = new URL(BASE).host;

type Res = { status: number; headers: http.IncomingHttpHeaders; raw: Buffer; body: Buffer; ttfbMs: number };
type Case = { id: string; area: string; title: string; trace: string; expected: string; actual: string; result: 'pass' | 'fail' };

/** One GET with raw (still-compressed) bytes kept, plus the decoded body. No redirects followed. */
function get(url: string, opts: { enc?: string; headers?: Record<string, string> } = {}): Promise<Res> {
  const lib = url.startsWith('https:') ? https : http;
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const req = lib.get(url, { agent: false, headers: { 'User-Agent': 'zedpath-e2e-static/1', 'Accept-Encoding': opts.enc ?? 'identity', ...opts.headers } }, res => {
      const ttfbMs = performance.now() - t0;
      const chunks: Buffer[] = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        const ce = String(res.headers['content-encoding'] ?? '');
        let body = raw;
        try {
          if (ce === 'br') body = zlib.brotliDecompressSync(raw);
          else if (ce === 'gzip') body = zlib.gunzipSync(raw);
          else if (ce === 'zstd' && (zlib as any).zstdDecompressSync) body = (zlib as any).zstdDecompressSync(raw);
        } catch { /* keep raw */ }
        resolve({ status: res.statusCode ?? 0, headers: res.headers, raw, body, ttfbMs });
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('timeout')));
  });
}

const cases: Case[] = [];
let n = 0;
function add(area: string, title: string, trace: string, expected: string, actual: string, ok: boolean) {
  n += 1;
  cases.push({ id: `E2E-STATIC-${String(n).padStart(3, '0')}`, area, title, trace, expected, actual, result: ok ? 'pass' : 'fail' });
}
const ct = (r: Res) => String(r.headers['content-type'] ?? '');
const cc = (r: Res) => String(r.headers['cache-control'] ?? '(none)');
const kb = (b: number) => `${(b / 1024).toFixed(1)} KB`;
const SECRET_RE = /AIza[0-9A-Za-z_-]{20,}|sk-ant-[0-9A-Za-z_-]{10,}|ghp_[0-9A-Za-z]{20,}|BEGIN [A-Z ]*PRIVATE KEY/;
const isShell = (r: Res) => /<div id="root">|<script type="module"/.test(r.body.toString('utf8'));

async function main() {
  // ---- Shell ----
  const idx = await get(`${BASE}/`, { enc: 'br, gzip' });
  const html = idx.body.toString('utf8');
  add('Shell', 'index.html returns 200 text/html', 'NFR-063', '200, text/html', `${idx.status}, ${ct(idx)}`, idx.status === 200 && ct(idx).includes('text/html'));
  const charset = /<meta[^>]+charset=["']?utf-8/i.test(html);
  const viewport = html.match(/<meta[^>]+name=["']viewport["'][^>]*content=["']([^"']+)/i)?.[1];
  add('Shell', 'charset and viewport meta present', 'NFR-025', 'meta charset=utf-8 and viewport with width=device-width',
    `charset=${charset}, viewport="${viewport ?? 'missing'}"`, charset && !!viewport && viewport.includes('width=device-width'));
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  add('Shell', 'document title set', 'n/a', 'non-empty <title> mentioning ZedPath', `"${title ?? 'missing'}"`, !!title && /ZedPath/i.test(title));
  const manifestLink = /<link[^>]+rel=["']manifest["']/i.test(html);
  add('PWA', 'index links the web manifest', 'NFR-063', '<link rel="manifest"> in index.html', manifestLink ? 'present' : 'missing', manifestLink);
  const htmlCC = cc(idx);
  const revalidates = /no-cache|must-revalidate|max-age=0|no-store/i.test(htmlCC);
  add('Caching', 'HTML cache-control forces revalidation', 'NFR-001', 'no-cache / max-age=0 / must-revalidate (new deploys seen at once)',
    `cache-control: ${htmlCC}; etag: ${idx.headers.etag ?? '(none)'}`, revalidates);

  // ---- Bundles ----
  const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
  const preloads = [...html.matchAll(/<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+)["']/gi)].map(m => m[1]);
  const styles = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)].map(m => m[1]).filter(s => s.startsWith('/'));
  const mainJs = scripts.find(s => s.startsWith('/assets/')) ?? scripts[0];
  add('Bundle', 'entry script is a hashed /assets/ file', 'n/a', 'one <script type=module src=/assets/<name>-<hash>.js>',
    `scripts=${JSON.stringify(scripts)}, modulepreload=${preloads.length}, css=${JSON.stringify(styles)}`, !!mainJs && /\/assets\/.+-[A-Za-z0-9_-]{6,}\.js$/.test(mainJs));

  const js = await get(`${BASE}${mainJs}`, { enc: 'br, gzip' });
  const jsGz = await get(`${BASE}${mainJs}`, { enc: 'gzip' });
  const jsText = js.body.toString('utf8');
  add('Bundle', 'main JS 200 with JavaScript content-type', 'n/a', '200, text/javascript or application/javascript', `${js.status}, ${ct(js)}`, js.status === 200 && /javascript/.test(ct(js)));
  const jsCC = cc(js);
  const maxAge = Number(jsCC.match(/max-age=(\d+)/)?.[1] ?? 0);
  add('Caching', 'hashed /assets/* JS has a long cache', 'NFR-001, NFR-011', 'max-age >= 1 year (31536000) and/or immutable',
    `cache-control: ${jsCC}`, maxAge >= 31536000 || /immutable/.test(jsCC));
  const brBytes = js.headers['content-encoding'] === 'br' ? js.raw.length : NaN;
  const gzBytes = jsGz.headers['content-encoding'] === 'gzip' ? jsGz.raw.length : NaN;
  const best = Math.min(...[js.raw.length, jsGz.raw.length]);
  add('Performance', 'main JS compressed transfer < 350 KB (task budget)', 'NFR-001', '< 350 KB compressed',
    `raw ${kb(js.body.length)}; br ${isNaN(brBytes) ? `n/a (served ${js.headers['content-encoding'] ?? 'identity'})` : kb(brBytes)}; gzip ${isNaN(gzBytes) ? `n/a (served ${jsGz.headers['content-encoding'] ?? 'identity'})` : kb(gzBytes)}`,
    best < 350 * 1024);
  add('Performance', 'main JS compressed transfer <= 200 KB (SRS NFR-006)', 'NFR-006', '<= 200 KB compressed (SRS budget, stricter than the task budget)',
    `smallest compressed transfer ${kb(best)}`, best <= 200 * 1024);

  let cssNote = 'no stylesheet link';
  let cssOk = false;
  let cssCC = '';
  for (const s of styles) {
    const c = await get(`${BASE}${s}`, { enc: 'br, gzip' });
    cssNote = `${c.status}, ${ct(c)}, raw ${kb(c.body.length)}, transfer ${kb(c.raw.length)} (${c.headers['content-encoding'] ?? 'identity'})`;
    cssCC = cc(c);
    cssOk = c.status === 200 && ct(c).includes('text/css');
  }
  if (!styles.length) { cssOk = /<style/i.test(html); cssNote = cssOk ? 'CSS inlined in index.html' : cssNote; }
  add('Bundle', 'CSS bundle reachable, size recorded', 'NFR-001', '200 text/css (or inlined), compressed size recorded', cssNote, cssOk);
  if (styles.length) {
    const ma = Number(cssCC.match(/max-age=(\d+)/)?.[1] ?? 0);
    add('Caching', 'hashed CSS has a long cache', 'NFR-001', 'max-age >= 31536000 and/or immutable', `cache-control: ${cssCC}`, ma >= 31536000 || /immutable/.test(cssCC));
  }

  // Source maps.
  const map = await get(`${BASE}${mainJs}.map`);
  const mapRef = /sourceMappingURL=/.test(jsText);
  const mapIsMap = map.status === 200 && /"mappings"/.test(map.body.toString('utf8'));
  add('Security', 'no source maps published', 'NFR-033', 'no sourceMappingURL in bundle; <main>.js.map not served as a map',
    `sourceMappingURL in bundle: ${mapRef}; .map -> ${map.status} ${ct(map)}${mapIsMap ? ' (REAL MAP)' : ''}`, !mapRef && !mapIsMap);

  // Secrets in bundle (main + preloaded chunks).
  const chunkTexts: [string, string][] = [[mainJs, jsText]];
  for (const p of preloads.filter(p => p !== mainJs)) chunkTexts.push([p, (await get(`${BASE}${p}`, { enc: 'br, gzip' })).body.toString('utf8')]);
  const hits = chunkTexts.flatMap(([name, t]) => (t.match(new RegExp(SECRET_RE, 'g')) ?? []).map(h => `${name}: ${h.slice(0, 6)}...`));
  add('Security', "no secret-looking strings in shipped JS ('AIza', 'sk-ant', 'ghp_', 'BEGIN PRIVATE KEY')", 'NFR-033', '0 matches',
    `${hits.length} matches in ${chunkTexts.length} file(s)${hits.length ? ': ' + hits.join(', ') : ''}`, hits.length === 0);

  // Feature markers in the live bundle (main + preloads; also scan lazy chunks referenced from main).
  const lazy = [...new Set([...jsText.matchAll(/["'`](?:\.\/|\/assets\/)([A-Za-z0-9_.-]+\.js)["'`]/g)].map(m => `/assets/${m[1]}`))]
    .filter(p => p !== mainJs && !preloads.includes(p)).slice(0, 40);
  for (const p of lazy) chunkTexts.push([p, (await get(`${BASE}${p}`, { enc: 'br, gzip' })).body.toString('utf8')]);
  const all = chunkTexts.map(c => c[1]).join('\n');
  const has = (s: string) => all.includes(s);
  add('Features', 'team line text in live bundle', 'n/a', 'contains "Team Kestrel" and "Undergraduate bracket"',
    `Team Kestrel: ${has('Team Kestrel')}; Undergraduate bracket: ${has('Undergraduate bracket')} (scanned ${chunkTexts.length} JS files)`, has('Team Kestrel') && has('Undergraduate bracket'));
  const demo = has('demo=kasun') || (has('kasun') && /[?&]?demo/.test(all));
  add('Features', 'demo mode marker in live bundle', 'n/a', "contains 'demo=kasun' (or the demo param + 'kasun')",
    `demo=kasun literal: ${has('demo=kasun')}; 'kasun': ${has('kasun')}`, demo);
  const askQ = 'When do UGC applications usually open?';
  add('Features', 'Ask suggestion text in live bundle', 'n/a', `contains "${askQ}" and the aptitude suggestion`,
    `UGC suggestion: ${has(askQ)}; aptitude suggestion: ${has('aptitude test for Architecture')}`, has(askQ) && has('aptitude test for Architecture'));

  // ---- PWA ----
  const man = await get(`${BASE}/manifest.webmanifest`);
  let m: any = null;
  try { m = JSON.parse(man.body.toString('utf8')); } catch { /* invalid */ }
  add('PWA', 'manifest.webmanifest is valid JSON', 'NFR-063', '200, parses as JSON, manifest content-type',
    `${man.status}, ${ct(man)}, JSON ${m ? 'valid' : 'INVALID'}`, man.status === 200 && !!m);
  const icons: any[] = m?.icons ?? [];
  add('PWA', 'manifest has name, icons, start_url, display', 'NFR-063', 'name, icons[192 & 512], start_url, display set',
    `name="${m?.name}", start_url="${m?.start_url}", display="${m?.display}", icons=${icons.map(i => i.sizes).join(',')}`,
    !!m?.name && !!m?.start_url && !!m?.display && icons.some(i => i.sizes === '192x192') && icons.some(i => i.sizes === '512x512'));
  for (const size of ['192x192', '512x512']) {
    const ic = icons.find(i => i.sizes === size);
    const r = ic ? await get(`${BASE}${ic.src.startsWith('/') ? '' : '/'}${ic.src}`) : null;
    const png = !!r && r.body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    add('PWA', `icon ${size} reachable`, 'NFR-063', '200 image/png with PNG signature',
      r ? `${ic.src} -> ${r.status}, ${ct(r)}, ${kb(r.body.length)}, PNG signature ${png}` : 'not listed in manifest', !!r && r.status === 200 && ct(r).includes('image/png') && png);
  }
  const sw = await get(`${BASE}/sw.js`);
  const swText = sw.body.toString('utf8');
  add('PWA', 'service worker sw.js reachable as JavaScript', 'NFR-063', '200, JavaScript content-type, not the SPA HTML shell',
    `${sw.status}, ${ct(sw)}, ${kb(sw.body.length)}, html-shell=${isShell(sw)}`, sw.status === 200 && /javascript/.test(ct(sw)) && !isShell(sw));
  add('Caching', 'sw.js is not long-cached', 'NFR-063', 'cache-control allows revalidation (so SW updates land)', `cache-control: ${cc(sw)}`,
    !/max-age=([1-9]\d{3,})/.test(cc(sw)) || /no-cache|must-revalidate/.test(cc(sw)));
  const swRegistered = has('sw.js') || html.includes('sw.js');
  add('PWA', 'app registers the service worker', 'NFR-063', "bundle or index references 'sw.js' (serviceWorker.register)",
    `sw.js referenced: ${swRegistered}; serviceWorker in bundle: ${has('serviceWorker')}`, swRegistered && has('serviceWorker'));

  // Avatars a01..a12.
  const bad: string[] = [];
  for (let i = 1; i <= 12; i++) {
    const p = `/avatars/a${String(i).padStart(2, '0')}.svg`;
    const r = await get(`${BASE}${p}`);
    if (!(r.status === 200 && ct(r).includes('image/svg+xml') && r.body.toString('utf8').includes('<svg'))) bad.push(`${p}: ${r.status} ${ct(r)}`);
  }
  add('Assets', 'all 12 avatars /avatars/a01..a12.svg are 200 image/svg+xml', 'n/a', '12 of 12 OK', `${12 - bad.length} of 12 OK${bad.length ? '; ' + bad.join('; ') : ''}`, bad.length === 0);
  const favHref = html.match(/<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? '/favicon.svg';
  const fav = await get(`${BASE}${favHref}`);
  add('Assets', 'favicon reachable', 'n/a', '200 image/*', `${favHref} -> ${fav.status}, ${ct(fav)}`, fav.status === 200 && ct(fav).startsWith('image/'));

  // ---- Routing ----
  for (const p of ['/#/paths', '/paths', '/ask', '/profile/settings']) {
    const r = await get(`${BASE}${p.split('#')[0] || '/'}`, { headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' } });
    add('Routing', `SPA deep link ${p} serves the app shell`, 'NFR-012', '200 text/html with the same shell (root div + module script)',
      `${r.status}, ${ct(r)}, shell=${isShell(r)}${p.includes('#') ? ' (hash route: fragment never reaches the server)' : ''}`, r.status === 200 && isShell(r));
  }
  const miss = await get(`${BASE}/assets/does-not-exist-e2e-0000.js`, { headers: { 'Sec-Fetch-Mode': 'no-cors', 'Sec-Fetch-Dest': 'script', Accept: '*/*' } });
  add('Routing', 'missing hashed asset is not served as valid JS', 'n/a', '404 (preferred), never 200 JavaScript',
    `${miss.status}, ${ct(miss)}, shell=${isShell(miss)}`, miss.status === 404 || (!/javascript/.test(ct(miss))));
  const missNote = miss.status === 404 ? '' : ' (note: 200 HTML shell for a missing script is SPA fallback; a stale tab would get a MIME error rather than a clean 404)';
  if (missNote) cases[cases.length - 1].actual += missNote;

  // HTTPS redirect.
  try {
    const h = await get(`http://${HOST}/`);
    const loc = String(h.headers.location ?? '');
    add('Security', 'plain HTTP redirects to HTTPS', 'n/a', '301/302/307/308 with Location https://', `${h.status}, location ${loc.startsWith('https://') ? 'https://(same host)' : loc || '(none)'}`,
      [301, 302, 307, 308].includes(h.status) && loc.startsWith('https://'));
  } catch (e) { add('Security', 'plain HTTP redirects to HTTPS', 'n/a', '3xx to https://', `error: ${(e as Error).message}`, false); }

  // Hidden files.
  for (const p of ['/.env', '/.dev.vars', '/wrangler.jsonc', '/.git/config', '/package.json']) {
    const r = await get(`${BASE}${p}`);
    const t = r.body.toString('utf8');
    const leaked = SECRET_RE.test(t) || /GEMINI_API_KEY\s*=|PEPPER\s*=|"account_id"|\[core\]|"devDependencies"/.test(t);
    add('Security', `GET ${p} does not expose project files`, 'NFR-033', '404, or the SPA shell with no secret/config content',
      `${r.status}, ${ct(r)}, shell=${isShell(r)}, secret/config content=${leaked}`, !leaked && (r.status === 404 || isShell(r)));
  }

  // ---- TTFB ----
  const t: number[] = [];
  for (let i = 0; i < 10; i++) t.push((await get(`${BASE}/`, { enc: 'br, gzip' })).ttfbMs);
  const s = [...t].sort((a, b) => a - b);
  const pct = (p: number) => s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
  add('Performance', 'index TTFB over 10 cold-connection runs (p50/p95)', 'NFR-001, NFR-003', 'p50 < 800 ms, p95 < 1500 ms (incl. DNS+TCP+TLS from the test laptop)',
    `p50 ${pct(50).toFixed(0)} ms, p95 ${pct(95).toFixed(0)} ms, min ${s[0].toFixed(0)}, max ${s[s.length - 1].toFixed(0)} (runs: ${t.map(x => x.toFixed(0)).join(', ')})`, pct(50) < 800 && pct(95) < 1500);

  // ---- Write results ----
  const pass = cases.filter(c => c.result === 'pass').length;
  const out = { suite: 'live-static', server: 'live (production)', ranAt: new Date().toISOString(), totals: { cases: cases.length, pass, fail: cases.length - pass }, cases };
  const dir = join(dirname(fileURLToPath(import.meta.url)), 'results');
  mkdirSync(dir, { recursive: true });
  const scrub = (x: string) => x.split(HOST).join('<host>');
  writeFileSync(join(dir, 'live-static.json'), scrub(JSON.stringify(out, null, 2)) + '\n');
  const esc = (x: string) => x.replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const md = [
    '# E2E: live static site / PWA (read-only)', '',
    `- server: live (production)`, `- ran: ${out.ranAt}`, `- method: GET only, raw HTTPS from the test laptop; no sign-ups, no writes`,
    `- totals: ${cases.length} cases, ${pass} pass, ${cases.length - pass} fail`, '',
    '| ID | Area | Title | Trace | Expected | Actual | Result |', '|---|---|---|---|---|---|---|',
    ...cases.map(c => `| ${c.id} | ${c.area} | ${esc(c.title)} | ${c.trace} | ${esc(c.expected)} | ${esc(c.actual)} | ${c.result.toUpperCase()} |`), '',
  ].join('\n');
  writeFileSync(join(dir, 'live-static.md'), scrub(md));
  for (const c of cases) console.log(`${c.result === 'pass' ? 'PASS' : 'FAIL'} ${c.id} ${c.title} :: ${scrub(c.actual)}`);
  console.log(`\n${pass}/${cases.length} pass`);
}

main().catch(e => { console.error(e); process.exit(1); });
