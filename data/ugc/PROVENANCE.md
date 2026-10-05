# Provenance of the UGC data in this folder

These files are **facts derived from official University Grants Commission (UGC) publications**, extracted and
verified by Team Kestrel on 5 October 2026. The original PDFs are not redistributed in this repository; ZedPath
stores them privately and cites them (ZP-DOC-03 CON-5).

| Source | Edition | SHA-256 of the PDF used |
|---|---|---|
| UGC, *Minimum "Z" Scores for selection to various Courses of Study of Universities, in respect of each district* (signed 31/07/2026) | Academic year 2025/2026, A/L 2025, after re-scrutiny | `e1914bfbd287774c7879b7758eff9349c7a4ea40df4ca2ae9db92ac605e88ba0` |
| UGC, *Admission to Undergraduate Courses of the Universities in Sri Lanka* (student handbook) | Academic year 2025/2026, A/L 2025 | `8b9cc7b24ed2a10ed19c22a1e12d0a9336c0db15f1623ea2aca35334e005c93d` |

## Files

| File | Content | How it was verified |
|---|---|---|
| `2025-2026/cutoffs_2025_2026.csv` | 260 offering columns × 25 districts = 6,500 cut-off cells (value or NQC), with source page and raw cell | Two independent extraction methods matched on all 6,500 cells (0 mismatches); 14 cells checked visually against rendered pages |
| `2025-2026/offerings_2025_2026.csv` | The 260 cut-off columns as printed (course, university, stream split, `*` merit-only and `#` aptitude flags) | Counts reconcile with the legend; `*` columns have identical values in all districts |
| `2025-2026/unicodes.csv` | The 255 Uni-Codes of 2025/26 with course and institution (handbook pages 142 to 148) | 255 unique codes over 121 course codes, as the handbook states |
| `2025-2026/courses_requirements.csv` | Per Uni-Code: subject requirements (verbatim and structured), O/L requirements, aptitude test, proposed intake, selection basis, medium, duration, page | All verbatim quotes machine-checked against the PDF text (0 failures); intake totals reconcile to 42,937 |
| `2024-2025/cutoffs_2024_2025.csv` | Previous year's cut-offs as printed in the 2025/26 handbook (Section 9), keyed to 2025/26 Uni-Codes | Row alignment checked against rendered pages; 25 values per row |

Page numbers in the CSVs are PDF page indexes unless stated; printed page = PDF page − 7 for the handbook.
Facts are loaded into D1 by `tools/seed/` with a citation to the source document and page for every row.
