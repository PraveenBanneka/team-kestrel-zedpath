# Rule-engine data-accuracy suite: results

Suite: `worker/accuracy.e2e.test.ts` (vitest, local only, no network). Run on 2026-10-12.
Command: `npx vitest run worker/accuracy.e2e.test.ts`

| Total | Passed | Failed | Run time |
|---|---|---|---|
| 75 | 75 | 0 | about 21 s |

Full suite: `npx vitest run` gave 1 failure, but not in this file. It was `DAT-037` in
`worker/data-integrity.e2e.test.ts`, a new file another session is still writing. It hit the 5 s vitest timeout under
full-suite load. With the three in-progress e2e files from other sessions (data-integrity, groups, perf) left out, the
run gave 24 files, 410 passed and 1 expected fail. This suite broke nothing.

## How the oracle works
The expected values come straight from the source files: `data/ugc/2025-2026/*.csv`, `data/ugc/2024-2025/cutoffs_2024_2025.csv`
and the BR-0xx text of ZP-DOC-03. They do not come from the seed loader or the rulebook builder. Z-scores are parsed by
string arithmetic, so there is no float rounding. Banding is checked against a separate re-implementation of
BR-030 to BR-034. Only the CSV reader (`tools/seed/csv.ts`) is reused.

## Groups and what each proves
| Group | IDs | What it proves |
|---|---|---|
| 1 Coverage | ACC-001 to 006 | All 255 Uni-Codes in unicodes.csv are engine offerings: no extras, no duplicates. Each one has the right institution, course code and a reconciled rule. Proposed intake, aptitude flag and the 22 merit-only offerings (BR-014) match the handbook row for row. |
| 2 Districts | ACC-010 to 013 | There are 25 districts, and their names equal the COP table's. The 16 disadvantaged districts are exactly the BR-007 list. Every cut-off row has 25 values. Validation accepts all 25 codes and rejects unknown ones. |
| 3 Cut-offs | ACC-020 to 044, 050 to 054 | **2025/26:** 226 of the 250 single-group COP columns are matched independently (exact course + university). All 5,650 of their cells (values and NQC) equal the engine. Plus 24 named course/district samples (ACC-021 to 044). **2024/25:** all 247 single-group handbook Section 9 rows (6,175 cells) equal the engine. Numeric and NQC cell counts equal the COP table (nothing dropped). The min/max are −0.8505 and 2.7935, as BR-005 states. Each merit-only offering has one cut-off for all districts (BR-035). The 5 split offerings have one column per group. |
| 4 Banding | ACC-060 to 067 | BR-032 boundaries were tested on real histories. Medicine 001A Colombo and Engineering 008 Kurunegala use full history. Two real pairs use limited history (n = 1 and n = 2, BR-031 margin 0.1000). At max+m, max+m−0.0001, c_l, c_l−0.0001, min−0.0500 and min−0.0501 the engine agrees with the oracle. All-NQC gives Not enough data (BR-030), and NQC years are reported, never used (BR-034). A sweep over every offering × group × district at 9 Z values gives zero differences. |
| 5 Eligibility | ACC-070 to 078 | Physical Science (CMATH/PHY/CHEM) can get Engineering; Bio cannot. The Medicine two-C rule holds. Commerce, Arts baskets and ICT (104) behave as the handbook says. Any grade below S blocks every course (BR-001). O/L-rule courses return NEEDS_OL until O/L grades are entered (FR-113). For every single-stream course in the handbook's eligible-streams column: typical students of other streams are never admitted, and at least one typical student of its own stream is. |
| 6 Invalid input | ACC-080 to 088 | Profiles with 2 or 4 subjects, a bad grade, an unknown stream, Z outside ±4.0000 or a non-integer Z are rejected by `parseProfile` and by `/api/results` (400). Strict mode rejects O/L or made-up subject codes. ±4.0000 itself is accepted. |
| 7 Results invariants | ACC-090 to 095 | Four real profiles were run through `/api/results`. No course/group appears in two bands. Counts add up. Every Uni-Code is either listed or in "hidden", never both. A Bio student never sees Engineering. Every listed band equals the oracle on that district's official history. |
| 8 Monotonicity | ACC-100 to 102 | Property test over a grid: 25 districts × 4 streams × Z from −1.0 to +3.0 in steps of 0.1. Safe, Safe+Likely and Safe+Likely+Reach counts never fall as Z rises. Each offering's band never drops as Z rises. Which courses are listed does not depend on Z. |

## Discrepancies found
**No genuine data discrepancies.** Every cut-off cell checked matched exactly, and the banding oracle had zero differences.

Three first-run failures were **misunderstandings in the test itself**, and they were fixed in the test (no app code changed):
1. ACC-077: an "ACC/ECON/ICT" Commerce student was admitted to Arts (019). That is correct. All three are Arts
   Basket 01 subjects, so that combination is also a valid Arts combination. The typical Commerce combinations now
   include Business Studies, which is not an Arts subject.
2. ACC-078: Music, Dance and Drama (068, 069, 071) need that subject at C or better. The typical Arts set gained one
   combination with each.
3. ACC-078: Accounting Information Systems (127D) needs ACC + (ECON or BSTUD) + (BSTAT or ICT). An ACC/BSTUD/ICT
   Commerce combination was added.

One run-time issue was fixed: ACC-100 first timed out (60 s), because it re-evaluated the subject rules at every grid
point. Subject rules do not depend on Z or district, so they are now judged once per stream and district. ACC-102
asserts that this is true.

## Coverage limits (honest notes)
- In 2025/26, 24 single-group COP columns are not covered by the independent exact-name matcher (printing differences such as
  the "University of Jayewardenepura" misprint). The 10 split-group columns are also not covered cell by cell. All of
  them are still covered by ACC-051, the total cell count. They were not checked value by value here.
- The 9 rows in the 2024/25 table that have no 2025/26 Uni-Code are not checked. The 10 split-group rows (sub-quota) are
  also not checked.
- Years 2021/22 to 2023/24 (crosswalked) are not cross-checked by this suite.
- Rule texts are checked by behaviour (typical students and handbook examples), not compared with the handbook word by word.
