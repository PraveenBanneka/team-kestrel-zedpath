---
id: ZP-DOC-03
title: Software Requirements Specification
subtitle: Functional, non-functional and business-rule requirements for ZedPath Release 1 and 2
version: 2.2
date: 23 October 2026
status: In review
classification: Public
owner: B.M.P Banneka, Product Owner
author: Team Kestrel (drafted with Claude, AI coding partner)
approved: 15 Oct 2026 (v2.1); 14 Oct 2026 (v2.0); 5 Oct 2026 (v1.0)
signature: Approved in writing (project channel): v2.1 on 15 Oct 2026, v2.0 on 14 Oct 2026, v1.0 on 5 Oct 2026
approver: B.M.P Banneka, Product Owner
reviewer: Claude (AI coding partner), consistency and traceability review
standard: ISO/IEC/IEEE 29148:2018, software requirements specification content; ZP-DOC-00
revision: 0.9 | 5 Oct 2026 | Team Kestrel | First issue: functional requirements derived from ZP-DOC-02; NFRs; business rules from the UGC handbook and cut-off table 2025/26; submitted for approval
revision: 1.0 | 5 Oct 2026 | B.M.P Banneka | Approved by the product owner; baselined
revision: 2.0 (draft) | 11 Oct 2026 | Team Kestrel | Under revision for change requests CR-001 to CR-006 and the video review of 11 October 2026 (all approved by the product owner): new FR-114 to FR-124, FR-215 to FR-218, FR-309 to FR-311, FR-409 to FR-417, FR-509, FR-510, FR-607 to FR-612, FR-707 to FR-719, UI-4, UI-5, SI-8, SI-9; revised UI-1, CON-4, FR-101, FR-213, FR-401, FR-402, FR-404, FR-501, FR-503, FR-606, FR-703, FR-705, NFR-030; superseded FR-104, FR-405, FR-406, FR-408, FR-704, FR-713 and SI-4; withdrew FR-508; new NFR-036 to NFR-039, NFR-043, NFR-070 to NFR-075, BR-050 to BR-058, BR-060 to BR-063, BR-070 to BR-077, BR-080; traceability extended. Scope change, so the next approved version is 2.0. Version 1.0 of 5 October 2026 stays in force until the product owner approves this revision
revision: 2.0 | 14 Oct 2026 | B.M.P Banneka | Approved by the product owner; baselined. Supersedes 1.0
revision: 2.1 (draft) | 15 Oct 2026 | Team Kestrel | Under revision for VR2 (band names, expired session; 14 October 2026) and CR-007 to CR-010 (15 October 2026): new FR-125 to FR-132, FR-219 to FR-221, FR-511, FR-613 to FR-615, FR-720 to FR-723, FR-914; revised FR-205 (displayed band names only); new NFR-007, NFR-054, NFR-055 and security-hardening NFR-076 to NFR-083; new BR-037, BR-059, BR-064, BR-078, BR-079, BR-081; traceability extended to US-112, US-210, US-211, US-508, US-908. No v2.0 requirement is withdrawn or weakened, so the next approved version is 2.1. Version 2.0 of 14 October 2026 stays in force until the product owner approves this revision
revision: 2.1 | 15 Oct 2026 | B.M.P Banneka | Approved by the product owner; baselined. Supersedes 2.0. Mahapola/Bursary line removed from University facts before approval
revision: 2.2 (draft) | 23 Oct 2026 | Team Kestrel | Under revision for CR-011: FR-303 and FR-304 reworded, FR-305 withdrawn, FR-312 added, BR-041 and BR-042 reworded; awaiting approval
revision: 2.2 (draft) | 23 Oct 2026 | Team Kestrel | Also CR-012 (UGC application co-pilot): FR-307 built; FR-313 to FR-316 added; awaiting approval
revision: 2.2 (draft) | 23 Oct 2026 | Team Kestrel | Also CR-013 (career-first mode): FR-317 to FR-319 added; awaiting approval
revision: 2.2 (draft) | 23 Oct 2026 | Team Kestrel | Also CR-014: FR-724 to FR-726 added; FR-317 entry hidden; awaiting approval
revision: 2.2 (draft) | 23 Oct 2026 | Team Kestrel | Also VR5: FR-131 added; awaiting approval
revision: 2.2 (draft) | 23 Oct 2026 | Team Kestrel | Also CR-015 (scholarships and loans): FR-512 to FR-516 added; US-509 trace row moved to the traceability appendix; awaiting approval
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
- **Change markers** (since v1.0): a requirement added or changed by a change request starts with a marker in
  italics: *New (CR-nnn)*, *Revised (CR-nnn)*, *Superseded by X (CR-nnn)* or *Withdrawn (reason)*. A superseded or
  withdrawn requirement keeps its ID and text for traceability (it is *Deleted* in the sense of ZP-DOC-00) and no
  longer has to be met. A new requirement is in force from this revision's approval.

## Change requests since version 1.0

Table: Change requests and the requirements they affect (the stories are listed in ZP-DOC-02)

| CR | Date | Change | Requirements |
|---|---|---|---|
| CR-001 | 5 October 2026 | Student accounts, key derived on the phone, recovery code, cross-device profile, delete account | FR-104, FR-114, FR-115, FR-117 to FR-119, NFR-036, NFR-037, NFR-075, BR-050, BR-051, BR-058 |
| CR-002 | 11 October 2026 | Journey with reminders on the phone; Alerts checked on the phone; Groups with verified seniors, moderation, report, block and rate limits; new navigation | UI-1, UI-5, SI-4, SI-8, SI-9, FR-401, FR-402, FR-405, FR-406, FR-412, FR-503, FR-509, FR-510, FR-703 to FR-705, FR-707 to FR-711, NFR-039, NFR-072, BR-070 to BR-073, BR-076 |
| CR-003 | 11 October 2026 | Account required at the start with name, email, Sri Lankan mobile and date of birth, purpose stated and consent recorded | FR-101, FR-116, FR-120, FR-121, NFR-030, NFR-070, BR-052 to BR-057 |
| CR-004 | 11 October 2026 | Ask answer card: verdict, layout, actions, sources, follow-ups, feedback | FR-606 to FR-611, NFR-073 |
| VR | 11 October 2026 | Video review: languages, search, Compare, chart values, Ask context, reminder settings, resit path removed, multi-select | FR-123, FR-124, FR-213, FR-215 to FR-218, FR-309, FR-310, FR-413, FR-501, FR-508, FR-612, NFR-074, BR-063, BR-080 |
| CR-005 | 11 October 2026 | Group rules before taking part; no phone numbers or emails in messages; popular groups; labelled samples; chat layout | UI-4, FR-712, FR-713, FR-715, FR-716, BR-074 |
| CR-006 | 11 October 2026 | Rules once per account; group info page; preset avatars; rooms stay connected; selection on My list with Compare; Journey ticked by the student within windows; follow courses and notices; Journey on the account; Alerts into the Journey | FR-122, FR-311, FR-401, FR-408, FR-409 to FR-411, FR-414 to FR-417, FR-713, FR-714, FR-717 to FR-719, NFR-038, NFR-043, NFR-071, BR-060 to BR-062, BR-075, BR-077 |

## Change requests since version 2.0

*New in v2.1 (draft).* Requirements added after v2.0 was approved on 14 October 2026. "VR2" is the product owner's review
and decisions of 14 October 2026. "Audit run-1" is the first security audit of 15 October 2026, reported in ZP-DOC-08.

Table: Change requests since version 2.0 and the requirements they affect

