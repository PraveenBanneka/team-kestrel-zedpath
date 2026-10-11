# E2E: database design vs ZP-DOC-05 (migrations 0001..0010)

- file: `worker/migrations.e2e.test.ts` (vitest, `npx vitest run worker/migrations.e2e.test.ts`)
- ran: 2026-10-12, local only (node:sqlite 3.51.3 in memory, foreign keys ON as D1 has them; `worker/testing/d1-sqlite.ts`)
- method: the real `migrations/*.sql` applied in order to an empty database, then PRAGMA checks and inserts/deletes. No network, no Cloudflare, no app or migration changes.
- totals: **30 cases, 30 pass, 0 fail**

| ID | Area | What is checked | Result |
|---|---|---|---|
| MIG-001 | Apply | 0001..0010 present with no gaps; each applies in order on an empty DB without error | PASS |
| MIG-002 | Apply | `PRAGMA foreign_keys` = 1; `integrity_check` = ok | PASS |
| MIG-003 | Apply | `foreign_key_check` clean after migrations (reference + 255 offering rows) | PASS |
| MIG-004 | Tables | every table is STRICT (all 47) | PASS |
| MIG-005 | Tables | every table named in the CR sections exists | PASS |
| MIG-006 | FKs | all 71 FK columns the doc declares exist with the documented ON DELETE (CASCADE / NO ACTION) | PASS |
| MIG-007 | FKs | no undocumented FK in the schema | PASS |
| MIG-008 | FKs | `journey_course` -> `offering` is one composite FK (course_code, institution_letter) | PASS |
| MIG-009 | Keys | CR-006 relations keyed by the pair of participating keys; group_member PK | PASS |
| MIG-010 | Indexes | 16 indexes named in the doc exist, unique/partial flags as described | PASS |
| MIG-011 | Data | 255 offerings, 121 courses, 20 institutions; uni_code derived and unique | PASS |
| MIG-012 | Data | 6 streams, 25 districts, 59 subjects | PASS |
| MIG-013 | CHECK | avatar 'zz' / 'a13' rejected; a01..a12 and NULL accepted | PASS |
| MIG-014 | CHECK | step_id 'X' rejected; all 8 documented steps accepted | PASS |
| MIG-015 | CHECK | route_id 'R12', 'R1234', 'X123', 'r012' rejected; 'R012' accepted | PASS |
| MIG-016 | CHECK | applied_at < followed_at rejected; equal/later accepted | PASS |
| MIG-017 | CHECK | rules_version other than '2026-10-11' rejected (group_rules_acceptance and group_member) | PASS |
| MIG-018 | FK | journey_course with a non-existent offering rejected (unknown course; real course at an institution that does not offer it) | PASS |
| MIG-019 | STRICT | text in an INTEGER column rejected | PASS |
| MIG-020 | CHECK | student_contact: bad mobile, upper-case email, 30 Feb rejected | PASS |
| MIG-021 | CHECK | course_group: one per course / per batch (partial UNIQUE); kind/column CHECK | PASS |
| MIG-022 | Trigger | student_profile on a CURATOR rejected; self-block rejected | PASS |
| MIG-023 | FKs | `foreign_key_check` clean after seeding two full students, a group, reports, blocks | PASS |
| MIG-024 | Cascade | DELETE account removes its rows in all 15 child tables: password_login, session, recovery_code, student_profile, student_subject (via profile), student_achievement, student_interest, student_contact, group_member, message_report, account_block (both directions), group_rules_acceptance, journey_course, journey_notice, journey_step; other account and course_group untouched | PASS |
| MIG-025 | Cascade | deleting a SENIOR deletes its redeemed senior_invite; unredeemed invite stays; second redemption refused | PASS |
| MIG-026 | FKs | staff account referenced by fact_revision.changed_by (NO ACTION) cannot be deleted | PASS |
| MIG-027 | Expand/contract | `group_member.rules_version` still exists after 0010 | PASS |
| MIG-028 | Expand/contract | previous release's SQL (join upsert, GROUP_SELECT, /live select, verbatim from `git show 4f3708b^:worker/groups.ts`) runs on the 0010 schema | PASS |
| MIG-029 | Carry-over | DB built to 0009, members seeded, then 0010 applied: one acceptance per account at the earliest *accepted* join; NULL members not carried; memberships and old column values untouched; FK check clean | PASS |
| MIG-030 | Defaults | no acceptances invented; new avatar NULL (initials) | PASS |

## Notes and doc/schema mismatches found

1. **Commit `d6323d59` does not exist** in this clone. The previous release's group SQL was taken from `4f3708b^` (the commit before CR-006 / migration 0010), which is the last version of `worker/groups.ts` that reads and writes `group_member.rules_version`.
2. **`ask_quota` (migration 0004) is not documented in ZP-DOC-05 at all**: no section, no index/table entry, no appendix (the doc reproduces 0001, 0003, 0006..0010). Schema is fine (STRICT, WITHOUT ROWID, no FKs); the doc is missing it.
3. **Indexes table (Physical design, "Indexes") is out of date**: it lists only 0001/0003 indexes. Missing from it: `idx_group_member_account`, `idx_account_block_blocked` (both mentioned in the CR-002 table instead), `ux_course_group_course`, `ux_course_group_batch` (described in words in CR-002), and `idx_message_report_reporter`, `idx_answer_feedback_open` (not mentioned anywhere in the doc text, only in the verbatim appendices).
4. **Stale convention text**: Physical design, Conventions, "Personal data" still says "there are still no names, contact details or telephone numbers", which CR-003 (`student_contact`) withdrew. The CR-003 section itself is correct.
5. Minor: appendix order puts migration 0010 before 0009.
6. Not tested here: the doc's carry-over claim is "tested on a copy of the database as it was before 0010" (also covered in `worker/my-journey.test.ts`); MIG-029 adds the multi-group / NULL-mixed case and confirms `min(joined_at)` is taken over accepted rows only.
