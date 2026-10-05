# Course rules 2025/26: two-model reconciliation

`rules-2025-2026.json` holds the entry requirements of all 121 courses of study in the UGC handbook 2025/26,
in the rule grammar of `shared/rules.ts` (ZP-DOC-05, Section "Rule grammar").

## Method (US-902 applied to our own seed data)

1. **Extractor A** encoded every course from the verbatim requirement texts; **Checker B** encoded every course
   independently from the raw handbook page text. Neither saw the other's work or any earlier parse.
2. Each wrote and passed its own self-tests (A: 117 cases, B: 158 cases).
3. `tools/rules/compare.ts` compared the two **by behaviour**: for each course, every relevant combination of stream,
   three subjects and grades (plus O/L grades) was evaluated under both rules: **40,357,764 student cases**.
4. **116 courses behaved identically on every case.** The 5 that differed were resolved against the handbook text:

| Course | Decision | Reason |
|---|---|---|
| 020, 041 Arts (SP) | Checker B | p.35: "three subjects from subject baskets in the Arts Stream": basket rules apply |
| 021 Arts (SAB) | Checker B | p.36: "satisfied the minimum requirements for admission in Arts Stream or Commerce Stream" |
| 027 MIT | Merged | p.83: no stream subject lists in the handbook: inclusive reading (BR-044), Mathematics excluded (an Arts basket subject, p.31) |
| 109 Business Science | Extractor A | p.104: same ambiguity: inclusive reading (BR-044) |

## Policy BR-044 (inclusive reading)

Where the handbook's wording admits two readings, ZedPath uses the more inclusive one and tells the student to confirm
on the UGC application form, which only lists courses the student is eligible for (handbook p.139). A course shown in
error is caught there; a course hidden in error is lost silently, which is the problem ZedPath exists to fix.
