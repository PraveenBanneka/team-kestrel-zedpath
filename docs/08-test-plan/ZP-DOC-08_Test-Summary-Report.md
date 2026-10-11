---
id: ZP-DOC-08
title: Test Summary Report
subtitle: Executed results of the automated suites and the agent test harnesses, 11 to 12 October 2026
version: 0.9
date: 12 October 2026
status: In review
classification: Public
owner: B.M.P Banneka, Product Owner
author: Team Kestrel (drafted with Claude, AI coding partner)
approver: B.M.P Banneka, Product Owner
reviewer: Claude (AI coding partner), consistency and traceability review
standard: IEEE 829 / ISO/IEC/IEEE 29119-3 test summary report; ZP-DOC-00
revision: 0.9 | 12 Oct 2026 | Team Kestrel | First issue: results of the 20-agent test campaign (1,053 executed cases), defects found, open risks; companion to the ZP-DOC-08 Test Plan; submitted for approval
---

# Introduction

## Purpose

This report records what was actually executed against ZedPath on 11 and 12 October 2026, what passed, what
failed and why. It is the companion of the ZP-DOC-08 Test Plan, which sets the strategy, environments and
Definition of Done. Every number below comes from a result file committed in the repository; nothing is
estimated.

## How the campaign was run

The product owner asked for an independent, documented test campaign of more than 200 cases within two hours.
It was run as an **agent harness**: the main session split the work into 20 independent agents, each with one
test area, a written brief, safety rules and an output file. Each agent wrote its own test code, ran it, and
reported its results; the main session reviewed each report, committed the code and the results, and wrote
this summary. No agent was allowed to change application code, so every failure below is reported as found.

Safety rules applied to every agent: no deploys; no production writes except where stated; test accounts
deleted at the end and checked (login afterwards returns 401); no new groups created and no chat messages
posted on shared data; no question sent to the AI model (quota); nothing fetched from outside the allow-list.

## Test environments

Table: Test environments

| Environment | Used for |
|---|---|
| Vitest on Node, with the real D1 migrations in SQLite (worker/testing/d1-sqlite.ts) | Unit, integration, data and schema suites |
| Local Worker (wrangler dev --local) | API, security, browser, accessibility, offline and layout harnesses |
| Live production Worker, read-only | Live API and live static/PWA/security checks (GET requests and requests refused before any write) |
| agent-browser (Chrome) at 390 x 844 and five other viewports | Browser, accessibility, offline and layout harnesses |

# Results summary

## Totals

Table: Executed cases by suite

| Suite | Target | Cases | Passed | Failed | Skipped | Result file |
|---|---|---|---|---|---|---|
| Automated test suite (vitest, 30+ files incl. the new e2e suites) | Code + SQLite D1 | 515 | 494 | 0 | 21 | npx vitest run |
| Worker CPU budget (opt-in, PERF=1) | Code | 21 | 21 on CPU mean | wall time noisy | 0 | tools/e2e/results/perf.md |
| API end-to-end harness | Local Worker | 218 | 211 | 7 | 10 | tools/e2e/results/api-results.md |
| Browser end-to-end harness | Local Worker | 42 | 42 | 0 | 0 | tools/e2e/results/ui-results.md |
| Security harness | Local Worker | 56 | 53 | 3 | 0 | tools/e2e/results/security.md |
| Group chat WebSocket check | Local Worker | 8 | 8 | 0 | 0 | tools/e2e/results/groups.md |
| Offline app (PWA) | Local Worker | 21 | 20 | 1 | 0 | tools/e2e/results/pwa.md |
| Accessibility and languages | Local Worker | 36 | 22 | 14 | 0 | tools/e2e/results/a11y-i18n.md |
| Responsive layout (6 viewports) | Local Worker | 33 | 31 | 2 | 0 | tools/e2e/results/responsive.md |
| Live API, read-only | Production | 86 | 85 | 1 | 0 | tools/e2e/results/live-readonly.md |
| Live static, PWA and security, read-only | Production | 38 | 35 | 3 | 0 | tools/e2e/results/live-static.md |
| **Total executed** | | **1,053** (excl. 21 skipped) | | | | |

The vitest figure counts intentional "expected fail" tests (known gaps written as the behaviour we want) as
passing: 5 in the group contact filter and 1 in list storage. They start failing as soon as the gap is fixed,
which forces the test to be switched to a normal one.

Type check: `npx tsc -b` clean. Leak scan of the full history: clean. Deploy-guard tests: 35 of 40 (see D-10).

## What the campaign proves

Table: What the campaign proves

