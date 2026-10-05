# ZedPath — work log

## Current state (update at end of every session)
- **Date:** 2026-10-05
- **Cloudflare:** pinned to **Stacklineops@gmail.com's Account** (`e6474e41...`). LIVE at
  https://zedpath.teamkestrel.workers.dev = version 8250b923 (design v2) + a newer version created by Praveen's
  `secret put GEMINI_API_KEY` (id not yet logged; read it with `versions list` at the next GO). Rollback target
  c7113216. Secrets: GEMINI_API_KEY (live). No D1/KV/R2 resources created yet.
- **GitHub:** https://github.com/PraveenBanneka/zedpath (PUBLIC, branch `main`). Leak scanner on every push.
- **Code:** onboarding -> Paths -> courses -> degree details -> hidden; other paths; Me; installable PWA; design v2.
  **Student accounts (CR-001) built, tested, committed, NOT live:** username + password (PBKDF2 on the phone),
  recovery code, sessions, cross-device sync, delete account. Runs locally on a local D1 copy.
  Schema: 35 tables / 190 columns / 52 FKs. Tests: 54/54. Client JS 131 KB gzip (NFR-006 200 KB met).
- **Docs:** 00-04 approved v1.0; 05 Data Design v0.9 (revised in review for CR-001, 33 pages). Next: 06, 07, 08;
  SRS v1.1 (beyond grades, other paths, BR-044, CR-001 accounts, NFR-030 wording).
- **Next step:** Praveen's GO for the accounts go-live batch (below) -> Ask ZedPath (cited answers, never named
  "Gemini") -> reminders -> narrated guide video (voice: Ava; rules in video/LESSONS.md).
- **Deadlines:** Tuesday 6 Oct progress review · Gate 3 final submission 11 Oct (demo video <= 4 min).
- **Waiting on Praveen:** ONE GO for the accounts go-live batch. Google sign-in comes later (Praveen 2026-10-05).

### Accounts go-live batch (needs one GO; reversal written first)
1. `npx wrangler whoami` -> must be e6474e41... (not salon).
2. `npx wrangler d1 create zedpath` -> copy the printed database_id into wrangler.jsonc (replacing the zeros).
3. `npx wrangler d1 migrations apply zedpath --remote` -> 0001, 0002, 0003.
4. `npm run deploy` -> note version id. Accounts answer 503 until step 5 (safe default; rest of the app unchanged).
5. PEPPER secret, generated and piped so the value is never shown:
   `node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" | npx wrangler secret put PEPPER`.
   PEPPER must never change afterwards (stored salts keep old accounts working even if it did, but do not rely on it).
6. Verify LIVE: sign-up -> /me -> log in on a second browser -> delete the test account (net-zero) -> health.
Reversal: `wrangler rollback 8250b923` (accounts code gone, D1 untouched); if needed `wrangler d1 delete zedpath`
(GO-gated) once no real student has an account. Nothing else (DNS, other Workers) is touched.

---

## 2026-10-05: Day one setup
- Read the concept artifact (33 screens) and the Gate 1 deck (16 pages) to understand the product.
- Ran Cloudflare's official agent setup (developers.cloudflare.com/agent-setup/prompt.md), Claude Code path:
  - `claude plugin marketplace add cloudflare/skills --scope project`
  - `claude plugin install cloudflare@cloudflare --scope project`
  - Chose **project scope** (not the default user scope) so the plugin only loads in ZedPath, never in
    the salon folder. Declared in `.claude/settings.json`.
  - Skipped the optional `cf` CLI: it wants a global CLAUDE.md edit and its own account login.
- `npx wrangler whoami` → **salon account** `c5cbb437...` (expected: Praveen hasn't
  switched yet). Did NOT deploy or create anything. Rule 3 respected.
- Created `CLAUDE.md` (rules 1–7, environment map, deploy runbook), this `WORKLOG.md`, `.gitignore`.
- Built `.claude/hooks/zedpath-guard.js` + `test-guard.sh`: 23/23 tests pass. Proven live: it blocked
  one of Claude's own test commands because the command text contained the salon folder path.
- Did not copy the salon "framework pack" (SDLC.md etc.): rule 1 forbids opening that folder.
  Wrote the guard fresh instead.

## 2026-10-05: Public GitHub repo (rules 8 + 9)
- Praveen: use GitHub `PraveenBanneka`, ONE new PUBLIC repo for this project only; never touch other
  repos; never copy from the salon folder. Also: build the whole product, not just the Gate 2 minimum.
