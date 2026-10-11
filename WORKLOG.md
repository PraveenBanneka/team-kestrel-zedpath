# ZedPath — work log

## Current state (update at end of every session)
- **Date:** 2026-10-11 (Gate 3 final submission day)
- **Cloudflare:** pinned to **Stacklineops@gmail.com's Account** (`e6474e41...`). LIVE at
  Live (workers.dev) = version **53572556** (ef419fb6 + personalised Ask suggestions). Rollback target ef419fb6 (code only).
  ZedPath's resources on that account (other projects must NEVER reuse these names or touch them):
  Worker `zedpath` · D1 `zedpath` (59e854ed...) · Vectorize `zedpath-ask` · AI Gateway `zedpath` · Rate-limit
  namespaces 1001/1002 · secrets GEMINI_API_KEY, PEPPER · workers.dev subdomain (shared by the account).
  Free-plan limits are per ACCOUNT, shared with any other project there (100k Worker requests/day, Workers AI 10k
  neurons/day, D1 5M reads/day...).
- **GitHub:** https://github.com/PraveenBanneka/team-kestrel-zedpath (renamed from `zedpath` 2026-10-06; PUBLIC, branch `main`). Leak scanner on every push.
- **Live features:** onboarding + beyond grades; results Safe/Likely/Reach; course pages with cut-off chart, syllabus
  (12 programmes) and "Explain this course"; hidden courses; 52 other paths; student accounts; Ask ZedPath (EN/SI/TA,
  cited, personal facts, model fallback); My list (order warnings, fix-the-order, copy Uni-Codes); Compare (3);
  PWA + Android APK 1.0.1 (TWA, native notification test). Tests 79/79.
- **Docs:** 00-04 approved v1.0; 05 Data Design v0.9 (revised for CR-001). Not yet: 06, 07, 08; SRS v1.1 (new stories:
  beyond grades, other paths, accounts, Ask, list, compare, syllabi, BR-044, NFR-030 wording).
- **Next (when ZedPath resumes):** deadlines/journey + calendar (.ics) reminders; Sinhala/Tamil UI text; weekly Gazette
  job-exam updates; application-steps guide (FR-307); Engineering syllabus (008G) + more programmes within the research
  safety protocol; Capacitor native app (option B) if wanted; docs 06-08 + SRS v1.1; Gate 3 demo video (Praveen).
- **Open with Praveen:** report the unsafe source host to Sri Lanka CERT|CC (his call); optional history rewrite to
  drop old addresses from commit e3dc863 (force push = GO).
- **Deadlines:** Gate 3 final submission 11 Oct (demo video <= 4 min).

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
- Deployed after GO: version c7113216 on workers.dev.
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

## 2026-10-05: Accounts LIVE (Praveen's GO)
- whoami = Stacklineops@gmail.com's Account e6474e41... Live before: 16feb5ec (Praveen's GEMINI_API_KEY secret
  change on top of 8250b923), which became the rollback target.
- `d1 create zedpath` -> 59e854ed-cf1b-4e32-8682-386b53a1e8ae (APAC). Wrangler offered to edit the config with a
  different binding name; declined (non-interactive) and the id was added by hand; account pin unchanged.
- `d1 migrations apply zedpath --remote`: 0001-0003 applied. Live check: 35 tables, 6/25/59 reference rows, 3 triggers.
- Deploy: exit 0, 54/54 tests, version **411b3b72-bdcc-46d6-98a2-a6ef5fd2451e**. Before the key existed the live
  safe default held: account routes 503, results unchanged (38/6/9).
- PEPPER generated with node crypto and piped into `secret put` (value never shown or stored elsewhere).
- Live E2E at 390 px, two browsers: sign-up 1.65 s (incl. PBKDF2), log-in on an empty browser 1.59 s with results and
  achievements restored, recovery issued a new code, no overflow. The scripted delete step did not run as intended
  (script steps, not the app); delete then done and screenshotted by hand on live: back to Welcome, phone cleared,
  /api/me 401, and all 8 account tables = 0 rows (net-zero).
