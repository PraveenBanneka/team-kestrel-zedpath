# ZedPath — work log

## Current state (update at end of every session)
- **Date:** 2026-10-05
- **Cloudflare:** wrangler is still logged into the SALON account (`c5cbb437...`). ZedPath account
  not connected yet. Nothing deployed. Nothing created on any Cloudflare account.
- **Code:** none yet. Project basics + deploy guard in place.
- **Next step:** Praveen logs in to the NEW Cloudflare account by hand (`npx wrangler login` in his own
  terminal) → Claude runs `whoami`, reports, pins `account_id` → scaffold the Week 2 core flow.
- **Deadline:** Tuesday progress review. Working version early matters most.

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
