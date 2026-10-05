---
id: ZP-DOC-03
title: Software Requirements Specification
subtitle: Functional, non-functional and business-rule requirements for ZedPath Release 1 and 2
version: 0.9
date: 5 October 2026
status: In review
classification: Public
owner: B.M.P Banneka, Product Owner
author: Team Kestrel (drafted with Claude, AI coding partner)
approver: B.M.P Banneka, Product Owner
reviewer: Claude (AI coding partner), consistency and traceability review
standard: ISO/IEC/IEEE 29148:2018, software requirements specification content; ZP-DOC-00
revision: 0.9 | 5 Oct 2026 | Team Kestrel | First issue: functional requirements derived from ZP-DOC-02; NFRs; business rules from the UGC handbook and cut-off table 2025/26; submitted for approval
---

# Introduction

## Purpose

This Software Requirements Specification (SRS) states precisely what ZedPath **shall** do and how well it
**shall** do it. Every requirement is uniquely identified, verifiable, and traced to the user story it comes
from (ZP-DOC-02). Designers use it to build the system; testers use it to prove the system is correct.

## Scope

The SRS covers Release R1 (Gate 3, 11 October 2026) and Release R2 (after the buildathon). Each requirement
states its release. Requirements for R2 are included so the design does not have to be reworked later.

## Intended audience

Developers, testers, the product owner, and buildathon judges assessing engineering quality.

## Relationship to other documents

Table: Position of this document in the ZedPath document set

| Document | Relationship |
|---|---|
| ZP-DOC-01 Vision and Scope | Grandparent. Business objectives BO-1 to BO-6 become quality requirements here |
| ZP-DOC-02 User Stories | Parent. Every functional requirement cites the story and acceptance criteria it refines |
| ZP-DOC-04 Use Case Model | Child. Use cases realise groups of functional requirements |
| ZP-DOC-05 Data Design | Child. Business rules and data requirements here become entities and constraints |
| ZP-DOC-06 Software Architecture | Child. Non-functional requirements here drive architecture decisions |
| ZP-DOC-08 Test Plan | Child. Every requirement here maps to at least one test case |

## Conventions

- Requirements use **shall** (mandatory), **should** (recommended) and **may** (optional), as defined in ZP-DOC-00.
- **FR-enn**: functional requirement (*e* = feature/epic number). **NFR-nnn**: non-functional requirement.
  **BR-nnn**: business rule, a fact or policy of the domain that the system must respect.
- **Priority** uses MoSCoW (M, S, C), inherited from the parent story unless stated.
- **Verification method** (ISO/IEC/IEEE 29148): **T** test, **D** demonstration, **I** inspection, **A** analysis.

# Overall description

## Product perspective

ZedPath is a new, self-contained web application. It is not part of, and does not connect to, any UGC or
government system: it **reads** their public documents and helps students act on them. The system context
is shown in ZP-DOC-01. It runs entirely on the Cloudflare free plan (ZP-DOC-06).

## Product functions

At the highest level, ZedPath shall let a student: enter their results once (FE-1); see every reachable
state-university course with a likelihood band and reasons (FE-2); build and check a UGC preference list
(FE-3); follow a dated journey with reminders (FE-4); see every other route (FE-5); ask cited questions in
three languages (FE-6); share with family and get help from others (FE-7); and prepare for university (FE-8).
Behind these, ZedPath shall keep every fact sourced, checked and correctable (FE-9).

## User classes and characteristics

Table: User classes

| Class | Persona | Frequency | Technical skill | Key needs |
|---|---|---|---|---|
| Student | P1, P2 | Intense for 4 to 8 weeks after results, then occasional | Smartphone-native; limited data | Accuracy, speed, own language |
| Family member | P3 | Occasional, through shared cards | Low | A simple summary in Sinhala or Tamil |
| Teacher or counsellor | P4 | Weekly in application season | Moderate | Class overview |
| Verified senior | P5 | Occasional | High | Safe, verified space |
| Curator | P6 | Daily in season, weekly otherwise | High | Fast review of extracted facts |

## Operating environment

- Client: mobile web browsers (Chrome for Android 120+, Samsung Internet 24+, Safari for iOS 17+) and current
  desktop browsers. Screen widths from 360 px.
- Server: Cloudflare Workers runtime and Cloudflare data services (free plan).

## Design and implementation constraints

These constraints are binding. Their detail is in ZP-DOC-06.

- **CON-1** The system shall run within the Cloudflare **free plan** limits verified on 5 October 2026.
- **CON-2** The application, API and tooling shall be written in **TypeScript**.
- **CON-3** The user interface shall follow **Material Design 3**.
- **CON-4** The system shall not send email, SMS or WhatsApp messages (not available or not free).
- **CON-5** Official third-party documents shall be stored privately and cited, not redistributed.

