# ZedPath — work log

## Current state (update at end of every session)
- **Date:** 2026-10-05
- **Cloudflare:** pinned to **Stacklineops@gmail.com's Account** (`e6474e41...`). LIVE at
  https://zedpath.teamkestrel.workers.dev = version 8250b923 (design v2, commit 2e1d84f). Previous: c7113216
  (walking skeleton), the rollback target. No D1/KV/R2/other resources created yet.
- **GitHub:** https://github.com/PraveenBanneka/zedpath (PUBLIC, branch `main`). Leak scanner on every push.
- **Code:** onboarding (welcome, intro, 5 steps incl. beyond grades) -> Paths home (ring + 7 other-path groups,
  52 routes, open-now) -> courses by band -> degree details (cut-off chart) -> hidden; Me; installable PWA.
  Design v2 (Outfit + Inter, aurora hero, motion). Client JS 127 KB gzip (NFR-006 budget 200 KB still met).
- **Docs:** 00-04 approved v1.0; 05 Data Design v0.9. Next: 06 Architecture, 07 UI/UX, 08 Test Plan; SRS v1.1
  for new stories (beyond grades, other paths, BR-044, student accounts).
- **Next step:** student accounts (design on paper first, see 2026-10-05 entry)
  -> full deck feature set (list, journey + reminders, compare, Ask, gazette pipeline, Sinhala/Tamil).
- **Deadlines:** Tuesday 6 Oct progress review · Gate 3 final submission 11 Oct (demo video <= 4 min).
- **Waiting on Praveen:** decision on how students sign in · Gemini key into .dev.vars /
  `wrangler secret put` (by Praveen, never pasted in chat).

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
