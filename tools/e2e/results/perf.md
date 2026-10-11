# Worker CPU budget check (in-process, laptop)

- **Test:** `worker/perf.e2e.test.ts`, 21 cases PERF-001 to PERF-021. Opt-in, so the normal `npm test` stays stable:
  `PERF=1 npx vitest run worker/perf.e2e.test.ts` (add `PERF_OUT=1` to write `perf.json`).
- **Measured:** 2026-10-12 (local time), 3 runs one after another. Node v25.9.0, Intel i5-13420H laptop, Windows 11.
- **Raw numbers:** `tools/e2e/results/perf.json` holds all 3 runs.
- **Budget:** Workers Free plan, 10 ms CPU per request. The test checks wall p95 < 10 ms (the stated gate) and
  CPU mean < 10 ms. Payload limits: results < 150 KB, course detail and meta < 50 KB, journey < 150 KB.

## How it was measured

| Item | Method |
|---|---|
| What runs | The real Hono app (`worker/index.ts`) through `app.request()`. The database is the test D1 (`node:sqlite` with the real migrations). Rate limiters let every request through. The GroupRoom Durable Object is a stub. **No AI calls**: Ask is not measured |
| Timing | 10 warm-up calls, then 3 rounds of 30 calls. Each timed span covers the request **plus reading the body**, so JSON encoding is counted. p50, p95 and max come from the round with the lowest p95 (best of 3) |
| CPU mean | `process.cpuUsage()` (user + system time) over all 90 timed calls, divided by 90. Windows updates process CPU time only about every 15.6 ms, so CPU can't be measured per call, only as an average. The average is accurate to about 0.2 ms |
| Heavy profiles | I tried every 3-subject combination of each stream's common subjects at Z = +3.0, all grade A, and kept the profile with the most eligible rows in each stream. BIO + CHEM + PHY (BIO stream) has the most: 121 rows |
| Signed-in state | The test student follows 20 courses and 10 notices and belongs to 30 course groups. 50 other members are spread across those groups |

## Results (3 runs, shown as run1 / run2 / run3, times in ms)

| ID | Endpoint | Wall p50 | Wall p95 | CPU mean | Payload | Wall p95 < 10 | CPU < 10 |
|---|---|---|---|---|---|---|---|
| PERF-001 | GET /meta | 0.48 / 0.56 / 0.54 | 0.88 / 3.34 / 9.78 | 0.5 / 0.2 / 0.5 | 6.0 KB | pass x3 (run3 only just) | pass |
| PERF-002 | GET /meta (304) | 0.13 / 0.13 / 0.16 | 0.26 / 0.72 / 5.51 | 0.2 / 0.5 / 0.7 | none | pass x3 | pass |
| PERF-003 | POST /results, heavy BIO (121 rows, 134 hidden) | 4.72 / 13.12 / 17.31 | 8.59 / 30.52 / 34.82 | **7.3 / 9.9 / 8.7** | 95.5 KB | **FAIL 2 of 3** | pass, but **at the limit** |
| PERF-004 | POST /results, heavy PHYS (89 rows) | 3.89 / 6.02 / 15.05 | 7.80 / 9.30 / 40.86 | 5.7 / 7.3 / 6.8 | 90.6 KB | **FAIL 1 of 3** | pass |
| PERF-005 | POST /results, heavy COMMERCE (73 rows) | 4.24 / 3.97 / 8.66 | 9.38 / 10.03 / 19.42 | 5.7 / 5.2 / 4.9 | 91.7 KB | **FAIL 2 of 3** | pass |
| PERF-006 | POST /results, heavy ARTS (48 rows) | 4.10 / 3.60 / 2.56 | 18.87 / 9.44 / 5.91 | 3.3 / 4.2 / 2.8 | 95.8 KB | **FAIL 1 of 3** | pass |
| PERF-007 | POST /results, pinned sample (PHYS / KUR) | 8.68 / 5.67 / 5.20 | 23.14 / 13.51 / 9.99 | 5.5 / 6.1 / 5.6 | 92.9 KB | **FAIL 2 of 3** | pass |
| PERF-008 | POST /results, invalid profile (400) | 0.22 / 0.18 / 0.15 | 9.80 / 0.38 / 0.29 | 0.4 / 0.2 / 0.4 | 71 B | pass x3 | pass |
| PERF-009 | GET /offerings/021L (split course, 10 history rows) | 0.38 / 0.31 / 0.36 | 17.79 / 2.02 / 1.31 | 0.9 / 0.5 / 0.3 | 3.3 KB | FAIL 1 of 3 (stall) | pass |
| PERF-010 | GET /offerings/012T (largest syllabus) | 0.36 / 0.28 / 0.24 | 9.58 / 1.73 / 0.52 | 0.2 | 5.1 KB | pass x3 | pass |
| PERF-011 | GET /offerings, slowest of all 255 | 0.23 / 0.17 / 0.29 | 5.88 / 0.22 / 2.78 | 0.3 to 0.9 | 1.9 KB | pass x3 | pass |
| PERF-012 | GET /offerings/999Z (404) | 0.14 / 0.12 / 0.19 | 3.74 / 0.15 / 7.13 | 0.2 or less | 28 B | pass x3 | pass |
| PERF-013 | GET /journey | 0.22 / 0.24 / 0.27 | 2.43 / 0.91 / 3.74 | 0.3 / 0.3 / 0.5 | 7.0 KB | pass x3 | pass |
| PERF-014 | GET /routes | 1.66 / 1.29 / 3.52 | 3.97 / 2.72 / 12.92 | 1.6 / 1.7 / 1.4 | **84.7 KB** | FAIL 1 of 3 | pass |
| PERF-015 | GET /me/journey (signed in) | 1.14 / 1.04 / 3.21 | 2.77 / 2.36 / 8.28 | 1.6 | 1.9 KB | pass x3 | pass |
| PERF-016 | GET /groups?courses= (30 codes) | 3.69 / 3.87 / 33.35 | 5.73 / 7.83 / 62.31 | 3.6 / 3.5 / 4.9 | 8.4 KB | FAIL 1 of 3 | pass |
| PERF-017 | GET /me | 1.56 / 1.55 / 11.84 | 3.49 / 25.29 / 36.87 | 1.9 / 2.4 / 2.8 | 323 B | FAIL 2 of 3 | pass |
| PERF-018 | POST /auth/signup (201, server part only) | 3.44 / 5.31 / 7.76 | 4.61 / 15.65 / 35.90 | 4.0 / 4.0 / 4.7 | 60 B | FAIL 2 of 3 | pass |
| PERF-019 | POST /auth/signup, invalid contact (400) | 0.27 / 0.44 / 0.41 | 0.48 / 1.46 / 4.03 | 0.3 / 1.0 / 0.5 | 55 B | pass x3 | pass |
| PERF-020 | POST /auth/salt | 4.68 / 8.39 / 4.02 | 11.29 / 18.33 / 8.83 | 0.5 / 1.0 / 1.0 | 72 B | FAIL 2 of 3 | pass |
| PERF-021 | GET /health | 0.09 / 0.09 / 0.10 | 1.30 / 0.42 / 0.22 | 0.2 | 100 B | pass x3 | pass |