## Assumptions and dependencies

As stated in ZP-DOC-01 (AS-1 to AS-4, DE-1 to DE-3).

# External interface requirements

## User interfaces

- **UI-1** The interface shall be a responsive, mobile-first web application with bottom navigation of at most
  four destinations (Journey, Courses, Routes, Ask), as specified in ZP-DOC-07.
- **UI-2** Every screen shall offer a language switch between Sinhala, Tamil and English.
- **UI-3** Every displayed fact shall offer access to its source (document, page, date verified).

## Software interfaces

Table: Software interfaces

| ID | External system | Purpose | Protocol and format |
|---|---|---|---|
| SI-1 | Google Gemini API, through Cloudflare AI Gateway | Read documents and photos; generate answers in three languages | HTTPS, JSON |
| SI-2 | Cloudflare Workers AI | Embeddings and fallback inference | Workers binding |
| SI-3 | Government Gazette website | Fetch weekly Gazette issues | HTTPS, PDF |
| SI-4 | Web Push services of browsers | Deliver reminders | Web Push protocol (RFC 8030) with VAPID (RFC 8292) |
| SI-5 | Device calendar | Import deadlines | iCalendar file (RFC 5545) |
| SI-6 | Device share sheet | Share the family card | Web Share API |
| SI-7 | Google Sign-In (R2) | Verify university accounts of seniors | OpenID Connect |

## Communications interfaces

- **CI-1** All traffic shall use HTTPS (TLS 1.2 or later).
- **CI-2** The public API shall exchange JSON (UTF-8).

# Functional requirements

Each table lists the requirements of one feature. *Source* names the parent story and acceptance criteria.

## FE-1 Profile and results

Table: Functional requirements, FE-1 Profile and results

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-101 | The system shall let a student enter stream, district, Z-score and three subjects with grades, without an account. | US-101, AC-101.1 | M | T |
| FR-102 | The system shall reject a Z-score outside −4.0000 to +4.0000 or with more than four decimal places, with an inline message. | AC-101.2 | M | T |
| FR-103 | The system shall reject a subject combination that is not admissible for the selected stream (BR-010) and name the offending subject. | AC-101.3 | M | T |
| FR-104 | The system shall store the profile only on the student's device and restore it on the next visit. | AC-101.4 | M | T |
| FR-105 | The system shall recalculate every result immediately when any profile field changes. | AC-102.1 | M | T |
| FR-106 | The system shall delete the profile from the device on request. | AC-102.2 | M | T |
| FR-107 | The system shall estimate a Z-score **range** from expected marks, using at least the three most recent years of subject statistics, labelled *Estimate*. | US-103 | S | T |
| FR-108 | When an estimated range is used, bands shall be computed from the lower bound and marked as estimate-based. | AC-103.3 | S | T |
| FR-109 | The system shall read stream, subjects, grades, Z-score and district from a results-sheet photo and require the student to confirm each field before use. | US-104 | S | D |
| FR-110 | The system shall highlight every field read with confidence below 0.85 for the student to check. | AC-104.2 | S | T |
| FR-111 | The system shall delete an uploaded photo as soon as reading finishes, and record the deletion in the audit log. | AC-104.3 | S | I |
| FR-112 | The system shall switch all interface text between Sinhala, Tamil and English without losing the current screen or data. | US-105 | M | D |
| FR-113 | When an offering has an O/L requirement (BR-022), the system shall ask for the relevant O/L grades, evaluate them, and show the offering as *Check O/L requirement* until they are given. | US-201; BR-022 | M | T |

## FE-2 State-university course discovery

