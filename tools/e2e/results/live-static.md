# E2E: live static site / PWA (read-only)

- server: live (production)
- ran: 2026-10-11T18:37:35.493Z
- method: GET only, raw HTTPS from the test laptop; no sign-ups, no writes
- totals: 38 cases, 35 pass, 3 fail

| ID | Area | Title | Trace | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| E2E-STATIC-001 | Shell | index.html returns 200 text/html | NFR-063 | 200, text/html | 200, text/html | PASS |
| E2E-STATIC-002 | Shell | charset and viewport meta present | NFR-025 | meta charset=utf-8 and viewport with width=device-width | charset=true, viewport="width=device-width, initial-scale=1, viewport-fit=cover" | PASS |
| E2E-STATIC-003 | Shell | document title set | n/a | non-empty <title> mentioning ZedPath | "ZedPath" | PASS |
| E2E-STATIC-004 | PWA | index links the web manifest | NFR-063 | <link rel="manifest"> in index.html | present | PASS |
| E2E-STATIC-005 | Caching | HTML cache-control forces revalidation | NFR-001 | no-cache / max-age=0 / must-revalidate (new deploys seen at once) | cache-control: public, max-age=0, must-revalidate; etag: (none) | PASS |
| E2E-STATIC-006 | Bundle | entry script is a hashed /assets/ file | n/a | one <script type=module src=/assets/<name>-<hash>.js> | scripts=["/assets/index-CnwVxMJ1.js"], modulepreload=0, css=["/assets/index-X5nxDzOi.css"] | PASS |
| E2E-STATIC-007 | Bundle | main JS 200 with JavaScript content-type | n/a | 200, text/javascript or application/javascript | 200, text/javascript | PASS |
| E2E-STATIC-008 | Caching | hashed /assets/* JS has a long cache | NFR-001, NFR-011 | max-age >= 1 year (31536000) and/or immutable | cache-control: public, max-age=0, must-revalidate | FAIL |
| E2E-STATIC-009 | Performance | main JS compressed transfer < 350 KB (task budget) | NFR-001 | < 350 KB compressed | raw 683.1 KB; br 193.6 KB; gzip 190.9 KB | PASS |
| E2E-STATIC-010 | Performance | main JS compressed transfer <= 200 KB (SRS NFR-006) | NFR-006 | <= 200 KB compressed (SRS budget, stricter than the task budget) | smallest compressed transfer 190.9 KB | PASS |
| E2E-STATIC-011 | Bundle | CSS bundle reachable, size recorded | NFR-001 | 200 text/css (or inlined), compressed size recorded | 200, text/css, raw 38.9 KB, transfer 9.3 KB (br) | PASS |
| E2E-STATIC-012 | Caching | hashed CSS has a long cache | NFR-001 | max-age >= 31536000 and/or immutable | cache-control: public, max-age=0, must-revalidate | FAIL |
| E2E-STATIC-013 | Security | no source maps published | NFR-033 | no sourceMappingURL in bundle; <main>.js.map not served as a map | sourceMappingURL in bundle: false; .map -> 200 text/html | PASS |
| E2E-STATIC-014 | Security | no secret-looking strings in shipped JS ('AIza', 'sk-ant', 'ghp_', 'BEGIN PRIVATE KEY') | NFR-033 | 0 matches | 0 matches in 1 file(s) | PASS |
| E2E-STATIC-015 | Features | team line text in live bundle | n/a | contains "Team Kestrel" and "Undergraduate bracket" | Team Kestrel: true; Undergraduate bracket: true (scanned 1 JS files) | PASS |
| E2E-STATIC-016 | Features | demo mode marker in live bundle | n/a | contains 'demo=kasun' (or the demo param + 'kasun') | demo=kasun literal: true; 'kasun': true | PASS |
| E2E-STATIC-017 | Features | Ask suggestion text in live bundle | n/a | contains "When do UGC applications usually open?" and the aptitude suggestion | UGC suggestion: true; aptitude suggestion: true | PASS |
| E2E-STATIC-018 | PWA | manifest.webmanifest is valid JSON | NFR-063 | 200, parses as JSON, manifest content-type | 200, application/manifest+json, JSON valid | PASS |
| E2E-STATIC-019 | PWA | manifest has name, icons, start_url, display | NFR-063 | name, icons[192 & 512], start_url, display set | name="ZedPath: everything after A/Ls", start_url="/?source=pwa", display="standalone", icons=192x192,512x512,512x512,any,512x512 | PASS |
| E2E-STATIC-020 | PWA | icon 192x192 reachable | NFR-063 | 200 image/png with PNG signature | /icons/icon-192.png -> 200, image/png, 3.9 KB, PNG signature true | PASS |
| E2E-STATIC-021 | PWA | icon 512x512 reachable | NFR-063 | 200 image/png with PNG signature | /icons/icon-512.png -> 200, image/png, 12.0 KB, PNG signature true | PASS |
| E2E-STATIC-022 | PWA | service worker sw.js reachable as JavaScript | NFR-063 | 200, JavaScript content-type, not the SPA HTML shell | 200, text/javascript, 2.0 KB, html-shell=false | PASS |
| E2E-STATIC-023 | Caching | sw.js is not long-cached | NFR-063 | cache-control allows revalidation (so SW updates land) | cache-control: public, max-age=0, must-revalidate | PASS |
| E2E-STATIC-024 | PWA | app registers the service worker | NFR-063 | bundle or index references 'sw.js' (serviceWorker.register) | sw.js referenced: true; serviceWorker in bundle: true | PASS |
| E2E-STATIC-025 | Assets | all 12 avatars /avatars/a01..a12.svg are 200 image/svg+xml | n/a | 12 of 12 OK | 12 of 12 OK | PASS |
| E2E-STATIC-026 | Assets | favicon reachable | n/a | 200 image/* | /favicon.svg -> 200, image/svg+xml | PASS |
| E2E-STATIC-027 | Routing | SPA deep link /#/paths serves the app shell | NFR-012 | 200 text/html with the same shell (root div + module script) | 200, text/html, shell=true (hash route: fragment never reaches the server) | PASS |
| E2E-STATIC-028 | Routing | SPA deep link /paths serves the app shell | NFR-012 | 200 text/html with the same shell (root div + module script) | 200, text/html, shell=true | PASS |
| E2E-STATIC-029 | Routing | SPA deep link /ask serves the app shell | NFR-012 | 200 text/html with the same shell (root div + module script) | 200, text/html, shell=true | PASS |
| E2E-STATIC-030 | Routing | SPA deep link /profile/settings serves the app shell | NFR-012 | 200 text/html with the same shell (root div + module script) | 200, text/html, shell=true | PASS |
| E2E-STATIC-031 | Routing | missing hashed asset is not served as valid JS | n/a | 404 (preferred), never 200 JavaScript | 200, text/html, shell=true (note: 200 HTML shell for a missing script is SPA fallback; a stale tab would get a MIME error rather than a clean 404) | PASS |
| E2E-STATIC-032 | Security | plain HTTP redirects to HTTPS | n/a | 301/302/307/308 with Location https:// | 200, location (none) | FAIL |
| E2E-STATIC-033 | Security | GET /.env does not expose project files | NFR-033 | 404, or the SPA shell with no secret/config content | 200, text/html, shell=true, secret/config content=false | PASS |
| E2E-STATIC-034 | Security | GET /.dev.vars does not expose project files | NFR-033 | 404, or the SPA shell with no secret/config content | 200, text/html, shell=true, secret/config content=false | PASS |
| E2E-STATIC-035 | Security | GET /wrangler.jsonc does not expose project files | NFR-033 | 404, or the SPA shell with no secret/config content | 200, text/html, shell=true, secret/config content=false | PASS |
| E2E-STATIC-036 | Security | GET /.git/config does not expose project files | NFR-033 | 404, or the SPA shell with no secret/config content | 200, text/html, shell=true, secret/config content=false | PASS |
| E2E-STATIC-037 | Security | GET /package.json does not expose project files | NFR-033 | 404, or the SPA shell with no secret/config content | 200, text/html, shell=true, secret/config content=false | PASS |
| E2E-STATIC-038 | Performance | index TTFB over 10 cold-connection runs (p50/p95) | NFR-001, NFR-003 | p50 < 800 ms, p95 < 1500 ms (incl. DNS+TCP+TLS from the test laptop) | p50 413 ms, p95 609 ms, min 324, max 609 (runs: 421, 397, 333, 413, 412, 437, 609, 324, 458, 456) | PASS |