Test outcome per run: run1 4 failed, run2 6 failed, run3 7 failed, out of 21. Every failure was a wall p95 failure.
**No CPU-mean check and no payload check failed in any run.**

## What this means

1. **The 10 ms budget is at risk only on POST /api/results.** The heaviest real profile (BIO + CHEM + PHY) uses
   **7.3 to 9.9 ms of CPU per request on average** on this laptop. Its wall p50 ranged from 4.7 to 17.3 ms. All of
   that time is synchronous JavaScript: the banding loop over 255 offerings, building the response and
   `JSON.stringify` of about 95 KB. The other streams use 3 to 7 ms. This route really is close to the limit.
2. **Every other route is far below the budget.** Bundled reads (meta, journey, course detail, syllabus) use less
   than 1 ms of CPU. Signed-in routes use 1.5 to 5 ms, and that figure includes running SQLite inside the test
   process (see the caveats).
3. **Most wall-p95 failures come from the shared machine, not the code.** During the runs, other processes kept
   the CPU at 36 to 62% load (several other node and esbuild processes). GET /health, which does almost nothing,
   still had single calls that took 9 to 11 ms. For DB-backed routes, the CPU means barely move between runs
   (for example GET /me: 1.9 / 2.4 / 2.8 ms) while wall p95 jumps from 3.5 to 36.9 ms. That pattern means the
   process was waiting for its turn on the CPU, not doing more work.
4. **POST /auth/salt is mostly waiting, not CPU.** Its wall p50 is 4 to 8 ms but its CPU mean is only 0.5 to
   1.0 ms. In Node, WebCrypto (HMAC, SHA-256) runs on a background thread pool, so each call adds wait time.
   Cloudflare does not count waiting towards the CPU limit.
5. **Payloads are within budget.** The results response is 91 to 96 KB against the 150 KB limit. About half of it
   is the `hidden` list: 134 to 207 courses, each carrying its full requirement quote. GET /routes is 85 KB, but
   the browser caches it for 300 seconds (`max-age=300`).

## Laptop vs Cloudflare (honest caveats)

- This is **wall time and process CPU under Node on a busy Windows laptop**. Cloudflare measures CPU time inside
  workerd (also V8), on different hardware. The numbers point in the right direction but are **not** the number
  Cloudflare bills or limits. The real check is the CPU time Cloudflare reports for the live Worker (dashboard
  metrics or `wrangler tail`). That needs the production Worker, so it is Praveen's call and was not done here.
- In this test, SQLite runs **inside the measured process**, so its query time counts as CPU. On Cloudflare, D1 is a
  separate service and waiting for it does not count towards the 10 ms. So the DB-backed rows above **overstate**
  real CPU use.
- WebCrypto runs on a background thread here, so its wall time includes waiting. On Workers, crypto time is CPU,
  but it is small: the CPU means above already include the thread-pool work.
- Not measured: Ask ZedPath (calls Gemini, Vectorize and Workers AI; AI waiting is I/O, not CPU), the GroupRoom
  Durable Object, and the client-side PBKDF2 (it runs on the phone, by design).

## Suggested follow-ups (not done: app code was not touched)

- POST /results: measure the CPU time Cloudflare reports for the BIO profile on the live Worker before the demo.
  If it is close to 10 ms, possible changes:
  - stop sending the full requirement quote with each hidden course (the course detail screen already has it);
  - pre-group the offerings by the subjects they need, so most non-eligible offerings are skipped quickly.
- Re-run this test on a quiet machine (close the other node and esbuild processes) to get cleaner wall-p95 numbers.