Table: Functional requirements, FE-2 State-university course discovery

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-201 | The system shall list every course offering for which the student meets the general eligibility rules (BR-001 to BR-004) and the course's specific subject and grade requirements (BR-020 to BR-024), excluding suspended offerings (BR-026). | US-201 | M | T |
| FR-202 | The eligibility check shall evaluate alternative requirements ("A **or** B") and combined requirements ("A **and** B") exactly as stated in the handbook. | AC-201.3 | M | T |
| FR-203 | The eligibility check shall run on the server; the client may cache results but shall not be the only place the rules are applied. | US-201; DoD 2 | M | I |
| FR-204 | The system shall show the number of hidden offerings and, for each, the rule failed in plain language with a link to the handbook page. | US-202 | M | T |
| FR-205 | The system shall assign each eligible offering exactly one band (Safe, Likely, Reach, Out of range or Not enough data) using the banding rules BR-030 to BR-036. | US-203 | M | T |
| FR-206 | For each banded offering, the system shall show the signed difference between the student's Z-score and the latest cut-off (four decimals) and the trend (rising, steady, jumpy). | AC-203.3 | M | T |
| FR-207 | No screen or answer shall state or imply that admission is certain. | AC-203.4 | M | I |
| FR-208 | The system shall show, per offering, the cut-off for the student's district for each available intake year, with the student's Z-score as the last row. | US-204 | M | T |
| FR-209 | Every cut-off, rule, duration, medium and aptitude-test flag shown shall link to its source document and page and show the date verified. | AC-204.2 | M | I |
| FR-210 | The system shall filter offerings by band, university, field of study and distance from the student's district, and update the count. | US-205 | S | T |
| FR-211 | For a chosen dream offering, the system shall show the gap to its lowest cut-off in the available years and classify the gap as *small* (≤ 0.10) or *large* (> 0.10). | US-206 | S | T |
| FR-212 | For a dream offering, the system shall suggest up to three offerings in the same field that are Safe or Likely for the student. | AC-206.2 | S | T |
| FR-213 | The system shall compare two offerings side by side on band, duration, medium, campus, aptitude test and trend. | US-207 | C | D |
| FR-214 | The system shall show monthly living-cost estimates by campus with sample size and collection date. | US-208 | C (R2) | D |

## FE-3 Preference list

Table: Functional requirements, FE-3 Preference list

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-301 | The system shall let the student add eligible offerings to an ordered list and reorder them by drag and drop and by keyboard. | US-301 | M | T |
| FR-302 | The system shall refuse to add an offering for which the student is not eligible. | AC-301.3 | M | T |
| FR-303 | The system shall warn when a Safe offering is listed above a Likely or Reach offering (BR-040, BR-041). | US-302 | M | T |
| FR-304 | The system shall warn when the list contains no Safe offering (BR-042). | AC-302.2 | M | T |
| FR-308 | The system shall limit the list to 125 Uni-Codes with no duplicates (BR-043). | US-301; BR-017 | M | T |
| FR-305 | The system shall propose a corrected order that keeps the student's most-wanted offerings first and Safe ones last, applied only after the student confirms. | AC-302.3 | M | T |
| FR-306 | The system shall copy the list's uni-codes to the clipboard, one per line, in list order. | US-303 | M | T |
| FR-307 | The system shall present the official application steps with the most common mistake for each, linked to the official instructions. | US-304 | S | I |

## FE-4 Journey and deadlines

