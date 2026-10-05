# ZedPath R1: non-university routes research report

Retrieved 2026-10-05. Target user: G.C.E. A/L 2025 candidates (academic year 2025/26).

Files in this folder:
- `routes.json`: 52 records.
- `sources/`: 64 official pages and PDFs.
- `sources_manifest.csv`: URL, retrieval date, SHA-256, bytes and the route groups that use each file.
- `build.py`, `verify.py`, `manifest.py`: scripts to rebuild the outputs and check them again.

Every fact comes from a government or institution site. No blogs, tuition sites, news sites or competitor apps were used.

`verify.py` checks every `entry_requirements_text` against the saved source text, ignoring whitespace and quote style. Fifty-one of the 52 records match word for word.

The one exception is the UoVT record. Its text comes from the image-only prospectus PDF and was transcribed by eye. The record says so.

Where the source table runs across a page break, the text is marked `[page break]` or `[table continues after page break]`. Where I left text out of a quotation, it is marked `...`.

## 1. Coverage at a glance

| Group | Records | Strongest source | Solid | Uncertain or missing |
|---|---|---|---|---|
| PRIVATE_DEGREE | 17: scheme, register, 15 programmes | IFSLS Student Handbook 2026/27 (191-page PDF) on studentloans.mohe.gov.lk | Eligibility (A/L 2023-2025, 3 x S in one sitting, CGT 30 or more, English S, age 25 or under by 27.09.2026). Per-programme entry text, duration and scheme fee. Loan caps and repayment terms. Dates of this intake. | Number of approved institutes (sources conflict). No income test found. Fees outside the scheme not captured. Teaching location only known for SLIIT and ICBT branches. |
| DIPLOMA | 10: 5 SLIATE HNDs, 3 OUSL, UCSC BIT, ITUM NDT | SLIATE admission guideline AY2026 (PDF); Gazette of 18.09.2026 (ITUM NDT) | SLIATE entry rules, ATI locations, full-time courses free, deadlines. ITUM NDT (open until 19.10.2026). BIT entry rules and fees. | OUSL fees are shown as approximate and contradict themselves on the same page. Next SLIATE and OUSL BSc IT/BMS cycles not yet published. |
| PROFESSIONAL | 4: CA, CMA, CIMA, AAT | Each body's own registration or FAQ page | Entry requirements word for word. CA registration fee for 2026. CMA 2027 subscription. | Full cost to qualify is not published by any of the four. AAT fee tables date from 2023. CIMA in LKR not found. No IT/computing professional body checked (see Gaps). |
| VOCATIONAL | 11: 5 VTA, 3 DTET, 2 NAITA, 1 UoVT | DTET intake Gazette (31.10.2025); VTA's own course API; Gazette of 18.09.2026 (NAITA IETI) | DTET full-time courses are free; entry text and colleges for each diploma. VTA fee per centre and entry text. NAITA IETI January 2027 batch (closes 15.10.2026). | VTA intake dates not published. UoVT fees and dates not found. The UoVT pathway text is read from an image. |
| JOB_EXAM | 3: Customs Inspector OCE, MSO OCE, NCOE | Weekly Gazette Part I Section (IIA) of 11.09.2026, 28.08.2026 and 07.11.2025 | Age limits, education rules, closing dates and fees, all word for word. | No NCOE call based on 2025 A/L results yet. Police and forces cadet entries not covered. |
| SCHOLARSHIP_ABROAD | 6: general process plus India, Japan, China, Hungary, Cuba | MOHE "Guidelines on Foreign Scholarships 2024" (PDF) | Basic conditions: citizen, 3 x S at A/L, not a UGC internal student, ranked by Z-score then interview. Usual months each country advertises. | No live undergraduate call found. Age limits and fields are set by each donor country. MEXT undergraduate details not available from an official Sri Lankan source (the Embassy of Japan site blocked automated access). |
| RETRY | 1 | UGC University Admissions Handbook 2025/26 | Three-attempt rule, CGT 30% rule, and that attempts need not be consecutive. | The 2027 A/L date and the private-candidate window were not found. No Department of Examinations rule found on how many times a candidate may sit. |

## 2. Application windows open on 2026-10-05

| Route | Closes | Source |
|---|---|---|
| Sri Lanka Customs, Inspector of Customs Gr II, open competitive exam (age 18-24, 3 A/L passes in one sitting) | 12 Oct 2026, 9.00 pm (online on doenets.lk) | Gazette 11.09.2026 |
| NAITA IETI Moratuwa apprentices, January 2027 batch (age 16-35) | Must be received before 15 Oct 2026 | Gazette 18.09.2026 |
| ITUM National Diploma in Technology 2026/27 (Physics, Chemistry and Combined Maths; A/L 2023-2025; under 24 on 31.12.2025) | 19 Oct 2026 | Gazette 18.09.2026 |
| OUSL Bachelor of Software Engineering 2026/27 | Applications issued 15 Oct to 15 Nov 2026 | ou.ac.lk programme page |

Already closed for 2026: IFSLS 11th intake (27.09.2026), SLIATE AY2026 (23.08.2026), MSO open competitive exam (25.09.2026), DTET AY2026 (04.12.2025), OUSL BSc IT (19.07.2026) and BMS (30.07.2026).

