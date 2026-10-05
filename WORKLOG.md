# ZedPath — work log

## Current state (update at end of every session)
- **Date:** 2026-10-05
- **Cloudflare:** wrangler logged into **Stacklineops@gmail.com's Account** (`e6474e41...`), pinned in
  `wrangler.jsonc`. Nothing deployed, nothing created. (Salon folder deploys will now fail on its own
  pin until Praveen logs wrangler back into the salon account there; that is the safety working.)
- **GitHub:** https://github.com/PraveenBanneka/zedpath (PUBLIC, branch `main`). Leak scanner on every push.
- **Code:** no app code yet (documentation first, by Praveen's direction). README, rules, guards in place.
- **Docs:** 00, 01, 02, 04 at v0.9 (in review, awaiting Praveen's approval). 03 SRS drafted, business rules
  pending the handbook analysis. 05–08 next, in order.
- **Next step:** finish ZP-DOC-03 business rules from the handbook → ZP-DOC-05 Data Design (EER → relational →
  normalisation → D1 DDL, using the real 2025/26 cut-off data) → 06 Architecture → 07 UI/UX → 08 Test Plan
  → then the walking skeleton (US-101 → US-201 → US-203 → US-204).
- **Deadlines:** Tuesday 6 Oct progress review · Gate 3 final submission 11 Oct (demo video ≤ 4 min).
- **Open questions for Praveen:** Gate 1 PDF in the repo or not? · licence (none yet = all rights reserved)
  · Gate 2 (due 3 Oct) submitted?

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