| CR | Date | Change | Requirements |
|---|---|---|---|
| VR2 | 14 October 2026 | Bands shown as Very likely, Possible and Unlikely with a one-line meaning; an expired session returns to *Log in* | FR-205 (revised), FR-221, FR-129, BR-037 |
| CR-007 | 15 October 2026 | *Try the demo*: private throwaway account with the sample student, deleted after 24 hours; read-only in groups | FR-125 to FR-127, BR-059 |
| CR-008 | 15 October 2026 | University facts from the UGC report *Sri Lanka University Statistics 2024* on the course page | FR-219, NFR-007, NFR-055, BR-081 |
| CR-009 | 15 October 2026 | Aptitude tests on the course page; NVQ 5/6 to NVQ 7 ladder on route R042 | FR-220, FR-511, BR-064 |
| CR-010 | 15 October 2026 | Security hardening from audit run-1 (leads 1 to 8 and 10 to 17) and the test campaign (D-03, D-04, D-05, D-12) | FR-126, FR-128, FR-130 to FR-132, FR-613 to FR-615, FR-720 to FR-723, FR-914, NFR-054, NFR-076 to NFR-083, BR-059, BR-078, BR-079 |
| CR-011 | 23 October 2026 | Preference-list guidance corrected after the product owner checked how selection really works: the order follows the student's own preference (UGC handbook 2025/26, p.112), so ZedPath no longer calls a Safe-first order a mistake or proposes moving Safe courses last; it explains what the order means and lists the UGC's rules, each with its handbook page | FR-303, FR-304, FR-305 (withdrawn), FR-312, BR-041, BR-042 |
| CR-012 | 23 October 2026 | UGC application co-pilot (the product owner's request after reviewing the UGC's form): a personal document checklist, every field of the UGC registration and steps 1 to 4 ready to copy (pre-filled where ZedPath already knows it, in the UGC's formats), and a print-and-post tracker, each citing the UGC handbook 2025/26 Section 5. ZedPath never logs in to the UGC or fills its form; the answers stay on the student's phone | FR-307, FR-313 to FR-316 |
| CR-013 | 23 October 2026 | Career-first mode: *Who do you want to become?* below My list; curated careers mapped to UGC courses, other paths and checked licence steps | FR-317 to FR-319 |
| CR-014 | 23 October 2026 | Groups for other paths (five standing groups with sample chats); rules in a small window, Agree and join opens the group; the demo sees only joinable groups; career card hidden | FR-724 to FR-726 |
| CR-015 | 23 October 2026 | Scholarships and loans: a seventh group of other paths that also lists the scholarships abroad; `for_routes` checked in the build; *Ways to pay* on the paths a scheme pays for; never a cost or "Free"; search in three languages; in Ask | FR-512 to FR-516 |

# Overall description

## Product perspective

ZedPath is a new, self-contained web application. It is not part of, and does not connect to, any UGC or
government system: it **reads** their public documents and helps students act on them. The system context
is shown in ZP-DOC-01. It runs entirely on the Cloudflare free plan (ZP-DOC-06).

## Product functions

At the highest level, ZedPath shall let a student: create an account with consent and enter their results once (FE-1); see every reachable
state-university course with a likelihood band and reasons (FE-2); build and check a UGC preference list
(FE-3); follow a journey they tick themselves, with followed courses and notices and reminders (FE-4); see every
other route and the notices open now (FE-5); ask cited questions in three languages (FE-6); share with family and
talk with peers and verified seniors in moderated groups (FE-7); and prepare for university (FE-8).
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
  desktop browsers. Screen widths from 360 px. *Revised (CR-002):* also the ZedPath Android app, which loads the
  same web application and posts native notifications (UI-5).
- Server: Cloudflare Workers runtime and Cloudflare data services (free plan).

## Design and implementation constraints

These constraints are binding. Their detail is in ZP-DOC-06.

- **CON-1** The system shall run within the Cloudflare **free plan** limits verified on 5 October 2026.
- **CON-2** The application, API and tooling shall be written in **TypeScript**.
- **CON-3** The user interface shall follow **Material Design 3**.
- **CON-4** The system shall not send email, SMS or WhatsApp messages (not available or not free). *Revised (CR-003):
  this holds until a sending domain and an SMS service exist; email addresses and mobile numbers collected under
  FR-116 are therefore not verified yet.*
- **CON-5** Official third-party documents shall be stored privately and cited, not redistributed.

## Assumptions and dependencies

As stated in ZP-DOC-01 (AS-1 to AS-4, DE-1 to DE-3).

# External interface requirements

## User interfaces

- **UI-1** *Revised (CR-002, CR-006).* The interface shall be a responsive, mobile-first web application with
  bottom navigation of five destinations (Paths, My list, Journey, Groups, Ask) and *Me* (the student's avatar) in the
  top bar, as specified in ZP-DOC-07. Alerts are the Journey's *Open now* tab; the top bar has no bell (FR-417).
  The v1.0 text was "at most four destinations (Journey, Courses, Routes, Ask)".
- **UI-2** Every screen shall offer a language switch between Sinhala, Tamil and English.
- **UI-3** Every displayed fact shall offer access to its source (document, page, date verified).
- **UI-4** *New (CR-005).* Group screens shall follow a chat-app layout: a list of groups, a room with message
  bubbles, and a message box at the bottom.
- **UI-5** *New (CR-002).* An Android app shall load the same web application in its own window and post native
  notifications for reminders (FR-412).

## Software interfaces

Table: Software interfaces

| ID | External system | Purpose | Protocol and format |
|---|---|---|---|
| SI-1 | Google Gemini API, through Cloudflare AI Gateway | Read documents and photos; generate answers in three languages | HTTPS, JSON |
| SI-2 | Cloudflare Workers AI | Embeddings and fallback inference | Workers binding |
| SI-3 | Government Gazette website | Fetch weekly Gazette issues | HTTPS, PDF |
| SI-4 | Web Push services of browsers. *Superseded by SI-8 (CR-002).* | Deliver reminders | Web Push protocol (RFC 8030) with VAPID (RFC 8292) |
| SI-5 | Device calendar | Import deadlines | iCalendar file (RFC 5545) |
| SI-6 | Device share sheet | Share the family card | Web Share API |
| SI-7 | Google Sign-In (R2) | Verify university accounts of seniors | OpenID Connect |
| SI-8 | Android notification system, through the Android app. *New (CR-002).* | Show reminders scheduled on the phone | Local notifications (Capacitor plugin) |
| SI-9 | Cloudflare Workers AI moderation model. *New (CR-002).* | Screen each group message before others see it | Workers binding |

## Communications interfaces

- **CI-1** All traffic shall use HTTPS (TLS 1.2 or later).
- **CI-2** The public API shall exchange JSON (UTF-8).

# Functional requirements

Each table lists the requirements of one feature. *Source* names the parent story and acceptance criteria.

## FE-1 Profile and results

Table: Functional requirements, FE-1 Profile and results

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-101 | *Revised (CR-003): "without an account" removed; an account comes first (FR-116).* The system shall let a student enter stream, district, Z-score and three subjects with grades. | US-101, AC-101.1 | M | T |
| FR-102 | The system shall reject a Z-score outside −4.0000 to +4.0000 or with more than four decimal places, with an inline message. | AC-101.2 | M | T |
| FR-103 | The system shall reject a subject combination that is not admissible for the selected stream (BR-010) and name the offending subject. | AC-101.3 | M | T |
| FR-104 | *Superseded by FR-117 (CR-001, CR-003).* The system shall store the profile only on the student's device and restore it on the next visit. | AC-101.4 | M | T |
| FR-105 | The system shall recalculate every result immediately when any profile field changes. | AC-102.1 | M | T |
| FR-106 | The system shall delete the profile from the device on request. | AC-102.2 | M | T |
| FR-107 | The system shall estimate a Z-score **range** from expected marks, using at least the three most recent years of subject statistics, labelled *Estimate*. | US-103 | S | T |
| FR-108 | When an estimated range is used, bands shall be computed from the lower bound and marked as estimate-based. | AC-103.3 | S | T |
| FR-109 | The system shall read stream, subjects, grades, Z-score and district from a results-sheet photo and require the student to confirm each field before use. | US-104 | S | D |
| FR-110 | The system shall highlight every field read with confidence below 0.85 for the student to check. | AC-104.2 | S | T |
| FR-111 | The system shall delete an uploaded photo as soon as reading finishes, and record the deletion in the audit log. | AC-104.3 | S | I |
| FR-112 | The system shall switch all interface text between Sinhala, Tamil and English without losing the current screen or data. | US-105 | M | D |
| FR-113 | When an offering has an O/L requirement (BR-022), the system shall ask for the relevant O/L grades, evaluate them, and show the offering as *Check O/L requirement* until they are given. | US-201; BR-022 | M | T |
| FR-114 | *New (CR-001).* The system shall create a student account from a username (BR-050) and a password (BR-051). The device shall derive a key from the password with PBKDF2-HMAC-SHA256 at 600,000 iterations and send only that key; the password shall never be sent (NFR-036). | US-106, AC-106.2 | M | T |
| FR-115 | *New (CR-001).* The system shall let a student log in with username and password on any device, keep the session for 30 days (BR-058), and log out on this device or on every device. | US-106 | M | T |
| FR-116 | *New (CR-003).* The system shall require an account before any screen other than the welcome, sign-up and log-in screens. Sign-up shall require full name, email address, Sri Lankan mobile number and date of birth (BR-052 to BR-055), shall state the purpose of each before consent, and shall be refused by the server when any of them, or the consent, is missing or invalid. | US-106, AC-106.1; US-109, AC-109.1 to AC-109.3 | M | T |
| FR-117 | *New (CR-001; supersedes FR-104).* The system shall keep the student's profile (results, achievements, interests) on the account, restore it on log-in on any device, and keep a copy on the device. A change made offline shall be sent when the device is online and shall not be overwritten by the older copy on the server. | US-106, AC-106.3, AC-106.4; AC-101.5 | M | T |
| FR-118 | *New (CR-001).* The system shall show an 80-bit recovery code once at sign-up and require the student to confirm saving it; it shall let the student set a new password with username and recovery code, then issue a new code and invalidate the old one. Typed 0, 1 and 8 shall be read as O, I and B. | US-107 | S | T |
| FR-119 | *New (CR-001).* On confirmed request, the system shall delete the account and every row stored under it (NFR-075), delete the account's messages from every group it was in, clear the student's data from the device and return to the welcome screen. | US-108 | M | T |
| FR-120 | *New (CR-003).* An account made before CR-003 without contact details shall be asked to complete them before any other screen; no value shall be invented for it. | AC-109.4 | M | T |
| FR-121 | *New (CR-003).* The consent statement shall include that a parent or guardian agrees when the student is under 18 (BR-056); the system shall record the consent version and time (BR-057), and shall tell the student that email and mobile are not verified yet (CON-4). | AC-109.2, AC-109.5 | M | T |
| FR-122 | *New (CR-006).* The system shall let a student choose one of 12 preset avatars, or none (initials, the default), shall accept no other value and no photo upload (BR-077), and shall show the avatar in the app bar, in group member lists and with the group messages the student posts. | US-110 | C | T |
| FR-123 | *New (VR).* The system shall filter the subject list in *About you* as the student types: every word typed must start a word of the subject name, common short forms are understood, and case, accents and punctuation are ignored. | US-111 | S | T |
| FR-124 | *New (VR).* While the Sinhala and Tamil interface text has not been reviewed by native speakers, the system shall say that it is an AI translation being checked; official names and quotations shall stay in English as published. | AC-105.3, AC-105.4 | M | I |
| FR-125 | *New (CR-007).* On *Try the demo*, the server shall create a demo account holding the sample student (profile, achievements, interests and sample contact details, accepted by the same rules as a sign-up), start a 24-hour session and record the account's expiry (BR-059). The account shall have a random username and an unusable random password verifier, so nobody can log in to it with a password. | US-112, AC-112.1 to AC-112.3 | S | T |
| FR-126 | *New (CR-007; bounded by CR-010).* Each demo tap shall first delete up to 50 demo accounts whose expiry has passed, with every row stored under them, and no other account; a failed clean-up shall not block the tap. When 500 demo accounts exist, the tap shall be refused with a message inviting the visitor to create an account (BR-059). | AC-112.4, AC-112.7 | S | T |
| FR-127 | *New (CR-007).* A demo account shall be able to join and read a group that already exists; the server shall refuse it creating a group or reporting a message (403), and the group room shall refuse its posts. | AC-112.5 | S | T |
| FR-128 | *New (CR-010).* Demo mode shall prefill no password, and no password shall be shipped in the app or its scripts. Clearing the phone (*Delete everything on this phone* or *Log out and clear this phone*) shall also switch demo mode off. | AC-102.3, AC-112.6 | S | T |
| FR-129 | *New (VR2).* When the server answers 401 to any request outside the sign-in routes (sign-up, log-in, recovery, demo, log-out), the app shall end the local session and open *Log in*. | AC-106.5 | S | D |
| FR-130 | *New (CR-010).* The app shall record on the phone which username its stored results, list, Journey and settings belong to; when a different student logs in, it shall clear that data from the phone first (the language choice stays). Clearing the phone shall also forget the owner. | AC-102.4 | M | T |
| FR-131 | *New (VR5).* The Welcome screen shall offer *Try the demo* first; choosing a language shall only select it (no navigation), and the demo or a new account shall open in the chosen language; on screens 1024 px and wider it shall fill the screen; the logo in the app's top bar shall link home. | AC-112.8, AC-112.9 | S | T |
| FR-131 | *New (CR-010).* When *Log out* or *Log out everywhere* fails, the app shall say that the student is still logged in and should try again, and shall not show the student as logged out. | AC-106.6 | S | D |
| FR-132 | *New (CR-010).* The server shall record each group room an account opens (GROUP_ROOM_SEEN, migration 0012, ZP-DOC-05); deleting the account shall purge the account's messages from every room it is in or ever opened, read before the rows are deleted. | AC-108.3 | M | T |

## FE-2 State-university course discovery

Table: Functional requirements, FE-2 State-university course discovery

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-201 | The system shall list every course offering for which the student meets the general eligibility rules (BR-001 to BR-004) and the course's specific subject and grade requirements (BR-020 to BR-024), excluding suspended offerings (BR-026). | US-201 | M | T |
| FR-202 | The eligibility check shall evaluate alternative requirements ("A **or** B") and combined requirements ("A **and** B") exactly as stated in the handbook. | AC-201.3 | M | T |
| FR-203 | The eligibility check shall run on the server; the client may cache results but shall not be the only place the rules are applied. | US-201; DoD 2 | M | I |
| FR-204 | The system shall show the number of hidden offerings and, for each, the rule failed in plain language with a link to the handbook page. | US-202 | M | T |
| FR-205 | *Revised (VR2): the names shown to students changed (FR-221); the bands and their rules did not.* The system shall assign each eligible offering exactly one band (Safe, Likely, Reach, Out of range or Not enough data) using the banding rules BR-030 to BR-036. | US-203 | M | T |
| FR-206 | For each banded offering, the system shall show the signed difference between the student's Z-score and the latest cut-off (four decimals) and the trend (rising, steady, jumpy). | AC-203.3 | M | T |
| FR-207 | No screen or answer shall state or imply that admission is certain. | AC-203.4 | M | I |
| FR-208 | The system shall show, per offering, the cut-off for the student's district for each available intake year, with the student's Z-score as the last row. | US-204 | M | T |
| FR-209 | Every cut-off, rule, duration, medium and aptitude-test flag shown shall link to its source document and page and show the date verified. | AC-204.2 | M | I |
| FR-210 | The system shall filter offerings by band, university, field of study and distance from the student's district, and update the count. | US-205 | S | T |
| FR-211 | For a chosen dream offering, the system shall show the gap to its lowest cut-off in the available years and classify the gap as *small* (≤ 0.10) or *large* (> 0.10). | US-206 | S | T |
| FR-212 | For a dream offering, the system shall suggest up to three offerings in the same field that are Safe or Likely for the student. | AC-206.2 | S | T |
| FR-213 | *Revised (VR): "two" became "up to three".* The system shall compare up to three offerings side by side on band, duration, medium, campus, aptitude test and trend. | US-207, AC-207.1, AC-207.2 | C | D |
| FR-214 | The system shall show monthly living-cost estimates by campus with sample size and collection date. | US-208 | C (R2) | D |
| FR-215 | *New (VR).* The system shall search the student's courses across every band by course name, university name, common short forms or Uni-Code, with the matching rule of FR-123. | US-209 | S | T |
| FR-216 | *New (VR).* Compare shall show each offering as a column that swipes sideways on a narrow screen and, while fewer than three are compared, a "+" column that opens a picker of the student's Safe, Likely and Reach courses (searchable) and of My list. | AC-207.2, AC-207.3 | C | D |
| FR-217 | *New (VR).* Every *Compare* button in the app shall open the Compare screen with that offering included. | AC-207.4 | C | D |
| FR-218 | *New (VR).* The cut-off chart on a course page shall print each point's cut-off value beside the point. | AC-204.3 | S | I |
| FR-219 | *New (CR-008).* The course page shall show *University facts* for the offering's institution from the UGC report *Sri Lanka University Statistics 2024*: students admitted for 2023/24 (Table 2.2), undergraduates in 2024 (Table 3.1(a)), permanent hostel places and the share of undergraduates they can house (Table 7.1) and graduates of 2024 (Table 4.1), each with its table, page and a link to that page of the official PDF (BR-081, NFR-055). | US-210 | C | T |
| FR-220 | *New (CR-009).* For each of the 24 offerings with an aptitude or practical test (BR-025), the course page shall show the test's institution, application opening and closing dates and test date from its official notice, with a link to the notice; dates shall be labelled as the last intake's and past under BR-064. A course whose joint practical test is held at other universities shall link the official notices of those universities. No card shall be shown for a course without a test. | US-211 | S | T |
| FR-221 | *New (VR2).* The interface shall name the bands *Very likely* (SAFE), *Possible* (LIKELY) and *Unlikely* (REACH) in all three languages, and show the one-line meaning of the selected band under the *Courses* tabs (BR-037). | AC-203.5 | M | I |

## FE-3 Preference list

Table: Functional requirements, FE-3 Preference list

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-301 | The system shall let the student add eligible offerings to an ordered list and reorder them by drag and drop and by keyboard. | US-301 | M | T |
| FR-302 | The system shall refuse to add an offering for which the student is not eligible. | AC-301.3 | M | T |
| FR-303 | *Changed (CR-011).* The system shall explain, as information, when a Safe offering is listed above a Likely or Reach offering, and shall never change the student's order (BR-040, BR-041). | US-302 | M | T |
| FR-304 | *Changed (CR-011).* The system shall advise, when the list contains no Safe offering, that the handbook recommends listing as many eligible courses as possible (BR-042). | AC-302.2 | M | T |
| FR-308 | The system shall limit the list to 125 Uni-Codes with no duplicates (BR-043). | US-301; BR-017 | M | T |
| FR-305 | *Withdrawn (CR-011).* (Was: propose an order with Safe offerings last.) The UGC follows the student's own order (handbook p.112), so the system does not propose orders. | AC-302.3 (withdrawn) | – | – |
| FR-306 | The system shall copy the list's uni-codes to the clipboard, one per line, in list order. | US-303 | M | T |
| FR-307 | The system shall present the official application steps with the most common mistake for each, linked to the official instructions. *(Built by CR-012.)* | US-304 | S | I |
| FR-309 | *New (VR, CR-006).* Pressing and holding a course in *Courses* or *My list*, or tapping *Select*, shall start selection with that course ticked; while selecting, a tap shall tick or untick a course instead of opening it. | US-305, AC-305.1 | C | T |
| FR-310 | *New (VR).* The selection bar in *Courses* shall offer *Add to my list*, which adds every selected course under FR-302 and FR-308 and reports how many were added, how many were already listed, and whether the list was full. | AC-305.2 | C | T |
| FR-311 | *New (CR-006).* The selection bar in *Courses* and *My list* shall offer *Compare*, which opens Compare with the selected courses in the order selected, at most three. | AC-305.3 | C | T |
| FR-312 | *New (CR-011).* My list shall show *What you need to know*: the UGC's rules for the preference list, each citing its page or section of the UGC handbook. | AC-302.4 | M | T |
| FR-313 | *New (CR-012).* The system shall build the student's document checklist from their answers (school or private candidate; name change) and their list (O/L passes needed; aptitude tests), each item citing the UGC handbook. | AC-304.2 | S | T |
| FR-314 | *New (CR-012).* The system shall show every field of the UGC registration and application steps 1 to 4 in the UGC's order and format: known values pre-filled with a Copy action, the others as guides (what to write, format, common mistake) rather than inputs; it shall never log in to the UGC or fill its form. | AC-304.3 | S | T |
| FR-315 | *New (CR-012).* The system shall offer a print-and-post tracker with the UGC address and the order-change rule. | AC-304.4 | S | T |
| FR-316 | *New (CR-012).* The co-pilot shall store only the two answers and the ticks, only on the student's phone, cleared with the student's data (NFR-030); details typed under its first version are deleted on the next load. | AC-304.5 | M | T |
| FR-317 | *New (CR-013).* The Paths home shall offer *Who do you want to become?* below My list, listing the curated careers by name (English, Sinhala, Tamil) with a search over names and the words students use. | AC-509.1 | S | T |
| FR-318 | *New (CR-013).* For a career, the system shall show the student's state-university courses mapped to it (by UGC course code) with their bands, best chance first; the number of mapped courses closed by their subjects; and the other paths mapped to it (by id or by words in names and programme titles), with cost and matched programmes. A licence step shall be shown only with a checked official source (quoted, linked, dated). | AC-509.2, AC-509.3 | S | T |
| FR-319 | *New (CR-013).* A search for an unmapped career shall show the courses and paths whose names or programmes match. | AC-509.4 | C | T |

## FE-4 Journey and deadlines

Table: Functional requirements, FE-4 Journey and deadlines

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-401 | *Revised (CR-006): past stages are no longer marked done by date (FR-409).* The system shall show the student's Journey steps in order (BR-060), the courses and notices the student follows, and the next dated item at the top with days remaining. | US-401, AC-401.2 | M | T |
| FR-402 | *Revised (CR-002, CR-006): no estimated dates.* A date shall be shown only when it is announced, labelled *Confirmed* with its source. A UGC step whose date is not announced shall show *Not announced yet* with the official rule and its handbook page; the system shall never invent or estimate a date. | US-402, AC-402.1, AC-402.3 | M | T |
| FR-403 | When the list contains an offering with an aptitude or practical test (BR-025), the journey shall add the test's application and test dates. | US-403 | M | T |
| FR-404 | *Revised (VR): alarms follow the reminder settings (FR-413).* The system shall generate an iCalendar file of the journey's dated items with alarms 7 days and 1 day before each, as set in FR-413. | AC-404.1 | S | T |
| FR-405 | *Superseded by FR-412 (CR-002).* The system shall send web-push reminders 7 days and 1 day before each deadline to students who opted in. | AC-404.2 | S | T |
| FR-406 | *Superseded by FR-412 (CR-002): no push subscription is stored on the server.* The system shall delete a push subscription when the student turns notifications off. | AC-404.3 | S | T |
| FR-407 | The system shall check special-intake categories against the student's answers and link each to its handbook section. | US-405 | C (R2) | T |
| FR-408 | *Superseded by FR-414 and FR-416 (CR-006).* The system shall let the student add a route's dates to the journey. | US-406 | C (R2) | D |
| FR-409 | *New (CR-006).* Every Journey step shall start unticked; only the student shall tick or untick a step. | US-407, AC-407.1 | M | T |
| FR-410 | *New (CR-006).* The server shall accept a tick only inside the step's window (BR-061) and shall refuse a tick outside it without storing anything; the app shall disable the tick box and state why. | AC-407.2 to AC-407.4 | M | T |
| FR-411 | *New (CR-006).* The system shall save the student's followed courses, followed notices (with the *I applied* state) and ticked steps on the account, show the same Journey on every device, and delete it with the account. | US-411 | M | T |
| FR-412 | *New (CR-002; supersedes FR-405, FR-406).* In the Android app, the phone shall schedule a notification 7 days and 1 day before each dated item in the Journey, at the hour set in FR-413; no push subscription or device identifier shall be stored on the server for reminders. On other devices the calendar file (FR-404) provides the reminders. | AC-404.5, AC-404.6 | S | T |
| FR-413 | *New (VR).* *Me* shall offer reminder settings, kept on the phone: 7-day reminder on or off, 1-day reminder on or off, 8 am or 6 pm, and the new-notice count on or off. Unset or unreadable settings shall fall back to the default (both reminders on, 8 am, count shown), field by field (BR-063). There shall be no test-notification button. | US-408 | S | T |
| FR-414 | *New (CR-006; with FR-416 supersedes FR-408).* The student shall be able to follow and unfollow a notice or other path from *Open now* and from other-path pages; a followed one shall appear in the Journey with its closing date and source. The server shall accept only identifiers in ZedPath's route catalogue. | US-410, AC-410.1, AC-410.4 | S | T |
| FR-415 | *New (CR-006).* The student shall be able to tick *I applied* on a followed notice only once it has opened (BR-062); the server shall refuse it before then, and for a notice that is not followed. | AC-410.2, AC-410.3 | S | T |
| FR-416 | *New (CR-006).* The student shall be able to follow and unfollow a course from its course page; the server shall accept only 2025/26 offerings. | US-409 | S | T |
| FR-417 | *New (CR-006).* The Journey shall have a second tab, *Open now*, listing the open notices (FR-503); the top bar shall have no bell, and the count of new notices shall show on the Journey tab when the setting is on (FR-413). | AC-503.5 | M | D |

## FE-5 Other routes

Table: Functional requirements, FE-5 Other routes

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-501 | *Revised (VR): the retry group ("Sit the A/L again") was removed.* The system shall list non-UGC routes in six groups (private and non-state degrees, higher national diplomas, professional qualifications, vocational courses, job examinations, study abroad) and mark each as open or not open to the student with the reason. | US-501, AC-501.2, AC-501.3 | M | T |
| FR-502 | Each route shall show entry requirements, duration, approximate cost, intake timing and sources with verified dates. | US-502 | M | I |
| FR-503 | *Revised (CR-002, CR-006): intake notices added; shown under the Journey's Open now tab (FR-417).* The system shall show announced Gazette job examinations and intakes of other routes, each with its closing date, provider and a link to the official notice, and the result of the eligibility check of FR-509. | US-503, AC-503.1, AC-503.3 | M | T |
| FR-504 | A job-examination notice extracted with low confidence shall not be shown until a curator approves it. | AC-503.2 | M | T |
| FR-505 | The system shall show the recognition status of a programme's awarding university and local approval, each with source and date checked. | US-504 | S (R2) | I |
| FR-506 | The system shall check the basic conditions of the government interest-free loan scheme. | US-505 | S (R2) | T |
| FR-507 | The system shall list government scholarships abroad open to school leavers with usual timing and requirements. | US-506 | C (R2) | I |
| FR-508 | *Withdrawn (VR, 11 October 2026: the "Sit the A/L again" path was removed).* For a dream offering, the system shall show the Z-score gap, the student's attempt number out of the maximum (BR-004) and alternative routes. | US-507 | S | T |
| FR-509 | *New (CR-002, CR-003).* For each notice, the device shall check the A/L-pass rule against the student's results and the age rule against the date of birth given at registration, showing each as met, not met or unknown (data missing); O/L rules shall be shown for the student to check and not evaluated. The check shall run on the device (NFR-072). | AC-503.3 | M | T |
| FR-510 | *New (CR-002).* Notices shall be ordered with open and upcoming ones first, soonest closing date first, then closed ones, most recently closed first. | AC-503.4 | S | T |
| FR-511 | *New (CR-009).* The University of Vocational Technology route (R042) shall quote the TVEC statement of the NVQ Level 5/6 to NVQ Level 7 (degree) progression, with the manual and page, and list the degree programmes the university lists for 2026 with the date they were read. | US-508 | C | I |
| FR-512 | *New (CR-015).* The system shall offer a seventh group of other paths, *Scholarships and loans* (code SCHOLARSHIP_LOAN, "Ways to pay for your next step"), whose screen also lists the SCHOLARSHIP_ABROAD routes in a second section, *Study abroad scholarships*, from the same records (no copies); with no SCHOLARSHIP_LOAN route it shows that section alone. The group codes are one list (`ROUTE_GROUP_CODES`); a catalogue route with any other code shall stop the rulebook build. | AC-510.1 | S | T |
| FR-513 | *New (CR-015).* A route may carry `for_routes`, the ids of the routes it pays for. The rulebook build shall refuse the catalogue when `for_routes` appears on a route outside SCHOLARSHIP_LOAN, names a route that does not exist, names the route itself or another scholarship or loan, or repeats an id. The catalogue, not a new D1 table, holds the link (ZP-DOC-05). | AC-510.3 | S | T |
| FR-514 | *New (CR-015).* The build shall compute, for each route, the SCHOLARSHIP_LOAN routes that list it (`waysToPay`); a route's page shall show them under *Ways to pay*, and a scholarship's or loan's page shall show the routes it pays for, each opening that route. | AC-510.2, AC-510.3 | S | T |
| FR-515 | *New (CR-015).* A SCHOLARSHIP_LOAN route shall carry no cost (the build refuses one), so it never shows a cost line or "Free"; what it gives and its conditions shall be shown from its notes, as information, not as a warning. | AC-510.2 | S | T |
| FR-516 | *New (CR-015).* Search inside the group shall find scholarships and loans by the words students type (scholarship, Mahapola, bursary, loan, interest free; the Sinhala and Tamil words for scholarship and loan), by short names formed from a route's own name (e.g. IFSLS), with Sinhala and Tamil vowel signs kept inside a word and zero-width joiners ignored; Ask's corpus shall include each scheme's notes, the routes it pays for and, on each paid route, its ways to pay. | AC-510.4 | S | T |

## FE-6 Ask

Table: Functional requirements, FE-6 Ask

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-601 | The system shall answer a question in the language it was asked (Sinhala, Tamil or English). | US-601 | M | T |
| FR-602 | Answers about eligibility shall use the student's profile when the student has one. | AC-601.2 | M | T |
| FR-603 | Every factual answer shall cite at least one stored source (document and page). | US-602 | M | T |
| FR-604 | When no stored source supports an answer, the system shall say it does not know and point to an official contact, and shall not generate an unsupported answer. | AC-602.2 | M | T |
| FR-605 | The system shall decline to predict future cut-offs or guarantee admission, and offer the historical pattern instead. | US-603 | S | T |
| FR-606 | *Revised (CR-004): moved to R1 and detailed.* The system shall offer actions under an answer, built by ZedPath from its own data and never from the model's text: for up to three course places, best chance first, open the course, add to list (only when eligible) and compare; for a matching notice, add to the Journey. | US-604 | C | D |
| FR-607 | *New (CR-004).* When the model's reply starts with a verdict, the answer shall show it as a chip: *Yes*, *No*, *It depends* or *Not in official sources*; with no verdict, no chip shall be shown. | AC-605.1 | S | T |
| FR-608 | *New (CR-004).* An answer shall be shown as one lead line and short bullets; bullets after the fourth shall be folded behind *Show more*. | AC-605.2 | S | T |
| FR-609 | *New (CR-004, VR).* Each citation chip shall show a readable source name (handbook page, or the route's name; never an internal file note), open the quoted passage, and link to the official document over HTTPS; a route citation shall also open the route's page in ZedPath. | AC-605.3 | S | T |
| FR-610 | *New (CR-004).* An answer about a course shall offer two follow-up questions about that course; an answer whose verdict is *Not in official sources* shall offer none. | AC-605.4 | C | D |
| FR-611 | *New (CR-004).* The system shall record *Helpful* and *Report a wrong answer* (optional note of up to 500 characters) with the question, the answer, the cited pages and the app language, and nothing that identifies the student (NFR-073); the screen shall say that the question and answer will be sent before the report is sent; submissions shall be rate-limited. | US-606 | S | T |
| FR-612 | *New (VR).* The app shall send the student's achievements and interests with a question; the server shall use them for that answer only and not store them (NFR-074). Whether the special intake may apply shall be decided by BR-080 in code and given to the model as a fact, and the special-intake handbook section shall be retrieved with the question. | US-607 | C | T |
| FR-613 | *New (CR-010).* A link that opens Ask with a question shall only fill the question box; the question shall be sent only when the student taps send (NFR-079). | AC-601.3 | M | I |
| FR-614 | *New (CR-010).* The service shall store at most 2,000 answer ratings and reports a day, answering "enough reports for today" beyond that, and shall delete those older than one year. | US-606; AC-907.3 | S | T |
| FR-615 | *New (CR-010).* Ask shall answer at most 3,000 questions a day across the whole service (the sum of the day's per-device counters), in addition to the per-device and per-network limits (NFR-034). | AC-907.3 | S | T |

## FE-7 People around the student

Table: Functional requirements, FE-7 People around the student

| ID | Requirement | Source | Pri | Ver |
|---|---|---|---|---|
| FR-701 | The system shall generate a share card (image and short text) in the chosen language and pass it to the device share sheet. | US-701 | M | D |
| FR-702 | The share card shall exclude the student's name and Z-score unless the student includes them. | AC-701.2 | M | T |
| FR-703 | *Revised (CR-002): moved to R1; seniors answer in groups.* The system shall show seniors' messages with the badge "Verified senior · *course*, year *n*", set by the server from the redeemed invite and never by the member. | US-702 | S | D |
| FR-704 | *Superseded by FR-707 (CR-002).* The system shall verify a senior by a university Google account on a recognised domain, or by curator review of proof that is deleted after the decision. | US-703 | S (R2) | T |
| FR-705 | *Revised (CR-002): moved to R1 and detailed.* The system shall provide one group per target course and one per A/L batch (BR-070, BR-071); *Groups* shall list the groups for the courses on the student's list (or the three best-chance courses when the list is empty), the student's batch group and every joined group; only members shall open a group's live room. | US-704, AC-704.1 to AC-704.4 | C | T |
| FR-706 | The system shall show a teacher aggregate counts for students who shared with the teacher's class code, and names only of those who shared. | US-705 | C (R2) | T |
| FR-707 | *New (CR-002; supersedes FR-704).* The system shall verify a senior by a one-time invite code issued by the product owner after checking enrolment, naming course, institution and year of study (BR-076). Redeeming it at sign-up shall create a senior account that keeps no A/L results; a used or expired code shall be refused. | US-703, AC-703.4, AC-703.5 | S | T |
| FR-708 | *New (CR-002).* Group messages shall be text only, 1 to 500 characters, and shall be checked by an automatic moderation model before any other member sees them; a message judged unsafe, or one the check cannot judge, shall not be posted (NFR-039), and the sender shall be told why. | AC-706.1 | M | T |
| FR-709 | *New (CR-002).* The room shall limit each member to one message every 3 seconds and 20 messages in any 10 minutes (BR-072). | AC-706.2 | M | T |
| FR-710 | *New (CR-002).* A member shall be able to report a message once, with a reason (BR-073); a message reported by three different members shall be hidden for everyone. | AC-706.3 | M | T |
| FR-711 | *New (CR-002).* A member shall be able to block and unblock another member by username; a blocked member's messages shall not be shown or delivered to the blocker. | AC-706.4 | M | T |
| FR-712 | *New (CR-005).* The room shall refuse a message containing a Sri Lankan phone number or an email address, with an explanation (group rule 3, BR-074). | AC-706.5 | M | T |
| FR-713 | *Superseded by FR-714 (CR-006).* A member shall accept the current group rules for each group before taking part; the server shall refuse a join without the current rules version and keep the live room closed for a member whose membership is not on it. | AC-707.1 | M | T |
| FR-714 | *New (CR-006; supersedes FR-713).* A student shall accept the current group rules once per account, at the first join of any group (BR-075); the server shall record the version and time, refuse a first join without acceptance, and keep every live room closed until the account has accepted the current version. A new rules version shall be asked for again. | AC-707.2 to AC-707.5 | M | T |
| FR-715 | *New (CR-005).* *Groups* shall list popular course groups for everyone: Medicine (001), Engineering (008), Computer Science (012), Management (016), Commerce (018) and Law (025). | AC-704.5 | C | D |
| FR-716 | *New (CR-005).* A group may show curated sample conversations before the real messages; each shall be marked *Sample*, have an author name starting "Sample" and no verified badge, shall not be reportable or blockable, and shall not be stored as a message. | AC-704.6 | C | T |
| FR-717 | *New (CR-006).* Tapping the group's name in a room shall open its info page: description, general group rules and any group-specific rules, the member list, and *Exit group* at the bottom. The (i) button shall be removed. | US-708, AC-708.1 | S | D |
| FR-718 | *New (CR-006).* The member list shall show usernames, avatars and senior badges, never real names, and the server shall return it only to members of the group (NFR-071). *Exit group* shall end the membership and close the room for that student. | AC-708.2, AC-708.3 | S | T |
| FR-719 | *New (CR-006).* An open group room shall be kept alive by a message from the app at least every 25 seconds and shall reconnect by itself after a dropped connection, without showing "Disconnected" (NFR-043). | AC-704.8 | S | T |
| FR-720 | *New (CR-010).* Only reports from accounts at least one day old that are not demo accounts shall count toward the three that hide a message (BR-078); other reports shall still be recorded. | AC-706.6 | M | T |
| FR-721 | *New (CR-010).* The room shall count every post attempt, refused or not, before moderation, and refuse further attempts after 20 in any 10 minutes per member (BR-079). | AC-706.7 | M | I |
| FR-722 | *New (CR-010).* A room shall keep at most three live connections per account, closing the oldest; opening the live room shall be rate-limited per account (BR-079). | AC-706.7 | M | I |
| FR-723 | *New (CR-010; test-campaign finding D-04).* The contact check of FR-712 shall also run on a normalised copy of the message (Unicode NFKC, invisible characters removed, spelled-out digits turned into digits) and shall refuse 0094 and other loose phone forms, "[at]" and "(dot)" email forms, and WhatsApp or Telegram invite links, while allowing years, index numbers and Z-scores. | AC-706.8 | M | T |
| FR-724 | *New (CR-014).* The system shall provide five standing groups for other paths (keys PROF_ACCOUNTING, PROF_BUSINESS, OUSL, GOV_CUSTOMS, GOV_MSO, mirrored by a database CHECK), listed for everyone under *Groups for other paths*, each with its own labelled sample chat; they and the popular course groups shall exist before anyone joins. | AC-704.9 | S | T |
| FR-725 | *New (CR-014).* For the demo, *Groups* shall list only groups that exist (server-enforced), so every listed group can be joined; the demo still cannot create a group. | AC-704.10 | S | T |
| FR-726 | *New (CR-014).* Tapping a group not yet joined shall show the rules, the first time, in a small window with Cancel and Agree and join; joining shall open the group. | AC-704.11, AC-707.4 | S | T |

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
| FR-914 | *New (CR-010).* When a session or membership ends, the system shall close the live group-room connections opened under it: on log out, those of that session only; on log out everywhere and on password recovery, every connection of the account; on leaving a group, the account's connections to that group (NFR-077). | US-908, AC-908.1 to AC-908.3 | S | T |

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
| NFR-007 | *New (CR-008; test-campaign finding D-05).* The API shall answer 304 Not Modified to a request whose If-None-Match carries the current ETag in its strong or weak (W/) form, so a compressed response can be revalidated without being downloaded again. | T |

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
| NFR-030 | *Revised (CR-003): an account is now required, so personal data is stored by consent at sign-up rather than by optional opt-in.* The system shall store personal data on the server only for a purpose stated to the student and with the student's recorded consent (FR-121), in line with the Personal Data Protection Act No. 9 of 2022 (Sri Lanka); it shall collect no personal detail beyond those in FR-116. | I |
| NFR-031 | Results photos shall be deleted within 5 minutes of upload, whether or not reading succeeds. | T |
| NFR-032 | Curator functions shall require authentication; every curator action shall be logged. | T |
| NFR-033 | Secrets (API keys) shall be stored as Cloudflare secrets and never in source code or the repository. | I |
| NFR-034 | Ask shall accept at most 10 questions per client per minute and 100 per client per day. | T |
| NFR-035 | All input shall be validated on the server; database access shall use bound parameters only. | I |
| NFR-036 | *New (CR-001).* A password shall never leave the device; the server shall store only a SHA-256 hash of the key derived on the device (FR-114). Session tokens and recovery codes shall be stored only as SHA-256 hashes, and the session cookie shall be HttpOnly, Secure and SameSite=Lax; cross-site writes shall be refused. | I |
| NFR-037 | *New (CR-001).* Sign-up and log-in attempts shall be limited to 10 a minute per network address and username, and 100 a minute per network address. | T |
| NFR-038 | *New (CR-002, CR-005, CR-006).* Group membership, group-rules acceptance, the Journey tick windows and the *I applied* rule shall be enforced by the server; checks in the app are a convenience only. Which account acts shall come only from the session, never from the request body. | T |
| NFR-039 | *New (CR-002).* Message moderation shall fail closed: when the moderation result cannot be read, the message shall not be posted. | T |

## Reliability and availability

Table: Reliability and availability requirements

| ID | Requirement | Ver |
|---|---|---|
| NFR-040 | Core browsing (courses, bands, list) shall remain usable if the AI services are unavailable. | T |
| NFR-041 | Scheduled jobs shall retry failed steps at least three times with back-off. | T |
| NFR-042 | The database shall be restorable to any point in the previous 7 days (D1 Time Travel). | D |
| NFR-043 | *New (CR-006).* An idle group-room connection shall stay open (keep-alive at least every 25 seconds, answered without waking the room), and a dropped connection shall be re-established without the student's action; the room retries after 1, 2, 4 ... up to 15 seconds and shows "Reconnecting" only after three failed tries; "Disconnected" is shown only when the account was deleted. | T |

## Data quality

Table: Data quality requirements

| ID | Requirement | Ver |
|---|---|---|
| NFR-050 | 100% of published facts shall reference a source document and page (BO-2). | A |
| NFR-051 | Cut-off values shall be stored and compared as exact four-decimal values, not binary floating point. | I |
| NFR-052 | Imported cut-off tables shall be verified by two independent extraction methods with zero unexplained differences before publication. | T |
| NFR-053 | A reported mistake shall be triaged within 48 hours during the admission season. | A |
| NFR-054 | *New (CR-010).* No URL in ZedPath's data shall point to a host or a page blocked during research (CLAUDE.md research rules). Blocked pages shall be recorded only as SHA-256 fingerprints of their normalised address, so the public repository never shows the address. | T |
| NFR-055 | *New (CR-008).* A statistical fact shall be shown exactly as printed in the official report, with the report's caveats (provisional, incomplete, including campuses); a value the report marks "Information not submitted" shall not be shown, and never as zero. | T |

## Maintainability and portability

Table: Maintainability and portability requirements

| ID | Requirement | Ver |
|---|---|---|
| NFR-060 | Business rules (eligibility, banding thresholds) shall be data or pure functions with unit tests, not scattered through the interface. | I |
| NFR-061 | Rule-engine code shall have at least 90% branch coverage. | A |
| NFR-062 | A new intake year's handbook and cut-offs shall be loadable without code changes. | D |
| NFR-063 | The front end shall run in any standards-compliant browser without installation; it may be installed as a progressive web app. | D |

## Privacy of accounts, groups and Ask

*New (CR-001 to CR-006).* These requirements make the privacy promises of the change requests verifiable.

Table: Privacy requirements added by the change requests

| ID | Requirement | Ver |
|---|---|---|
| NFR-070 | *New (CR-003).* Contact details (full name, email, mobile, date of birth) shall be kept in their own table, apart from results; they shall never be shown to other students, never be sold, and be deleted with the account. Email and mobile shall not be unique, so that sign-up never reveals whether an address is already registered. | I |
| NFR-071 | *New (CR-006).* In groups the system shall show only a member's username, preset avatar and any senior badge: never a real name, contact detail or uploaded photograph. | T |
| NFR-072 | *New (CR-002).* The eligibility of notices (FR-509) shall be computed on the student's device; no request for this check shall send the student's results or date of birth. | I |
| NFR-073 | *New (CR-004).* Answer feedback (FR-611) shall be stored without any account, device or network identifier. | I |
| NFR-074 | *New (VR).* Achievements and interests sent with a question (FR-612) shall be used for that answer only and shall not be stored with the question or the answer. | I |
| NFR-075 | *New (CR-001, CR-006).* Deleting an account shall remove every row stored under it in every table (account, sign-in, sessions, recovery code, redeemed senior invite, profile, subjects, achievements, interests, contact details, group memberships, rules acceptances, reports, blocks in both directions and the Journey) and its group messages, and nothing of another account. | T |

## Security hardening

*New (CR-010).* These requirements close findings of the 20-agent test campaign (D-03, D-04, D-05, D-12) and of security
audit run-1 (every lead except lead 9, see below), reported in ZP-DOC-08.

Table: Security-hardening requirements added by CR-010

| ID | Requirement | Ver |
|---|---|---|
| NFR-076 | Every request that changes data, including Ask and its feedback, shall be refused with 403 and change nothing when its Origin header names another site or is "null" or malformed; a malformed Origin shall never cause a 5xx response. | T |
| NFR-077 | A live group-room connection shall not outlive the session or the membership that opened it (FR-914); account deletion closes every connection of the account (FR-119). | T |
| NFR-078 | No password, key or other credential shall be shipped in the app bundle, sample data or demonstration scripts. | T |
| NFR-079 | Opening a link shall never by itself spend a student's question allowance or change the student's data; a tap by the student is required (FR-613). | I |
| NFR-080 | The pre-push leak scan shall inspect every commit the remote does not yet have, including commits reached only by a new tag, and shall read files as committed, never through a local text converter. | T |
| NFR-081 | A signed-in account shall be able to make at most 100 data-changing requests a minute (profile, Journey, groups, blocks); beyond that the server answers 429. | T |
| NFR-082 | Limits keyed by network shall treat an IPv4 address, or an IPv6 /64 network, as one network. | T |
| NFR-083 | The developer tools of Ask shall answer only on the developer's own machine with the developer switch on, and shall refuse a cross-site call even there. | T |

Lead 9 of audit run-1 (the log-in limit is keyed per username, which the caller chooses) is **not** tightened per network
on purpose: a school laboratory puts a whole class behind one network address. The network-wide limit of 100 a minute
(NFR-037) still applies, and a human check (Cloudflare Turnstile, FR-912) is the planned fix. This is a recorded,
accepted risk.

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
| BR-037 | *New (VR2).* Students see the bands as **Very likely** (Safe), **Possible** (Likely) and **Unlikely** (Reach), with these meanings: "Your Z-score is above every cut-off of the last five years"; "Above the latest cut-off, but not above every recent year"; "Below the latest cut-off: possible only if the cut-off falls". The codes SAFE, LIKELY and REACH and the rules BR-030 to BR-036 are unchanged. |

## Preference-list checks (ZedPath policy, derived from BR-016)

Table: Business rules, preference-list checks

| ID | Rule |
|---|---|
| BR-040 | Because selection takes the highest-listed Uni-Code the student clears (BR-016), an offering listed below one the student is very likely to clear is very unlikely to be reached. |
| BR-041 | **Ordering note** *(changed by CR-011)*: when a Safe offering is listed above any Likely or Reach offering, the student is told that if selected for it, the offerings below it are not considered, and that this is fine if they want it more. The order is the student's own preference (handbook p.112); the system never re-orders it. |
| BR-042 | **Coverage advice** *(changed by CR-011)*: when the list contains no Safe offering, the student is advised that the handbook recommends listing as many eligible courses as possible, up to 125 (p.112). |
| BR-043 | The list enforces BR-017: at most 125 entries and no duplicates. |

## Accounts and contact details (ZedPath policy, CR-001 and CR-003)

*New.* The same rules are checked on the device, for a clear message, and on the server, which refuses anything the
device let through. The database repeats them as constraints (ZP-DOC-05).

Table: Business rules, accounts and contact details

| ID | Rule | Source |
|---|---|---|
| BR-050 | A username has 3 to 24 characters from lower-case letters, digits, "_" and "."; it is stored and compared lower-cased and trimmed, and is unique. | ZedPath policy (CR-001) |
| BR-051 | A password has 8 to 128 characters. | ZedPath policy (CR-001) |
| BR-052 | A full name has 2 to 80 characters after trimming and joining spaces. | ZedPath policy (CR-003) |
| BR-053 | An email address has the shape *name@domain.tld*, at most 254 characters, and is stored in lower case. It is not unique. | ZedPath policy (CR-003) |
| BR-054 | A mobile number is a Sri Lankan mobile number, entered as 07..., +94 7..., 94 7... or 0094 7... with any spacing, and stored as +947 followed by eight digits. It is not unique (siblings may share a parent's number). | ZedPath policy (CR-003) |
| BR-055 | A date of birth is a real calendar date, and the student's age on the day of sign-up is 13 to 70 years. | ZedPath policy (CR-003) |
| BR-056 | A student under 18 confirms that a parent or guardian agrees to the details being kept. | ZedPath policy (CR-003); Personal Data Protection Act, No. 9 of 2022 [4] |
| BR-057 | Consent is recorded with the version of the privacy wording agreed to (currently 2026-10-11) and the time; a new wording is a new version. | ZedPath policy (CR-003) |
| BR-058 | A session lasts 30 days. | ZedPath policy (CR-001) |
| BR-059 | *New (CR-007).* A demo account and its session last 24 hours from creation. Its username is "demo_" followed by eight random hexadecimal digits, and it has no usable password. It is deleted at the first demo tap after it expires (the free plan runs no scheduled clean-up). Demo taps share the log-in limits: 10 a minute per network address and 100 a minute per network address overall. *(CR-010)* At most 500 demo accounts exist at once, and each tap deletes at most 50 expired ones. | ZedPath policy (CR-007, CR-010) |

## Journey and reminders (ZedPath policy, CR-002, CR-006 and VR)

*New.*

Table: Business rules, Journey and reminders

| ID | Rule | Source |
|---|---|---|
| BR-060 | The Journey has eight steps: three preparation steps (enter results, build the list, compare courses) and five UGC steps (apply to the UGC, change the Uni-Code order once, apply for the aptitude test, selection results, register for the course). The aptitude step appears only when a course on the list has a test (BR-025). | ZedPath policy; HB p.116, p.118, p.151 |
| BR-061 | A preparation step can be ticked at any time. A UGC step can be ticked only on or after the opening date given in the UGC press notice, as a Sri Lanka date (UTC+05:30); while that date is not announced the step cannot be ticked. ZedPath never invents a date. | ZedPath policy (CR-006) |
| BR-062 | *I applied* can be ticked on a followed notice only from the notice's opening date; a notice without an opening date is open from publication. | ZedPath policy (CR-006) |
| BR-063 | Reminders fall 7 days and 1 day before a dated item, at 08:00 or 18:00 on the phone's clock; the default is both reminders at 08:00, the behaviour before settings existed. | ZedPath policy (CR-002, VR) |
| BR-064 | *New (CR-009).* An aptitude-test notice is shown as the last intake's and *past* when the later of its closing date and test date is before today's Sri Lanka date, or when it states neither; the next intake's dates are never estimated. A course whose joint practical test is held at other universities shows those universities' notices. | ZedPath policy (CR-009); HB p.151 (BR-025) |

## Groups (ZedPath policy, CR-002, CR-005 and CR-006)

*New.*

Table: Business rules, groups

| ID | Rule | Source |
|---|---|---|
| BR-070 | There is at most one course group per course code and one batch group per pair of A/L stream and district. A group is created when its first member joins. | ZedPath policy (CR-002) |
| BR-071 | Only a student whose results are saved on the account can join a batch group; it is the group of that student's stream and district. | ZedPath policy (CR-002) |
| BR-072 | A message is text only, 1 to 500 characters. A member may post at most one message every 3 seconds and 20 in any 10 minutes in a group. | ZedPath policy (CR-002) |
| BR-073 | A member may report a message once, for one of four reasons: harmful, wrong information, spam, other. A message reported by 3 different members is hidden for everyone. | ZedPath policy (CR-002) |
| BR-074 | The group rules (version 2026-10-11) are six: be kind; stay on topic; never share phone numbers, email or home addresses, or passwords (ZedPath blocks phone numbers and emails); no selling, paid tuition adverts or exam leaks; members give opinions, so check official sources; report anything wrong (3 reports hide a message). | ZedPath policy (CR-005) |
| BR-075 | The group rules are accepted once per account for each rules version, at the first join of any group; a new version must be accepted again, and earlier acceptances are kept. *Replaces the CR-005 rule "once per membership".* | ZedPath policy (CR-006) |
| BR-076 | A senior invite names a course, an institution and a year of study from 1 to 6, is valid for 14 days, can be redeemed once, and only by a senior account of that institution. Its code is 80 random bits and is stored only as a SHA-256 hash. | ZedPath policy (CR-002) |
| BR-077 | An avatar is one of 12 preset pictures (a01 to a12) or none, meaning initials. Photographs are never uploaded. | ZedPath policy (CR-006) |
| BR-078 | *New (CR-010).* A report counts toward hiding a message (BR-073) only when the reporting account is at least one day old and is not a demo account. | ZedPath policy (CR-010, audit lead 4) |
| BR-079 | *New (CR-010).* A member may make at most 20 post attempts in any 10 minutes in a group, counting refused ones; an account keeps at most three live connections to one group. | ZedPath policy (CR-010, audit leads 13 and 14) |

## Ask (ZedPath policy, VR)

*New.*

Table: Business rules, Ask

| ID | Rule | Source |
|---|---|---|
| BR-080 | ZedPath tells a student that the special intake for outstanding achievements **may** apply when they list a first, second or third place at national level, or an achievement at international level, dated 2023 to 2025. It only flags the possibility and cites the section; the handbook's further conditions (up to 0.5% of places per course, a Z-score within 0.2000 of the district cut-off) are decided by the UGC. | HB Section 6, p.166, p.167; ZedPath policy |

## University facts (CR-008)

*New.*

Table: Business rules, university facts

| ID | Rule | Source |
|---|---|---|
| BR-081 | University facts are matched to an offering by its institution letter (the last character of its Uni-Code). Graduate figures for 2024 are provisional, and are marked incomplete when a faculty did not submit figures. "Information not submitted" means no value, never zero. | UGC, *Sri Lanka University Statistics 2024*, Tables 2.2, 3.1(a), 4.1, 7.1 and 7.2 [9] |

## Known gaps in the official sources

The 2025/26 handbook does not state: application opening and closing dates (announced by press notice),
test dates for aptitude tests, a tie-break rule, a re-scrutiny procedure, Mahapola or bursary eligibility rules,
hostel allocation rules, or the registration deadline. *Revised (CR-002, CR-006):* ZedPath shows these as
*Not announced yet* with the official rule and its page (FR-402), never as confirmed facts and never as estimated
dates. Subject means and standard deviations needed for the Z-score estimate (FR-107)
are not in either source; FR-107 is therefore at risk until those statistics are obtained.

# Verification

Each requirement states its verification method. ZP-DOC-08 maps every requirement to test cases and records
results. A requirement is verified when its test cases pass, or when the inspection, analysis or demonstration
is recorded with its evidence.

# Traceability: stories to requirements {.appendix}

Table: Story-to-requirement traceability (every story in ZP-DOC-02 is covered)

| Story | Title | Requirements |
|---|---|---|
| US-101 | Enter my results once | FR-101, FR-102, FR-103, FR-117 (FR-104 superseded) |
| US-102 | Change my profile at any time | FR-105, FR-106, FR-128, FR-130 |
| US-103 | Estimate my Z-score before results | FR-107, FR-108 |
| US-104 | Read my results sheet from a photo | FR-109, FR-110, FR-111 |
| US-105 | Use the app in my language | FR-112, FR-124 |
| US-106 | Create an account and use it on any device | FR-114, FR-115, FR-116, FR-117, FR-129, FR-131; NFR-036, NFR-037, NFR-082 |
| US-107 | Get back into my account with a recovery code | FR-118 |
| US-108 | Delete my account and everything in it | FR-119, FR-132; NFR-075 |
| US-109 | Give my contact details with a stated purpose and consent | FR-116, FR-120, FR-121; NFR-030, NFR-070 |
| US-110 | Choose a profile picture | FR-122 |
| US-111 | Find my subjects by searching | FR-123 |
| US-112 | Try ZedPath with a sample student | FR-125 to FR-128; NFR-078; BR-059 |
| US-201 | See every course I am eligible for | FR-113, FR-201, FR-202, FR-203 |
| US-202 | See why a course is hidden from me | FR-204 |
| US-203 | See Safe / Likely / Reach for each course | FR-205, FR-206, FR-207, FR-221; BR-037 |
| US-204 | Open a course page with sources | FR-208, FR-209, FR-218 |
| US-205 | Filter and sort courses | FR-210 |
| US-206 | Work backwards from a dream course | FR-211, FR-212 |
| US-207 | Compare up to three courses | FR-213, FR-216, FR-217 |
| US-208 | See what living there costs | FR-214 |
| US-209 | Find a course by searching | FR-215 |
| US-210 | See official facts about the university | FR-219; NFR-007, NFR-055; BR-081 |
| US-211 | See a course's aptitude test on its page | FR-220; BR-064 |
| US-301 | Build my preference list | FR-301, FR-302, FR-308 |
| US-302 | Understand what my list order means | FR-303, FR-304, FR-312 (FR-305 withdrawn) |
| US-303 | Copy uni-codes in order | FR-306 |
| US-304 | Learn the UGC form step by step | FR-307, FR-313 to FR-316 |
| US-305 | Select several courses at once | FR-309, FR-310, FR-311 |
| US-401 | See my journey with the next step first | FR-401 |
| US-402 | Know whether a date is confirmed or estimated | FR-402 |
| US-403 | Be told about aptitude tests for courses on my list | FR-403 |
| US-404 | Get reminders before deadlines | FR-404, FR-412 (FR-405, FR-406 superseded) |
| US-405 | Check whether a special intake applies to me | FR-407 |
| US-406 | Add my own steps to the journey (superseded) | FR-408 (superseded by FR-414, FR-416) |
| US-407 | Tick my own Journey steps when they open | FR-409, FR-410; NFR-038 |
| US-408 | Choose how I am reminded | FR-413 |
| US-409 | Follow a course into my Journey | FR-416 |
| US-410 | Follow a notice or other path and record that I applied | FR-414, FR-415 |
| US-411 | Keep my Journey on my account | FR-411; NFR-075 |
| US-501 | See every route my results open | FR-501 |
| US-502 | Open a route's details | FR-502 |
| US-503 | Be alerted about job exams I qualify for | FR-503, FR-504, FR-509, FR-510, FR-417; NFR-072 |
| US-504 | Check whether a degree is recognised | FR-505 |
| US-505 | Check the interest-free loan scheme | FR-506 |
| US-506 | See scholarships abroad | FR-507 |
| US-507 | Understand what retrying would take (withdrawn) | FR-508 (withdrawn) |
| US-508 | See how a vocational qualification leads to a degree | FR-511 |
| US-509 | Start from the career I want | FR-317 to FR-319 |
| US-510 | Find scholarships and loans that pay for my next step | FR-512 to FR-516 |
| US-601 | Ask a question in my language | FR-601, FR-602, FR-613; NFR-079 |
| US-602 | Every answer cites its source | FR-603, FR-604 |
| US-603 | The assistant won't predict the future | FR-605 |
| US-604 | Turn an answer into an action | FR-606 |
| US-605 | Read a clear answer card | FR-607, FR-608, FR-609, FR-610 |
| US-606 | Tell ZedPath whether an answer helped | FR-611, FR-614; NFR-073 |
| US-607 | Let Ask use my achievements and interests | FR-612; NFR-074; BR-080 |
| US-701 | Share a summary with my family | FR-701, FR-702 |
| US-702 | Ask a verified senior | FR-703 |
| US-703 | Become a verified senior | FR-707 (FR-704 superseded) |
| US-704 | Join a group for my batch and target course | FR-705, FR-715, FR-716, FR-719, FR-724, FR-725, FR-726; UI-4; NFR-043 |
| US-705 | See my class's progress as a teacher | FR-706 |
| US-706 | Stay safe in groups | FR-708, FR-709, FR-710, FR-711, FR-712, FR-720 to FR-723; NFR-039; BR-078, BR-079 |
| US-707 | Accept the group rules once | FR-714 (FR-713 superseded); NFR-038 |
| US-708 | See a group's details and members, and leave it | FR-717, FR-718; NFR-071 |
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
| US-907 | Protect the app from abuse | FR-912, FR-913, FR-615; NFR-054, NFR-080 to NFR-083 |
| US-908 | Close my open chats when my session ends | FR-914; NFR-076, NFR-077 |

# Glossary {.appendix}

Table: Terms and abbreviations used in this document

| Term | Meaning |
|---|---|
| Band | ZedPath's classification of an offering relative to the student's Z-score: Safe, Likely, Reach, Out of range, Not enough data |
| COP | The UGC table of minimum Z-scores ("cut-off points") by course, university and district |
| Demo account | A private, throwaway account holding the sample student, opened by *Try the demo* and deleted after 24 hours (CR-007) |
| ETag | An HTTP response header naming a version of a response; a client sends it back so the server can answer 304 Not Modified |
| Fingerprint | A SHA-256 hash of a normalised web address, used to block a page without publishing its address |
| NQC | "No Qualified Candidates": a cut-off cell for which no candidate from that district was selected |
| NVQ | National Vocational Qualification, Levels 1 to 7 (Tertiary and Vocational Education Commission) |
| Origin | An HTTP request header naming the website a request came from; ZedPath refuses data-changing requests from other sites |
| Offering | One course of study at one university |
| PBKDF2 | Password-Based Key Derivation Function 2: stretches a password into a key with many hash rounds |
| SRS | Software Requirements Specification |
| VAPID | Voluntary Application Server Identification for Web Push (RFC 8292) |
| Verdict | The one-word answer shown above an Ask answer: Yes, No, It depends or Not in official sources (CR-004) |
| VR | The product owner's video review of the live app, 11 October 2026 |
| VR2 | The product owner's review and decisions of 14 October 2026 (band names, intro guide, avatars, expired session) |
| Window | The period in which a Journey step or *I applied* can be ticked (BR-061, BR-062) |

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
| [8] | ZP-DOC-05 Data Design, sections on CR-001 to CR-007 (migrations 0003 and 0005 to 0011) and the university-facts read model |
| [9] | University Grants Commission, *Sri Lanka University Statistics 2024*, Chapters 2, 3, 4 and 7 |
| [10] | Tertiary and Vocational Education Commission, *NVQ Framework of Sri Lanka: Operations Manual*, October 2009 |
| [11] | ZP-DOC-08 Test Plan and Test Summary Report (test-campaign findings D-01 to D-13; security audit run-1) |
