# ZedPath requirements-to-test traceability matrix

Generated 2026-10-11 19:08 UTC from `docs/03-requirements/ZP-DOC-03_Software-Requirements-Specification.md` and `docs/02-user-stories/ZP-DOC-02_User-Stories.md`, against 32 test files (listed at the end). Read-only: no doc or code was changed.

## How coverage is decided

| Label | Meaning |
|---|---|
| **Direct** | A test name, describe block, file header or live-check trace field cites the id, or cites an acceptance criterion (AC-x.y) the requirement traces to, or (for an FR) cites a BR the FR statement names. |
| **Inferred** | No id cited, but a named test clearly exercises the behaviour (matched by hand from the requirement wording and read against the test name), or the id is only inside a cited range ("BR-020 to BR-024"). |
| **None** | No test found. "None (cited only)": a test cites the id but does not exercise the behaviour (checked by hand); counted as None. |
| **n/a** | Superseded or withdrawn in ZP-DOC-03; excluded from the percentages. |

"(partial: ...)" marks rows where the test covers only part of the requirement. Coverage means a test **exists**; it does not mean it passes. Vitest suites were not run for this matrix. For the two live runners, a check that failed in its last recorded run (`tools/e2e/results/live-*.json`) is flagged **[last live run: FAIL]**. `tools/e2e/*.ts` are runner scripts (live read-only, static, local security), not vitest suites.

## Summary

| Type | Active | Direct | Inferred | None | Covered (Direct + Inferred) | Direct only | Superseded / withdrawn |
|---|---|---|---|---|---|---|---|
| FR | 121 | 50 | 29 | 42 | **65.3%** | 41.3% | 7 |
| NFR | 43 | 21 | 8 | 14 | **67.4%** | 48.8% | 0 |
| BR | 60 | 36 | 12 | 12 | **80.0%** | 60.0% | 0 |
| **All** | 224 | 107 | 49 | 68 | **69.6%** | 47.8% | 7 |

User stories: 69 in ZP-DOC-02. Cited directly by a test: 3. Covered through their requirements: 24 via a Direct requirement, 11 via Inferred only. No covering test: 31.

### By area

| Area | Active | Direct | Inferred | None |
|---|---|---|---|---|
| FE-1 Profile and results | 23 | 13 | 3 | 7 |
| FE-2 State-university course discovery | 18 | 8 | 3 | 7 |
| FE-3 Preference list | 11 | 6 | 3 | 2 |
| FE-4 Journey and deadlines | 14 | 10 | 3 | 1 |
| FE-5 Other routes | 9 | 2 | 3 | 4 |
| FE-6 Ask | 12 | 2 | 8 | 2 |
| FE-7 People around the student | 17 | 9 | 5 | 3 |
| FE-8 After selection | 4 | 0 | 0 | 4 |
| FE-9 Data and trust | 13 | 0 | 1 | 12 |
| Performance | 6 | 5 | 0 | 1 |
| Capacity and cost | 3 | 2 | 0 | 1 |
| Usability, accessibility and localisation | 6 | 1 | 1 | 4 |
| Security and privacy | 10 | 6 | 2 | 2 |
| Reliability and availability | 4 | 1 | 1 | 2 |
| Data quality | 4 | 2 | 1 | 1 |
| Maintainability and portability | 4 | 1 | 1 | 2 |
| Privacy of accounts, groups and Ask | 6 | 3 | 2 | 1 |
| General eligibility | 7 | 3 | 0 | 4 |
| Streams, subjects and grades | 3 | 3 | 0 | 0 |
| Selection and the preference list | 7 | 3 | 0 | 4 |
| Course-specific requirements | 8 | 0 | 6 | 2 |
| Cut-off data | 2 | 0 | 2 | 0 |
| Banding (ZedPath policy) | 7 | 7 | 0 | 0 |
| Preference-list checks (ZedPath policy, derived from BR-016) | 4 | 3 | 1 | 0 |
| Accounts and contact details (ZedPath policy, CR-001 and CR-003) | 9 | 7 | 0 | 2 |
| Journey and reminders (ZedPath policy, CR-002, CR-006 and VR) | 4 | 3 | 1 | 0 |
| Groups (ZedPath policy, CR-002, CR-005 and CR-006) | 8 | 6 | 2 | 0 |
| Ask (ZedPath policy, VR) | 1 | 1 | 0 | 0 |

## Functional requirements

