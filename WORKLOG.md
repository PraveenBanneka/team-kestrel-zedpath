# ZedPath — work log

## Current state (update at end of every session)
- **Date:** 2026-10-05
- **Cloudflare:** wrangler logged into **Stacklineops@gmail.com's Account** (`e6474e41...`), pinned in
  `wrangler.jsonc`. Nothing deployed, nothing created. (Salon folder deploys will now fail on its own
  pin until Praveen logs wrangler back into the salon account there; that is the safety working.)
- **GitHub:** https://github.com/PraveenBanneka/zedpath (PUBLIC, branch `main`). Leak scanner on every push.
- **Code:** no app code yet. README, rules, guards in place.
- **Next step:** scaffold the app (Next.js + TS on Workers) locally, keeping the `account_id` pin, then
  build the core flow: results in → Safe/Likely/Reach + other routes out.
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