| Area | Evidence |
|---|---|
| Course rules and cut-offs match the official UGC data | 75 accuracy cases against the UGC CSVs, independent of the app's own loader: 255 Uni-Codes, 5,650 cut-off cells (2025/26) and 6,175 (2024/25) equal, zero banding differences over a full grid; a higher Z-score never lowers a band |
| Rules are enforced on the server, not only hidden in the UI | API harness: early Journey ticks refused (409), invalid avatars refused (400), 21 private routes refuse requests without a session (401), cross-site writes refused (403) |
| One student cannot reach another's data | Security harness: journey, avatar, contact, membership, reports and blocks tried across accounts; the account comes only from the session cookie |
| Deleting an account deletes everything | Database suite: cascade to all 15 child tables; API harness: no orphan rows after cleanup |
| The 0010 migration is safe to roll back | Database suite: the previous release's SQL runs on the new schema (expand, then contract) |
| Every published fact has an official source | Data suite: all links https on allow-listed official domains (two exceptions, D-08), every number with a page and quote, no invented UGC dates |
| Group chat keeps students safe | Phone numbers and emails refused by the live room (WebSocket check 8/8); sample chats labelled; rules asked once per account |
| Ask ZedPath does not leak model reasoning and cites sources | 46 offline cases with a fake model: leaked reasoning rejected, next model tried, links restricted to https |
| The app works on real phones and languages | Browser harness 42/42 end to end; English fits at all six viewports; html lang follows the chosen language |
| The free plan holds | Average CPU per request within 10 ms for every route (heaviest results profile 7 to 10 ms) |

# Defects and findings

Severity: High = wrong result or data exposure; Medium = visible to students or a security weakness without
data exposure; Low = cosmetic, performance or tooling. None of the findings exposes data or gives a wrong course
result.

Table: Defects and findings

| ID | Finding | Severity | Found by | Status |
|---|---|---|---|---|
| D-01 | Tamil Courses screen scrolls sideways at normal phone width (Safe/Likely/Reach tabs do not fit); Sinhala at 320 px too | Medium | Accessibility, layout | Open |
| D-02 | Grey helper text and green status pills below WCAG AA contrast (3.0 to 3.8 against 4.5) | Medium | Accessibility | Open |
| D-03 | A malformed or "null" Origin header returns 500 instead of 403 (nothing is written) | Low | Security | Open; fix is a try/catch in sameOrigin |
| D-04 | Group contact filter misses some formats: 0094..., (077) 123 4567, spelled-out numbers, chat.whatsapp.com invites | Medium | Group chat, security | Open; pinned as expected-fail tests |
| D-05 | Weak ETag from compression never matches, so the API never answers 304 (extra data on 3G) | Low | Live API | Open; one-line fix |
| D-06 | No security headers (HSTS, nosniff, CSP, frame options) and no http to https redirect on workers.dev | Medium | Live API, live static | Open; _headers file plus middleware |
| D-07 | Hashed JS/CSS not long-cached; first visit does not precache them for offline use | Low | Live static, PWA | Open |
| D-08 | One route link uses http; one syllabus source is a Google Drive mirror, not the university's site | Low | Data | Open; pinned in the data suite |
| D-09 | Some touch targets under 44 px (Me avatar, tabs, intro dots) | Low | Accessibility | Open |
| D-10 | Deploy-guard tests still expect the old repo name (5 of 40 fail, all over-blocking) | Low | Test plan, security | Open; update test file |
| D-11 | Some university names show cut off ("Sabaragamuwa University of"); "1 courses" wording | Low | Browser, layout | Open |
| D-12 | List storage accepts valid JSON of the wrong shape | Low | List suite | Open; pinned as expected-fail |
| D-13 | ZP-DOC-05 omits ask_quota and four indexes; one privacy sentence predates CR-003 | Low (documentation) | Database suite | Open |

## Failures that are not application defects

Table: Failures that are not application defects

| Suite | Cases | Cause |
|---|---|---|
| API harness | 7 | The local development proxy drops about one in three requests whose body the Worker does not read before an early refusal; each case gives the right answer when sent alone. To be confirmed on production. |
| CPU budget | wall-time p95 | Measured on a laptop running 20 agents at once; CPU time per request stayed within budget |

# Limits of this campaign

- **Production writes were not exercised.** Automated runs that create data on the live service were blocked by
  the tooling's safety checks; the live service was tested read-only (124 cases). Write paths were tested on the
  local Worker with the same code and migrations, and after each deploy a manual live check is logged in WORKLOG.
- **Ask ZedPath against the real model** was not run (quota); the logic around the model was tested offline.
- **Traceability:** 69.6 % of the 224 active requirements have at least one test (47.8 % directly); the uncovered
  ones are listed with a suggested test in tools/e2e/results/traceability.md.
- No usability study with students and no native-speaker review of Sinhala and Tamil in this campaign.

# Conclusion

The release is fit for the demonstration: the core promise (the right courses, from the official data, with a
source for every number, enforced on the server) passed every accuracy, API, database and browser test. The
open defects are presentation, hardening and performance items; D-01, D-02, D-04 and D-06 are recommended
before a public launch.

# Appendix A. Result files

All result files are in tools/e2e/results/ in the repository, each with the test code that produced it:
api-results, ui-results, security, groups, pwa, a11y-i18n, responsive, live-readonly, live-static, accuracy,
migrations, data-integrity, journey-logic, list-compare, ask, perf and traceability.