Timing matters for the app. A/L 2026 was held from 10 Aug to 5 Sep 2026, so 2025 candidates who want to re-sit now face the 2027 exam. Its date has not been published.

## 3. Conflicts between official sources

1. **Number of IFSLS institutes.**
   - The handbook (Section 1.4) lists 17, including SLITA.
   - The FAQ page says "sixteen" and its table has 16 (no SLITA).
   - The MOHE "Overview of Student Loan" page says 16 but lists 18 (adds Gateway College). It still cites A/L 2022-2024, so that page is stale.
   - Prefer the handbook.
2. **Approved institutes vs the Section 25A register.** BMS, Lyceum, SLITA and Gateway are in IFSLS lists but do not appear in the MOHE Section 25A table as parsed (22 institutes). Verify before labelling them "recognised degree awarding institutes".
3. **OUSL BSE fee.** The page gives "LKR 660,000 (Approx.)" and LKR 4,190 per credit with "must pass 125 credits". The FAQ on the same page says the programme is 90 credits. The three cannot all be right.
4. **OUSL BSc IT fee.** The header says LKR 3,010 per credit. The Finance section, written for 2023/24, uses LKR 2,870.
5. **SLIATE closing date.** The guideline PDF says 03.08.2026. Later notices extended it to 17.08.2026 and then 23.08.2026.
6. **Scholarship calendar.** The undated MOHE calendar shows India in February. The 2024 Guidelines say January-February. China (November) is in the Guidelines but not in the calendar.
7. **UoVT programme length.** The prospectus pathway diagram shows a "Three year Degree Programme" with an optional 4th year. The module pages show 8 semesters. Durations are left general.

## 4. What the app should NOT claim

- **That private degrees are free or loan-covered in general.** Only the listed IFSLS programmes, in a valid intake, at the scheme fee are covered. Applications for 2026/27 are closed.
- **An income test for IFSLS.** None was found in official documents. Do not invent one.
- **That VTA courses are free.** The VTA course data lists fees (for example Rs. 25,000-149,000 for NVQ 5 diplomas). Only DTET full-time courses and SLIATE full-time HNDs are stated as free. NAITA IETI is free only for low-income families.
- **Total cost of CA, CMA, CIMA or AAT.** Only registration and subscription items are published, and AAT's are dated 2023.
- **Any 2027 date** (A/L 2027, IFSLS 12th intake, SLIATE AY2027, DTET AY2027, NCOE for A/L 2025). None is published. Show the last cycle's months only as "usually around", clearly labelled.
- **NCOE eligibility for A/L 2025 students using the 2025 Gazette rules.** That call was for A/L 2023/2024 with age measured at 01.01.2025.
- **A Z-score cut-off for any route in this file.** None is published. IFSLS, SLIATE Category I, ITUM, NCOE and UoVT use Z-score only to rank applicants.
- **"Recognised degree" for a programme** unless that exact programme is in the MOHE Section 25A register.
- **Personal data.** The scholarship nomination PDFs in `sources/` contain student names. Use them as evidence only and never republish them.
- **Lock-in effects, unless shown as a warning.** Several state routes block others:
  - A full-time HND of 3 years or more blocks university and IFSLS entry.
  - Registering for NDT blocks other universities, except OUSL.
  - A 3-year UoVT university-college diploma blocks IFSLS.
  - A third A/L sitting closes off results from earlier and later attempts.
  These are warnings, not reasons to exclude a student.

## 5. Gaps for R2

- Computing and IT professional bodies (BCS, CSSL) and their direct A/L entry: not researched. UCSC BIT is included instead, as a state external degree.
- Police, armed forces and cadet entries: police.lk has no current notice; the forces were not checked.
- Development Officer entry: no A/L-level open competitive notice found in the weekly Gazettes of 28.08.2026 to 25.09.2026.
- Japan MEXT undergraduate and India ICCR eligibility details from official embassy or donor pages.
- VTA intake months, and the NVQ 5/6 offer at the six UoVT University Colleges.
- The procedure, fees and dates for private candidates sitting the A/L.
- Fees institutes charge outside IFSLS. They are not in the handbook, so each institute's own site would be needed.

## 6. How the data was gathered

- **Static pages:** downloaded with `curl -sL`.
- **PDFs:** text extracted with pymupdf. Image-only PDFs (UoVT prospectus, scholarship calendar) were rendered and read visually; this is noted on the records.
- **JavaScript-rendered pages** (CIMA, NAITA, documents.gov.lk, doenets.lk): opened in a headless browser. For documents.gov.lk this was used only to find the official Gazette PDF links, which were then downloaded directly.
- **VTA course data:** from the JSON API that the official VTA "Apply for Courses" page uses.
- **Gazettes:** taken from documents.gov.lk, Part I Section (IIA), English versions.
- **Confidence scores:**
  - 0.9-0.95: Gazette or handbook text, current cycle.
  - 0.75-0.85: an official web page, or a single source with a minor inconsistency.
  - 0.6-0.7: dated fees, transcription from an image, or generic scheme conditions applied to a specific country.