Table: Functional requirements, FE-4 Journey and deadlines

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-401 | The system shall show the student's journey stages in date order, marking past stages done and placing the next open deadline at the top with days remaining. | US-401 | M | T |
| FR-402 | Every date shall be labelled *Confirmed* (with its source) or *Estimated* (with the basis, e.g. the previous year's date). | US-402 | M | T |
| FR-403 | When the list contains an offering with an aptitude or practical test (BR-025), the journey shall add the test's application and test dates. | US-403 | M | T |
| FR-404 | The system shall generate an iCalendar file of the journey's deadlines with alarms 7 days and 1 day before each. | AC-404.1 | S | T |
| FR-405 | The system shall send web-push reminders 7 days and 1 day before each deadline to students who opted in. | AC-404.2 | S | T |
| FR-406 | The system shall delete a push subscription when the student turns notifications off. | AC-404.3 | S | T |
| FR-407 | The system shall check special-intake categories against the student's answers and link each to its handbook section. | US-405 | C (R2) | T |
| FR-408 | The system shall let the student add a route's dates to the journey. | US-406 | C (R2) | D |

## FE-5 Other routes

Table: Functional requirements, FE-5 Other routes

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-501 | The system shall list non-UGC routes in seven groups (private and non-state degrees, higher national diplomas, professional qualifications, vocational courses, job examinations, study abroad, retry) and mark each as open or not open to the student with the reason. | US-501 | M | T |
| FR-502 | Each route shall show entry requirements, duration, approximate cost, intake timing and sources with verified dates. | US-502 | M | I |
| FR-503 | The system shall show newly announced job examinations whose education and age rules the student meets, with closing date and Gazette link. | US-503 | M | T |
| FR-504 | A job-examination notice extracted with low confidence shall not be shown until a curator approves it. | AC-503.2 | M | T |
| FR-505 | The system shall show the recognition status of a programme's awarding university and local approval, each with source and date checked. | US-504 | S (R2) | I |
| FR-506 | The system shall check the basic conditions of the government interest-free loan scheme. | US-505 | S (R2) | T |
| FR-507 | The system shall list government scholarships abroad open to school leavers with usual timing and requirements. | US-506 | C (R2) | I |
| FR-508 | For a dream offering, the system shall show the Z-score gap, the student's attempt number out of the maximum (BR-004) and alternative routes. | US-507 | S | T |

## FE-6 Ask

Table: Functional requirements, FE-6 Ask

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-601 | The system shall answer a question in the language it was asked (Sinhala, Tamil or English). | US-601 | M | T |
| FR-602 | Answers about eligibility shall use the student's profile when the student has one. | AC-601.2 | M | T |
| FR-603 | Every factual answer shall cite at least one stored source (document and page). | US-602 | M | T |
| FR-604 | When no stored source supports an answer, the system shall say it does not know and point to an official contact, and shall not generate an unsupported answer. | AC-602.2 | M | T |
| FR-605 | The system shall decline to predict future cut-offs or guarantee admission, and offer the historical pattern instead. | US-603 | S | T |
| FR-606 | The system shall offer actions under an answer (add to list, add to journey, compare). | US-604 | C (R2) | D |

## FE-7 People around the student

Table: Functional requirements, FE-7 People around the student

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-701 | The system shall generate a share card (image and short text) in the chosen language and pass it to the device share sheet. | US-701 | M | D |
| FR-702 | The share card shall exclude the student's name and Z-score unless the student includes them. | AC-701.2 | M | T |
| FR-703 | The system shall show seniors' answers with course, year and a verified badge. | US-702 | S (R2) | D |
| FR-704 | The system shall verify a senior by a university Google account on a recognised domain, or by curator review of proof that is deleted after the decision. | US-703 | S (R2) | T |
| FR-705 | The system shall provide groups by batch and target course. | US-704 | C (R2) | D |
| FR-706 | The system shall show a teacher aggregate counts for students who shared with the teacher's class code, and names only of those who shared. | US-705 | C (R2) | T |

## FE-8 After selection

Table: Functional requirements, FE-8 After selection (Release R2)

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-801 | The system shall present each university's registration requirements as a checklist with where to obtain each item. | US-801 | C | I |
| FR-802 | The system shall explain Mahapola and bursary eligibility and the documents that delay applications. | US-802 | C | I |
| FR-803 | The system shall propose a month-by-month plan for the period before lectures, based on the course and district. | US-803 | C | D |
| FR-804 | The system shall keep a documents checklist covering every route. | US-804 | C | D |

## FE-9 Data and trust

Table: Functional requirements, FE-9 Data and trust

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-901 | The system shall let a curator register a source document with publisher, title, edition, issue date and language, store it unchanged, and record its SHA-256 fingerprint. | US-901 | M | T |
| FR-902 | The system shall detect a duplicate source by fingerprint. | AC-901.2 | M | T |
| FR-903 | The system shall extract, from a handbook source, one candidate rule per course with a confidence score and source page. | US-902 | M | T |
| FR-904 | An independent second model shall mark each candidate rule *agree* or *disagree*. | AC-902.2 | M | T |
| FR-905 | A candidate rule shall be published automatically only when both models agree and both confidences are at least 0.90; otherwise it shall enter the review queue. | AC-902.3 | M | T |
| FR-906 | The review queue shall show the source text, the proposed structured fact, both verdicts and the page, and let the curator approve, correct or reject. | US-903 | M | D |
| FR-907 | Each review decision shall be recorded with reviewer, time and the change made. | AC-903.2 | M | T |
| FR-908 | The system shall fetch new Gazette issues weekly, extract exam name, eligibility, age limit and closing date with confidence, and log counts per run. | US-904 | M | T |
| FR-909 | A failed scheduled run shall be retried automatically and its failure shown to the curator. | AC-904.2 | M | T |
| FR-910 | The system shall let anyone report a mistake on any fact with an optional note, linked to that fact, and queue it for the curator. | US-905 | M | T |
| FR-911 | The system shall keep every previous version of a published fact. | US-906 | S | T |
| FR-912 | The system shall require a bot check before accepting a report, a reminder opt-in or a question. | US-907 | S | T |
| FR-913 | The system shall limit Ask requests per client per minute (NFR-034) and return a friendly message when exceeded. | AC-907.2 | S | T |

# Non-functional requirements

## Performance

Table: Performance requirements

| ID | Requirement | Ver |
|---|---|---|
| NFR-001 | The first screen shall be interactive within 3 seconds on a "Fast 3G" network profile on a mid-range Android phone. | T |
| NFR-002 | Eligibility and banding results shall appear within 2 seconds of submitting a profile on a "Fast 3G" profile. | T |
| NFR-003 | 95% of API requests (excluding Ask) shall complete within 500 ms at the edge. | T |
| NFR-004 | Ask answers shall begin streaming within 4 seconds in 95% of cases. | T |
| NFR-005 | Each API request shall use less than 10 ms of CPU time (the free-plan limit). | A |
| NFR-006 | The initial JavaScript download shall not exceed 200 KB compressed. | I |

## Capacity and cost

Table: Capacity and cost requirements

| ID | Requirement | Ver |
|---|---|---|
| NFR-010 | The system shall serve 10,000 students per admission cycle within the free plan (BO-1, BO-6). | A |
| NFR-011 | Daily usage of each Cloudflare free-plan quota shall stay below 70% on a typical day and below 100% on results day, according to the budget in ZP-DOC-06. | A |
| NFR-012 | Page navigation shall not consume Worker requests (static assets are served without invoking the Worker). | I |

## Usability, accessibility and localisation

Table: Usability, accessibility and localisation requirements

| ID | Requirement | Ver |
|---|---|---|
| NFR-020 | A first-time user shall reach a checked preference list in under 10 minutes without help (BO-3), measured with at least 5 participants. | T |
| NFR-021 | The interface shall meet WCAG 2.2 level AA. | I |
| NFR-022 | Touch targets shall be at least 48 × 48 dp, following Material Design 3. | I |
| NFR-023 | All interface text shall exist in Sinhala, Tamil and English; no screen shall mix languages except for official names and quotations. | I |
| NFR-024 | Sinhala and Tamil text shall render correctly with Noto Sans Sinhala and Noto Sans Tamil. | D |
| NFR-025 | Layouts shall work from 360 px width without horizontal scrolling. | T |

## Security and privacy

Table: Security and privacy requirements

| ID | Requirement | Ver |
|---|---|---|
| NFR-030 | The system shall store no personal data on the server without the student's explicit opt-in, in line with the Personal Data Protection Act No. 9 of 2022 (Sri Lanka). | I |
| NFR-031 | Results photos shall be deleted within 5 minutes of upload, whether or not reading succeeds. | T |
| NFR-032 | Curator functions shall require authentication; every curator action shall be logged. | T |
| NFR-033 | Secrets (API keys) shall be stored as Cloudflare secrets and never in source code or the repository. | I |
| NFR-034 | Ask shall accept at most 10 questions per client per minute and 100 per client per day. | T |
| NFR-035 | All input shall be validated on the server; database access shall use bound parameters only. | I |

## Reliability and availability

Table: Reliability and availability requirements

| ID | Requirement | Ver |
|---|---|---|
| NFR-040 | Core browsing (courses, bands, list) shall remain usable if the AI services are unavailable. | T |
| NFR-041 | Scheduled jobs shall retry failed steps at least three times with back-off. | T |
| NFR-042 | The database shall be restorable to any point in the previous 7 days (D1 Time Travel). | D |

## Data quality

Table: Data quality requirements

| ID | Requirement | Ver |
|---|---|---|
| NFR-050 | 100% of published facts shall reference a source document and page (BO-2). | A |
| NFR-051 | Cut-off values shall be stored and compared as exact four-decimal values, not binary floating point. | I |
| NFR-052 | Imported cut-off tables shall be verified by two independent extraction methods with zero unexplained differences before publication. | T |
| NFR-053 | A reported mistake shall be triaged within 48 hours during the admission season. | A |

## Maintainability and portability

Table: Maintainability and portability requirements

| ID | Requirement | Ver |
|---|---|---|
| NFR-060 | Business rules (eligibility, banding thresholds) shall be data or pure functions with unit tests, not scattered through the interface. | I |
| NFR-061 | Rule-engine code shall have at least 90% branch coverage. | A |
| NFR-062 | A new intake year's handbook and cut-offs shall be loadable without code changes. | D |
| NFR-063 | The front end shall run in any standards-compliant browser without installation; it may be installed as a progressive web app. | D |

# Business rules

Business rules are facts and policies of the admission domain that the system must respect. Their source is
the UGC handbook and cut-off table for the 2025/26 intake; rules marked *ZedPath policy* are product decisions.

Sources are cited as **HB p.*n*** (printed page of the UGC handbook 2025/26 [2]; PDF page = printed + 7) and
**COP** (UGC cut-off table 2025/26 [3]). Every handbook rule below was checked word for word against the PDF
text. Rules marked **ZedPath policy** are product decisions; they are configurable and reviewed each intake.

## General eligibility

Table: Business rules, general eligibility for state-university admission

| ID | Rule | Source |
|---|---|---|
| BR-001 | A candidate must have at least an *S* grade in each of three approved subjects in **one sitting**. | HB p.9 |
| BR-002 | A candidate must have at least **30%** in the Common General Paper (also called the Common General Test), in the current attempt or a previous one within the three allowed; without it the candidate cannot register even if selected. | HB p.9 |
| BR-003 | A candidate may use at most **three attempts**; after the third, results of any attempt cannot be used. Attempts need not be consecutive. | HB p.9, p.13 |
| BR-004 | Some candidates are ineligible regardless of results: those already registered as internal students of a UGC institution, degree holders, certain diploma and college students, holders of a government-channelled foreign scholarship, and anyone who made a false declaration. | HB p.13 to p.15 |
| BR-005 | A Z-score is entered with exactly four decimal places and must lie between −4.0000 and +4.0000. (Published cut-offs for 2025/26 range from −0.8505 to 2.7935.) | ZedPath policy; COP |
| BR-006 | The candidate's district is the district of the school attended for the most days, totalling at least one year, in the three years before the examination; otherwise it is the district of permanent residence. | HB p.10, p.11 |
| BR-007 | Sixteen districts are educationally disadvantaged: Nuwara Eliya, Hambantota, Jaffna, Kilinochchi, Mannar, Mullaitivu, Vavuniya, Trincomalee, Batticaloa, Ampara, Puttalam, Anuradhapura, Polonnaruwa, Badulla, Monaragala and Ratnapura. | HB p.9 |

## Streams, subjects and grades

Table: Business rules, streams, subjects and grades

| ID | Rule | Source |
|---|---|---|
| BR-010 | Subjects belong to six streams: Arts, Commerce, Biological Science, Physical Science, Engineering Technology and Biosystems Technology. A subject combination is admissible only if it follows the rules of its stream (for Arts, the basket rules 01 to 04). | HB p.20, p.31 to p.34, p.77, p.79 |
| BR-011 | Grades are ordered A > B > C > S > F. The handbook names S (Ordinary Pass), C (Credit Pass) and B (Very Good Pass); the full order is the Department of Examinations' grading scale. | HB p.9, p.83; ZedPath policy for the order |
| BR-012 | The handbook gives no numeric subject codes; ZedPath assigns its own subject identifiers and maps every handbook subject name to one of them. | ZedPath policy |

## Selection and the preference list

Table: Business rules, quotas, selection and the preference list

| ID | Rule | Source |
|---|---|---|
| BR-013 | Up to 40% of places in a course are filled on all-island merit, up to 55% by district quota in proportion to population, and the remaining 5% are shared by the 16 educationally disadvantaged districts. | HB p.8, p.9 |
| BR-014 | Ten Arts courses (Arts, Arts SP, Arts SAB, Communication Studies, Peace and Conflict Resolution, Islamic Studies, Arabic Language, TESL, Social Work, Arts-IT) are filled **100% on all-island merit**; their cut-off is the same in every district (marked * in the COP). | HB p.8, p.21; COP |
| BR-015 | Each course at each institution has a **Uni-Code**: a three-digit course code plus one institution letter (for example, 016C). There are 255 Uni-Codes for 2025/26. | HB p.112 |
| BR-016 | The UGC selects a candidate for the **highest-preferred Uni-Code** whose places are not already filled by candidates with higher Z-scores; a Uni-Code the candidate did not list is never allocated. | HB p.112, p.113 |
| BR-017 | A candidate may list at most **125** Uni-Codes and may not list the same Uni-Code twice. | HB p.113 |
| BR-018 | A candidate who does not register for a selected Uni-Code is not considered for the same course at any other university in later rounds, even if preferred higher. | HB p.114 |
| BR-019 | The order may be changed **once**, online, within two weeks of the closing date; the change replaces the whole list. | HB p.116, p.155 |

## Course-specific requirements

Table: Business rules, course-specific requirements

| ID | Rule | Source |
|---|---|---|
| BR-020 | Each Uni-Code has subject and grade requirements that follow one of twenty patterns (fixed trio; trio with a count of higher grades; two fixed subjects plus a third from a list; one of several trios; slot rules; a gate subject at a higher grade; *n* of a list at a higher grade; and others). ZP-DOC-05 defines a rule grammar that expresses all twenty. | HB Section 2.2, p.31 to p.110 |
| BR-021 | Alternatives ("A or B") and combinations ("A and B") in a requirement are evaluated exactly as written; a requirement such as "a C grade in Combined Mathematics or Physics" is met by either subject. | HB p.70 (example: Computer Science) |
| BR-022 | Fifty-one Uni-Codes also require G.C.E. (O/L) results (for example, a Credit Pass in English or Mathematics); some accept an A/L pass instead. The course text prevails over the summary table where they differ. | HB p.149, p.150; course pages |
| BR-023 | Some requirements are not academic (Nursing: height at least 4 feet 10 inches and no deformity). They are shown as additional requirements and are not evaluated. | HB p.57, p.150 |
| BR-024 | Where a stream's "you may also apply for" list omits a course whose subject rule the student meets, the **subject rule prevails**. | ZedPath policy (handbook lists are incomplete) |
| BR-025 | Twenty-four Uni-Codes require a practical or aptitude test run by the university; the student applies to the university directly after its press notice; passing does not remove the cut-off; failing affects only that course. | HB p.38, p.151 |
| BR-026 | Eight courses of the Gampaha Wickramarachchi University of Indigenous Medicine are suspended for 2025/26 and shall not be offered. | HB p.48, p.66, p.109 |
| BR-027 | Some courses are not taught in all three languages, so a student may meet the cut-off and still not be selected; this caveat is shown on every course page. | COP note; HB p.174 |

## Cut-off data

Table: Business rules, cut-off data

| ID | Rule | Source |
|---|---|---|
| BR-028 | A cut-off is the minimum Z-score selected for one Uni-Code from one district in one intake year, published by the UGC after re-scrutiny. Previous cut-offs are guidance only and are presented as such. | HB p.10, p.112, p.173; COP |
| BR-029 | *NQC* ("No Qualified Candidates") means no candidate from that district was selected for that course, for one of three stated reasons; it is not a numeric cut-off. | COP legend |

## Banding (ZedPath policy)

Bands turn cut-off history into an honest likelihood. They never promise admission (FR-207). Let *Z* be the
student's Z-score (or the lower bound of an estimate), *C* the set of numeric cut-offs for the offering and the
student's district over the most recent five intake years, *n* the number of values in *C*, and *c*ₗ the most
recent value in *C*.

Table: Business rules, banding (ZedPath policy, configurable)

| ID | Rule |
|---|---|
| BR-030 | If *n* = 0 (every year NQC, or a new course), the band is **Not enough data**. |
| BR-031 | If *n* ≥ 3 the band uses *full history*; if *n* is 1 or 2 it uses *limited history* and is labelled "based on *n* year(s)". The margin *m* is 0.0000 for full history and 0.1000 for limited history. |
| BR-032 | **Safe:** *Z* ≥ max(*C*) + *m*. **Likely:** *c*ₗ ≤ *Z* < max(*C*) + *m*. **Reach:** min(*C*) − 0.0500 ≤ *Z* < *c*ₗ. **Out of range:** *Z* < min(*C*) − 0.0500. Comparisons use exact four-decimal values (NFR-051). |
| BR-033 | Trend (full history only): the least-squares slope of *C* by year; **rising** above +0.0200 per year, **falling** below −0.0200, otherwise **steady**; **jumpy** if the standard deviation of *C* exceeds 0.1000 (overrides the others). |
| BR-034 | An NQC year is excluded from *C* and shown as "No qualified candidates in *year*". |
| BR-035 | For all-island-merit offerings (BR-014) the single all-island cut-off is used for every district. |
| BR-036 | The thresholds 0.0500, 0.1000 and 0.0200 are configuration values. When three or more years are loaded they shall be validated by back-testing: bands computed from earlier years are compared with the following year's actual cut-offs. |

## Preference-list checks (ZedPath policy, derived from BR-016)

Table: Business rules, preference-list checks

| ID | Rule |
|---|---|
| BR-040 | Because selection takes the highest-listed Uni-Code the student clears (BR-016), an offering listed below one the student is very likely to clear is very unlikely to be reached. |
| BR-041 | **Ordering warning:** when a Safe offering is listed above any Likely or Reach offering, the student is warned that the offerings below it are unlikely to be reached. |
| BR-042 | **Coverage warning:** when the list contains no Safe offering, the student is warned that they may not be placed anywhere. |
| BR-043 | The list enforces BR-017: at most 125 entries and no duplicates. |

## Known gaps in the official sources

The 2025/26 handbook does not state: application opening and closing dates (announced by press notice),
test dates for aptitude tests, a tie-break rule, a re-scrutiny procedure, Mahapola or bursary eligibility rules,
hostel allocation rules, or the registration deadline. ZedPath shows these as *Estimated* or *Not yet announced*
(FR-402), never as confirmed facts. Subject means and standard deviations needed for the Z-score estimate (FR-107)
are not in either source; FR-107 is therefore at risk until those statistics are obtained.

# Verification

Each requirement states its verification method. ZP-DOC-08 maps every requirement to test cases and records
results. A requirement is verified when its test cases pass, or when the inspection, analysis or demonstration
is recorded with its evidence.

# Traceability: stories to requirements {.appendix}

Table: Story-to-requirement traceability (every story in ZP-DOC-02 is covered)

| Story | Title | Requirements |
|---|---|---|
| US-101 | Enter my results once | FR-101, FR-102, FR-103, FR-104 |
| US-102 | Change my profile at any time | FR-105, FR-106 |
| US-103 | Estimate my Z-score before results | FR-107, FR-108 |
| US-104 | Read my results sheet from a photo | FR-109, FR-110, FR-111 |
| US-105 | Use the app in my language | FR-112 |
| US-201 | See every course I am eligible for | FR-113, FR-201, FR-202, FR-203 |
| US-202 | See why a course is hidden from me | FR-204 |
| US-203 | See Safe / Likely / Reach for each course | FR-205, FR-206, FR-207 |
| US-204 | Open a course page with sources | FR-208, FR-209 |
| US-205 | Filter and sort courses | FR-210 |
| US-206 | Work backwards from a dream course | FR-211, FR-212 |
| US-207 | Compare two courses | FR-213 |
| US-208 | See what living there costs | FR-214 |
| US-301 | Build my preference list | FR-301, FR-302, FR-308 |
| US-302 | Get warned about a bad order | FR-303, FR-304, FR-305 |
| US-303 | Copy uni-codes in order | FR-306 |
| US-304 | Learn the UGC form step by step | FR-307 |
| US-401 | See my journey with the next step first | FR-401 |
| US-402 | Know whether a date is confirmed or estimated | FR-402 |
| US-403 | Be told about aptitude tests for courses on my list | FR-403 |
| US-404 | Get reminders before deadlines | FR-404, FR-405, FR-406 |
| US-405 | Check whether a special intake applies to me | FR-407 |
| US-406 | Add my own steps to the journey | FR-408 |
| US-501 | See every route my results open | FR-501 |
| US-502 | Open a route's details | FR-502 |
| US-503 | Be alerted about job exams I qualify for | FR-503, FR-504 |
| US-504 | Check whether a degree is recognised | FR-505 |
| US-505 | Check the interest-free loan scheme | FR-506 |
| US-506 | See scholarships abroad | FR-507 |
| US-507 | Understand what retrying would take | FR-508 |
| US-601 | Ask a question in my language | FR-601, FR-602 |
| US-602 | Every answer cites its source | FR-603, FR-604 |
| US-603 | The assistant won't predict the future | FR-605 |
| US-604 | Turn an answer into an action | FR-606 |
| US-701 | Share a summary with my family | FR-701, FR-702 |
| US-702 | Ask a verified senior | FR-703 |
| US-703 | Become a verified senior | FR-704 |
| US-704 | Join a group for my batch and target course | FR-705 |
| US-705 | See my class's progress as a teacher | FR-706 |
| US-801 | Get my registration checklist | FR-801 |
| US-802 | Check Mahapola and bursary | FR-802 |
| US-803 | Plan the gap year | FR-803 |
| US-804 | Keep my documents ready | FR-804 |
| US-901 | Register an official source | FR-901, FR-902 |
| US-902 | Extract rules from the handbook with AI | FR-903, FR-904, FR-905 |
| US-903 | Review uncertain facts | FR-906, FR-907 |
| US-904 | Scan the Gazette every week | FR-908, FR-909 |
| US-905 | Report a mistake | FR-910 |
| US-906 | Keep a history of every change | FR-911 |
| US-907 | Protect the app from abuse | FR-912, FR-913 |

# Glossary {.appendix}

Table: Terms and abbreviations used in this document

| Term | Meaning |
|---|---|
| Band | ZedPath's classification of an offering relative to the student's Z-score: Safe, Likely, Reach, Out of range, Not enough data |
| COP | The UGC table of minimum Z-scores ("cut-off points") by course, university and district |
| NQC | "No Qualified Candidates": a cut-off cell for which no candidate from that district was selected |
| Offering | One course of study at one university |
| SRS | Software Requirements Specification |
| VAPID | Voluntary Application Server Identification for Web Push (RFC 8292) |

# References {.appendix}

Table: Sources referred to in this document

| Ref | Source |
|---|---|
| [1] | ISO/IEC/IEEE 29148:2018, *Requirements engineering* |
| [2] | University Grants Commission, *Admission to Undergraduate Courses of the Universities in Sri Lanka, Academic Year 2025/2026* (student handbook) |
| [3] | University Grants Commission, *Minimum "Z" Scores for selection to various Courses of Study, Academic Year 2025/2026*, 31 July 2026 |
| [4] | Personal Data Protection Act, No. 9 of 2022, Democratic Socialist Republic of Sri Lanka |
| [5] | W3C, *Web Content Accessibility Guidelines (WCAG) 2.2* |
| [6] | IETF RFC 5545 (iCalendar), RFC 8030 (Web Push), RFC 8292 (VAPID) |
| [7] | ZP-DOC-02 User Stories; ZP-DOC-06 Software Architecture |
