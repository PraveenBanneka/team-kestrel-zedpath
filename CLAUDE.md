# ZedPath — project rules (Team Kestrel, IntelliCon '26 Buildathon)

Global rules in `~/.claude/CLAUDE.md` apply too. This file adds the project-specific ones.

## What we're building
ZedPath: one place for a Sri Lankan student between A/L results and their next step.
Enter results once → see every path you can reach (state uni Safe/Likely/Reach from district
cut-offs, private degrees, gazetted job exams, vocational, abroad, retry) → deadlines + cited answers.
- Concept screens: https://claude.ai/artifact/N8wGu87fiY8ksUbb82yU8f
- Gate 1 deck: `Kestrel_Gate1_Problem-and-Proof.pdf` (problem, interviews E1–E6, TAM/SAM/SOM, plan).
  Kept locally, NOT in the public repo (gitignored) unless Praveen says otherwise.
- Buildathon gates: Gate 1 (problem & proof) done · Gate 2 build checkpoint (due 3 Oct, 10%: public
  repo, architecture diagram, 2-min recording of one thing working, what changed since Gate 1) ·
  **Gate 3 final (due 11 Oct, 65%): demo video max 4 min, "a slideshow is not a demo"; live link optional but helps.**
- Praveen's call (2026-10-05): build the WHOLE product, not just the minimum. Order the work so
  there is always a working, demoable version at every step.
- Stack (from the deck): Next.js + TS on Cloudflare Workers · D1 (rules, dates) · R2 (source PDFs,
  photos) · Vectorize (cited answers) · Cron (weekly Gazette) · Queues (uploads) · Gemini (vision/PDF/
  Sinhala-Tamil) · Claude (build partner + second-opinion rule checker).
- Plan: Week 1 problem & proof (done) → Week 2 core flow live on a public link → Week 3 AI + depth.
- **Tuesday progress review: a working version early matters most.** Guard the critical path.
- Trust rules the product promises: every number links to its source; never "you will get in";
  no paid placement; nothing stored without asking. Sample data must be labelled as sample.