- Leak check before going public: the first commit contained the full salon account ID (guard,
  CLAUDE.md, WORKLOG). Replaced it with a SHA-256 fingerprint in the guard; docs keep only the
  `c5cbb437...` prefix. Rewrote the single unpushed local commit so history never had it.
- Commit identity for this repo set to GitHub's no-reply address (the real email is private on GitHub).
- Gate 1 PDF kept out of the public repo (gitignored), pending Praveen's call.
- Guard extended for rule 8 (gh repo create/edit/delete, gh api writes, remotes, pushes, force-push):
  36/36 tests pass. Real salon ID still blocked via fingerprint (checked separately, outside the repo).
- Added `.githooks/pre-push` leak scanner (keys, tokens, .env/.dev.vars, salon ID) for every push.
- Added README.md (problem, features, architecture diagram, stack, roadmap, trust rules, status).

## 2026-10-05: ZedPath Cloudflare account connected + pinned (rule 2)
- Praveen ran `npx wrangler login` himself, in a separate Chrome profile; consent page showed
  stacklineops@gmail.com / "Stacklineops@gmail.com's Account" (screenshot checked before Authorize).
- `npx wrangler whoami` → Stacklineops@gmail.com's Account, `e6474e41044c5722ad57c3372ab7492e`. Not salon.
- Created `wrangler.jsonc` with that `account_id` pinned. Guard tightened from "not the salon account"
  to "exactly this account": 40/40 tests (new: 3rd-account pin + GO → blocked).
- Verified: live deploy attempt blocked for missing GO only; `wrangler d1 list` (read-only) ran against
  the pinned account without error (no databases yet).

## 2026-10-05: Documentation-first, company grade (Praveen's direction)
- Praveen: document first in the standard SE order (user stories → ... → EER/schemas), every doc as .docx and
  .pdf, highest professional standard; commit step by step; TypeScript everywhere; Material Design UI via
  ui-ux-pro-max; use the CF free plan fully within limits ("surprise the AWS guys").
- Researched CF free-plan limits from developers.cloudflare.com (subagent, 44 sources). Key: 10 ms CPU per
  request (SSR typically 10–20 ms → Next.js risks Error 1102), 100k req/day, static assets free, no outbound
  email on Free, Queues free since 2026-02-04. Recommendation: Vite + React SPA + Hono in one Worker (ADR in ZP-DOC-06).
- Built docs toolchain `docs/_build/build.ts` (TypeScript on Node 25): Markdown → DOCX (docx-js) → PDF (Word);
  PlantUML diagrams (Chen EER, UML, C4) with no Graphviz. Company layout: cover, document control, revision
  history, approval table, numbered sections/appendices, captions + lists of figures/tables.
- Written + committed (each its own commit): ZP-DOC-02 User Stories (50 stories, 176 pts, 74 ACs; totals
  verified by script), ZP-DOC-00 Documentation Standard, ZP-DOC-01 Vision and Scope, ZP-DOC-04 Use Case Model
  (18 UCs; coverage of all 78 FRs verified by script). ZP-DOC-03 SRS drafted (78 FR, 32 NFR); business-rules
  section waits for the handbook analysis.
- Praveen added the official UGC handbook 2025/26 (210 pp) and cut-off table 2025/26 (10 pp) at project root;
  gitignored (not redistributed). Cut-off table parsed: 260 offerings × 25 districts = 6,500 cells, verified by
  two extraction methods (0 mismatches) + 14 visual spot checks. No uni-codes in the COP (come from handbook).

## 2026-10-05: Walking skeleton working locally on real data; ready for first deploy (awaiting GO)
- Docs 00-04 approved v1.0 (tagged); 05 Data Design v0.9 committed. Schema validated on five years of official data.
- Course rules: two independent encodings compared over 40.4M student cases: 116/121 identical, 5 resolved against
  the handbook (data/rules/RECONCILIATION.md); new policy BR-044 (inclusive reading + confirm on the UGC form).
- App (React + Hono on Workers): About you -> Your paths -> courses by band -> Degree details -> why hidden; deck-style
  UI, fewer boxes, plain-language Needs. 32 unit tests. Client 74.6 KB gzip; Worker 129 KB gzip; zero DB reads/request.
- Safety incident (no harm): package.json "type": "module" silently broke the CommonJS guard for ~1 h (exit 1 is
  non-blocking). Fixed: .cjs + fail-closed hook (`|| exit 2`); 40/40 guard tests; a simulated crash now blocks.
