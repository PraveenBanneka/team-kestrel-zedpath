# Ask ZedPath e2e results (worker/ask.e2e.test.ts)

Run: `npx vitest run worker/ask.e2e.test.ts` on 2026-10-12 (vitest 4.1.11). No network: Workers AI, Vectorize and the
model gateway are stand-ins; global `fetch` throws if called. No app code changed.

| Area | Cases | Pass | Fail |
|---|---|---|---|
| takeVerdict (YES/NO/DEPENDS/NOT_FOUND/NONE/garbage/lowercase/missing) | ASK-001..008 | 8 | 0 |
| usableReply (leaked reasoning vs normal EN/SI/TA answers) | ASK-009..016 | 8 | 0 |
| layoutAnswer (bullets, wall of text, show-more split, citations) | ASK-017..022 | 6 | 0 |
| Citations, source mapping, safeUrl, provider name | ASK-023..029 | 7 | 0 |
| Question validation (empty, whitespace, QUESTION_MAX, non-string, bad JSON) | ASK-030..033 | 4 | 0 |
| Model fallback order, thought parts, 404 skip, 400 stop | ASK-034..039 | 6 | 0 |
| Daily allowance on the test D1 (device, IP, malformed id, cleanup) | ASK-040..043 | 4 | 0 |
| Suggested questions, 3 extra profiles (EN x2, TA) | ASK-044..046 | 3 | 0 |
| **Total** | **46** | **46** | **0** |

Duration 35.7 s (most of it module import/transform).

## Findings (behaviour pinned, not failures)
1. **safeUrl accepts https only.** `http:` is refused as well as `javascript:`/`data:`/`ftp:`. It does **not** enforce
   official domains (`https://example.com/x` passes, ASK-028); domain trust relies on the verified route data feeding it.
2. **usableReply is strict.** A genuine answer containing "rule 3" (e.g. "Under rule 3 of the handbook") is rejected and
   the next model is asked (ASK-016). Harmless today (fallback), but a real handbook "rule N" phrase could exhaust all
   models and return 503.
3. **Show-more split** lives in `src/screens/Ask.tsx` (`SHOW = 4`, not exported); the test checks layoutAnswer returns all
   bullets so the screen can fold after 4, not the fold itself.
4. A 400 from the first model stops the fallback and the student sees 503 "busy" (ASK-038), by design.