### FE-1 Profile and results

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| FR-101 | The system shall let a student enter stream, district, Z-score and three subjects with grades. | `live-readonly.ts`: [meta] GET /api/meta shape (year, 25 districts, 6 streams, subjects, sources) <br>`live-readonly.ts`: case: no body <br>`live-readonly.ts`: case: unknown stream <br>`live-readonly.ts`: case: unknown district <br>`live-readonly.ts`: case: only two subjects <br>`live-readonly.ts`: case: invalid grade E <br>+2 more | Direct |
| FR-102 | The system shall reject a Z-score outside −4.0000 to +4.0000 or with more than four decimal places, with an inline... | `banding.test.ts`: rejects wrong precision and out-of-range values (FR-102) <br>`api-e2e.ts`: Edge Z = +4.0000 accepted <br>`api-e2e.ts`: Edge Z = -4.0000 accepted <br>`api-e2e.ts`: Z = +4.0001 rejected <br>`api-e2e.ts`: Z = -4.0001 rejected <br>`api-e2e.ts`: Z with a fifth decimal (non-integer zE4) rejected <br>+11 more | Direct |
| FR-103 | The system shall reject a subject combination that is not admissible for the selected stream (BR-010) and name the... | `api-e2e.ts`: GET /meta lists the 6 A/L streams (via BR-010)<br>`api-e2e.ts`: Unknown stream rejected (via BR-010)<br>`rules.test.ts`: checks the stream (inferred)<br>`accuracy.e2e.test.ts`: ACC-087 strict mode rejects a subject code that is not an A/L subject (O/L code or made-up (inferred) | Direct (partial: naming the offending subject not asserted) |
| FR-104 | The system shall store the profile only on the student's device and restore it on the next visit. | - | n/a (Superseded) |
| FR-105 | The system shall recalculate every result immediately when any profile field changes. | `api-e2e.ts`: PUT /me saves a new profile and extras (cites the id but does not exercise it) | None (cited only) |
| FR-106 | The system shall delete the profile from the device on request. | `list.e2e.test.ts`: LST-035 clearEverything removes the list and the compare picks (inferred) | Inferred (partial: storage clear tested for list/compare keys only) |
| FR-107 | The system shall estimate a Z-score range from expected marks, using at least the three most recent years of subject... | - | None |
| FR-108 | When an estimated range is used, bands shall be computed from the lower bound and marked as estimate-based. | - | None |
| FR-109 | The system shall read stream, subjects, grades, Z-score and district from a results-sheet photo and require the... | - | None |
| FR-110 | The system shall highlight every field read with confidence below 0.85 for the student to check. | - | None |
| FR-111 | The system shall delete an uploaded photo as soon as reading finishes, and record the deletion in the audit log. | - | None |
| FR-112 | The system shall switch all interface text between Sinhala, Tamil and English without losing the current screen or data. | `i18n.test.ts`: fills placeholders, switches language and leaves unknown placeholders visible (inferred) | Inferred (partial: dictionary switch only; keeping screen/data on switch not tested) |
| FR-113 | When an offering has an O/L requirement (BR-022), the system shall ask for the relevant O/L grades, evaluate them,... | `rules.test.ts`: evaluate(): streams and O/L requirements (FR-113) <br>`accuracy.e2e.test.ts`: ACC-076 FR-113: courses with an O/L rule return NEEDS_OL (not ELIGIBLE) until O/L grades a  | Direct |
| FR-114 | The system shall create a student account from a username (BR-050) and a password (BR-051). The device shall derive... | `api-e2e.ts`: Valid sign-up -> 201 with a recovery code and a session <br>`api-e2e.ts`: Duplicate username -> 409 <br>`live-readonly.ts`: [validation] POST /api/auth/signup with valid-format username but malformed key -> 400 (no <br>`api-e2e.ts`: case: Username too short ("ab") (via BR-050)<br>`api-e2e.ts`: case: Username with illegal characters (via BR-050)<br>`api-e2e.ts`: case: Username too long (25 characters) (via BR-050)<br>+8 more | Direct |
| FR-115 | The system shall let a student log in with username and password on any device, keep the session for 30 days... | `api-e2e.ts`: Login with the right password returns the profile <br>`api-e2e.ts`: Login with a wrong password -> 401 <br>`api-e2e.ts`: Login for an unknown username -> 401 with the same message <br>`live-readonly.ts`: case: /api/me/journey <br>`api-e2e.ts`: Session cookie is HttpOnly, Secure, SameSite=Lax, Path=/api, 30 days (via BR-058)<br>`api-e2e.ts`: Logout ends that session (204, then /me 401) (via BR-058)<br>+6 more | Direct |
| FR-116 | The system shall require an account before any screen other than the welcome, sign-up and log-in screens. Sign-up... | `api-e2e.ts`: case: Contact details missing <br>`api-e2e.ts`: N N without a session -> 401 <br>`api-e2e.ts`: Sign-up without results (profile null) is allowed <br>`live-readonly.ts`: case: /api/me/journey <br>`api-e2e.ts`: case: Full name of 1 character (via BR-052)<br>`api-e2e.ts`: case: Full name over 80 characters (via BR-052)<br>+9 more | Direct |
| FR-117 | The system shall keep the student's profile (results, achievements, interests) on the account, restore it on log-in... | `api-e2e.ts`: case: Profile with an unknown stream <br>`api-e2e.ts`: GET /me returns contact, profile and extras; mobile normalised <br>`api-e2e.ts`: PUT /me saves a new profile and extras <br>`live-readonly.ts`: case: /api/me/journey <br>`account.test.ts`: saves profile and extras together, atomically (no partial write on a bad save) (inferred)<br>`account.test.ts`: signs up, sets a session cookie, shows the recovery code once and stores the profile (inferred) | Direct |
| FR-118 | The system shall show an 80-bit recovery code once at sign-up and require the student to confirm saving it; it shall... | `api-e2e.ts`: Valid sign-up -> 201 with a recovery code and a session <br>`api-e2e.ts`: Recover with a wrong recovery code -> 401 <br>`api-e2e.ts`: Recover with a malformed code -> 401 <br>`api-e2e.ts`: Recover with the right code (typed lower-case, no dashes): new password, new code, old ses <br>`account.test.ts`: recovers with the one-time code: new password, new code, every old session ended (inferred)<br>`account.test.ts`: reads a recovery code typed back with 0/1/8 for O/I/B (inferred)<br>+1 more | Direct |
| FR-119 | On confirmed request, the system shall delete the account and every row stored under it (NFR-075), delete the... | `api-e2e.ts`: DELETE /me from another site -> 403 and the account is kept <br>`api-e2e.ts`: DELETE /me -> 204 and clears the cookie <br>`api-e2e.ts`: After delete: old session -> 401 <br>`api-e2e.ts`: After delete: login -> 401 <br>`api-e2e.ts`: The deleted username can be signed up again (login row gone); then deleted <br>`api-e2e.ts`: Delete test account N; login then 401 <br>+4 more | Direct |
| FR-120 | An account made before CR-003 without contact details shall be asked to complete them before any other screen; no... | `api-e2e.ts`: PUT /me/contact updates and normalises name, email and mobile <br>`account.test.ts`: lets an account made before CR-003 complete them, and refuses bad values on the server (inferred) | Direct |
| FR-121 | The consent statement shall include that a parent or guardian agrees when the student is under 18 (BR-056); the... | `api-e2e.ts`: case: Consent missing <br>`api-e2e.ts`: case: Consent of an old wording version (via BR-057)<br>`api-e2e.ts`: PUT /me/contact without consent -> 400 (via BR-057)<br>`account.test.ts`: accepts exactly the consent wording version the app sends (inferred)<br>`contact.test.ts`: names the first wrong field (inferred) | Direct |
| FR-122 | The system shall let a student choose one of 12 preset avatars, or none (initials, the default), shall accept no... | `api-e2e.ts`: Avatar preset N accepted <br>`api-e2e.ts`: Avatar null (initials) accepted <br>`api-e2e.ts`: Avatar N rejected (via BR-077)<br>`my-journey.test.ts`: accepts a preset or null, nothing else (inferred)<br>`migrations.e2e.test.ts`: MIG-013 account.avatar: 'zz' rejected; 'a01'..'a12' and NULL accepted (inferred)<br>`live-static.ts`: [Assets] all 12 avatars /avatars/a01..a12.svg are 200 image/svg+xml (inferred) | Direct |
| FR-123 | The system shall filter the subject list in About you as the student types: every word typed must start a word of... | `search.test.ts`: matches word starts in any order, ignoring case and punctuation (inferred)<br>`search.test.ts`: finds Uni-Codes and common short forms (inferred) | Inferred |
| FR-124 | While the Sinhala and Tamil interface text has not been reviewed by native speakers, the system shall say that it is... | - | None |

### FE-2 State-university course discovery

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| FR-201 | The system shall list every course offering for which the student meets the general eligibility rules (BR-001 to... | `api-e2e.ts`: POST /results for a N profile <br>`live-readonly.ts`: [results] POST /api/results N (N, N, z=N) sanity <br>`accuracy.e2e.test.ts`: ACC-003 course code = first three characters of the Uni-Code, and every course has a recon <br>`rules.test.ts`: evaluate(): general minimum (BR-001) (via BR-001)<br>`api-e2e.ts`: Two subjects rejected (via BR-001)<br>`api-e2e.ts`: Four subjects rejected (via BR-001)<br>+3 more | Direct |
| FR-202 | The eligibility check shall evaluate alternative requirements ("A or B") and combined requirements ("A and B")... | `api-e2e.ts`: Requirement lines (needs) present <br>`rules.test.ts`: Computer Science: C in Physics alone satisfies "Combined Mathematics or Physics" (AC-201.3 (via AC-201.3)<br>`rules.test.ts`: Physical Science: three distinct subjects; a subject used for one slot cannot fill the thi (inferred) | Direct |
| FR-203 | The eligibility check shall run on the server; the client may cache results but shall not be the only place the... | `results.test.ts`: gives exactly the same answer as before the Ask refactor (inferred)<br>`accuracy.e2e.test.ts`: ACC-094 a Bio student never sees Engineering (008) in results; it is in "hidden" with its  (inferred) | Inferred (partial: server path tested; "client is not the only place" not asserted) |
| FR-204 | The system shall show the number of hidden offerings and, for each, the rule failed in plain language with a link to... | `api-e2e.ts`: ARTS profile hides science-only courses with the rule quoted <br>`live-readonly.ts`: [results] Hidden offerings each carry a reason and handbook page <br>`accuracy.e2e.test.ts`: ACC-094 a Bio student never sees Engineering (008) in results; it is in "hidden" with its  (inferred) | Direct |
| FR-205 | The system shall assign each eligible offering exactly one band (Safe, Likely, Reach, Out of range or Not enough... | `api-e2e.ts`: POST /results for a N profile <br>`live-readonly.ts`: [results] POST /api/results N (N, N, z=N) sanity <br>`accuracy.e2e.test.ts`: ACC 7: /api/results invariants (FR-205) <br>`banding.test.ts`: band() with NQC years (BR-030, BR-034) (via BR-030)<br>`live-readonly.ts`: [results] Edge: maximum Z-score +4.0000 is accepted; nothing is Reach/Out of range (via BR-030)<br>`live-readonly.ts`: [results] Edge: minimum Z-score -4.0000 is accepted; nothing is Safe or Likely (via BR-030)<br>+1 more | Direct |
| FR-206 | For each banded offering, the system shall show the signed difference between the student's Z-score and the latest... | `banding.test.ts`: reports the signed gap to the latest cut-off (FR-206) <br>`api-e2e.ts`: Banded offerings carry the latest cut-off and the gap <br>`live-readonly.ts`: [results] POST /api/results N (N, N, z=N) sanity <br>`banding.test.ts`: RISING, FALLING, STEADY and JUMPY (inferred) | Direct |
| FR-207 | No screen or answer shall state or imply that admission is certain. | `api-e2e.ts`: computedAt is an ISO time; no "guarantee" wording <br>`live-readonly.ts`: [results] No response states or implies certain admission  | Direct |
| FR-208 | The system shall show, per offering, the cut-off for the student's district for each available intake year, with the... | `api-e2e.ts`: Banded offerings carry the latest cut-off and the gap <br>`api-e2e.ts`: GET /offerings/001A returns detail with a citation <br>`api-e2e.ts`: History without a district has null cut-offs <br>`api-e2e.ts`: History with ?district=COL has cut-offs, each year cited <br>`live-readonly.ts`: [offering] GET /api/offerings/:uniCode with district: cited history with district cut-offs <br>`live-readonly.ts`: [offering] Offering without district: history zE4 all null (no guessing)  | Direct |
| FR-209 | Every cut-off, rule, duration, medium and aptitude-test flag shown shall link to its source document and page and... | `api-e2e.ts`: GET /meta lists cited sources <br>`api-e2e.ts`: GET /offerings/001A returns detail with a citation <br>`api-e2e.ts`: History with ?district=COL has cut-offs, each year cited <br>`live-readonly.ts`: [offering] GET /api/offerings/:uniCode with district: cited history with district cut-offs <br>`syllabi.test.ts`: serves the official curriculum with its source on the course API (inferred)<br>`data-integrity.e2e.test.ts`: DAT-035 every course rule cites a handbook page and its quote (inferred)<br>+1 more | Direct |
| FR-210 | The system shall filter offerings by band, university, field of study and distance from the student's district, and... | - | None |
| FR-211 | For a chosen dream offering, the system shall show the gap to its lowest cut-off in the available years and classify... | - | None |
| FR-212 | For a dream offering, the system shall suggest up to three offerings in the same field that are Safe or Likely for... | - | None |
| FR-213 | The system shall compare up to three offerings side by side on band, duration, medium, campus, aptitude test and trend. | `list.e2e.test.ts`: LST-026 COMPARE_MAX is 3 (inferred)<br>`list.e2e.test.ts`: LST-027 multi-select keeps the first 3 picked, in the order picked (inferred)<br>`list.e2e.test.ts`: LST-028 adding one at a time appends in order, ignores a repeat, and stops at 3 (inferred) | Inferred (partial: compare limit/selection only; side-by-side fields not tested) |
| FR-214 | The system shall show monthly living-cost estimates by campus with sample size and collection date. | - | None |
| FR-215 | The system shall search the student's courses across every band by course name, university name, common short forms... | `search.test.ts`: finds Uni-Codes and common short forms (inferred)<br>`search.test.ts`: matches word starts in any order, ignoring case and punctuation (inferred) | Inferred |
| FR-216 | Compare shall show each offering as a column that swipes sideways on a narrow screen and, while fewer than three are... | - | None |
| FR-217 | Every Compare button in the app shall open the Compare screen with that offering included. | - | None |
| FR-218 | The cut-off chart on a course page shall print each point's cut-off value beside the point. | - | None |

### FE-3 Preference list

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| FR-301 | The system shall let the student add eligible offerings to an ordered list and reorder them by drag and drop and by... | `list.test.ts`: copies Uni-Codes one per line in list order (FR-306) and moves entries (inferred)<br>`list.e2e.test.ts`: LST-015 move down: first to last (inferred)<br>`list.e2e.test.ts`: LST-016 move by one (the up/down arrows) swaps neighbours (inferred) | Inferred (partial: reorder logic only; drag-and-drop and keyboard UI not tested) |
| FR-302 | The system shall refuse to add an offering for which the student is not eligible. | `list.e2e.test.ts`: LST add: eligibility, duplicates, FULL at 125 (BR-017, BR-043, FR-302, FR-308) <br>`list.test.ts`: adds only eligible offerings, never twice, at most 125 (FR-302, FR-308)  | Direct |
| FR-303 | The system shall warn when a Safe offering is listed above a Likely or Reach offering (BR-040, BR-041). | `list.e2e.test.ts`: LST order warnings (BR-041, BR-042) (via BR-041)<br>`list.test.ts`: warns when a Safe course sits above a Likely or Reach one (BR-041) (via BR-041) | Direct |
| FR-304 | The system shall warn when the list contains no Safe offering (BR-042). | `list.e2e.test.ts`: LST order warnings (BR-041, BR-042) (via BR-042)<br>`list.test.ts`: warns when there is no Safe course (BR-042), but not for an empty list (via BR-042) | Direct |
| FR-308 | The system shall limit the list to 125 Uni-Codes with no duplicates (BR-043). | `list.e2e.test.ts`: (file header) <br>`list.e2e.test.ts`: LST add: eligibility, duplicates, FULL at 125 (BR-017, BR-043, FR-302, FR-308) <br>`list.test.ts`: adds only eligible offerings, never twice, at most 125 (FR-302, FR-308)  | Direct |
| FR-305 | The system shall propose a corrected order that keeps the student's most-wanted offerings first and Safe ones last,... | `list.test.ts`: proposes an order that keeps the student\'s wishes first and Safe ones last (FR-305)  | Direct |
| FR-306 | The system shall copy the list's uni-codes to the clipboard, one per line, in list order. | `list.e2e.test.ts`: LST-019 reordering is reflected in the copied Uni-Code text (FR-306) <br>`list.test.ts`: copies Uni-Codes one per line in list order (FR-306) and moves entries  | Direct |
| FR-307 | The system shall present the official application steps with the most common mistake for each, linked to the... | - | None |
| FR-309 | Pressing and holding a course in Courses or My list, or tapping Select, shall start selection with that course... | - | None |
| FR-310 | The selection bar in Courses shall offer Add to my list, which adds every selected course under FR-302 and FR-308... | `list.test.ts`: adds in order, skips ones already on the list, and stops at 125 (inferred)<br>`list.e2e.test.ts`: LST-008 keeps the given order and appends after existing entries (inferred)<br>`list.e2e.test.ts`: LST-010 at capacity: fills up to 125 in order, the rest count as full (inferred)<br>`list.e2e.test.ts`: LST-013 added + already + full always equals the batch size (inferred) | Inferred |
| FR-311 | The selection bar in Courses and My list shall offer Compare, which opens Compare with the selected courses in the... | `list.e2e.test.ts`: LST-027 multi-select keeps the first 3 picked, in the order picked (inferred) | Inferred |

### FE-4 Journey and deadlines

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| FR-401 | The system shall show the student's Journey steps in order (BR-060), the courses and notices the student follows,... | `journey.test.ts`: buildJourney (FR-401, FR-403) <br>`api-e2e.ts`: GET /journey returns steps and notices (no build stamp) <br>`live-readonly.ts`: [meta] GET /api/journey shape (academicYear, steps with id/title/page) <br>`api-e2e.ts`: Unknown step id -> 404 (via BR-060) | Direct |
| FR-402 | A date shall be shown only when it is announced, labelled Confirmed with its source. A UGC step whose date is not... | `live-readonly.ts`: [meta] GET /api/journey shape (academicYear, steps with id/title/page) <br>`journey.e2e.test.ts`: JRN-006 shipped 2025/26 read model: every UGC step is closed (no dates announced yet, none (inferred)<br>`data-integrity.e2e.test.ts`: DAT-016 no UGC step carries a date (opensOn absent or null) until a UGC press notice is so (inferred)<br>`data-integrity.e2e.test.ts`: DAT-017 no UGC step text states a calendar date (inferred) | Direct |
| FR-403 | When the list contains an offering with an aptitude or practical test (BR-025), the journey shall add the test's... | `journey.test.ts`: buildJourney (FR-401, FR-403)  | Direct |
| FR-404 | The system shall generate an iCalendar file of the journey's dated items with alarms 7 days and 1 day before each,... | `journey.test.ts`: reminders (FR-404, FR-405) <br>`journey.e2e.test.ts`: (file header) (range ref) | Direct |
| FR-405 | The system shall send web-push reminders 7 days and 1 day before each deadline to students who opted in. | `journey.test.ts`: reminders (FR-404, FR-405) <br>`journey.e2e.test.ts`: (file header) (range ref) | n/a (Superseded) |
| FR-406 | The system shall delete a push subscription when the student turns notifications off. | - | n/a (Superseded) |
| FR-407 | The system shall check special-intake categories against the student's answers and link each to its handbook section. | `ask.test.ts`: turns achievements into facts, with ZedPath (not the model) deciding the special intake (inferred) | Inferred (partial: outstanding-achievement intake only; other special-intake categories not tested) |
| FR-408 | The system shall let the student add a route's dates to the journey. | - | n/a (Superseded) |
| FR-409 | Every Journey step shall start unticked; only the student shall tick or untick a step. | `api-e2e.ts`: GET /me/journey starts empty <br>`api-e2e.ts`: Un-tick a UGC step (done:false) is always allowed <br>`api-e2e.ts`: GET /me/journey shows exactly the 3 ticked preparation steps <br>`api-e2e.ts`: Un-tick a preparation step <br>`my-journey.test.ts`: starts empty: nothing is ticked for the student (safe default) (inferred) | Direct |
| FR-410 | The server shall accept a tick only inside the step's window (BR-061) and shall refuse a tick outside it without... | `api-e2e.ts`: Preparation step N can be ticked any time <br>`api-e2e.ts`: UGC step N N <br>`api-e2e.ts`: Step with a non-boolean done flag -> 400 <br>`my-journey.test.ts`: lets a step or notice be ticked only once it is open, and checks it on the server (inferred)<br>`my-journey.test.ts`: opens preparation steps any time, and UGC steps only from their announced date (inferred)<br>`journey.e2e.test.ts`: JRN-003 N opens exactly on opensOn (closed the day before, open on the day and after) (inferred) | Direct |
| FR-411 | The system shall save the student's followed courses, followed notices (with the I applied state) and ticked steps... | `api-e2e.ts`: GET /me/journey starts empty <br>`api-e2e.ts`: Followed course appears in GET /me/journey <br>`api-e2e.ts`: GET /me/journey shows exactly the 3 ticked preparation steps <br>`api-e2e.ts`: Before delete: account C follows a course, a notice and ticks a step <br>`live-readonly.ts`: case: /api/me/journey <br>`my-journey.test.ts`: follows and unfollows real courses and notices only, never twice (inferred) | Direct |
| FR-412 | In the Android app, the phone shall schedule a notification 7 days and 1 day before each dated item in the Journey,... | `journey.test.ts`: reminds 7 days and 1 day before at 08:00 local time, future times only (inferred)<br>`journey.test.ts`: gives each reminder a stable id above the reserved range (inferred)<br>`notify.test.ts`: in the native app, asks permission once and posts exactly one native notification (inferred) | Inferred (partial: reminder times and notification bridge; Android scheduling itself not tested) |
| FR-413 | Me shall offer reminder settings, kept on the phone: 7-day reminder on or off, 1-day reminder on or off, 8 am or 6... | `journey.test.ts`: follows the chosen days and hour, in reminders and in the calendar file (inferred)<br>`journey.e2e.test.ts`: JRN-018 prefs: week off, day off, evening hour (inferred) | Inferred |
| FR-414 | The student shall be able to follow and unfollow a notice or other path from Open now and from other-path pages; a... | `api-e2e.ts`: Follow notice R001 <br>`api-e2e.ts`: Follow unknown notice R999 -> 404 <br>`api-e2e.ts`: Unfollow notice R001 <br>`my-journey.test.ts`: follows and unfollows real courses and notices only, never twice (inferred) | Direct |
| FR-415 | The student shall be able to tick I applied on a followed notice only once it has opened (BR-062); the server shall... | `api-e2e.ts`: "I applied" without a flag -> 400 <br>`api-e2e.ts`: "I applied" on a notice not followed -> 404 <br>`api-e2e.ts`: case: "I applied" on followed, already-open notice N <br>`api-e2e.ts`: case: "I applied" on an open notice <br>`api-e2e.ts`: Un-tick "I applied" (applied:false) <br>`api-e2e.ts`: case: "I applied" before notice N opens -> 409 (via BR-062)<br>+3 more | Direct |
| FR-416 | The student shall be able to follow and unfollow a course from its course page; the server shall accept only 2025/26... | `api-e2e.ts`: Follow course 001A <br>`api-e2e.ts`: Following the same course again is idempotent <br>`api-e2e.ts`: Unfollow course 001A <br>`my-journey.test.ts`: follows and unfollows real courses and notices only, never twice (inferred)<br>`migrations.e2e.test.ts`: MIG-018 composite FK journey_course -> offering rejects a non-existent offering (real cour (inferred) | Direct |
| FR-417 | The Journey shall have a second tab, Open now, listing the open notices (FR-503); the top bar shall have no bell,... | - | None |

### FE-5 Other routes

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| FR-501 | The system shall list non-UGC routes in six groups (private and non-state degrees, higher national diplomas,... | `api-e2e.ts`: GET /routes lists every other route with an openNow flag <br>`live-readonly.ts`: [meta] GET /api/routes shape (id, name, group, openNow boolean) <br>`data-integrity.e2e.test.ts`: DAT-006 route groups are the known seven, and each has an interface label (inferred) | Direct |
| FR-502 | Each route shall show entry requirements, duration, approximate cost, intake timing and sources with verified dates. | `data-integrity.e2e.test.ts`: DAT-030 every route carries a source link, a locator and a retrieval date (inferred)<br>`data-integrity.e2e.test.ts`: DAT-031 route costs are sane: whole LKR, not negative, min <= max (inferred) | Inferred |
| FR-503 | The system shall show announced Gazette job examinations and intakes of other routes, each with its closing date,... | `api-e2e.ts`: GET /routes lists every other route with an openNow flag <br>`live-readonly.ts`: [meta] GET /api/routes shape (id, name, group, openNow boolean) <br>`journey.test.ts`: are the official ones, with sources (inferred) | Direct |
| FR-504 | A job-examination notice extracted with low confidence shall not be shown until a curator approves it. | - | None |
| FR-505 | The system shall show the recognition status of a programme's awarding university and local approval, each with... | - | None |
| FR-506 | The system shall check the basic conditions of the government interest-free loan scheme. | - | None |
| FR-507 | The system shall list government scholarships abroad open to school leavers with usual timing and requirements. | - | None |
| FR-508 | For a dream offering, the system shall show the Z-score gap, the student's attempt number out of the maximum... | - | n/a (Withdrawn) |
| FR-509 | For each notice, the device shall check the A/L-pass rule against the student's results and the age rule against the... | `journey.test.ts`: meets the Customs exam with 3 passes and the right age, and says when it closes (inferred)<br>`journey.test.ts`: checks named subjects: NDT needs Physics, Chemistry and C. Maths or H. Maths (inferred)<br>`journey.test.ts`: says UNKNOWN (never a guess) without results or a birth date, and NOT_NEEDED where no A/L  (inferred) | Inferred |
| FR-510 | Notices shall be ordered with open and upcoming ones first, soonest closing date first, then closed ones, most... | `journey.test.ts`: sorts open ones by closing date first, closed ones last (inferred) | Inferred |

### FE-6 Ask

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| FR-601 | The system shall answer a question in the language it was asked (Sinhala, Tamil or English). | `ask.test.ts`: still asks the model for Sinhala or Tamil questions, so the reply is in that language (inferred)<br>`api-e2e.ts`: Empty question -> 400 (cites the id but does not exercise it) | Inferred (partial: model is mocked; reply language not verified) |
| FR-602 | Answers about eligibility shall use the student's profile when the student has one. | `ask.test.ts`: adds facts from ZedPath\'s own rule engine for the student\'s results (inferred)<br>`api-e2e.ts`: Valid question with an invalid profile -> 400 (before any model) (cites the id but does not exercise it) | Inferred |
| FR-603 | Every factual answer shall cite at least one stored source (document and page). | `ask.test.ts`: answers with citations that point at the exact passages used (inferred)<br>`ask.e2e.test.ts`: ASK-023 grouped and repeated citations map once each, in order of first use (inferred)<br>`ask.e2e.test.ts`: ASK-025 a handbook citation points at the official UGC handbook and its page, quote at mos (inferred) | Inferred |
| FR-604 | When no stored source supports an answer, the system shall say it does not know and point to an official contact,... | `ask.test.ts`: says "not found" for off-topic English questions without spending a model call (inferred)<br>`ask.e2e.test.ts`: ASK-004 NOT_FOUND is read (inferred) | Inferred |
| FR-605 | The system shall decline to predict future cut-offs or guarantee admission, and offer the historical pattern instead. | - | None |
| FR-606 | The system shall offer actions under an answer, built by ZedPath from its own data and never from the model's text:... | `ask.test.ts`: builds actions from its own matches: best chance first, at most 3 places, and named Gazett (inferred) | Inferred |
| FR-607 | When the model's reply starts with a verdict, the answer shall show it as a chip: Yes, No, It depends or Not in... | `ask.test.ts`: reads the verdict line and removes it from the text; no line means no verdict (inferred)<br>`ask.e2e.test.ts`: ASK-001 YES is read and the line removed (inferred)<br>`ask.e2e.test.ts`: ASK-005 NONE means no chip, but the line is still removed (inferred)<br>`ask.e2e.test.ts`: ASK-008 a missing line, or a verdict that is not on the first line, gives no chip (inferred) | Inferred |
| FR-608 | An answer shall be shown as one lead line and short bullets; bullets after the fourth shall be folded behind Show more. | `answer.test.ts`: turns a wall of text into a lead line and bullets (inferred)<br>`ask.e2e.test.ts`: ASK-021 show-more split: more than 4 bullets are all returned, so the screen folds the res (inferred) | Inferred |
| FR-609 | Each citation chip shall show a readable source name (handbook page, or the route's name; never an internal file... | `ask.test.ts`: shows a route by its name and official document, never the research notes (video 2) (inferred)<br>`ask.e2e.test.ts`: ASK-025 a handbook citation points at the official UGC handbook and its page, quote at mos (inferred)<br>`ask.e2e.test.ts`: ASK-026 an unknown route shows "Official source" and a javascript: link is turned into no  (inferred) | Inferred |
| FR-610 | An answer about a course shall offer two follow-up questions about that course; an answer whose verdict is Not in... | - | None |
| FR-611 | The system shall record Helpful and Report a wrong answer (optional note of up to 500 characters) with the question,... | `api-e2e.ts`: Feedback with an unknown rating -> 400 <br>`api-e2e.ts`: Feedback with nothing to report -> 400 <br>`ask.test.ts`: stores feedback without anything that identifies the student, and validates it (inferred) | Direct |
| FR-612 | The app shall send the student's achievements and interests with a question; the server shall use them for that... | `api-e2e.ts`: case: Unknown interest <br>`api-e2e.ts`: Valid question with invalid extras -> 400 (before any model) <br>`api-e2e.ts`: Interests come back in the fixed app order <br>`api-e2e.ts`: case: Achievement with an unknown level (via BR-080)<br>`ask.test.ts`: sends the achievements to the model only for that answer, and validates them (inferred) | Direct |

### FE-7 People around the student

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| FR-701 | The system shall generate a share card (image and short text) in the chosen language and pass it to the device share... | - | None |
| FR-702 | The share card shall exclude the student's name and Z-score unless the student includes them. | - | None |
| FR-703 | The system shall show seniors' messages with the badge "Verified senior · course, year n", set by the server from... | `groups.test.ts`: words the senior badge (inferred)<br>`groups.e2e.test.ts`: GRP-023 members list: seniors first with their badge, then students in join order; no name (inferred) | Inferred |
| FR-704 | The system shall verify a senior by a university Google account on a recognised domain, or by curator review of... | - | n/a (Superseded) |
| FR-705 | The system shall provide one group per target course and one per A/L batch (BR-070, BR-071); Groups shall list the... | `api-e2e.ts`: GET /groups?courses= lists asked course groups and ignores unknown codes <br>`api-e2e.ts`: Join course group N, accepting the rules (first join) <br>`api-e2e.ts`: Join own batch group (results saved on the account) <br>`api-e2e.ts`: Room connection for a non-member -> 403 <br>`api-e2e.ts`: Leave the group, then the member list -> 403 <br>`live-readonly.ts`: case: /api/me/journey <br>+5 more | Direct |
| FR-706 | The system shall show a teacher aggregate counts for students who shared with the teacher's class code, and names... | - | None |
| FR-707 | The system shall verify a senior by a one-time invite code issued by the product owner after checking enrolment,... | `api-e2e.ts`: case: Invite code in the wrong format <br>`api-e2e.ts`: Valid-format but unknown invite code refused <br>`groups.test.ts`: creates a verified SENIOR account that stores no A/L results (inferred)<br>`groups.test.ts`: refuses a used, expired, unknown or malformed code and creates nothing (inferred)<br>`groups.test.ts`: lets only a SENIOR account of the right institution redeem an invite, once (inferred) | Direct |
| FR-708 | Group messages shall be text only, 1 to 500 characters, and shall be checked by an automatic moderation model before... | `groups.test.ts`: refuses empty, non-text, too long and control characters (inferred)<br>`groups.test.ts`: treats anything unreadable as unsafe (inferred)<br>`groups.e2e.test.ts`: GRP-009 length: exactly MESSAGE_MAX passes, one more is refused, surrounding spaces do not (inferred) | Inferred |
| FR-709 | The room shall limit each member to one message every 3 seconds and 20 messages in any 10 minutes (BR-072). | `groups.test.ts`: allows a first message and refuses one within 3 seconds (inferred)<br>`groups.test.ts`: caps 20 messages in 10 minutes, then lets older ones expire (inferred) | Inferred |
| FR-710 | A member shall be able to report a message once, with a reason (BR-073); a message reported by three different... | `api-e2e.ts`: Report with a malformed message id -> 400 <br>`groups.test.ts`: hides a message once three different members report it, never on repeats by one member (inferred) | Direct |
| FR-711 | A member shall be able to block and unblock another member by username; a blocked member's messages shall not be... | `api-e2e.ts`: Block another member; the block list shows them <br>`api-e2e.ts`: Block yourself -> 400 <br>`api-e2e.ts`: Block an unknown username -> 404 <br>`api-e2e.ts`: Unblock <br>`groups.test.ts`: blocks and unblocks by username (inferred)<br>`groups.test.ts`: hides hidden messages and blocked authors only (inferred) | Direct |
| FR-712 | The room shall refuse a message containing a Sri Lankan phone number or an email address, with an explanation (group... | `api-e2e.ts`: Message containing a phone number is refused by the room (WebSocket) <br>`groups.test.ts`: refuses phone numbers in any spacing and email addresses (inferred)<br>`groups.e2e.test.ts`: GRP-001 blocks a plain Sri Lankan mobile number (07X XXXXXXX) for every operator prefix (inferred)<br>`groups.e2e.test.ts`: GRP-005 blocks email addresses in common shapes (inferred)<br>`security-e2e.ts`: [Group safety] Live WebSocket: A posts "text me on 0771234567 or kasun@example.com" in the (inferred)<br>`ws-check.ts`: GRP-WS-06 phone-number post refused: N (inferred) | Direct |
| FR-713 | A member shall accept the current group rules for each group before taking part; the server shall refuse a join... | - | n/a (Superseded) |
| FR-714 | A student shall accept the current group rules once per account, at the first join of any group (BR-075); the server... | `api-e2e.ts`: GET /groups lists the popular course groups; rules not yet accepted <br>`api-e2e.ts`: Join without accepting the rules (first join) -> 400 <br>`api-e2e.ts`: Join course group N, accepting the rules (first join) <br>`api-e2e.ts`: Second group N: the rules are not asked again <br>`api-e2e.ts`: GET /groups now says rules accepted and lists joined groups first <br>`api-e2e.ts`: Join with an old rules version -> 400 (via BR-075)<br>+2 more | Direct |
| FR-715 | Groups shall list popular course groups for everyone: Medicine (001), Engineering (008), Computer Science (012),... | `api-e2e.ts`: GET /groups lists the popular course groups; rules not yet accepted <br>`groups.test.ts`: lists the popular course groups for everyone, without repeating ones already suggested (inferred) | Direct |
| FR-716 | A group may show curated sample conversations before the real messages; each shall be marked Sample, have an author... | `ws-check.ts`: GRP-WS-04 history frame received (N messages, samples labelled) (inferred)<br>`groups.test.ts`: every sample is marked, named "Sample", never "verified", and cannot be reported (inferred)<br>`groups.e2e.test.ts`: GRP-019 every sample message is labelled: sample flag, "Sample" author, sample- id, no "ve (inferred)<br>`data-integrity.e2e.test.ts`: DAT-046 every sample chat message is flagged sample, authored "Sample ...", and has a samp (inferred) | Inferred |
| FR-717 | Tapping the group's name in a room shall open its info page: description, general group rules and any group-specific... | `api-e2e.ts`: GET /groups/:id returns the summary <br>`groups.test.ts`: lets only members open the live room or report, and leaving ends membership (inferred)<br>`groups.e2e.test.ts`: GRP-025 leave then rejoin: same group, no new rules prompt, members count goes 2 -> 1 -> 2 (inferred) | Direct (partial: leave/rejoin only; info page content not tested) |
| FR-718 | The member list shall show usernames, avatars and senior badges, never real names, and the server shall return it... | `api-e2e.ts`: Member list for a non-member -> 403 <br>`api-e2e.ts`: Second account joins; member list has both usernames and no contact details <br>`groups.test.ts`: CR-006: shows members to members only, with usernames and avatars, never names (inferred)<br>`groups.e2e.test.ts`: GRP-023 members list: seniors first with their badge, then students in join order; no name (inferred) | Direct |
| FR-719 | An open group room shall be kept alive by a message from the app at least every 25 seconds and shall reconnect by... | `ws-check.ts`: GRP-WS-05 ping -> pong auto-response (inferred)<br>`api-e2e.ts`: Room connection without a WebSocket upgrade -> 400 (member) (cites the id but does not exercise it) | Inferred (partial: ping/pong auto-response only; 25 s interval and auto-reconnect not tested) |

### FE-8 After selection

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| FR-801 | The system shall present each university's registration requirements as a checklist with where to obtain each item. | - | None |
| FR-802 | The system shall explain Mahapola and bursary eligibility and the documents that delay applications. | - | None |
| FR-803 | The system shall propose a month-by-month plan for the period before lectures, based on the course and district. | - | None |
| FR-804 | The system shall keep a documents checklist covering every route. | - | None |

### FE-9 Data and trust

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| FR-901 | The system shall let a curator register a source document with publisher, title, edition, issue date and language,... | - | None |
| FR-902 | The system shall detect a duplicate source by fingerprint. | - | None |
| FR-903 | The system shall extract, from a handbook source, one candidate rule per course with a confidence score and source page. | - | None |
| FR-904 | An independent second model shall mark each candidate rule agree or disagree. | - | None |
| FR-905 | A candidate rule shall be published automatically only when both models agree and both confidences are at least... | - | None |
| FR-906 | The review queue shall show the source text, the proposed structured fact, both verdicts and the page, and let the... | - | None |
| FR-907 | Each review decision shall be recorded with reviewer, time and the change made. | - | None |
| FR-908 | The system shall fetch new Gazette issues weekly, extract exam name, eligibility, age limit and closing date with... | - | None |
| FR-909 | A failed scheduled run shall be retried automatically and its failure shown to the curator. | - | None |
| FR-910 | The system shall let anyone report a mistake on any fact with an optional note, linked to that fact, and queue it... | - | None |
| FR-911 | The system shall keep every previous version of a published fact. | - | None |
| FR-912 | The system shall require a bot check before accepting a report, a reminder opt-in or a question. | - | None |
| FR-913 | The system shall limit Ask requests per client per minute (NFR-034) and return a friendly message when exceeded. | `ask.test.ts`: allows 30 questions a day per device, while other devices on the same network carry on (inferred)<br>`ask.e2e.test.ts`: ASK-041 a shared network (IP) is refused after N questions even from a fresh device (inferred) | Inferred (partial: tests a 30/day device limit; per-minute limit and friendly message not asserted) |

## Non-functional requirements

### Performance

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| NFR-001 | The first screen shall be interactive within 3 seconds on a "Fast 3G" network profile on a mid-range Android phone. | `live-static.ts`: [Caching] HTML cache-control forces revalidation <br>`live-static.ts`: [Caching] hashed /assets/* JS has a long cache  **[last live run: FAIL]**<br>`live-static.ts`: [Performance] main JS compressed transfer < 350 KB (task budget) <br>`live-static.ts`: [Bundle] CSS bundle reachable, size recorded <br>`live-static.ts`: [Caching] hashed CSS has a long cache  **[last live run: FAIL]**<br>`live-static.ts`: [Performance] index TTFB over 10 cold-connection runs (p50/p95)  | Direct (partial: proxies only (cache headers, bundle size, TTFB); 3 s interactive on Fast 3G not measured) |
| NFR-002 | Eligibility and banding results shall appear within 2 seconds of submitting a profile on a "Fast 3G" profile. | `live-readonly.ts`: [performance] N p95 over 10 calls <= 1500 ms  | Direct (partial: server p95 measured; Fast 3G end-to-end time not measured) |
| NFR-003 | 95% of API requests (excluding Ask) shall complete within 500 ms at the edge. | `api-e2e.ts`: GET /meta with matching If-None-Match -> 304 <br>`api-e2e.ts`: GET /journey with matching If-None-Match -> 304 <br>`api-e2e.ts`: Offering detail with matching If-None-Match -> 304 <br>`live-readonly.ts`: [performance] N p95 over 10 calls <= 1500 ms <br>`live-static.ts`: [Performance] index TTFB over 10 cold-connection runs (p50/p95)  | Direct |
| NFR-004 | Ask answers shall begin streaming within 4 seconds in 95% of cases. | - | None |
| NFR-005 | Each API request shall use less than 10 ms of CPU time (the free-plan limit). | `perf.e2e.test.ts`: (file header)  | Direct (partial: in-process time on Node with stub bindings, not Workers CPU telemetry) |
| NFR-006 | The initial JavaScript download shall not exceed 200 KB compressed. | `live-static.ts`: [Performance] main JS compressed transfer <= 200 KB (SRS NFR-006)  | Direct |

### Capacity and cost

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| NFR-010 | The system shall serve 10,000 students per admission cycle within the free plan (BO-1, BO-6). | - | None |
| NFR-011 | Daily usage of each Cloudflare free-plan quota shall stay below 70% on a typical day and below 100% on results day,... | `api-e2e.ts`: GET /routes is cacheable for 5 minutes <br>`live-readonly.ts`: [meta] GET /api/meta revalidates with ETag (304 on If-None-Match)  **[last live run: FAIL]**<br>`live-static.ts`: [Caching] hashed /assets/* JS has a long cache  **[last live run: FAIL]** | Direct (partial: cache/ETag behaviour only; quota usage not measured) |
| NFR-012 | Page navigation shall not consume Worker requests (static assets are served without invoking the Worker). | `live-readonly.ts`: [static] GET / serves the app HTML <br>`live-static.ts`: [Routing] SPA deep link N serves the app shell  | Direct |

### Usability, accessibility and localisation

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| NFR-020 | A first-time user shall reach a checked preference list in under 10 minutes without help (BO-3), measured with at... | - | None |
| NFR-021 | The interface shall meet WCAG 2.2 level AA. | - | None |
| NFR-022 | Touch targets shall be at least 48 × 48 dp, following Material Design 3. | - | None |
| NFR-023 | All interface text shall exist in Sinhala, Tamil and English; no screen shall mix languages except for official... | `i18n.test.ts`: is actually translated (in that script), not English left in place (inferred)<br>`data-integrity.e2e.test.ts`: DAT-053 the Sinhala and Tamil dictionaries cover every English key with non-empty text (inferred) | Inferred |
| NFR-024 | Sinhala and Tamil text shall render correctly with Noto Sans Sinhala and Noto Sans Tamil. | - | None |
| NFR-025 | Layouts shall work from 360 px width without horizontal scrolling. | `live-static.ts`: [Shell] charset and viewport meta present  | Direct (partial: viewport meta only; 360 px layout not measured) |

### Security and privacy

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| NFR-030 | The system shall store personal data on the server only for a purpose stated to the student and with the student's... | `live-readonly.ts`: [results] Results are not cached publicly and set no cookie  | Direct (partial: results set no cookie and are not publicly cached; consent-purpose storage not checked here) |
| NFR-031 | Results photos shall be deleted within 5 minutes of upload, whether or not reading succeeds. | - | None |
| NFR-032 | Curator functions shall require authentication; every curator action shall be logged. | - | None |
| NFR-033 | Secrets (API keys) shall be stored as Cloudflare secrets and never in source code or the repository. | `live-readonly.ts`: [routing] POST /api/dev/embed is disabled in production -> 404 (no model call) <br>`live-readonly.ts`: [routing] POST /api/dev/search is disabled in production -> 404 (no model call) <br>`live-static.ts`: [Security] no source maps published <br>`live-static.ts`: [Security] no secret-looking strings in shipped JS ('AIza', 'sk-ant', 'ghp_', 'BEGIN PRIVA <br>`live-static.ts`: [Security] GET N does not expose project files  | Direct |
| NFR-034 | Ask shall accept at most 10 questions per client per minute and 100 per client per day. | `ask.test.ts`: allows 30 questions a day per device, while other devices on the same network carry on (inferred)<br>`ask.e2e.test.ts`: ASK-041 a shared network (IP) is refused after N questions even from a fresh device (inferred)<br>`ask.e2e.test.ts`: ASK-042 a malformed device id falls back to the IP, so it cannot dodge the N/day device li (inferred) | Inferred (partial: SRS says 10/min and 100/day; tests pin a 30/day device limit (mismatch to resolve)) |
| NFR-035 | All input shall be validated on the server; database access shall use bound parameters only. | `api-e2e.ts`: Z sent as a string rejected <br>`api-e2e.ts`: Unknown stream rejected <br>`api-e2e.ts`: Unknown district rejected <br>`api-e2e.ts`: Malformed subject code rejected <br>`api-e2e.ts`: Invalid JSON body rejected <br>`api-e2e.ts`: JSON null body rejected <br>+44 more | Direct |
| NFR-036 | A password shall never leave the device; the server shall store only a SHA-256 hash of the key derived on the device... | `api-e2e.ts`: case: Key too short <br>`api-e2e.ts`: case: Key in upper-case hex <br>`api-e2e.ts`: Salt for a valid username: 32 hex + KDF name <br>`api-e2e.ts`: Salt is stable and the same shape for an unknown username <br>`api-e2e.ts`: Session cookie is HttpOnly, Secure, SameSite=Lax, Path=/api, 30 days <br>`live-readonly.ts`: [validation] POST /api/auth/signup with valid-format username but malformed key -> 400 (no <br>+1 more | Direct |
| NFR-037 | Sign-up and log-in attempts shall be limited to 10 a minute per network address and username, and 100 a minute per... | `live-readonly.ts`: [cors] Foreign Origin on POST /api/auth/signup -> 403 <br>`account.test.ts`: rate-limits sign-up and log-in (inferred)<br>`account.test.ts`: blocks the 11th password guess at one account within a minute (inferred)<br>`security-e2e.ts`: [Rate limiting] N wrong-key logins for one username within a minute (inferred) | Direct |
| NFR-038 | Group membership, group-rules acceptance, the Journey tick windows and the I applied rule shall be enforced by the... | `api-e2e.ts`: N N without a session -> 401 <br>`live-readonly.ts`: case: /api/me/journey <br>`live-readonly.ts`: [cors] Foreign Origin on PUT /api/me/journey/steps -> 403 <br>`live-readonly.ts`: [cors] Foreign Origin on POST /api/groups/join -> 403  | Direct |
| NFR-039 | Message moderation shall fail closed: when the moderation result cannot be read, the message shall not be posted. | `groups.test.ts`: treats anything unreadable as unsafe (inferred) | Inferred |

### Reliability and availability

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| NFR-040 | Core browsing (courses, bands, list) shall remain usable if the AI services are unavailable. | `api-e2e.ts`: GET /health returns ok and the academic year <br>`live-readonly.ts`: [meta] GET /api/health is up and rules reconciled <br>`account.test.ts`: answers 503 for account routes and still gives results with no cookie (inferred)<br>`ask.test.ts`: is switched off (503) until every piece exists, and nothing else breaks (inferred) | Direct (partial: health endpoint and "Ask off, results still work"; AI outage of browsing not simulated) |
| NFR-041 | Scheduled jobs shall retry failed steps at least three times with back-off. | - | None |
| NFR-042 | The database shall be restorable to any point in the previous 7 days (D1 Time Travel). | - | None |
| NFR-043 | An idle group-room connection shall stay open (keep-alive at least every 25 seconds, answered without waking the... | `ws-check.ts`: GRP-WS-05 ping -> pong auto-response (inferred) | Inferred (partial: ping/pong auto-response only; 25 s interval and auto-reconnect not tested) |

### Data quality

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| NFR-050 | 100% of published facts shall reference a source document and page (BO-2). | `api-e2e.ts`: GET /meta lists cited sources <br>`live-readonly.ts`: [meta] GET /api/meta shape (year, 25 districts, 6 streams, subjects, sources) <br>`live-readonly.ts`: [meta] GET /api/journey shape (academicYear, steps with id/title/page) <br>`live-readonly.ts`: [results] Hidden offerings each carry a reason and handbook page <br>`live-readonly.ts`: [offering] GET /api/offerings/:uniCode with district: cited history with district cut-offs <br>`data-integrity.e2e.test.ts`: DAT-030 every route carries a source link, a locator and a retrieval date (inferred)<br>+1 more | Direct |
| NFR-051 | Cut-off values shall be stored and compared as exact four-decimal values, not binary floating point. | `banding.test.ts`: parseZ / formatZ (BR-005, NFR-051) <br>`live-readonly.ts`: [results] POST /api/results N (N, N, z=N) sanity  | Direct |
| NFR-052 | Imported cut-off tables shall be verified by two independent extraction methods with zero unexplained differences... | `accuracy.e2e.test.ts`: ACC-020 2025/26: every cell of every independently matched COP column equals the engine va (inferred)<br>`accuracy.e2e.test.ts`: ACC-051 2025/26: the number of numeric and NQC cells in the engine equals the COP table (n (inferred) | Inferred |
| NFR-053 | A reported mistake shall be triaged within 48 hours during the admission season. | - | None |

### Maintainability and portability

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| NFR-060 | Business rules (eligibility, banding thresholds) shall be data or pure functions with unit tests, not scattered... | `banding.test.ts`: parses four-decimal Z-scores exactly (inferred)<br>`rules.test.ts`: rejects any subject below S (inferred) | Inferred (partial: rules are pure functions with unit tests; structural property itself not checked) |
| NFR-061 | Rule-engine code shall have at least 90% branch coverage. | - | None |
| NFR-062 | A new intake year's handbook and cut-offs shall be loadable without code changes. | - | None |
| NFR-063 | The front end shall run in any standards-compliant browser without installation; it may be installed as a... | `live-readonly.ts`: [static] GET / serves the app HTML <br>`live-readonly.ts`: [static] Deep link (SPA route) serves the app HTML, not a 404 page <br>`live-static.ts`: [Shell] index.html returns 200 text/html <br>`live-static.ts`: [PWA] index links the web manifest <br>`live-static.ts`: [PWA] manifest.webmanifest is valid JSON <br>`live-static.ts`: [PWA] manifest has name, icons, start_url, display <br>+4 more | Direct |

### Privacy of accounts, groups and Ask

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| NFR-070 | Contact details (full name, email, mobile, date of birth) shall be kept in their own table, apart from results; they... | `api-e2e.ts`: GET /me returns contact, profile and extras; mobile normalised <br>`migrations.e2e.test.ts`: MIG-020 student_contact CHECKs (CR-003): bad mobile, upper-case email, impossible date rej (inferred)<br>`account.test.ts`: stores them normalised, returns them in /me, and deletes them with the account (inferred) | Direct |
| NFR-071 | In groups the system shall show only a member's username, preset avatar and any senior badge: never a real name,... | `api-e2e.ts`: Second account joins; member list has both usernames and no contact details <br>`groups.test.ts`: CR-006: shows members to members only, with usernames and avatars, never names (inferred)<br>`groups.e2e.test.ts`: GRP-023 members list: seniors first with their badge, then students in join order; no name (inferred) | Direct |
| NFR-072 | The eligibility of notices (FR-509) shall be computed on the student's device; no request for this check shall send... | - | None |
| NFR-073 | Answer feedback (FR-611) shall be stored without any account, device or network identifier. | `ask.test.ts`: stores feedback without anything that identifies the student, and validates it (inferred) | Inferred |
| NFR-074 | Achievements and interests sent with a question (FR-612) shall be used for that answer only and shall not be stored... | `ask.test.ts`: sends the achievements to the model only for that answer, and validates them (inferred) | Inferred |
| NFR-075 | Deleting an account shall remove every row stored under it in every table (account, sign-in, sessions, recovery... | `api-e2e.ts`: DELETE /me -> 204 and clears the cookie <br>`api-e2e.ts`: After delete: the journey cannot be read -> 401 <br>`api-e2e.ts`: After delete: the recovery code no longer works -> 401 <br>`api-e2e.ts`: No orphan rows left under any deleted account (local D1 query) <br>`api-e2e.ts`: The deleted username can be signed up again (login row gone); then deleted <br>`account.test.ts`: deletes the account and every row under it, and nothing of anyone else (inferred)<br>+2 more | Direct |

## Business rules

### General eligibility

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| BR-001 | A candidate must have at least an S grade in each of three approved subjects in one sitting. | `rules.test.ts`: evaluate(): general minimum (BR-001) <br>`api-e2e.ts`: Two subjects rejected <br>`api-e2e.ts`: Four subjects rejected <br>`accuracy.e2e.test.ts`: ACC 5: subject-rule eligibility by stream (BR-001, BR-020 to BR-024) <br>`accuracy.e2e.test.ts`: ACC-075 BR-001: a single grade below S (F) makes every course NOT_ELIGIBLE  | Direct |
| BR-002 | A candidate must have at least 30% in the Common General Paper (also called the Common General Test), in the current... | - | None |
| BR-003 | A candidate may use at most three attempts; after the third, results of any attempt cannot be used. Attempts need... | - | None |
| BR-004 | Some candidates are ineligible regardless of results: those already registered as internal students of a UGC... | - | None |
| BR-005 | A Z-score is entered with exactly four decimal places and must lie between −4.0000 and +4.0000. (Published cut-offs... | `banding.test.ts`: parseZ / formatZ (BR-005, NFR-051) <br>`api-e2e.ts`: Edge Z = +4.0000 accepted <br>`api-e2e.ts`: Edge Z = -4.0000 accepted <br>`api-e2e.ts`: Edge Z = 0.0000 accepted <br>`api-e2e.ts`: Z = +4.0001 rejected <br>`api-e2e.ts`: Z = -4.0001 rejected <br>+3 more | Direct |
| BR-006 | The candidate's district is the district of the school attended for the most days, totalling at least one year, in... | `api-e2e.ts`: GET /meta lists the 25 districts (cites the id but does not exercise it)<br>`api-e2e.ts`: Unknown district rejected (cites the id but does not exercise it) | None (cited only) |
| BR-007 | Sixteen districts are educationally disadvantaged: Nuwara Eliya, Hambantota, Jaffna, Kilinochchi, Mannar,... | `accuracy.e2e.test.ts`: ACC 2: districts (BR-007) <br>`accuracy.e2e.test.ts`: ACC-011 exactly the 16 educationally disadvantaged districts named in BR-007 are flagged  | Direct |

### Streams, subjects and grades

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| BR-010 | Subjects belong to six streams: Arts, Commerce, Biological Science, Physical Science, Engineering Technology and... | `api-e2e.ts`: GET /meta lists the 6 A/L streams <br>`api-e2e.ts`: Unknown stream rejected <br>`rules.test.ts`: checks the stream (inferred)<br>`rules.test.ts`: needs at least one Basket 01 subject in general (inferred)<br>`accuracy.e2e.test.ts`: ACC-077 handbook "eligible streams": a single-stream course never admits typical students  (inferred) | Direct |
| BR-011 | Grades are ordered A > B > C > S > F. The handbook names S (Ordinary Pass), C (Credit Pass) and B (Very Good Pass);... | `api-e2e.ts`: Grade F rejected <br>`rules.test.ts`: rejects any subject below S (inferred)<br>`rules.test.ts`: Medicine: two Cs and an S is eligible; one C is not (inferred) | Direct |
| BR-012 | The handbook gives no numeric subject codes; ZedPath assigns its own subject identifiers and maps every handbook... | `api-e2e.ts`: GET /meta lists subjects <br>`accuracy.e2e.test.ts`: ACC-087 strict mode rejects a subject code that is not an A/L subject (O/L code or made-up (inferred)<br>`migrations.e2e.test.ts`: MIG-012 0002 reference data: 6 streams, 25 districts, 59 subjects (Appendix "Student accou (inferred) | Direct |

### Selection and the preference list

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| BR-013 | Up to 40% of places in a course are filled on all-island merit, up to 55% by district quota in proportion to... | - | None |
| BR-014 | Ten Arts courses (Arts, Arts SP, Arts SAB, Communication Studies, Peace and Conflict Resolution, Islamic Studies,... | `live-readonly.ts`: [results] District matters: same results, different district changes bands <br>`accuracy.e2e.test.ts`: ACC-006 merit-only (BR-014) offerings are exactly the handbook "All Island Merit (100%)" r  | Direct |
| BR-015 | Each course at each institution has a Uni-Code: a three-digit course code plus one institution letter (for example,... | `api-e2e.ts`: Uni-Code lookup is case-insensitive (001a) <br>`api-e2e.ts`: Unknown Uni-Code -> 404 <br>`api-e2e.ts`: Follow lower-case Uni-Code (001a) -> 404 <br>`api-e2e.ts`: Follow unknown Uni-Code 999Z -> 404 <br>`accuracy.e2e.test.ts`: ACC-001 all 255 Uni-Codes in unicodes.csv are offerings in the rulebook, with no extras or (inferred)<br>`migrations.e2e.test.ts`: MIG-011 255 offerings (2025/26 Uni-Codes), 121 courses, 20 institutions; uni_code is deriv (inferred)<br>+1 more | Direct |
| BR-016 | The UGC selects a candidate for the highest-preferred Uni-Code whose places are not already filled by candidates... | - | None |
| BR-017 | A candidate may list at most 125 Uni-Codes and may not list the same Uni-Code twice. | `list.e2e.test.ts`: (file header) <br>`list.e2e.test.ts`: LST add: eligibility, duplicates, FULL at 125 (BR-017, BR-043, FR-302, FR-308)  | Direct |
| BR-018 | A candidate who does not register for a selected Uni-Code is not considered for the same course at any other... | - | None |
| BR-019 | The order may be changed once, online, within two weeks of the closing date; the change replaces the whole list. | - | None |

### Course-specific requirements

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| BR-020 | Each Uni-Code has subject and grade requirements that follow one of twenty patterns (fixed trio; trio with a count... | `accuracy.e2e.test.ts`: ACC 5: subject-rule eligibility by stream (BR-001, BR-020 to BR-024) (range ref)<br>`rules.test.ts`: Computer Science: C in Physics alone satisfies "Combined Mathematics or Physics" (AC-201.3 (inferred) | Inferred |
| BR-021 | Alternatives ("A or B") and combinations ("A and B") in a requirement are evaluated exactly as written; a... | `accuracy.e2e.test.ts`: ACC 5: subject-rule eligibility by stream (BR-001, BR-020 to BR-024) (range ref)<br>`rules.test.ts`: Computer Science: C in Physics alone satisfies "Combined Mathematics or Physics" (AC-201.3 (inferred)<br>`rules.test.ts`: Computer Science: the gate subject cannot also count as one of the two others (inferred) | Inferred |
| BR-022 | Fifty-one Uni-Codes also require G.C.E. (O/L) results (for example, a Credit Pass in English or Mathematics); some... | `accuracy.e2e.test.ts`: ACC 5: subject-rule eligibility by stream (BR-001, BR-020 to BR-024) (range ref)<br>`rules.test.ts`: is NEEDS_OL until O/L grades are given (inferred)<br>`accuracy.e2e.test.ts`: ACC-076 FR-113: courses with an O/L rule return NEEDS_OL (not ELIGIBLE) until O/L grades a (inferred) | Inferred |
| BR-023 | Some requirements are not academic (Nursing: height at least 4 feet 10 inches and no deformity). They are shown as... | `accuracy.e2e.test.ts`: ACC 5: subject-rule eligibility by stream (BR-001, BR-020 to BR-024) (range ref) | Inferred |
| BR-024 | Where a stream's "you may also apply for" list omits a course whose subject rule the student meets, the subject rule... | `accuracy.e2e.test.ts`: ACC 5: subject-rule eligibility by stream (BR-001, BR-020 to BR-024) (range ref) | Inferred |
| BR-025 | Twenty-four Uni-Codes require a practical or aptitude test run by the university; the student applies to the... | `accuracy.e2e.test.ts`: ACC-005 aptitude-test flag equals the handbook value for every Uni-Code (inferred)<br>`journey.test.ts`: shows the aptitude step only when a listed course has a test, with those courses (inferred) | Inferred |
| BR-026 | Eight courses of the Gampaha Wickramarachchi University of Indigenous Medicine are suspended for 2025/26 and shall... | - | None |
| BR-027 | Some courses are not taught in all three languages, so a student may meet the cut-off and still not be selected;... | - | None |

### Cut-off data

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| BR-028 | A cut-off is the minimum Z-score selected for one Uni-Code from one district in one intake year, published by the... | `accuracy.e2e.test.ts`: ACC-020 2025/26: every cell of every independently matched COP column equals the engine va (inferred)<br>`accuracy.e2e.test.ts`: ACC-050 2024/25: every single-group row of the handbook Section 9 table equals the engine  (inferred) | Inferred |
| BR-029 | ("No Qualified Candidates") means no candidate from that district was selected for that course, for one of three... | `banding.test.ts`: excludes NQC years and reports them (inferred)<br>`accuracy.e2e.test.ts`: ACC-051 2025/26: the number of numeric and NQC cells in the engine equals the COP table (n (inferred) | Inferred |

### Banding (ZedPath policy)

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| BR-030 | If n = 0 (every year NQC, or a new course), the band is Not enough data. | `banding.test.ts`: band() with NQC years (BR-030, BR-034) <br>`live-readonly.ts`: [results] Edge: maximum Z-score +4.0000 is accepted; nothing is Reach/Out of range <br>`live-readonly.ts`: [results] Edge: minimum Z-score -4.0000 is accepted; nothing is Safe or Likely <br>`live-readonly.ts`: [results] Monotonic: higher Z-score never lowers the Safe count (same profile) (range ref)<br>`accuracy.e2e.test.ts`: (file header) (range ref)<br>`accuracy.e2e.test.ts`: ACC 4: Safe / Likely / Reach boundaries on real cut-offs (BR-030 to BR-034) (range ref)<br>+1 more | Direct |
| BR-031 | If n ≥ 3 the band uses full history; if n is 1 or 2 it uses limited history and is labelled "based on n year(s)".... | `banding.test.ts`: band() with limited history (n = 1 or 2, BR-031) <br>`accuracy.e2e.test.ts`: ACC-060 BR-032 full history: Safe at max(C), Likely at max(C) − 0.0001 and at c_l, Reach j <br>`accuracy.e2e.test.ts`: ACC-065 BR-031 limited history: Safe needs max(C) + 0.1000; max(C) + 0.0999 is only Likely <br>`live-readonly.ts`: [results] Monotonic: higher Z-score never lowers the Safe count (same profile) (range ref)<br>`accuracy.e2e.test.ts`: (file header) (range ref)<br>`accuracy.e2e.test.ts`: ACC 4: Safe / Likely / Reach boundaries on real cut-offs (BR-030 to BR-034) (range ref)<br>+1 more | Direct |
| BR-032 | Safe: Z ≥ max(C) + m. Likely: cₗ ≤ Z < max(C) + m. Reach: min(C) − 0.0500 ≤ Z < cₗ. Out of range: Z < min(C) −... | `banding.test.ts`: band() with full history (n >= 3, BR-032) <br>`api-e2e.ts`: Very high Z (+3.0000, PHYS) gives Safe offerings <br>`api-e2e.ts`: Very low Z (-3.0000, PHYS) gives no Safe offering <br>`accuracy.e2e.test.ts`: ACC-060 BR-032 full history: Safe at max(C), Likely at max(C) − 0.0001 and at c_l, Reach j <br>`accuracy.e2e.test.ts`: ACC-067 BR-032 oracle sweep: engine band equals the oracle for every offering, group and d <br>`accuracy.e2e.test.ts`: ACC-095 results band for each listed offering equals the BR-032 oracle on that district\'s <br>+4 more | Direct |
| BR-033 | Trend (full history only): the least-squares slope of C by year; rising above +0.0200 per year, falling below... | `banding.test.ts`: trend (BR-033) <br>`live-readonly.ts`: [results] Monotonic: higher Z-score never lowers the Safe count (same profile) (range ref)<br>`accuracy.e2e.test.ts`: ACC 4: Safe / Likely / Reach boundaries on real cut-offs (BR-030 to BR-034) (range ref)<br>`accuracy.e2e.test.ts`: ACC-066 BR-030 / BR-034: an all-NQC history is Not enough data, and NQC years are reported (range ref) | Direct |
| BR-034 | An NQC year is excluded from C and shown as "No qualified candidates in year". | `banding.test.ts`: band() with NQC years (BR-030, BR-034) <br>`accuracy.e2e.test.ts`: (file header) <br>`live-readonly.ts`: [results] Monotonic: higher Z-score never lowers the Safe count (same profile) (range ref)<br>`accuracy.e2e.test.ts`: ACC 4: Safe / Likely / Reach boundaries on real cut-offs (BR-030 to BR-034) (range ref)<br>`accuracy.e2e.test.ts`: ACC-066 BR-030 / BR-034: an all-NQC history is Not enough data, and NQC years are reported (range ref) | Direct |
| BR-035 | For all-island-merit offerings (BR-014) the single all-island cut-off is used for every district. | `accuracy.e2e.test.ts`: ACC-053 BR-035: every all-island-merit offering has one single 2025/26 cut-off for all dis <br>`live-readonly.ts`: [results] Monotonic: higher Z-score never lowers the Safe count (same profile) (range ref) | Direct |
| BR-036 | The thresholds 0.0500, 0.1000 and 0.0200 are configuration values. When three or more years are loaded they shall be... | `banding.test.ts`: banding thresholds (pinned: changing them changes what students see; BR-036) <br>`live-readonly.ts`: [results] Monotonic: higher Z-score never lowers the Safe count (same profile) (range ref) | Direct (partial: thresholds pinned; back-testing not implemented as a test) |

### Preference-list checks (ZedPath policy, derived from BR-016)

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| BR-040 | Because selection takes the highest-listed Uni-Code the student clears (BR-016), an offering listed below one the... | `list.test.ts`: warns when a Safe course sits above a Likely or Reach one (BR-041) (inferred) | Inferred |
| BR-041 | Ordering warning: when a Safe offering is listed above any Likely or Reach offering, the student is warned that the... | `list.e2e.test.ts`: LST order warnings (BR-041, BR-042) <br>`list.test.ts`: warns when a Safe course sits above a Likely or Reach one (BR-041) <br>`list.e2e.test.ts`: (file header) (range ref) | Direct |
| BR-042 | Coverage warning: when the list contains no Safe offering, the student is warned that they may not be placed anywhere. | `list.e2e.test.ts`: LST order warnings (BR-041, BR-042) <br>`list.test.ts`: warns when there is no Safe course (BR-042), but not for an empty list <br>`list.e2e.test.ts`: (file header) (range ref) | Direct |
| BR-043 | The list enforces BR-017: at most 125 entries and no duplicates. | `list.e2e.test.ts`: LST add: eligibility, duplicates, FULL at 125 (BR-017, BR-043, FR-302, FR-308)  | Direct |

### Accounts and contact details (ZedPath policy, CR-001 and CR-003)

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| BR-050 | A username has 3 to 24 characters from lower-case letters, digits, "_" and "."; it is stored and compared... | `api-e2e.ts`: case: Username too short ("ab") <br>`api-e2e.ts`: case: Username with illegal characters <br>`api-e2e.ts`: case: Username too long (25 characters) <br>`api-e2e.ts`: Duplicate username -> 409 <br>`api-e2e.ts`: Mixed-case username is stored in lower case <br>`api-e2e.ts`: Salt for a valid username: 32 hex + KDF name <br>+4 more | Direct |
| BR-051 | A password has 8 to 128 characters. | - | None |
| BR-052 | A full name has 2 to 80 characters after trimming and joining spaces. | `api-e2e.ts`: case: Full name of 1 character <br>`api-e2e.ts`: case: Full name over 80 characters <br>`api-e2e.ts`: PUT /me/contact updates and normalises name, email and mobile <br>`contact.test.ts`: normalises name, email and mobile (inferred)<br>`contact.test.ts`: names the first wrong field (inferred) | Direct |
| BR-053 | An email address has the shape name@domain.tld, at most 254 characters, and is stored in lower case. It is not unique. | `api-e2e.ts`: case: Email without a domain <br>`api-e2e.ts`: case: Email with a space <br>`api-e2e.ts`: PUT /me/contact updates and normalises name, email and mobile <br>`api-e2e.ts`: PUT /me/contact with a bad email -> 400 <br>`contact.test.ts`: normalises name, email and mobile (inferred) | Direct |
| BR-054 | A mobile number is a Sri Lankan mobile number, entered as 07..., +94 7..., 94 7... or 0094 7... with any spacing,... | `api-e2e.ts`: case: Mobile too short <br>`api-e2e.ts`: case: Landline instead of a mobile <br>`api-e2e.ts`: GET /me returns contact, profile and extras; mobile normalised <br>`api-e2e.ts`: PUT /me/contact updates and normalises name, email and mobile <br>`contact.test.ts`: accepts the ways Sri Lankans write a mobile number (inferred)<br>`contact.test.ts`: refuses landlines, short numbers and other countries (inferred) | Direct |
| BR-055 | A date of birth is a real calendar date, and the student's age on the day of sign-up is 13 to 70 years. | `api-e2e.ts`: case: Birth date not a real date (2006-02-30) <br>`api-e2e.ts`: case: Birth date in the wrong format <br>`api-e2e.ts`: case: Under 13 (12 years old) <br>`api-e2e.ts`: case: Over 70 (71 years old) <br>`api-e2e.ts`: Age exactly 13 passes the birth-date rule <br>`contact.test.ts`: computes age with the birthday included (inferred)<br>+1 more | Direct |
| BR-056 | A student under 18 confirms that a parent or guardian agrees to the details being kept. | - | None |
| BR-057 | Consent is recorded with the version of the privacy wording agreed to (currently 2026-10-11) and the time; a new... | `api-e2e.ts`: case: Consent missing <br>`api-e2e.ts`: case: Consent of an old wording version <br>`api-e2e.ts`: PUT /me/contact without consent -> 400 <br>`account.test.ts`: accepts exactly the consent wording version the app sends (inferred)<br>`contact.test.ts`: names the first wrong field (inferred) | Direct |
| BR-058 | A session lasts 30 days. | `api-e2e.ts`: Session cookie is HttpOnly, Secure, SameSite=Lax, Path=/api, 30 days <br>`api-e2e.ts`: Logout ends that session (204, then /me 401) <br>`api-e2e.ts`: Logout-all ends every session of the account <br>`api-e2e.ts`: A well-formed but unknown session token -> 401 <br>`account.test.ts`: refuses an expired session (inferred) | Direct (partial: expiry refused; the 30-day value not pinned) |

### Journey and reminders (ZedPath policy, CR-002, CR-006 and VR)

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| BR-060 | The Journey has eight steps: three preparation steps (enter results, build the list, compare courses) and five UGC... | `api-e2e.ts`: GET /journey returns steps and notices (no build stamp) <br>`api-e2e.ts`: Unknown step id -> 404 <br>`journey.e2e.test.ts`: JRN-012 JOURNEY_STEP_IDS matches the journey_step CHECK in migration 0010 exactly (same id (inferred)<br>`migrations.e2e.test.ts`: MIG-014 journey_step.step_id: 'X' rejected; the eight documented steps accepted (inferred) | Direct |
| BR-061 | A preparation step can be ticked at any time. A UGC step can be ticked only on or after the opening date given in... | `api-e2e.ts`: Preparation step N can be ticked any time <br>`api-e2e.ts`: UGC step N N <br>`my-journey.test.ts`: opens preparation steps any time, and UGC steps only from their announced date (inferred)<br>`my-journey.test.ts`: uses the Sri Lanka date (UTC+05:30) (inferred)<br>`journey.e2e.test.ts`: JRN-001 N is open any time, even with no steps and a far-past date (inferred)<br>`journey.e2e.test.ts`: JRN-003 N opens exactly on opensOn (closed the day before, open on the day and after) (inferred)<br>+1 more | Direct |
| BR-062 | can be ticked on a followed notice only from the notice's opening date; a notice without an opening date is open... | `api-e2e.ts`: "I applied" on a notice not followed -> 404 <br>`api-e2e.ts`: case: "I applied" on followed, already-open notice N <br>`api-e2e.ts`: case: "I applied" before notice N opens -> 409 <br>`api-e2e.ts`: case: "I applied" before the notice opens -> 409 <br>`journey.e2e.test.ts`: JRN-007 before / on / after the opening date (inferred)<br>`journey.e2e.test.ts`: JRN-008 a notice with no opening date is open on publication; an unknown notice is not blo (inferred) | Direct |
| BR-063 | Reminders fall 7 days and 1 day before a dated item, at 08:00 or 18:00 on the phone's clock; the default is both... | `journey.test.ts`: defaults to the behaviour before settings existed: 7 days and 1 day before, 08:00, bell co (inferred)<br>`journey.e2e.test.ts`: JRN-014 pinned defaults: week + day on, 08:00, badge on (inferred)<br>`journey.e2e.test.ts`: JRN-017 default: 7 days and 1 day before, at 08:00 local (inferred) | Inferred |

### Groups (ZedPath policy, CR-002, CR-005 and CR-006)

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| BR-070 | There is at most one course group per course code and one batch group per pair of A/L stream and district. A group... | `api-e2e.ts`: Join an unknown course group -> 400 <br>`api-e2e.ts`: Join with an unknown kind -> 400 <br>`api-e2e.ts`: Joining the same group twice keeps one membership <br>`groups.test.ts`: suggests the asked-for course groups and the batch, creates a group on first join, shares  (inferred)<br>`migrations.e2e.test.ts`: MIG-021 course_group: one group per course and per batch (partial UNIQUE), kind/columns co (inferred) | Direct |
| BR-071 | Only a student whose results are saved on the account can join a batch group; it is the group of that student's... | `api-e2e.ts`: Join own batch group (results saved on the account) <br>`api-e2e.ts`: Batch group for an account without saved results -> 403 <br>`groups.test.ts`: refuses unknown courses, and batch groups for accounts without saved results (inferred) | Direct |
| BR-072 | A message is text only, 1 to 500 characters. A member may post at most one message every 3 seconds and 20 in any 10... | `groups.test.ts`: allows a first message and refuses one within 3 seconds (inferred)<br>`groups.test.ts`: caps 20 messages in 10 minutes, then lets older ones expire (inferred)<br>`groups.e2e.test.ts`: GRP-009 length: exactly MESSAGE_MAX passes, one more is refused, surrounding spaces do not (inferred) | Inferred |
| BR-073 | A member may report a message once, for one of four reasons: harmful, wrong information, spam, other. A message... | `groups.test.ts`: hides a message once three different members report it, never on repeats by one member (inferred) | Inferred |
| BR-074 | The group rules (version 2026-10-11) are six: be kind; stay on topic; never share phone numbers, email or home... | `api-e2e.ts`: Message containing a phone number is refused by the room (WebSocket) <br>`groups.test.ts`: refuses phone numbers in any spacing and email addresses (inferred)<br>`groups.e2e.test.ts`: GRP-018 GROUP_RULE_COUNT matches gr.rule.1..N in every language, with no extra rule (inferred) | Direct |
| BR-075 | The group rules are accepted once per account for each rules version, at the first join of any group; a new version... | `api-e2e.ts`: Join without accepting the rules (first join) -> 400 <br>`api-e2e.ts`: Join with an old rules version -> 400 <br>`api-e2e.ts`: Join course group N, accepting the rules (first join) <br>`api-e2e.ts`: Second group N: the rules are not asked again <br>`groups.test.ts`: CR-006: rules are accepted once per account, recorded, and the room stays shut without the (inferred)<br>`groups.e2e.test.ts`: GRP-024 a stale or junk acceptRules after accepting the current rules still joins, and rec (inferred)<br>+1 more | Direct |
| BR-076 | A senior invite names a course, an institution and a year of study from 1 to 6, is valid for 14 days, can be... | `api-e2e.ts`: Valid-format but unknown invite code refused <br>`groups.test.ts`: refuses a used, expired, unknown or malformed code and creates nothing (inferred)<br>`groups.test.ts`: lets only a SENIOR account of the right institution redeem an invite, once (inferred) | Direct |
| BR-077 | An avatar is one of 12 preset pictures (a01 to a12) or none, meaning initials. Photographs are never uploaded. | `api-e2e.ts`: Avatar preset N accepted <br>`api-e2e.ts`: Avatar null (initials) accepted <br>`api-e2e.ts`: Avatar N rejected <br>`my-journey.test.ts`: accepts a preset or null, nothing else (inferred)<br>`migrations.e2e.test.ts`: MIG-013 account.avatar: 'zz' rejected; 'a01'..'a12' and NULL accepted (inferred) | Direct |

### Ask (ZedPath policy, VR)

| Requirement | Title | Tests (file: test name) | Coverage |
|---|---|---|---|
| BR-080 | ZedPath tells a student that the special intake for outstanding achievements may apply when they list a first,... | `api-e2e.ts`: case: Achievement with an unknown level <br>`ask.test.ts`: turns achievements into facts, with ZedPath (not the model) deciding the special intake (inferred) | Direct |

## User stories

| Story | Title | Requirements (ZP-DOC-03 trace) | Tests citing the story | Coverage |
|---|---|---|---|---|
| US-101 | Enter my results once | FR-101 | - | Via requirements (Direct) |
| US-102 | Change my profile at any time | - | - | None (no active requirement traces it) |
| US-103 | Estimate my Z-score before results | FR-107 | - | None |
| US-104 | Read my results sheet from a photo | FR-109 | - | None |
| US-105 | Use the app in my language | FR-112 | - | Via requirements (Inferred) |
| US-106 | Create an account and use it on any device | FR-114, FR-115, FR-116, FR-117 | - | Via requirements (Direct) |
| US-107 | Get back into my account with a recovery code | FR-118 | - | Via requirements (Direct) |
| US-108 | Delete my account and everything in it | FR-119 | - | Via requirements (Direct) |
| US-109 | Give my contact details with a stated purpose and consent | FR-116 | - | Via requirements (Direct) |
| US-110 | Choose a profile picture | FR-122 | - | Via requirements (Direct) |
| US-111 | Find my subjects by searching | FR-123 | - | Via requirements (Inferred) |
| US-201 | See every course I am eligible for | FR-113, FR-201, FR-203 | - | Via requirements (Direct) |
| US-202 | See why a course is hidden from me | FR-204 | - | Via requirements (Direct) |
| US-203 | See Safe / Likely / Reach for each course | FR-205 | - | Via requirements (Direct) |
| US-204 | Open a course page with sources | FR-208 | - | Via requirements (Direct) |
| US-205 | Filter and sort courses | FR-210 | - | None |
| US-206 | Work backwards from a dream course | FR-211 | - | None |
| US-207 | Compare up to three courses | FR-213 | - | Via requirements (Inferred) |
| US-208 | See what living there costs | FR-214 | - | None |
| US-209 | Find a course by searching | FR-215 | - | Via requirements (Inferred) |
| US-301 | Build my preference list | FR-301, FR-308 | `list.e2e.test.ts`: (file header)<br>`list.test.ts`: My list (US-301..303) | Direct |
| US-302 | Get warned about a bad order | FR-303 | `list.e2e.test.ts`: (file header)<br>`list.test.ts`: My list (US-301..303) | Direct |
| US-303 | Copy uni-codes in order | FR-306 | `list.e2e.test.ts`: (file header)<br>`list.test.ts`: My list (US-301..303) | Direct |
| US-304 | Learn the UGC form step by step | FR-307 | - | None |
| US-305 | Select several courses at once | FR-309 | - | None |
| US-401 | See my journey with the next step first | FR-401 | - | Via requirements (Direct) |
| US-402 | Know whether a date is confirmed or estimated | FR-402 | - | Via requirements (Direct) |
| US-403 | Be told about aptitude tests for courses on my list | FR-403 | - | Via requirements (Direct) |
| US-404 | Get reminders before deadlines | - | - | None (no active requirement traces it) |
| US-405 | Check whether a special intake applies to me | FR-407 | - | Via requirements (Inferred) |
| US-406 | Add my own steps to the journey | - | - | None (no active requirement traces it) |
| US-407 | Tick my own Journey steps when they open | FR-409 | - | Via requirements (Direct) |
| US-408 | Choose how I am reminded | FR-413 | - | Via requirements (Inferred) |
| US-409 | Follow a course into my Journey | FR-416 | - | Via requirements (Direct) |
| US-410 | Follow a notice or other path and record that I applied | FR-414 | - | Via requirements (Direct) |
| US-411 | Keep my Journey on my account | FR-411 | - | Via requirements (Direct) |
| US-501 | See every route my results open | FR-501 | - | Via requirements (Direct) |
| US-502 | Open a route's details | FR-502 | - | Via requirements (Inferred) |
| US-503 | Be alerted about job exams I qualify for | FR-503 | - | Via requirements (Direct) |
| US-504 | Check whether a degree is recognised | FR-505 | - | None |
| US-505 | Check the interest-free loan scheme | FR-506 | - | None |
| US-506 | See scholarships abroad | FR-507 | - | None |
| US-507 | Understand what retrying would take | - | - | None (no active requirement traces it) |
| US-601 | Ask a question in my language | FR-601 | - | Via requirements (Inferred) |
| US-602 | Every answer cites its source | FR-603 | - | Via requirements (Inferred) |
| US-603 | The assistant won't predict the future | FR-605 | - | None |
| US-604 | Turn an answer into an action | FR-606 | - | Via requirements (Inferred) |
| US-605 | Read a clear answer card | - | - | None (no active requirement traces it) |
| US-606 | Tell ZedPath whether an answer helped | FR-611 | - | Via requirements (Direct) |
| US-607 | Let Ask use my achievements and interests | FR-612 | - | Via requirements (Direct) |
| US-701 | Share a summary with my family | FR-701 | - | None |
| US-702 | Ask a verified senior | FR-703 | - | Via requirements (Inferred) |
| US-703 | Become a verified senior | FR-707 | - | Via requirements (Direct) |
| US-704 | Join a group for my batch and target course | FR-705 | - | Via requirements (Direct) |
| US-705 | See my class's progress as a teacher | FR-706 | - | None |
| US-706 | Stay safe in groups | - | - | None (no active requirement traces it) |
| US-707 | Accept the group rules once | - | - | None (no active requirement traces it) |
| US-708 | See a group's details and members, and leave it | FR-717 | - | Via requirements (Direct) |
| US-801 | Get my registration checklist | FR-801 | - | None |
| US-802 | Check Mahapola and bursary | FR-802 | - | None |
| US-803 | Plan the gap year | FR-803 | - | None |
| US-804 | Keep my documents ready | FR-804 | - | None |
| US-901 | Register an official source | FR-901 | - | None |
| US-902 | Extract rules from the handbook with AI | FR-903 | - | None |
| US-903 | Review uncertain facts | FR-906 | - | None |
| US-904 | Scan the Gazette every week | FR-908 | - | None |
| US-905 | Report a mistake | FR-910 | - | None |
| US-906 | Keep a history of every change | FR-911 | - | None |
| US-907 | Protect the app from abuse | FR-912 | - | None |

## Uncovered requirements, with a suggested test

Active requirements with no Direct or Inferred test, grouped by area.

### FE-1 Profile and results (7)

- **FR-105** The system shall recalculate every result immediately when any profile field... -> UI test: change the Z-score in About you and assert the Courses counts update without a reload.
- **FR-107** The system shall estimate a Z-score range from expected marks, using at... -> Unit test the expected-marks estimator: returns a range from 3+ years of statistics, labelled Estimate.
- **FR-108** When an estimated range is used, bands shall be computed from the lower... -> Unit test: banding with an estimated range uses the lower bound and sets an estimate flag.
- **FR-109** The system shall read stream, subjects, grades, Z-score and district from a... -> Worker test with a stubbed vision model: photo -> fields returned unconfirmed; profile not saved until confirmed.
- **FR-110** The system shall highlight every field read with confidence below 0.85 for... -> Unit test: fields with confidence < 0.85 are flagged; 0.85 exactly is not.
- **FR-111** The system shall delete an uploaded photo as soon as reading finishes, and... -> Worker test: after reading, the R2 object is gone and an audit-log row records the deletion.
- **FR-124** While the Sinhala and Tamil interface text has not been reviewed by native... -> UI/i18n test: in si and ta the AI-translation notice is shown; in en it is not.

### FE-2 State-university course discovery (7)

- **FR-210** The system shall filter offerings by band, university, field of study and... -> Unit test the course filter: band + university + field + distance filters combine and the count updates.
- **FR-211** For a chosen dream offering, the system shall show the gap to its lowest... -> Unit test: dream-course gap to lowest cut-off, classified small at 0.1000 and large at 0.1001.
- **FR-212** For a dream offering, the system shall suggest up to three offerings in the... -> Unit test: dream suggestions are same-field, Safe/Likely only, at most 3.
- **FR-214** The system shall show monthly living-cost estimates by campus with sample... -> Data test: each living-cost row has campus, sample size and collection date.
- **FR-216** Compare shall show each offering as a column that swipes sideways on a... -> UI test at 360 px: Compare columns scroll sideways; a "+" column appears while fewer than 3 are compared.
- **FR-217** Every Compare button in the app shall open the Compare screen with that... -> UI test: every Compare button opens Compare with that offering included.
- **FR-218** The cut-off chart on a course page shall print each point's cut-off value... -> UI test: the course-page chart renders a value label beside every cut-off point.

### FE-3 Preference list (2)

- **FR-307** The system shall present the official application steps with the most common... -> Data test: each application step has a common-mistake text and an official link.
- **FR-309** Pressing and holding a course in Courses or My list, or tapping Select,... -> UI test: long-press / Select starts selection with the course ticked; tap toggles; selection bar shows count.

### FE-4 Journey and deadlines (1)

- **FR-417** The Journey shall have a second tab, Open now, listing the open notices... -> UI test: Journey has an Open now tab listing open notices; top bar has no bell; new-notice count on the tab.

### FE-5 Other routes (4)

- **FR-504** A job-examination notice extracted with low confidence shall not be shown... -> Worker test: a low-confidence job notice stays hidden from /api/routes until a curator approves it.
- **FR-505** The system shall show the recognition status of a programme's awarding... -> Data test: every private programme has recognition status with source and checked date.
- **FR-506** The system shall check the basic conditions of the government interest-free... -> Unit test the interest-free loan checker against the published conditions (eligible / not / unknown).
- **FR-507** The system shall list government scholarships abroad open to school leavers... -> Data test: each scholarship route has timing, requirements and a gov.lk source.

### FE-6 Ask (2)

- **FR-605** The system shall decline to predict future cut-offs or guarantee admission,... -> Worker test: "What will the cut-off be next year?" returns a decline plus the historical pattern, no prediction.
- **FR-610** An answer about a course shall offer two follow-up questions about that... -> Worker test: a course answer returns exactly two follow-ups; a NOT_FOUND answer returns none.

### FE-7 People around the student (3)

- **FR-701** The system shall generate a share card (image and short text) in the chosen... -> Unit test the share-card builder: image + text in the chosen language, handed to navigator.share.
- **FR-702** The share card shall exclude the student's name and Z-score unless the... -> Unit test: share card omits name and Z-score unless the student opts in.
- **FR-706** The system shall show a teacher aggregate counts for students who shared... -> Worker test: a teacher sees aggregate counts and names only of students who shared with the class code.

### FE-8 After selection (4)

- **FR-801** The system shall present each university's registration requirements as a... -> Data test: every university has a registration checklist with where to obtain each item.
- **FR-802** The system shall explain Mahapola and bursary eligibility and the documents... -> Unit test the Mahapola/bursary explainer against the stated eligibility conditions.
- **FR-803** The system shall propose a month-by-month plan for the period before... -> Unit test: month-by-month plan generated for a course + district, covering the gap until lectures.
- **FR-804** The system shall keep a documents checklist covering every route. -> Data test: the documents checklist covers every route group.

### FE-9 Data and trust (12)

- **FR-901** The system shall let a curator register a source document with publisher,... -> Worker test: registering a source stores it unchanged with its SHA-256 and metadata.
- **FR-902** The system shall detect a duplicate source by fingerprint. -> Worker test: registering the same bytes twice is detected as a duplicate by fingerprint.
- **FR-903** The system shall extract, from a handbook source, one candidate rule per... -> Pipeline test with a stubbed model: one candidate rule per course with confidence and page.
- **FR-904** An independent second model shall mark each candidate rule agree or disagree. -> Pipeline test: the second model marks each candidate agree/disagree independently.
- **FR-905** A candidate rule shall be published automatically only when both models... -> Unit test: auto-publish only when both agree and both confidences >= 0.90; else review queue (0.8999 case).
- **FR-906** The review queue shall show the source text, the proposed structured fact,... -> UI/API test: review queue item shows source text, structured fact, both verdicts and page; approve/correct/reject work.
- **FR-907** Each review decision shall be recorded with reviewer, time and the change made. -> Worker test: each review decision writes reviewer, time and diff to the audit table.
- **FR-908** The system shall fetch new Gazette issues weekly, extract exam name,... -> Cron handler test with a stubbed Gazette fetch: extracts exam fields and logs counts per run.
- **FR-909** A failed scheduled run shall be retried automatically and its failure shown... -> Cron test: a failing run is retried and the failure is visible to the curator.
- **FR-910** The system shall let anyone report a mistake on any fact with an optional... -> Worker test: a mistake report on a fact is stored with its note, linked to the fact and queued.
- **FR-911** The system shall keep every previous version of a published fact. -> Worker test: publishing a new version keeps the previous version readable.
- **FR-912** The system shall require a bot check before accepting a report, a reminder... -> Worker test with a stubbed Turnstile: report, reminder opt-in and Ask are refused without a valid token.

### Performance (1)

- **NFR-004** Ask answers shall begin streaming within 4 seconds in 95% of cases. -> Live/perf test: time-to-first-streamed-token of Ask p95 <= 4 s over N questions.

### Capacity and cost (1)

- **NFR-010** The system shall serve 10,000 students per admission cycle within the free... -> Capacity model check: projected requests/day for 10,000 students stay under free-plan quotas (ZP-DOC-06 budget).

### Usability, accessibility and localisation (4)

- **NFR-020** A first-time user shall reach a checked preference list in under 10 minutes... -> Moderated usability test with 5+ first-time users: time to a checked preference list < 10 min.
- **NFR-021** The interface shall meet WCAG 2.2 level AA. -> Automated axe-core scan of each screen (WCAG 2.2 AA) plus a manual keyboard pass.
- **NFR-022** Touch targets shall be at least 48 × 48 dp, following Material Design 3. -> UI test: every interactive element is at least 48 x 48 dp (bounding-box scan).
- **NFR-024** Sinhala and Tamil text shall render correctly with Noto Sans Sinhala and... -> Visual test: Sinhala and Tamil screens load Noto Sans Sinhala/Tamil and render without tofu boxes.

### Security and privacy (2)

- **NFR-031** Results photos shall be deleted within 5 minutes of upload, whether or not... -> Worker test: results photo deleted within 5 minutes on success and on failure.
- **NFR-032** Curator functions shall require authentication; every curator action shall... -> Worker test: curator endpoints refuse non-curator sessions and log every curator action.

### Reliability and availability (2)

- **NFR-041** Scheduled jobs shall retry failed steps at least three times with back-off. -> Cron test: a failing step is retried at least 3 times with increasing back-off.
- **NFR-042** The database shall be restorable to any point in the previous 7 days (D1... -> Operational check: a D1 Time Travel restore drill to a point within 7 days (documented run).

### Data quality (1)

- **NFR-053** A reported mistake shall be triaged within 48 hours during the admission season. -> Process check: report-triage timestamps show <= 48 h during the season (ops metric, not a unit test).

### Maintainability and portability (2)

- **NFR-061** Rule-engine code shall have at least 90% branch coverage. -> Add vitest coverage with a 90% branch threshold for shared/rules.ts and shared/banding.ts.
- **NFR-062** A new intake year's handbook and cut-offs shall be loadable without code... -> Seed test: load a synthetic next-year handbook/cut-off set through tools/seed with no code change.

### Privacy of accounts, groups and Ask (1)

- **NFR-072** The eligibility of notices (FR-509) shall be computed on the student's... -> UI/network test: checking notice eligibility sends no request carrying results or date of birth.

### General eligibility (4)

- **BR-002** A candidate must have at least 30% in the Common General Paper (also called... -> Rules test: CGT below 30% makes the student ineligible; 30% exactly is eligible.
- **BR-003** A candidate may use at most three attempts; after the third, results of any... -> Rules test: a fourth attempt is refused; attempts need not be consecutive.
- **BR-004** Some candidates are ineligible regardless of results: those already... -> Rules test: each ineligible category (registered internal student, degree holder ...) blocks all courses.
- **BR-006** The candidate's district is the district of the school attended for the most... -> Help-text/data test: the district rule is explained with its handbook page (it is self-declared in the app).

### Selection and the preference list (4)

- **BR-013** Up to 40% of places in a course are filled on all-island merit, up to 55% by... -> Explainer test: merit/district/disadvantaged quota percentages shown match 40/55/5 with source.
- **BR-016** The UGC selects a candidate for the highest-preferred Uni-Code whose places... -> Unit test: a simulated selection picks the highest-listed Uni-Code the student clears.
- **BR-018** A candidate who does not register for a selected Uni-Code is not considered... -> Content test: the not-registering consequence is stated in the application guide with its page.
- **BR-019** The order may be changed once, online, within two weeks of the closing date;... -> Journey test: the "change order once" step and its two-week window are present and cited.

### Course-specific requirements (2)

- **BR-026** Eight courses of the Gampaha Wickramarachchi University of Indigenous... -> Accuracy test: the eight suspended Gampaha Wickramarachchi courses are absent from results for 2025/26.
- **BR-027** Some courses are not taught in all three languages, so a student may meet... -> UI test: every course page shows the medium-of-instruction caveat.

### Accounts and contact details (ZedPath policy, CR-001 and CR-003) (2)

- **BR-051** A password has 8 to 128 characters. -> Client test: sign-up refuses passwords of 7 and 129 characters and accepts 8 and 128 (server cannot see it).
- **BR-056** A student under 18 confirms that a parent or guardian agrees to the details... -> Worker/UI test: an under-18 sign-up without guardian agreement is refused; 18 is not asked.

## Test files scanned

- `shared/answer.test.ts` (7 tests/checks found)
- `shared/banding.test.ts` (14 tests/checks found)
- `shared/contact.test.ts` (5 tests/checks found)
- `shared/groups.test.ts` (12 tests/checks found)
- `shared/journey.e2e.test.ts` (29 tests/checks found)
- `shared/journey.test.ts` (16 tests/checks found)
- `shared/kdf.test.ts` (3 tests/checks found)
- `shared/list.e2e.test.ts` (36 tests/checks found)
- `shared/list.test.ts` (7 tests/checks found)
- `shared/rules.test.ts` (18 tests/checks found)
- `shared/search.test.ts` (4 tests/checks found)
- `src/ask-suggest.test.ts` (4 tests/checks found)
- `src/demo.test.ts` (2 tests/checks found)
- `src/i18n/i18n.test.ts` (4 tests/checks found)
- `src/notify.test.ts` (4 tests/checks found)
- `tools/e2e/api-e2e.ts` (155 tests/checks found)
- `tools/e2e/live-readonly.ts` (43 tests/checks found)
- `tools/e2e/live-static.ts` (30 tests/checks found)
- `tools/e2e/security-e2e.ts` (55 tests/checks found)
- `tools/e2e/ws-check.ts` (8 tests/checks found)
- `worker/account.test.ts` (26 tests/checks found)
- `worker/accuracy.e2e.test.ts` (38 tests/checks found)
- `worker/ask.e2e.test.ts` (46 tests/checks found)
- `worker/ask.test.ts` (24 tests/checks found)
- `worker/data-integrity.e2e.test.ts` (53 tests/checks found)
- `worker/groups.e2e.test.ts` (30 tests/checks found)
- `worker/groups.test.ts` (16 tests/checks found)
- `worker/migrations.e2e.test.ts` (30 tests/checks found)
- `worker/my-journey.test.ts` (11 tests/checks found)
- `worker/perf.e2e.test.ts` (18 tests/checks found)
- `worker/results.test.ts` (1 tests/checks found)
- `worker/syllabi.test.ts` (4 tests/checks found)
