# ZedPath schema validation report
- Schema: migrations/0001_initial_schema.sql (28 tables, 8 explicit indexes)
- Engine: SQLite 3.51.3 (node:sqlite), foreign keys ON

| Check | Result | Expected | Pass |
|---|---:|---:|---|
| Uni-Codes (offerings) | 255 | 255 | yes |
| course codes | 121 | 121 | yes |
| institutions | 20 | 20 | yes |
| 2025/26 offering-years | 255 | 255 | yes |
| 2025/26 proposed intake (Uni-Code places; +900 Arts additional intake = 42,937) | 42037 | 42037 | yes |
| 2025/26 cut-off columns matched to a Uni-Code | 260 | 260 | yes |
| 2025/26 cut-off cells loaded | 6500 | 6500 | yes |
| 2025/26 selection groups | 260 | 260 | yes |
| 2025/26 Uni-Codes with no selection group (no cut-offs) | 0 | 0 | yes |
| 2025/26 Uni-Codes split into more than one selection group | 5 | 5 | yes |
| 2025/26 NQC cells | 1026 | 1026 | yes |
| merit-only offerings have one value in all districts | 0 | 0 | yes |
| facts without a citation | 0 | 0 | yes |
| foreign-key violations | 0 | 0 | yes |

- 2024/25 cut-off cells loaded: 6425 (rows without a 2025/26 Uni-Code skipped: 9)
- Cut-off columns matched by token similarity rather than exact name: 0
- Unmatched cut-off columns: 0
- Negative tests rejected by constraints: 24 of 24
- Database size with two intake years: 2.30 MB (D1 free limit: 500 MB per database)