## Cloudflare: environment map
| Thing | Value |
|---|---|
| ZedPath Cloudflare account | **Stacklineops@gmail.com's Account** · `e6474e41044c5722ad57c3372ab7492e` (login stacklineops@gmail.com, confirmed by whoami 2026-10-05). Pinned in `wrangler.jsonc`; the guard allows deploys to THIS id only |
| Salon account (FORBIDDEN here) | ID starts `c5cbb437...`. Full ID is never written in this repo (it's public); the guard + leak scanner hold only its SHA-256 fingerprint |
| Staging | none yet (no online target is "safe to break" until a separate one exists) |
| Production | none yet |
| GitHub repo (PUBLIC) | `github.com/PraveenBanneka/zedpath`. The ONLY repo this project may create or push to |
| Git identity (repo-local) | `PraveenBanneka` / `279389974+PraveenBanneka@users.noreply.github.com` (keeps the real email off public commits) |

Wrangler has ONE login for the whole laptop. Logging in with one account switches it for every folder.
The pinned `account_id` in this project's wrangler config is what stops a deploy landing on the wrong
account. The Cloudflare MCP server (plugin) has its **own** OAuth login, a second door. When its
browser prompt appears, pick the ZedPath account, never the salon one.

## Rules (from Praveen, day one, 2026-10-05)
1. **Never open, edit or deploy anything in the salon folder**
   (`...\Documents\New website june 20\VSCode site`). Not part of this project. (Guard-enforced.)
2. After Praveen logs in to the new account: run `npx wrangler whoami`, report account name + ID,
   then pin that `account_id` in this project's wrangler config (`wrangler.jsonc`).
3. **If whoami ever shows the salon account (`c5cbb437...`): STOP, tell Praveen, do not deploy.**
4. Before ANY deploy: check whoami again, show Praveen the account, ask for a clear **GO**.
5. Project basics: this CLAUDE.md, `WORKLOG.md`, and the deploy guard (below).
6. Explain things simply: short steps, no jargon.
7. **Never run `wrangler login`, `wrangler logout`, `cf auth ...` or any account-switching command.**
   Praveen switches accounts by hand. (Guard-enforced.)
8. **GitHub account PraveenBanneka. ONE new PUBLIC repo for this project only** (`zedpath`).
   Never push to, change, or make public any other repo (the salon ones are private). (Guard-enforced.)
9. **Never copy code, files or .env secrets from the salon folder.** (Guard blocks any access to it.)

## The guard: `.claude/hooks/zedpath-guard.js` (PreToolUse, wired in `.claude/settings.json`)
| Action | Result |
|---|---|
| `wrangler login/logout`, `cf auth` | always blocked |
| any path/command touching the salon folder | always blocked |
| salon account id anywhere in a command | always blocked |
| deploy / publish / versions / secrets / `--remote` data / remote D1 migrations / resource create-delete / `npm run deploy` / Cloudflare MCP non-search tools | blocked unless **(a)** `wrangler.jsonc` pins exactly the ZedPath `account_id` (`e6474e41...`) **and** **(b)** Praveen's latest message **starts with "GO"** |
| `gh repo create/edit/delete/rename/...`, `gh api` writes, `git remote add/set-url`, `git push` to anything but `PraveenBanneka/zedpath` | always blocked (creating `zedpath` allowed once, before a remote exists) |
| `git push --force` to zedpath | needs GO |
| local dev (`wrangler dev`, `--local`), `whoami`, installs, normal `git push` to zedpath | allowed |

Tests: `bash .claude/hooks/test-guard.sh` (40 cases, incl. pinned defaults). Re-run after editing the guard.
The guard reads the whole command text, so a command that merely *mentions* a deploy (e.g. a sed on
the test file) is blocked too. Put such text in a script file and run the file.

**Wipe-bug check:** any scaffold or tool that regenerates `wrangler.jsonc` (OpenNext, C3, templates)
must keep `"account_id": "e6474e41044c5722ad57c3372ab7492e"`. Diff it after every scaffold step.

## Public-repo safety: `.githooks/pre-push` → `leak-scan.js`
Every push is scanned (all new commits, not just the latest files) for API keys (Gemini, Anthropic,
GitHub, Cloudflare...), private keys, `.env`/`.dev.vars` files and the salon account ID. Any hit
blocks the push. Enabled per clone with `git config core.hooksPath .githooks`. Full-history scan:
`node .githooks/leak-scan.js --all`. If a real secret ever lands in a commit: rotate it first.

## Deploy sequence (runbook, follow every time)
1. `npm run build` (or the framework build) is green; tests pass.
2. Verify the bundle locally (`wrangler dev` / preview), with the key flow clicked through.
3. `npx wrangler whoami` → confirm it's the ZedPath account, not `c5cbb437...` → show Praveen.
   (Don't paste the full salon ID into any file; the leak scanner will block the push.)
4. Ask for GO. Praveen replies with a message starting `GO`.
5. Deploy. Note the version ID wrangler prints.
6. Verify LIVE on the public URL (a channel that can actually see it).
7. Log the version + URL + what changed in `WORKLOG.md`. Commit.
Reversal plan: `npx wrangler rollback <previous-version-id>` (also GO-gated), written down BEFORE deploying.

## Cloudflare tooling installed (project scope only, never user-level)
- Plugin `cloudflare@cloudflare` (marketplace `cloudflare/skills`), declared in `.claude/settings.json`.
  Gives skills (workers-best-practices, wrangler, nextjs-on-cloudflare, durable-objects, agents-sdk, ...)
  and the `cloudflare` MCP server (`https://mcp.cloudflare.com/mcp`, OAuth on first use).
- The optional `cf` CLI was NOT installed (it would need a global CLAUDE.md edit + its own login).
  If installed later, its instruction line goes HERE, not in the global file:
  "When interacting with Cloudflare, use the cf CLI unless the project has a Wrangler configuration file."

## Hygiene
- Work journal: `WORKLOG.md`. Log meaningful work before ending a session; keep the state block current.
- Secrets (Gemini key etc.) go in `.dev.vars` locally / `wrangler secret put` remotely (GO-gated). Never commit.