- Found while re-running the script locally: salt + sign-up limited per IP alone (10/min) would block a school lab
  or home Wi-Fi. Fixed in 9770558 (per IP+username 10/min, per IP 100/min; classroom test; mutation-checked).
  Not live yet: ships with the next GO.

## 2026-10-05: Android APK 1.0.0 -> 1.0.1, deploy bd7a6d89 (Praveen's GO)
- Praveen asked for an APK. Built a Trusted Web Activity with Bubblewrap (JDK 17 + Android SDK 36 in
  %USERPROFILE%\.bubblewrap, outside the repo). Signing key in %USERPROFILE%\.zedpath-signing (DPAPI-encrypted
  password); fingerprint B6:3E:...:98:A8. Fixes on the way: Bubblewrap expects bin/ at the SDK root (junctions added);
  this session sets NoDefaultCurrentDirectoryInExePath=1, cleared for the build process only.
- 1.0.0 opened with a Chrome bar (Praveen's screenshot) because assetlinks.json was not yet deployed.
- Praveen asked "how do I know it is safe / what if it bricks my phone": showed permissions (none), components, the
  only URL, signer and SHA-256; uninstall removes it; Play Protect / VirusTotal / rebuild-from-repo as checks.
- GO (2nd message; "here my GO" was refused by the guard because GO must come first). Live before: da60b5ff.
  Deploy exit 0, 56/56 tests -> version **bd7a6d89-c2c8-4390-abf3-4e4889b694e5**: assetlinks.json (200,
  application/json, no redirect; Google's Digital Asset Links API returns the statement), monochrome icon, test
  notification button (exactly one notification, fixed tag), SW v2 with notificationclick, rate-limit fix (9770558).
- APK 1.0.1 (versionCode 2, notifications on, same key; new permission POST_NOTIFICATIONS only), sha256 1199a954...
  Sent to Praveen's phone. Vectorize binding held back until the Ask index exists.

## 2026-10-05: Ask ZedPath LIVE (Praveen's GO)
- Praveen: "GO GO GO, don't ask for more goes, make all the AI features". (The guard later blocked once because an
  automatic "user hasn't heard from you" note counted as the latest message; a fresh "GO" cleared it. Fail-safe kept.)
- Corpus: 520 handbook passages (193 pages, printed page numbers) + 52 verified routes. Embedded with Workers AI bge-m3
  via a localhost-only dev route; Vectorize index `zedpath-ask` (1024, cosine) created and loaded (572 vectors).
- Retrieval calibrated on evidence (tools/ask/calibrate.ts): right page rank 1 for English and Tamil, rank 5 for
  Sinhala (0.551); off-topic max 0.474 -> MIN_SCORE 0.50.
- /api/ask: engine facts from the SAME assessOffering as /results (refactor pinned by a byte-exact test); model via AI
  Gateway `zedpath` (logs OFF to keep the "results not kept" promise; cache ON); never named; 30/day per device, 300
  per network, stored as daily-salted hashes (migration 0004, applied live).
- Live test found: gemini-flash-latest 503 "high demand", gemini-2.5-flash retired (404). Fixed with model fallback
  (flash-latest -> 2.5-flash -> flash-lite-latest -> 2.5-flash-lite on 404/429/5xx) + upstream error logging.
  After fix 6/6 live questions answered: English, personal (Computer Science chances match the results screen),
  Sinhala and Tamil answered in those languages citing p.50, off-topic -> honest "not found".
- Versions: f0d5b4e8 -> 9b93fa91 (logging) -> 5f096264 (fallback) -> 76c2856a (all places listed) -> next (tidy names).
  Screenshots + test run sent to Praveen's phone.

## 2026-10-05: My list, Compare, degree syllabi LIVE (Praveen's GO) + an unsafe source host
- Live before: bd923072. Deploy exit 0, 79/79 tests -> version **c221ddfc-e98d-4c4f-89b5-513b4868789a**.
- My list (US-301..303: order warnings BR-041/042, fix-the-order with confirm, copy Uni-Codes, drag handle on the
  right per Praveen, keyboard reorder on the handle), Compare (up to 3 courses), syllabi for 12 programmes from
  official university sources (0 Firecrawl credits; Law spot-check 30/32 verbatim, 2 paraphrases fixed).
  Live check: 026G 41 modules (uom.lk), 001A 55 (med.cmb.ac.lk); ETag now carries a syllabus-data fingerprint.
- One source host (see BLOCKED_HOSTS in worker/syllabi.ts) returned unsafe content during research. Never served
  or linked (tested); its page addresses removed from the public data file (89c841c, + test). Details given to
  Praveen privately; reporting to Sri Lanka CERT|CC is his decision. No copies were saved on disk.
  Praveen: "Do not visit it again" -> rule added to CLAUDE.md.

## 2026-10-05 (night): native Android app (Capacitor) built and sent
- Praveen: "make the proper native android apk" (option B). native/ = Capacitor 8.5 project, package
  com.teamkestrel.zedpath 1.1.0 (versionCode 3), API 36, plugins LocalNotifications/App/SplashScreen/StatusBar,
  loads the live site (web deploys update it), offline page in the APK, icons/splash generated from the logo.
- Built with JDK 21 (downloaded to %USERPROFILE%\.bubblewrap\jdk21) + Gradle 8.14.3: APK 3.4 MB, AAB 3.2 MB,
  apksigner verifies (v2), cert b63eec...98a8 (same key as the TWA). Permissions: INTERNET, POST_NOTIFICATIONS,
  RECEIVE_BOOT_COMPLETED, WAKE_LOCK, SCHEDULE_EXACT_ALARM (from the notifications plugin). Sent to Praveen (b38b9c9).
- src/notify.ts now posts a real native notification inside the app (7d041dc). NOT LIVE: Praveen's message
  "here u have the GO" did not start with GO, so the guard blocked deploys; the in-app test button appears after the
  next deploy (needs a message starting with GO). Praveen uninstalled the TWA + PWA and installs 1.1.0 fresh.
- Play Store notes for later: $25 account (Praveen), privacy policy + data safety, 12 testers x 14 days for new
  personal accounts before public release; internal testing link is possible immediately.
- GO (Praveen): deploy exit 0, 83/83 tests -> version **8e90be0e-c9e4-49d3-871d-3c6051b31532** (live before c221ddfc).
  Native notification code live: bundle index-CmKGXida.js contains it, served at /?source=android-app. Right after
  the deploy plain "/" briefly came from Cloudflare's edge cache (CF-Cache-Status HIT, old bundle); a cache-busted
  request showed the new one and both URLs served it within a minute.

## 2026-10-05 (late): exact-alarm fix, deploy 99da5707, app 1.1.1
- Praveen's test on 1.1.0: native notification worked, but Android showed ZedPath under "Alarms and reminders".
  Cause (plugin source): LocalNotifications defaults isExactNotification=true and opens
  ACTION_REQUEST_SCHEDULE_EXACT_ALARM when exact alarms are not granted.
- Fix (d798b6f): web passes isExactNotification:false (+ test); app 1.1.1 (versionCode 4) removes
  SCHEDULE_EXACT_ALARM / USE_EXACT_ALARM (also avoids Google Play's restricted-permission review).
- GO: deploy exit 0, 83/83 -> version **99da5707-8d9f-43cc-bd30-3358bc641d68** (live before 8e90be0e). Live bundle
  index-ByBJtb-u.js contains isExactNotification:!1 at the app's start URL. THEN 1.1.1 sent (apksigner verifies,
  cert b63eec...98a8; permissions INTERNET, POST_NOTIFICATIONS, WAKE_LOCK, RECEIVE_BOOT_COMPLETED).
- Praveen: "That's my first native app. Yey!"

## 2026-10-11: pipeline test deploy e2501c73 (Praveen's GO)
- Change: welcome-screen heading "ZedPath" -> "ZedPath." (src/screens/Onboarding.tsx), a visible marker to prove the
  build -> deploy -> live path still works after six days.
- Runbook: 83/83 tests, build green, marker found in the bundle; whoami = Stacklineops@gmail.com's Account
  (e6474e41...); GO; deployed version e2501c73-d7d6-450e-aa0e-76674175840a (previous 99da5707).
- Verified LIVE with a cache-busted fetch: the live page serves bundle index-CtopB9aI.js containing "ZedPath.";
  /api/health and /api/meta return 200.
- Rollback (needs GO): npx wrangler rollback 99da5707-8d9f-43cc-bd30-3358bc641d68
- Open: guard update for the repo rename is half-done and uncommitted (the permission system blocked my edits on
  2026-10-06). Pushes work; test-guard.sh still expects the old repo name.

## 2026-10-11: CR-002 live — Journey, Alerts, Groups, My list tab, Ask layout (Praveen's GO "all in one go")
- Asked for in Praveen's screen recording (Gate 1 mock-ups 4 to 9). Plan approved with: all five today, no SMS/email
  (no domain yet: Android reminders + calendar file), senior badge by invite codes, test dot removed.
- Design first: ZP-DOC-05 revised (CR-002 section + migration 0006 appendix). Data placed where each kind already
  lives: steps/notices in a bundled read model (quotes verified verbatim at build; mutation-checked); personal items on
  the phone; groups/invites/reports/blocks in D1 (0006, FKs + CHECKs + partial unique indexes + redemption trigger);
  messages in one GroupRoom Durable Object per group. Seniors reuse the existing SENIOR role. 0005 loads 121 courses
  and 20 institutions for the foreign keys.
- Tests: 126 (was 83). Local end-to-end on wrangler dev: two-user live chat, senior badge, invite reuse refused,
  moderation refused a harmful message, rate limit. Two real bugs found and fixed there: posts handled concurrently
  (second post skipped the rate limit and could overtake the first) -> posts now processed in order; non-ASCII
  header for the badge -> URI-encoded.
- LESSON: `wrangler dev` runs the BUILT copy (dist/zedpath) with the Vite plugin. Run `npm run build` before every
  local test, or you test old code (cost ~20 minutes today). Port 8787 was taken by other projects' dev servers: used 8899.
- Deploy runbook: whoami = ZedPath account; D1 backup first (C:/Users/prave/zedpath-backups/zedpath-before-0005-20261011.sql,
  97 rows); migrations 0005+0006 --remote; deploy version 3784f9c3-6b39-4451-af00-d2601900ec49.
- Verified LIVE: /api/journey (5 steps, 5 notices), /api/groups 401 without login, throwaway account joined group 012,
  posted over wss, message received; account deleted -> its message purged from the room (wipe path proven in prod).
  Live page serves the new bundle (index-BacDiSRm.js).
- Not done: Gemini not called (Praveen's instruction; Ask layout checked with a fixed sample answer). No senior invite
  created in production: Praveen chooses the senior (node tools/groups/make-invite.ts <Uni-Code> <year>, then the
  printed --remote command with GO). UGC site timed out twice, so no UGC dates: steps show the official rule instead.

## 2026-10-11 (later): search, Sinhala/Tamil, compulsory accounts (CR-003), Ask answer card (CR-004) live as e5e2d55b
- Search: subjects (About you) and courses (all bands), one tested matcher with short forms and Uni-Codes.
- Sinhala and Tamil: ~480 interface strings, dictionaries forced complete by TypeScript; test checks placeholders,
  bold tags and script. Translated by two parallel AI agents; marked in-app as AI translation pending native review.
  Official names and quotes stay in English as published.
- CR-003 (Praveen's decision): account required at start with full name, email, Sri Lankan mobile, birthday and
  consent; student_contact (0007) in its own table, not unique, not verified yet. README, business case, app privacy
  text, ZP-DOC-05 updated. Existing accounts complete their details on next open. Offline is never treated as no account.
- CR-004: Ask answer card (verdict, show more, source chips, ZedPath-built actions, follow-ups, feedback to
  answer_feedback 0008 with nothing identifying the student, app language sent with the question).
- Business case exported as ZedPath_Business_Case.docx (project folder, not committed; Downloads).
- Deploy: whoami ZedPath; D1 backup zedpath-before-0007-20261011.sql (241 rows); migrations 0007+0008 --remote;
  version e5e2d55b-2f5b-4e97-a073-adc29eea8111. Verified LIVE: sign-up without contact 400 (fullName), with contact 201,
  /me returns normalised contact, feedback validation 400, throwaway deleted 204, live bundle index-DHoca4ZP.js has
  Sinhala, Tamil and the Ask card. 152 tests.
- Open: guard repo-rename edit still uncommitted (needs Praveen's permission); Ask not exercised live (no Gemini calls,
  as asked); translations need a native-speaker check.

## 2026-10-11 (afternoon): video-2 fixes, CR-005 group rules — built and tested locally, NOT yet live
Praveen's walkthrough video (08:50) plus three messages ("remove the resit A/L option", "groups should have rules",
"WhatsApp-style groups"). Commits, each with tests:
- 239d548 "Name" label; "Sit the A/L again" tile removed; numbers on every cut-off chart point; Ask box pinned to the
  bottom; a new account goes straight to About you.
- 89e5166 Compare: every Compare button opens it; columns swipe (scroll-snap); "+" column on the right opens a picker
  (search your Safe/Likely/Reach courses, or My list).
- 9cb2337 Ask: route citations show the route's name (the index stored research notes such as "sources/ifsl_faq.html",
  which looked like broken links); links are https-only and space-escaped (safeUrl); handbook citations link the UGC
  handbook; "See it in ZedPath" opens the route page. Achievements/interests are sent with the question (validated by
  parseExtras, never stored); ZedPath's own special-intake rule (now shared/account.ts) becomes an engine fact, and the
  special-intake passage is retrieved too. Five demo suggestion chips. Both official PDFs checked to load via WebFetch.
- 894c631 Groups (CR-005): rules accepted before joining, server-enforced (join 400 without the current version; live
  room 403 for a member whose group_member.rules_version is not current; migration 0009 adds that column + CHECK);
  phone numbers and emails refused in messages; popular groups (001 008 012 016 018 025); labelled sample conversations
  (shared/group-samples.ts, read-model, not stored, cannot be reported); WhatsApp-style list, room, bubbles, composer.
- 79beb09 Journey: checklist of the student's own next steps (results, list, compare, aptitude tests, deadlines, apply
  to the UGC with its handbook quote) replaces the UGC step list. Notification settings in Me (7-day / 1-day reminders,
  8 am / 6 pm, bell count), on this phone; defaults = previous behaviour (pinned by tests).
- Docs: ZP-DOC-05 CR-005 section + appendix (migration 0009), docx/pdf rebuilt. README tests 164.
- Verified: tsc clean, 164/164 tests; local build clicked through at 390x844 (groups, rules, room, journey, me, compare,
  course chart, ask). Ask was NOT called against Gemini (quota rule).
- To go live (needs Praveen's GO): D1 backup, then migration 0009 on the live database (it only ADDS a nullable column),
  then the new version. Reversal: roll back to e5e2d55b (the old code ignores the new column).

## 2026-10-11 (afternoon): 52b0e1af LIVE (Praveen's GO)
- whoami: Stacklineops@gmail.com's Account (e6474e41...). D1 backup C:/Users/prave/zedpath-backups/zedpath-before-0009-20261011.sql
  (257 rows) -> migration 0009 applied remotely -> deploy, version **52b0e1af-cd75-4944-9139-55b54001f1ee**.
- Live checks (throwaway account, deleted after): sign-up 201; popular groups listed; join without rules 400, with rules
  200 + rulesAccepted; bundle has the rules sheet, Compare "+", Journey checklist, notification settings.
- Gate 3 documents committed (df714c2): business case v2 (9 pages), AI Usage Report (2 pages), demo script.

## 2026-10-11 (midday): 6cbd4cbe LIVE (Praveen's GO) + Gate 3 documents
- whoami ZedPath account; no migrations pending; 164/164 tests; deploy -> version **6cbd4cbe-7a69-4183-8e81-cff9599e4274**.
- Live check (throwaway account, deleted): Physical Science group (013) history = 5 labelled sample messages incl. the hostel Q&A.
- Gate 3 files committed: Kestrel_Business_Case_Document (final, Praveen's edits + layout fixes), ZedPath_Presentation.pdf,
  Kestrel_AI_Usage_Report.pdf, Kestrel_Declaration (sign before upload), ZedPath_Demo_Script.md (Kurunegala PhysSci student).

## 2026-10-11: 8daa557b LIVE (Praveen's GO): test-notification button removed from Me; live bundle checked (button code gone).

## 2026-10-11: d6323d59 LIVE (Praveen's GO): Courses press-and-hold multi-select -> Add to my list (addManyToList, tested); 165/165; live bundle checked.

## 2026-10-11 (afternoon): f589f1a8 LIVE (Praveen's GO): CR-006 + Ask fixes + avatars
- whoami = ZedPath account (e6474e41...). Backup: C:/Users/prave/zedpath-backups/zedpath-before-0010-20261011.sql (56 KB).
- Remote D1: migration 0010 applied (255 offerings, group_rules_acceptance with 1 carried-over row, journey_course/notice/step).
  Expand-then-contract: group_member.rules_version kept but unused, so rolling back code to d6323d59 stays safe; a later migration drops it.
- Live check (throwaway account, deleted after): signup 201; journey empty; follow 136L + R043 204; tick RESULTS 204; tick UGC_APPLY 409
  (not open yet); avatar a05 200, bad avatar 400; DELETE /me 204 and journey rows cascaded to 0. Avatars a01/a12 served as SVG; /api/me/journey 401 without session.
- Tests 179/179, tsc -b clean. Docs 01-04 at 2.0 (draft) awaiting approval; ZP-DOC-05 updated for 0010.

## 2026-10-11 (evening): 40628ac5 LIVE (Praveen's GO): Back from Create account returns to Welcome (onboarded set only after sign-up/log-in); Welcome team line "Team Kestrel · Undergraduate bracket · IntelliCon '26" (en/si/ta). 179/179. Live check in a fresh browser: team line shown; English > Skip > signup > Back lands on Welcome.

## 2026-10-11 (evening): ef419fb6 LIVE (Praveen's GO): Back on Create account / Log in while logged out clears the onboarded flag and opens Welcome. 40628ac5 missed phones that still had the old flag (my live check used a fresh browser; lesson: test the user's actual state). Live check with the old flag set: signup > Back lands on Welcome.

## 2026-10-11 (evening): demo account + 53572556 LIVE (Praveen's GO)
- Demo account kasun_demo (sample student Kasun Perera, placeholder contact) created on live with tools/demo-account.ts (same sign-up API and PBKDF2 as the app); login checked (200, profile and extras back).
- Ask suggestions built from the student's own details (src/ask-suggest.ts): chances, best achievement vs the Reach course in the list, interests, aptitude test, student loan; en/si/ta; 183/183.
- Live check: logged in as kasun_demo with Physical Science Colombo in the list; Ask shows the five questions exactly.
