# Syllabi research report (retrieved 2026-10-05)

Data file: `syllabi-2026-10-05.json` (13 programmes). Official university/faculty sources only. Module titles are copied as printed, with no descriptions.
Scope was cut by the owner partway through (to 10 programmes). Work that was already finished was kept, so the file has 13 entries.
Firecrawl calls: 0. PDFs were downloaded with curl and converted to text locally with pdftotext.

| Uni-Code | Programme | University | Status | Modules captured | Source |
|---|---|---|---|---|---|
| 001A | MBBS | Colombo | FOUND | 55 (by stream) | https://med.cmb.ac.lk/mbbs/ -> 2026 (AL 2025) handbook (Google Drive link on that page) |
| 012T | BSc in Computer Science | UCSC | FOUND | 72 | https://ucsc.cmb.ac.lk/downloads/hb_2026.pdf |
| 026G | BSc (Hons) in IT | Moratuwa | FOUND | 41 (+~60 electives not listed) | https://uom.lk/sites/default/files/Faculty/IT/ugs/files/BSc(IT)Hons_curriculum2020Feb_0.pdf |
| 016C | BSc Hons Business Administration | Sri Jayewardenepura | FOUND (partial: Year I only) | 11 | https://mgt.sjp.ac.lk/bus/degree-programs/b-sc-business-administration-special-degree/common-programme-structure/ |
| 025A | Bachelor of Laws | Colombo | FOUND | 32 | https://law.cmb.ac.lk/academic/ll-b-degree/subjects-offered/ |
| 013A | BSc, Physical Science stream | Colombo | FOUND (Levels I-II) | 58 | https://science.cmb.ac.lk/wp-content/uploads/2026/04/Handbook-2025_2026-1.pdf |
| 006B | B.Sc., Biological Science stream | Peradeniya | FOUND (1000 level only) | 29 | https://sci.pdn.ac.lk/docs/Student-Handbook-2024-2025_v1.0.pdf |
| 023G | Bachelor of Architecture Honours | Moratuwa | FOUND | 68 | https://uom.lk/sites/default/files/archi/files/B.Arch%20Student%20Handbook%202022_1.pdf |
| 136L | BSc Hons Data Science | Sabaragamuwa | FOUND (compulsory) | 61 | https://www.sab.ac.lk/computing/undergraduate/bsc-ds-curriculum |
| 099L | BSc Hons Software Engineering | Sabaragamuwa | FOUND (core) | 61 | https://www.sab.ac.lk/computing/undergraduate/bsc-se-curriculum |
| 003B | BVSc (5-year) | Peradeniya | FOUND | 65 | https://vet.pdn.ac.lk/Download/Student%20Handbook_Batch%202024_25_web2_opt.pdf |
| 011G | BSc Hons Quantity Surveying | Moratuwa | FOUND | 56 | https://uom.lk/becon/programmes/undergraduate/quantity-surveying |
| 002B | BDS | Peradeniya | UNREADABLE | 0 | official faculty site (not readable on 2026-10-05; not linked) |

## Not covered (scope cut)
- Engineering, Moratuwa (008G): second on the owner's priority list, but not researched before the cut. The Faculty of Engineering handbooks are per department (for example `uom.lk/sites/default/files/civil/files/CIVIL_STUDENTS_HANDBOOK_2025_0.pdf`).
- Remaining degrees: Arts, Commerce, Pharmacy, Nursing, and the other offerings in the targets file.

## Uncertain / check before publishing
1. **002B (Dental Surgery, Peradeniya):** the faculty site returned unexpected, unsafe content on 2026-10-05, so nothing was read from it and ZedPath does not link to it. Reported privately to the project owner.
2. **001A**: the current handbook is hosted on Google Drive, not .ac.lk. The official MBBS page links to it. The handbook says the curriculum is "undergoing a major revision".
3. **026G**: the curriculum is dated January 2020 and may have been replaced. The document does not state a duration.
4. **016C**: only Year I was captured. Years II-IV are in PDFs that were not read. The page is the Business Administration department's "common programme structure". It is not certain that it applies to every 016C student.
5. **012T** and **023G** come from multi-column PDFs. Titles were checked against raw text, but the mandatory/optional marks for UCSC Years 3-4 are not recorded. The architecture handbook prints "History of Architecture-Sri Lankan II" twice. It was kept once.
6. **025A, 136L, 099L** were read through the WebFetch summariser, not a raw dump. The titles look verbatim, but a spot check against the page is advised.
7. **013A and 006B** list every course offered to the stream in the early levels. Each student takes only the subjects in their combination.
8. Several sources give no intake year (025A, 136L, 099L). Treat them as "current as published on 2026-10-05".
