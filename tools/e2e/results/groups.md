# Group chat logic: test results (GRP)

Run: 2026-10-12, local only (no production URL, no deploys). File: `worker/groups.e2e.test.ts`
(new cases only, on top of `worker/groups.test.ts`). Command: `npx vitest run worker/groups.e2e.test.ts`.

| Total | Passed | Known gaps (pinned with `it.fails`) | Failed |
|---|---|---|---|
| 30 | 25 | 5 | 0 |

## What is covered

| IDs | Area | Result |
|---|---|---|
| GRP-001..006 | `cleanMessage` blocks Sri Lankan mobiles (070-078), spaced / hyphenated / one-digit-per-space, +94, +94 spaced/hyphenated, 94 without plus, landlines, numbers inside Sinhala/Tamil sentences, emails, wa.me / api.whatsapp.com links with a number | pass |
| GRP-007 | Normal text untouched: Z-scores, cut-offs, years, 8-digit index numbers, course codes, "@ Moratuwa", Sinhala, Tamil | pass |
| GRP-008..011 | Whitespace tidy (CRLF, tabs, blank lines), 500-char limit (501 refused, padding not counted, matches the DO CHECK), empty / whitespace / non-string refused, control characters refused | pass |
| GRP-017 | `GROUP_RULES_VERSION` is the single value in the CHECKs of migrations 0009 and 0010; the CHECK refuses other versions on the real migrations | pass |
| GRP-018 | `GROUP_RULE_COUNT` (6) = `gr.rule.1..6` in en, si, ta | pass |
| GRP-019..022 | Samples: all `sample: true`, "Sample" authors, `sample-` ids (never a reportable 32-hex id), no "verified"; no contact details or links; no cut-off figures or dates; in time order before go-live; every Popular course has its own thread, fallbacks work | pass |
| GRP-023 | Members list: seniors first with their badge, then students in join order; no name, email or mobile leaks | pass |
| GRP-024 | Stale/junk `acceptRules` after accepting the current rules still joins; no extra acceptance row | pass |
| GRP-025 | Leave then rejoin: same group, no rules prompt, count 2 -> 1 -> 2, live opens again | pass |
| GRP-026 | Leave when not a member = 204, nothing changes; bad ids = 404 | pass |
| GRP-027 | Live: Worker hands the room the right author, sample thread key (COURSE:001 / COURSE / BATCH / COURSE:012), blocked list and senior badge | pass |
| GRP-028 | Sample message ids cannot be reported (400) | pass |
| GRP-029 | Cross-site join / leave / report / block refused (403), same origin works | pass |
| GRP-030 | Group list: joined first; after leaving shows not joined with the right count; never repeated under Popular | pass |

## Known gaps in the contact filter (honest failures)

These are written as the behaviour we want and marked `it.fails`, because `cleanMessage` currently lets them through.
No app code was changed. When the filter in `shared/groups.ts` is tightened, switch each to a plain `it(...)`.

| ID | Input that is NOT blocked today |
|---|---|
| GRP-012-GAP | `0094771234567` (0094 international prefix) |
| GRP-013-GAP | `(077) 123 4567`, `077.123.4567` (brackets, dots) |
| GRP-014-GAP | `https://chat.whatsapp.com/...` (WhatsApp group invite link, no number in it) |
| GRP-015-GAP | `0771234567x` (number glued to a letter), full-width digits `０７７１２３４５６７` |
| GRP-016-GAP | `kasun [at] gmail [dot] com` (spelled-out email) |

Also noted (not a test): the comment above `GROUP_RULES_VERSION` in `shared/groups.ts` says the CHECK is in migration
0009; the live table (`group_rules_acceptance`) is in 0010. Both CHECKs hold the same value (GRP-017).

## Live WebSocket check (GRP-WS): SKIPPED

`tools/e2e/ws-check.ts` (local only; it refuses any non-localhost URL) signs up `grp_<ts>`, joins an existing
group only, checks the history frame, `ping` -> `pong`, a phone-number post refused with no broadcast, then
deletes the account. Run on 2026-10-12 against `http://127.0.0.1:8899`: four `workerd` processes were listening
on that port but none answered any request within 10-15 s (curl and fetch both timed out), so the script exited
with SKIP (code 3) before creating anything. No account was created. Re-run after restarting the dev server:
`node tools/e2e/ws-check.ts http://127.0.0.1:8899`.

## Full suite note

`npx vitest run` at the time: 487 passed, 6 expected fail, 21 skipped, 1 failed: `DAT-037` in
`worker/data-integrity.e2e.test.ts` (not part of this work).

## Live WebSocket check (run by the main session after the local server was restarted, 12 Oct 2026, server: local)

| Case | Result |
|---|---|
| GRP-WS-01 sign-up of throwaway account | PASS (201) |
| GRP-WS-02 joined existing group (course 001) | PASS (200) |
| GRP-WS-03 WebSocket upgrade for a member | PASS |
| GRP-WS-04 history frame received, samples labelled | PASS (17 messages) |
| GRP-WS-05 ping -> pong auto-response | PASS |
| GRP-WS-06 phone-number post refused | PASS |
| GRP-WS-07 refused post not broadcast | PASS |
| GRP-WS-08 account deleted, session gone | PASS (204, then 401) |