- Pre-deploy check: whoami = Stacklineops@gmail.com's Account e6474e41... (not salon); generated deploy config keeps the pin.
- Reversal plan for the first deploy: there is no previous version. If anything is wrong, the Worker is removed with
  the (GO-gated) delete command, or a fixed version is deployed over it. No data or DNS is touched (workers.dev only).

## 2026-10-05: First deploy, app shell, design v2
- Deployed after GO: version c7113216 at https://zedpath.teamkestrel.workers.dev (subdomain "kestrel" was taken).
- App shell (77237b5): welcome + intro + one-question-per-screen onboarding, beyond grades (achievements ->
  special-intake hint, handbook p.166), 7 other-path groups from 52 official-source routes, PWA + logo.
- Praveen: "make it more stylish, students have 4G". Design v2: Outfit + Inter, aurora hero with Safe/Likely/Reach
  ring, bento tiles with icons and live "open" pills, list rows with band strips, cut-off line chart on each
  course, floating bottom nav, motion (respects reduced-motion). Checked at 390 px: no overflow, no errors.
- Size receipt: client JS 401.9 KB raw / 127.2 KB gzip, CSS 5.4 KB gzip -> NFR-006 (200 KB) still met; no CR needed.
- Guard note: a shell command that pushes AND contains any other URL (e.g. the live-site URL inside a worklog
  edit) is blocked by rule 8 (fail closed, by design). Keep the push as its own command; write files with the editor.
- Praveen asked for student registration (separate profiles for deadline reminders + personal paths). Needs a
  data design on paper + sign-in decision before any code (fundamentals rule); proposal sent, awaiting answer.
- Sent docs 00-05 PDFs to Praveen's phone.

## 2026-10-05: Deploy 2 - design v2 live
- Praveen: "GO". whoami = Stacklineops@gmail.com's Account e6474e41... (not salon); pin matches; tree clean; 32/32 tests.
- `npm run deploy` -> version **8250b923-e56a-4193-b1c2-55b3ad31ee64** (upload 1131.6 KiB / 141.2 KiB gzip, startup 3 ms).
- Verified LIVE at 390 px with a fresh browser session: full onboarding -> Paths (53 within reach: 38/6/9) ->
  courses -> degree details with cut-off chart -> job exams -> Me. No overflow, no error boundary, /api/health ok,
  live bundle = locally tested bundle (index-dsRHV32u.js).
- Rollback if needed: `wrangler rollback c7113216` (GO-gated).

## 2026-10-05: Student accounts (CR-001) built while Praveen napped
- Praveen: "oo accounts" (approved the on-paper design: username + password now, Google sign-in later).
- Data first: migration 0002 (reference data generated from the rulebook: 6 streams, 25 districts, 59 subjects) and
  0003 (STUDENT role via account rebuild; password_login, session, recovery_code, student_profile, student_subject,
  student_achievement, student_interest; cascades, CHECK enums, 4 indexes, 3 role triggers).
- API (worker/account.ts): salt / signup / login / recover / logout / logout-all, GET-PUT-DELETE /me. Password never
  reaches the server (PBKDF2-SHA256 600k on the phone; server stores SHA-256 of the key: ~microseconds of CPU).
  Sessions hashed; HttpOnly+Secure+SameSite=Lax cookie; cross-site writes refused; Workers Rate Limiting.
  Safe default: no DB/PEPPER -> 503 and the app behaves as before (pinned by a test).
- App: Create account / Log in / Reset with recovery code / Save your recovery code; Account card on Me; log-in link
  on Welcome. Sync with a pending-sync guard (wipe-bug check: an offline save is pushed, never overwritten).
  Me's privacy text now changes with account state (it would otherwise claim "only on this phone" falsely).
- Tests: 21 new (54/54 total). 4 planted security bugs each caught. Local Workers runtime + local D1: API smoke test
  and a two-browser E2E (sign-up 1.5 s incl. PBKDF2; log-in on an empty browser restored results + achievements).
- Found while testing: recovery codes contain O/I/B; typed 0/1/8 now read as those letters (+ test).
- Debugging drill applied: a "dead" 503 was an orphaned old dev server on :5173 (environment, not code).
- Docs: ZP-DOC-05 Section 2.5 + mapping + BCNF + security + evidence + Appendix B; generator now draws 1:1 correctly.
- Not done (needs Praveen): the GO batch above. Also open: SRS v1.1 change record.
