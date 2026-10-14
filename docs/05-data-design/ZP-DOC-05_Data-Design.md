---
id: ZP-DOC-05
title: Data Design
subtitle: Conceptual EER model, relational mapping, normalisation and the Cloudflare D1 physical schema
version: 0.9
date: 11 October 2026
status: In review
classification: Public
owner: B.M.P Banneka, Product Owner
author: Team Kestrel (drafted with Claude, AI coding partner)
approver: B.M.P Banneka, Product Owner
reviewer: Claude (AI coding partner), consistency and traceability review
standard: Enhanced ER model and mapping algorithm (Elmasri and Navathe, 7th ed.); relational normalisation to BCNF/4NF; ZP-DOC-00
revision: 0.9 | 5 Oct 2026 | Team Kestrel | First issue: four EER diagrams, rule grammar, mapping, normalisation, D1 schema validated against the real UGC 2025/26 and 2024/25 data; submitted for approval
revision: 0.9 | 5 Oct 2026 | Team Kestrel | Revised in review for CR-001 (student accounts, approved by the product owner): Section 2.5 EER model, mapping, normalisation, security conventions, 7 tables (migrations 0002 and 0003), 1:1 cardinality in the generated logical diagrams, evidence
revision: 0.9 | 11 Oct 2026 | Team Kestrel | Revised in review for CR-002 (Journey, Alerts, Groups; product owner's GO): Section 2.6, migrations 0005 and 0006, read-model decision for dates and notices
revision: 0.9 | 11 Oct 2026 | Team Kestrel | Revised in review for CR-003 (compulsory account with contact details; product owner's decision): STUDENT_CONTACT, migration 0007, the "username only" statement of CR-001 withdrawn
revision: 0.9 | 11 Oct 2026 | Team Kestrel | Revised in review for CR-004 (Ask answer feedback): ANSWER_FEEDBACK, migration 0008
revision: 0.9 | 11 Oct 2026 | Team Kestrel | Revised in review for CR-005 (group rules, product owner's request): GROUP_MEMBER.rules_version, migration 0009; labelled sample conversations as read-model data
revision: 0.9 | 11 Oct 2026 | Team Kestrel | Revised in review for CR-006 (product owner's decisions of 11 Oct): rules accepted once per account (GROUP_RULES_ACCEPTANCE, GROUP_MEMBER.rules_version withdrawn), ACCOUNT.avatar, the Journey on the account (JOURNEY_COURSE, JOURNEY_NOTICE, JOURNEY_STEP), OFFERING populated; migration 0010
revision: 0.9 | 15 Oct 2026 | Team Kestrel | Revised in review for CR-007 (product owner's decision of 15 Oct): demo accounts as ACCOUNT.demo_expires_at with a partial index; migration 0011
revision: 0.9 | 15 Oct 2026 | Team Kestrel | University facts from the UGC 'Sri Lanka University Statistics 2024' added as read-model data (no D1 change)
revision: 0.9 | 15 Oct 2026 | Team Kestrel | Security audit run-1 lead 3: GROUP_ROOM_SEEN (rooms an account opened) so account deletion purges every room; migration 0012
---

# Introduction

## Purpose

This document designs ZedPath's data in three steps, as a database engineer would: a **conceptual** model in
Enhanced Entity-Relationship (EER) notation, its **logical** relational schema derived with the standard
mapping algorithm and normalised, and the **physical** schema for Cloudflare D1. The physical schema is the real
migration file the application uses, and it has been proved by loading the real UGC data into it.

## Scope

All data held on the server for Releases R1 and R2. By default the student's own profile lives only on their
device (NFR-030). Change request CR-001 (5 October 2026) adds an **optional** student account: a student who
chooses to create one keeps the same profile on the server, under a username only, so it follows them between
devices and can drive reminders. Section 2.5 models it. The preference list stays on the device.

## Intended audience

Developers, reviewers and anyone assessing the data design.

## Relationship to other documents

Table: Position of this document in the ZedPath document set

| Document | Relationship |
|---|---|
| ZP-DOC-03 SRS | Parent. Business rules BR-001 to BR-043 and data-quality requirements NFR-050 to NFR-052 become entities and constraints |
| ZP-DOC-04 Use Case Model | Parent. Nouns in the use cases name the entities |
| ZP-DOC-06 Software Architecture | Child. Decides how the read path uses this schema within free-plan limits |
| `migrations/0001_initial_schema.sql` | Implementation. Appendix A reproduces it verbatim |
| `migrations/0002_reference_data.sql`, `0003_student_accounts.sql` | Implementation of CR-001. 0002 is generated reference data; Appendix B reproduces 0003 verbatim |

## Notation

Conceptual diagrams use Chen notation as extended by Elmasri and Navathe: rectangles are entities; double
rectangles are **weak** entities; diamonds are relationships; double diamonds are **identifying** relationships;
ovals are attributes, with keys underlined, double ovals for **multi-valued** and dashed ovals for **derived**
attributes; bold lines show **total participation**; a circle marked *d* or *o* shows a **disjoint** or
**overlapping specialisation**, and a circle marked *U* a **union category**. Partial keys of weak entities are
named in the entity catalogue. Logical diagrams use crow's-foot (Information Engineering) notation.

# Conceptual model (EER)

## Offerings and cut-offs

The admission domain has a feature that a simple design misses: a **course of study** (for example, Management)
is offered at several **institutions**; each pair is an **offering** with its own Uni-Code; an offering exists
anew in each **intake year** with its own intake and requirements; and a few offerings split their seats into
**selection groups** by stream or category, each with its own cut-offs. Loading the real 2025/26 cut-off table
confirmed this: its 260 columns correspond to 255 Uni-Codes, because five Uni-Codes are split.

![EER model of institutions, courses, offerings, intake years, selection groups and cut-offs](diagrams/eer-offerings.png)

## Subjects and requirement rules

Entry requirements follow twenty different patterns (BR-020). Instead of twenty columns or free text, every
requirement is a **tree of rule nodes** (recursive relationship CHILD_OF) whose leaves test subjects. One
structure serves state-university selection groups and other routes alike.

![EER model of streams, subjects and the recursive requirement-rule tree](diagrams/eer-rules.png)

## Provenance and trust

Every published fact must cite its source (BO-2). Cut-offs, offering details, rules, deadlines and routes are
different entity types, yet each needs citations, revisions and mistake reports. The model makes them members
of one **union category**, CITED_FACT, so these trust features are designed once.

![EER model of cited facts, sources, revisions, AI extraction, review and mistake reports](diagrams/eer-provenance.png)

## Journey and other routes

![EER model of deadlines, push reminders and the specialisation of other routes](diagrams/eer-journey.png)

## Student accounts (CR-001)

A student account is optional. ACCOUNT, already the superclass of the staff roles, gains a fourth subclass,
STUDENT. Each way of signing in is its own weak entity of ACCOUNT, so a later identity provider (for example
Google sign-in) adds an entity without touching the others. A password is never stored: PASSWORD_LOGIN holds a
salt and a *verifier*, a hash of a key the student's device derives from the password. A STUDENT's results are
the attributes the device already keeps: a Z-score, the stream sat (SAT_IN), the district sat from (SAT_FROM), and
three subjects with grades (TOOK, whose attributes are Grade and Position). Achievements are a weak entity with
partial key Position; interests are a multi-valued attribute. CR-001 stored no name, email address or telephone
number; CR-003 (below) withdraws that and adds them, with consent, in a table of their own.

![EER model of optional student accounts: sign-in, sessions, recovery and the student's results](diagrams/eer-accounts.png)

## Journey, Alerts and Groups (CR-002)

**Where each kind of data lives.** CR-002 adds three features. Each puts its data where the existing design already
puts that kind of data, rather than adding a new store:

| Data | Where | Why |
|---|---|---|
| UGC admission steps (order, rule, handbook page) and dated notices (Gazette job exams, intakes) | Bundled read model `worker/generated/journey-2025-2026.json`, built by `tools/journey/build-journey.ts` from `data/journey/` and `data/alerts/` | Reference facts, like cut-offs and routes (ADR-002): no database reads per request. The build refuses to write unless every quote is found verbatim in its source |
| A student's saved dates, date of birth, seen alerts, scheduled reminder ids | The student's phone only | Personal and only needed on that phone; nothing stored without asking (NFR-030). Eligibility is checked on the phone |
| Course groups, members, senior invites, reports, blocks | D1, migration 0006 | Shared between accounts, so it must be on the server, enforced by keys and CHECKs |
| Group messages | Each group's GroupRoom Durable Object (its own SQLite storage) | High write rate per group, never joined with other data; keeps chat traffic off D1 |

The `deadline` table of migration 0001 remains the system-of-record design for dates. It is not loaded in this
release: the UGC sets its dates by press notice each year, so the steps carry the official *rule* (for example,
"within two weeks of the closing date", p.116) and dated items come from cited notices. No date is invented.

**Verified seniors reuse the existing model.** ACCOUNT already has the disjoint subclass SENIOR with the attribute
VerifiedFor (`account.verified_for_letter`), and the 0003 triggers already keep student data off non-student
accounts. A SENIOR_INVITE (one-time code, stored only as its SHA-256) names the course, institution and study year
the product owner checked; redeeming it at sign-up creates the SENIOR account and marks the invite in one atomic
batch. A trigger allows redemption only by a SENIOR account of the invite's institution, and only once.

**Reference rows for foreign keys.** Migration 0005 loads the 121 courses and 20 institutions of 2025/26 (generated
by `tools/seed/courses-sql.ts` from the official Uni-Code list), so SENIOR_INVITE and COURSE_GROUP reference them.

| Table (0006) | Key | Constraints and indexes | Deleting an account |
|---|---|---|---|
| senior_invite | invite_id; code_hash UNIQUE; redeemed_by UNIQUE | FK course, institution; CHECK study_year 1 to 6, expires after created, redeemed_by and redeemed_at both set or both null; trigger on redemption | Its redeemed invite is deleted (CASCADE) |
| course_group | group_id | kind COURSE (course_code) or BATCH (stream_code + district_code), enforced by three CHECKs; one group per course and per batch by two partial UNIQUE indexes (SQLite treats NULLs as distinct in a plain UNIQUE) | Unaffected |
| group_member | (group_id, account_id) | FK both, CASCADE; index on account_id | Memberships deleted |
| message_report | (group_id, message_id, reporter_id) | one report per member per message; reason CHECK in four values; message_id CHECK 32 hex | Reports deleted |
| account_block | (blocker_id, blocked_id) | CHECK not self; index on blocked_id | Blocks both ways deleted |

Messages are outside D1's cascade, so deleting an account also tells every group it was in to delete that account's
messages (tested). All tables are in BCNF: every determinant is a candidate key; derived values (member counts, the
senior badge text) are computed, never stored.

## Contact details (CR-003)

**Decision.** On 11 October 2026 the product owner made an account compulsory at the start, with full name, email,
mobile number and date of birth (the birthday moves here from the Alerts screen, where it stayed on the phone). This
reverses the CR-001 promise "a username only". The README, the business case and the app's privacy text now say
exactly what is collected and why.

**Where it lives.** A weak entity CONTACT of ACCOUNT, 1:1 and total for accounts made after CR-003, mapped to its own
table `student_contact` rather than columns on `account`: `account` is the identity table shared by every role,
and personal contact data kept apart can be audited, exported or deleted on its own. It cascades with the account.

| Attribute | Rule (CHECK in migration 0007, same rule in `shared/contact.ts` for the phone and the API) |
|---|---|
| full_name | 2 to 80 characters after trimming |
| email | lower-case, an address shape, at most 254 characters; **not unique** (a uniqueness error would reveal that an address is registered) |
| mobile | Sri Lankan mobile in E.164 form `+947XXXXXXXX`; **not unique** (siblings may share a parent's number) |
| birth_date | a real calendar date; the API accepts ages 13 to 70 |
| consent_version, consent_at | the privacy wording agreed to and when; the CHECK lists the versions that exist |
| email_verified_at, mobile_verified_at | NULL until verification exists (no sending domain or SMS service yet); reset when the value changes |

**Accounts made before CR-003** have no row; the app asks them to complete it before anything else
(`PUT /api/me/contact`). Safe default: no existing row is invented or guessed. Students under 18 confirm that a
parent or guardian agrees (Personal Data Protection Act, No. 9 of 2022). The table is in BCNF: the only determinant
is the key.

## Answer feedback (CR-004)

"Helpful" and "Report a wrong answer" under an Ask ZedPath answer are stored in `answer_feedback` (migration 0008).
Not `mistake_report`: that table reports a stored, cited fact (its `fact_id` is required), and an AI answer is not one.
A row holds the rating, the question, the answer, the handbook pages it cited (JSON, checked by `json_valid`), an
optional note, the app language and a review state. It holds nothing that identifies the student: no account, device
or IP. The screen says the question and answer are sent before the student sends a report.

## Group rules and sample conversations (CR-005)

A member accepts the group rules before taking part. The accepted version is a fact about one membership, so it is a
column on `group_member` (`rules_version`, migration 0009) rather than a new table: one value per (group, member), fully
dependent on the key, so the table stays in BCNF. A CHECK lists the versions that exist (`'2026-10-11'`); a new version
of the rules adds a value and asks members again. NULL means joined before the rules existed. Server enforcement: the
Worker refuses a join without the current version and keeps the live room closed for a member whose row is not on it
(`worker/groups.ts`). Rule 3 (no phone numbers or email addresses) is checked on every message by the group's room.
*Superseded by CR-006:* acceptance moved from the membership to the account; migration 0010 carries
`group_member.rules_version` over and leaves the column unused until a later migration drops it.

Sample conversations, which show a new student how a group works, are **not stored**. Like the Journey steps they are
curated read-model data in code (`shared/group-samples.ts`), added by the room in front of the real messages. Every
sample is marked `sample`, its author starts with "Sample", no badge says "verified", and its id is not a message id, so
it cannot be reported, blocked or mistaken for a member (trust rule: sample data is labelled as sample; pinned by tests).

## Journey, avatars and group rules on the account (CR-006)

The product owner decided on 11 October 2026: group rules are accepted **once per account**; each account may pick a
**preset avatar** (no photo upload); the **Journey is saved on the account**; and a Journey step can be ticked **only once
its window is open**, which the server checks. Migration 0010 implements the design below.

Table: CR-006 changes to the conceptual model

| Concept | EER construct | Relation (migration 0010) | Key and constraints |
|---|---|---|---|
| An account accepts a version of the group rules | M:N relationship ACCEPTS between ACCOUNT and the (enumerated) RULES_VERSION, with attribute *accepted_at* | `group_rules_acceptance` | PK (account_id, rules_version); FK account ON DELETE CASCADE; CHECK on the versions that exist |
| An account has a picture | Single-valued attribute of ACCOUNT | `account.avatar` | CHECK: one of 12 preset codes or NULL (initials) |
| A student follows a course | M:N relationship FOLLOWS_COURSE between ACCOUNT and OFFERING, attribute *followed_at* | `journey_course` | PK (account_id, course_code, institution_letter); composite FK to `offering`; FK account CASCADE |
| A student follows a notice or other path, and may say they applied | M:N relationship FOLLOWS_NOTICE between ACCOUNT and ROUTE, attributes *followed_at*, *applied_at* | `journey_notice` | PK (account_id, route_id); CHECK on the id's shape; CHECK applied_at >= followed_at |
| A student ticks a Journey step | M:N relationship COMPLETES between ACCOUNT and the (enumerated) JOURNEY_STEP, attribute *done_at* | `journey_step` | PK (account_id, step_id); CHECK on the step ids |

**Mapping.** Every new relationship is many-to-many with its own attributes, so each maps to its own relation whose key
is the pair of participating keys (mapping step 5). The avatar is a single-valued attribute of ACCOUNT and stays on it
(step 1). The acceptance is no longer a column of GROUP_MEMBER because it does not depend on the group: under CR-005 the
same fact was repeated once per group the student joined, a partial-dependency redundancy that CR-006 removes.

**Normalisation.** In each new relation the only non-key attributes (`accepted_at`, `followed_at`, `applied_at`,
`done_at`) depend on the whole key and on nothing else, so all three are in BCNF; `account.avatar` depends on
`account_id` alone. There are no multi-valued dependencies: courses, notices and steps are independent facts kept in
separate relations rather than one wide table (4NF).

**Reusing existing structure.** `offering` was defined in 0001 but left empty because the read model serves the
course data. 0010 fills it with the 255 Uni-Codes of 2025/26 (handbook pages 142 to 148, generated by
`tools/seed/cr006-sql.ts` from the same official list as 0005), so a followed course is a real foreign key, not free text.
The route catalogue, by contrast, stays read-model data compiled into the Worker (the D1 `route` table uses integer ids
and is not populated), so `journey_notice.route_id` is checked by shape in D1 and against the catalogue by the Worker:
a documented departure in the table below.

**Business rules on the server.** The step list (three preparation steps, open at any time, and the five UGC steps) is
fixed in `shared/journey.ts` and mirrored by the CHECK on `journey_step.step_id`; a test inserts every step id the code
knows, so the two cannot drift. A UGC step opens on the date of the UGC press notice (`opensOn` in the journey read
model); while no date is announced it cannot be ticked, because ZedPath never invents a date. "I applied" on a followed
notice can be set only once the notice has opened. The Worker checks both against the read model, using the Sri Lanka
date (UTC+05:30), before writing (`worker/my-journey.ts`); the phone shows the same rule.

**Data migration and safe defaults.** Rules accepted under 0009 are carried into `group_rules_acceptance` with the time
of the account's first join (tested on a copy of the database as it was before 0010). `group_member.rules_version` is
no longer read or written but is kept for now (expand, then contract): the previous release still writes it, so a
rollback stays safe; a later migration drops it once this release is stable. No avatar means initials, as before. A new account's Journey is empty: nothing is ticked for the student.
Journey items kept on a phone before CR-006 are copied to the account by the app on first use.

**Privacy.** The members list of a group (members only) returns usernames, avatars and senior badges, never the name,
email or mobile in `student_contact`. Every new relation cascades on account deletion. In each group's room, a message
keeps the author's avatar as it was when posted, a snapshot like the author name (a deliberate departure).

## Demo accounts (CR-007)

The product owner asked for a one-tap demo on the Welcome screen (15 October 2026), choosing a **private copy per
visitor** over one shared account. Each tap creates a throwaway account holding the sample student; it expires 24 hours
later and is deleted on a later demo tap (the free plan has no scheduled job).

**Where the fact lives.** "This account is a demo, until T" is a single-valued fact about the account, so it is an
attribute of ACCOUNT (`demo_expires_at`, NULL for every real account), not a new entity. Reusing ACCOUNT means every row
a demo creates (profile, contact, list, Journey, sessions, memberships, rules acceptance) is already removed by the
existing ON DELETE CASCADE foreign keys: no second deletion path to keep in step.

Table: CR-007 changes

| Change | Kind | Rule |
|---|---|---|
| `account.demo_expires_at` | Attribute (nullable) | CHECK: NULL or later than `created_at` |
| `idx_account_demo_expires` | Partial index (`WHERE demo_expires_at IS NOT NULL`) | Serves the clean-up `DELETE ... WHERE demo_expires_at < now` without scanning real accounts |

**Enforced on the server** (tested in `worker/demo-login.test.ts`): a demo account has a random username and an
unusable random verifier (no password log-in); it reads groups but cannot create a group, report a message or post
(the group room refuses its posts); visitors never see each other's data. Real accounts are unchanged (safe default).

## University facts from UGC statistics (read model)

Five facts per institution (students admitted 2023/24, undergraduates 2024, permanent hostel places, Mahapola and
Bursary recipients, graduates 2024) come from the UGC report *Sri Lanka University Statistics 2024*, Chapters 2, 3, 4
and 7. They follow the read-model decision used for routes and dates: the extracts (`data/ugc/statistics-2024/*.json`,
each number checked twice against the printed table and its totals, and spot-checked by hand) are compiled by
`tools/statistics/build-statistics.ts` into `worker/generated/statistics-2024.json`, keyed by institution letter. They
are published, versioned reference data that students only read, so they are not stored in D1. Each fact keeps its
table, PDF page and URL, and the report's own caveats as flags (2024 provisional; "Information not submitted" shown as
no number, never as zero; university totals that include campuses).

## Rooms an account opened (security audit, lead 3)

Group messages live in each room's Durable Object, outside D1's ON DELETE CASCADE. Deleting an account therefore has to
tell each room to purge that account's messages, and before 0012 the Worker only knew the groups the account was *still*
in, so messages in groups it had left survived the deletion.

**Where the fact lives.** "Account A opened room G" is a fact about the pair, with no other attributes than when it was
first seen, so it is its own relation GROUP_ROOM_SEEN (account_id, group_id, first_at), primary key (account_id, group_id),
both foreign keys ON DELETE CASCADE. It is written when the live chat connects (posting is only possible over that
socket). Account deletion reads it, unioned with current memberships, **before** deleting the account, then purges each
room (at most 45 rooms per request, the free-plan subrequest limit). Migration 0012 seeds it from current memberships so
nothing is missed for existing accounts.

## Entity catalogue

Table: Entities, their type, identifier and the requirements that justify them

| Entity | Type | Identifier | Justified by |
|---|---|---|---|
| STREAM, SUBJECT | Strong | StreamCode; SubjectCode | BR-010 to BR-012 |
| DISTRICT | Strong | DistrictCode | BR-006, BR-007 |
| INSTITUTION | Strong, superclass of UNIVERSITY, CAMPUS, HIGHER_ED_INSTITUTE (disjoint, total) | Letter | BR-015 |
| COURSE | Strong | CourseCode (3 digits) | BR-015 |
| OFFERING | Weak, owners COURSE and INSTITUTION | (CourseCode, Letter); UniCode derived | BR-015 |
| INTAKE_YEAR | Strong | AcademicYear | BR-028 |
| OFFERING_YEAR | Weak, owners OFFERING and INTAKE_YEAR | (UniCode, AcademicYear) | BR-013, BR-014, BR-025, BR-026 |
| SELECTION_GROUP | Weak, owner OFFERING_YEAR | partial key GroupCode | Discovered in the 2025/26 cut-off table |
| CUTOFF | Weak, owners SELECTION_GROUP and DISTRICT | (group, District) | BR-028, BR-029 |
| RULE_NODE | Strong, recursive | NodeID | BR-020 to BR-022 |
| CITED_FACT | Union category of CUTOFF, OFFERING_YEAR, RULE_NODE, DEADLINE, ROUTE | FactID (surrogate) | BO-2, FR-209, FR-911 |
| SOURCE_DOCUMENT | Strong | SourceID; Sha256 unique | FR-901, FR-902 |
| FACT_REVISION | Weak, owner CITED_FACT | partial key Version | FR-911 |
| EXTRACTION_RUN, CANDIDATE_FACT | Strong | RunID; CandidateID | FR-903 to FR-907 |
| ACCOUNT | Strong, superclass of CURATOR, SENIOR, TEACHER, STUDENT (disjoint, partial) | AccountID | NFR-032, FR-704, FR-706, CR-001 |
| STUDENT | Subclass of ACCOUNT | AccountID (inherited) | CR-001 |
| PASSWORD_LOGIN, RECOVERY_CODE | Weak, owner ACCOUNT, 1:1 | AccountID (owner's key); Username unique | CR-001 |
| SESSION | Strong, N:1 to ACCOUNT | TokenHash | CR-001 |
| ACHIEVEMENT | Weak, owner STUDENT | partial key Position | CR-001, BR on special intakes (handbook Section 6) |
| MISTAKE_REPORT | Strong | ReportID | FR-910 |
| DEADLINE | Strong | DeadlineID | FR-401 to FR-403 |
| ROUTE | Strong, superclass of six route groups (disjoint, total) | RouteID | FR-501 to FR-507 |
| PUSH_SUBSCRIPTION | Strong | SubscriptionID | FR-405, FR-406 |

# Rule grammar

A requirement is stored as a tree of `rule_node` rows. Evaluation assigns each of the student's three A/L subjects
to **at most one** leaf, which captures the handbook's meaning of phrases such as "and the third subject from".

Table: Rule node kinds and their meaning

| Kind | Meaning | Example (handbook pattern) |
|---|---|---|
| ALL | Every child is satisfied, by distinct subjects | Fixed trio (pattern 1) |
| ANY | At least one child is satisfied | "Combined Mathematics **or** Physics" |
| AT_LEAST *n* | At least *n* children are satisfied, by distinct subjects | "two other subjects from the list" (pattern 7) |
| SUBJECT *s* ≥ *g* | Leaf: the student has subject *s* at grade *g* or better, and it is not used elsewhere | "a 'C' grade in Chemistry" |
| ANY_SUBJECTS *n* ≥ *g* | *n* further subjects of any kind, not used elsewhere | "any other two subjects" (pattern 8) |
| GRADE_COUNT *n* ≥ *g* | A check on subjects already used: at least *n* of the listed subjects reach grade *g* | Medicine: two 'C' grades (pattern 2) |
| STREAM_IS *x* | Leaf: the student's stream is *x* | "any three subjects in the Commerce Stream" (pattern 13) |
| PREDICATE *name* | A named check implemented in code | ARTS_BASKETS: the Arts basket rules (pattern 17) |
| OL_SUBJECT *s* ≥ *g* | Leaf in the O/L tree: the O/L subject *s* at grade *g* or better | "a Credit Pass in English" (pattern 18) |

Example: Medicine (Uni-Code 001A) is ALL( SUBJECT Biology ≥ S, SUBJECT Chemistry ≥ S, SUBJECT Physics ≥ S,
GRADE_COUNT 2 ≥ C of {Biology, Chemistry, Physics} ). Category splits with separate seats (pattern 14) are modelled
as separate selection groups, each with its own rule tree.

# Mapping the EER model to relations

The relational schema was derived with the standard nine-step algorithm.

Table: EER-to-relational mapping steps applied

| Step | Construct | Applied to | Result |
|---|---|---|---|
| 1 | Strong entities | STREAM, SUBJECT, DISTRICT, COURSE, INTAKE_YEAR, RULE_NODE, SOURCE_DOCUMENT, EXTRACTION_RUN, CANDIDATE_FACT, MISTAKE_REPORT, DEADLINE, PUSH_SUBSCRIPTION, ACCOUNT, ROUTE | One table each, primary key from the key attribute |
| 2 | Weak entities | OFFERING; OFFERING_YEAR; SELECTION_GROUP; CUTOFF; FACT_REVISION | Owners' keys become part of the primary key: `offering(course_code, institution_letter)`, `cutoff(group_id, district_code)`, `fact_revision(fact_id, version)`. OFFERING_YEAR and SELECTION_GROUP also get surrogate keys to keep later foreign keys short |
| 3 | 1:1 relationships | CANDIDATE_FACT PUBLISHED_AS CITED_FACT | Foreign key `published_fact_id` |
| 4 | 1:N relationships | PART_OF, CHILD_OF, TESTS, REQUIRES, READS, PRODUCED, ABOUT, RESOLVES, REVIEWS, FOR_YEAR | Foreign key on the N side; REVIEWS' attributes (decision, note, time) move into `candidate_fact` |
| 5 | M:N relationships | OFFERED_IN, CITES, CONCERNS, REMINDS | Relationship tables `stream_subject`, `citation` (with page and quote), `deadline_offering_year`, `push_subscription_deadline` |
| 6 | Multi-valued attributes | Medium of OFFERING_YEAR | Table `offering_year_medium` |
| 7 | N-ary relationships | None | Not needed |
| 8 | Specialisation | INSTITUTION; ACCOUNT | Option 8C, one table with a discriminator (`kind`, `role`): subclasses have almost no own attributes |
| 8 | Specialisation | ROUTE | Option 8A: superclass table plus `route_private_degree` and `route_job_exam` for subclasses with several constrained attributes; single-attribute subclasses keep the attribute on `route` with a guard constraint |
| 9 | Union category | CITED_FACT | Surrogate key `fact_id` in table `fact`; every member table carries a unique foreign key to it |

The student-account constructs (CR-001) were mapped with the same algorithm:

Table: Mapping of the student-account model

| Step | Construct | Result |
|---|---|---|
| 2 | Weak entities PASSWORD_LOGIN, RECOVERY_CODE (1:1 with the owner) | `password_login`, `recovery_code`, primary key = owner's `account_id` (at most one per account). Kept apart from `account` so staff rows carry no password columns and each sign-in method can be added or removed alone |
| 2 | Weak entity ACHIEVEMENT | `student_achievement` with surrogate `achievement_id`; the partial key becomes UNIQUE (`account_id`, `position`) |
| 4 | 1:N SIGNED_IN | Foreign key `session.account_id` |
| 4 | 1:N SAT_IN, SAT_FROM and the Z-score | Moved, with the Z-score, into `student_profile` keyed by `account_id`. A separate relation because participation is partial: an account may exist before results are entered, so no NULL-filled columns on `account` (option for partial 1:1 participation) |
| 5 | M:N TOOK (Grade, Position) | `student_subject(account_id, position, subject_code, grade)`; at most three per student through CHECK (position 1 to 3), no subject twice through UNIQUE |
| 6 | Multi-valued Interest | `student_interest(account_id, interest)` |
| 8 | Specialisation STUDENT | Option 8C as before: the `role` discriminator gains `STUDENT`; triggers refuse student rows for any other role |

![Logical schema, admission data (generated from the migration file)](diagrams/relational-admission.png)

![Logical schema, trust, routes and journey data (generated from the migration file)](diagrams/relational-trust-journey.png)

![Logical schema, optional student accounts (generated from the migration files)](diagrams/relational-accounts.png)

# Normalisation

## From the source form to 1NF

The UGC cut-off table, as printed, is a single wide relation: one row per district and one column per offering,
with each column header packing several facts into one string, for example "MANAGEMENT STUDIES (TV) - A
[Commerce Stream] (University of Vavuniya)", plus markers \* (merit only) and \# (aptitude test). It violates
first normal form twice: a **repeating group** (260 offering columns) and **non-atomic values** (the header).
Unpivoting gives one row per (offering column, district), and splitting the header gives atomic attributes:

> R1 ( UniCode, CourseCode, CourseName, Letter, InstitutionName, Year, GroupCode, District, IsDisadvantaged,
> MinZ, Status, ProposedIntake, SelectionBasis, HasAptitudeTest, Medium )

## Functional and multi-valued dependencies

Table: Dependencies identified in R1

| # | Dependency | Source of the rule |
|---|---|---|
| FD1 | UniCode → CourseCode, Letter (and the reverse: CourseCode, Letter → UniCode) | BR-015 |
| FD2 | CourseCode → CourseName | Handbook course list |
| FD3 | Letter → InstitutionName | Handbook Uni-Code list |
| FD4 | District → IsDisadvantaged | BR-007 |
| FD5 | UniCode, Year → ProposedIntake, SelectionBasis, HasAptitudeTest | Handbook, per intake |
| FD6 | UniCode, Year, GroupCode, District → MinZ, Status | Cut-off table |
| MVD1 | UniCode, Year ↠ Medium | Medium is independent of every other attribute |

The candidate key of R1 is (UniCode, Year, GroupCode, District, Medium).

## 2NF, 3NF and BCNF

- **2NF** removes attributes that depend on part of the key: FD5's attributes move to OFFERING_YEAR(UniCode,
  Year, ...); FD4's to DISTRICT; FD1 to OFFERING. CUTOFF keeps only MinZ and Status, which need the whole key.
- **3NF** removes transitive dependencies: UniCode → CourseCode → CourseName puts CourseName in COURSE;
  UniCode → Letter → InstitutionName puts the name in INSTITUTION.
- **BCNF**: in every resulting relation, every determinant is a candidate key. The only relation with two
  candidate keys, OFFERING, has (CourseCode, Letter) and the derived UniCode, both keys, so it is in BCNF.
- **4NF**: MVD1 is non-trivial, so Medium moves to its own relation, `offering_year_medium`.

The same analysis applied to the provenance data separates `citation` (fact, source, page) from `fact`, because a
fact may cite several pages and a page supports many facts.

The student-account relations are in BCNF by construction. In each, the only determinants are the keys:
`password_login` has two candidate keys, `account_id` and `username`, and every other attribute depends on
either. `student_subject` has the candidate keys (`account_id`, `position`) and (`account_id`, `subject_code`),
with Grade depending on both. A student's interests are independent of their achievements (MVD AccountID ↠
Interest), so they are kept in separate relations (4NF).

## Deliberate departures

Table: Controlled denormalisations and why they are safe

| Departure | Reason | How consistency is kept |
|---|---|---|
| `uni_code` stored alongside its parts in `offering` | Lookup by the code students know | Generated column, computed by the database; cannot disagree |
| Surrogate keys on `offering_year` and `selection_group` | Short foreign keys in the 13,000-row `cutoff` table | Natural keys kept as UNIQUE constraints |
| `journey_notice.route_id` without a foreign key (CR-006) | The route catalogue is curated read-model data compiled into the Worker; the D1 `route` table is not populated | CHECK on the id's shape in D1; the Worker accepts only ids in the catalogue (tested) |
| Avatar copied onto each group message (CR-006) | A message shows the picture the author had when posting, like the author name; no join across storage | The copy is taken from the account at connection time; deleting the account deletes its messages |
| Read model for the student path (ZP-DOC-06) | D1 free plan allows 5 million row reads a day; a district's full eligibility view reads about 3,000 rows, which would cap ZedPath near 1,600 students a day | Built from D1 by a single job after each data change, versioned, and never edited directly |

# Physical design for Cloudflare D1

## Conventions

- **STRICT tables**: every value must match its declared type.
- **Exact Z-scores**: stored as integers in ten-thousandths (`min_z_e4`; 1.4821 is stored as 14821), so comparisons
  are exact (NFR-051). The valid range −4.0000 to +4.0000 is a CHECK constraint (BR-005).
- **Enumerations** (streams, statuses, kinds, grades) are CHECK constraints, so invalid states cannot be stored.
- **Cross-column rules** are CHECK constraints: a CAMPUS must have a parent university; a VALUE cut-off must have
  a number and an NQC cut-off must not; an auto-published candidate must have two-model agreement at 0.90 or more
  (FR-905); an estimated deadline must state its basis (FR-402).
- **Foreign keys** are enforced by D1 by default (equivalent to `PRAGMA foreign_keys = ON`).
- **Personal data**: without an account, the only student-linked table is `push_subscription`, holding a browser
  push endpoint and keys that the student opted in to share (NFR-030). With an optional account (CR-001), the
  student's results, achievements and interests are kept under a username they choose; there are still no
  names, contact details or telephone numbers. `DELETE FROM account` cascades to every row of that student.
- **Secrets are stored only as hashes** (CR-001): `password_login.verifier` = SHA-256 of a key that the
  device derives with PBKDF2-HMAC-SHA256 at 600,000 rounds (the password never reaches the server);
  `session.token_hash` = SHA-256 of the random cookie token; `recovery_code.code_hash` = SHA-256 of an 80-bit
  random code. A copy of the tables therefore cannot be replayed to log in, and a guessed password costs an
  attacker 600,000 rounds per guess. Verifying a login costs the Worker one SHA-256, well inside the free plan's
  10 ms CPU limit.

## Indexes

Table: Secondary indexes and the query each serves

| Index | Serves |
|---|---|
| `idx_account_demo_expires` (partial, CR-007) | Deleting expired demo accounts on each demo tap |
| `idx_offering_uni_code` (unique) | Look up an offering by Uni-Code |
| `idx_cutoff_district` | All cut-offs for one district: the core of eligibility and banding |
| `idx_offering_year_year` | All offerings of an intake year |
| `idx_rule_node_parent` | Loading rule trees in order |
| `idx_deadline_year_due` | Journey timeline by date |
| `idx_citation_source` | All facts citing a source (re-extraction, audits) |
| `idx_candidate_queue` (partial, QUEUED only) | Curator review queue |
| `idx_report_open` (partial, OPEN only) | Open mistake reports |
| `idx_session_account` | Log out on every device; clearing expired sessions at log-in |
| `idx_student_profile_stream`, `idx_student_profile_district` | Foreign-key checks when a stream or district row changes; counts for reminders by district |
| `idx_student_subject_subject` | Foreign-key checks on `subject` |

## Capacity against the free plan

Table: Data volume per intake year and free-plan headroom

| Measure | Value | Free-plan limit |
|---|---|---|
| Cut-off rows per intake year | about 6,500 | — |
| Database size with two intake years loaded | 2.3 MB | 500 MB per database |
| Projected size with five years and all routes | under 10 MB | 500 MB per database |
| Rows read to rebuild the read model once | about 15,000 | 5 million per day |
| Rows written to load one intake year | about 13,500 (with facts and citations) | 100,000 per day |

# Validation against real data

The design was tested by loading the official data, not sample data. `tools/seed/validate-schema.ts` applies the
migration to an in-memory SQLite database (the engine D1 is built on), loads the UGC 2025/26 data and the 2024/25
cut-offs printed in the handbook, runs integrity checks, and then attempts 24 deliberately invalid inserts.

Table: Schema validation results (5 October 2026)

| Check | Result | Expected |
|---|---:|---:|
| Uni-Codes loaded | 255 | 255 |
| Course codes / institutions | 121 / 20 | 121 / 20 |
| 2025/26 proposed intake across Uni-Codes (plus 900 Arts additional intake = 42,937) | 42,037 | 42,037 |
| 2025/26 cut-off columns matched exactly to a Uni-Code | 260 | 260 |
| 2025/26 cut-off cells loaded / of which NQC | 6,500 / 1,026 | 6,500 / 1,026 |
| Uni-Codes split into more than one selection group | 5 | 5 |
| Uni-Codes without cut-offs | 0 | 0 |
| Merit-only offerings with differing district values | 0 | 0 |
| 2024/25 cut-off cells loaded | 6,425 | — |
| Facts without a citation | 0 | 0 |
| Foreign-key violations | 0 | 0 |
| Invalid inserts rejected by constraints | 24 of 24 | 24 of 24 |

The student-account tables (CR-001) are validated by `worker/account.test.ts`, which applies all three migrations
to an in-memory SQLite database with foreign keys on, exactly as D1 enforces them, and drives the real API.

Table: Student-account validation results (5 October 2026)

| Check | Result |
|---|---|
| Schema after migrations 0001 to 0003 | 35 tables, 190 columns, 52 foreign keys, 12 indexes, 3 triggers |
| Reference rows loaded by 0002 (streams / districts / subjects) | 6 / 25 / 59 |
| Invalid inserts rejected (unknown role, bad username, wrong-length hash, unknown KDF, Z-score out of range, unknown stream, district or subject, fourth subject, duplicate subject, grade D, blank or unknown achievement fields, unknown interest, expiry before creation, student rows on a staff account) | 17 of 17 |
| Deleting one account removes exactly its rows from all 8 account tables and nothing of another account | Pass |
| A request can read or change only its own session's account, whatever the request body says | Pass |
| A save that fails validation changes nothing (atomic batch) | Pass |
| Bugs planted on purpose (body-supplied account id, missing cascade, missing cross-site check, key not compared) caught by a failing test | 4 of 4 |
| Same migrations applied to the local D1 runtime (`wrangler d1 migrations apply --local`) | 3 of 3 applied |

Matching the cut-off table to Uni-Codes surfaced spelling differences between the two UGC documents
("BIO.SC" and "BIOLOGICAL SC.", "AGRI BUSINESS" and "AGRIBUSINESS", "BIO RESOURCES" and "BIORESOURCES") and one
misprinted university name. The loader normalises these explicitly; no column is matched by guesswork.

# Traceability: requirements to tables {.appendix}

Table: Requirements and the tables that realise them

| Requirement | Tables |
|---|---|
| BR-005, NFR-051 (exact Z-scores) | `cutoff.min_z_e4` with range CHECK |
| BR-006, BR-007 (districts) | `district` |
| BR-010 to BR-012 (streams, subjects) | `stream`, `subject`, `stream_subject` |
| BR-013, BR-014 (quotas, merit-only) | `offering_year.selection_basis` |
| BR-015 (Uni-Codes) | `course`, `institution`, `offering` |
| BR-020 to BR-024 (requirements) | `rule_node`, `selection_group.al_rule_root_id`, `ol_rule_root_id`, `offering_year.other_requirements` |
| BR-025, BR-026 (aptitude, suspended) | `offering_year.has_aptitude_test`, `is_suspended` |
| BR-028, BR-029 (cut-offs, NQC) | `selection_group`, `cutoff` |
| FR-209, BO-2, NFR-050 (every fact sourced) | `fact`, `citation`, `source_document` |
| FR-401 to FR-406 (journey, reminders) | `deadline`, `deadline_offering_year`, `push_subscription`, `push_subscription_deadline` |
| FR-501 to FR-507 (other routes) | `route`, `route_private_degree`, `route_job_exam` |
| FR-901 to FR-911 (data and trust) | `source_document`, `extraction_run`, `candidate_fact`, `fact_revision`, `mistake_report`, `account` |
| CR-001 (optional student account, cross-device profile) | `account` (role STUDENT), `password_login`, `session`, `recovery_code`, `student_profile`, `student_subject`, `student_achievement`, `student_interest` |
| CR-002 (Groups; Journey and Alerts as read-model data) | `course`, `institution` (0005), `course_group`, `group_member`, `senior_invite`, `message_report`, `account_block` (0006) |
| CR-003 (compulsory contact details, consent) | `student_contact` (0007) |
| CR-004 (Ask answer feedback) | `answer_feedback` (0008) |
| CR-006 (rules once per account, avatars, Journey on the account) | `group_rules_acceptance`, `account.avatar`, `journey_course` (to `offering`), `journey_notice`, `journey_step` (0010) |
| CR-007 (one-tap demo, a private copy per visitor) | `account.demo_expires_at`, `idx_account_demo_expires` (0011) |
| Security audit run-1, lead 3 (deletion purges every room) | `group_room_seen` (0012) |

# Physical schema (migration 0001) {.appendix}

Reproduced verbatim from `migrations/0001_initial_schema.sql`.

<!-- include: migrations/0001_initial_schema.sql -->

# Student accounts (migration 0003) {.appendix}

Reproduced verbatim from `migrations/0003_student_accounts.sql`. Migration 0002 inserts the reference data (6
streams, 25 districts, 59 subjects) and is generated by `tools/seed/reference-sql.ts` from the compiled rulebook.

<!-- include: migrations/0003_student_accounts.sql -->

# Contact details (migration 0007) {.appendix}

Reproduced verbatim from `migrations/0007_student_contact.sql`.

<!-- include: migrations/0007_student_contact.sql -->

# Answer feedback (migration 0008) {.appendix}

Reproduced verbatim from `migrations/0008_answer_feedback.sql`.

<!-- include: migrations/0008_answer_feedback.sql -->

# Journey, avatars and group rules on the account (migration 0010) {.appendix}

Reproduced verbatim from `migrations/0010_journey_avatars_rules.sql`, generated by `tools/seed/cr006-sql.ts` (the
255 offering rows are the official Uni-Code list).

<!-- include: migrations/0010_journey_avatars_rules.sql -->

# Rooms an account opened (migration 0012) {.appendix}

Reproduced verbatim from `migrations/0012_group_room_seen.sql`.

<!-- include: migrations/0012_group_room_seen.sql -->

# Demo accounts (migration 0011) {.appendix}

Reproduced verbatim from `migrations/0011_demo_accounts.sql`.

<!-- include: migrations/0011_demo_accounts.sql -->

# Group rules (migration 0009) {.appendix}

Reproduced verbatim from `migrations/0009_group_rules.sql`.

<!-- include: migrations/0009_group_rules.sql -->

# Groups (migration 0006) {.appendix}

Reproduced verbatim from `migrations/0006_groups.sql`. Migration 0005 inserts the courses and institutions and is
generated by `tools/seed/courses-sql.ts`.

<!-- include: migrations/0006_groups.sql -->

# Glossary {.appendix}

Table: Terms used in this document

| Term | Meaning |
|---|---|
| BCNF | Boyce-Codd normal form: every determinant is a candidate key |
| Category (union type) | An EER subclass of the union of several superclasses |
| D1 | Cloudflare's serverless SQL database, built on SQLite |
| Identifying relationship | The relationship that links a weak entity to the owner that identifies it |
| MVD | Multi-valued dependency, the basis of fourth normal form (4NF) |
| Read model | A query-optimised copy of data derived from the system of record |
| STRICT table | An SQLite table that rejects values of the wrong type |
| Weak entity | An entity that cannot be identified by its own attributes alone |

# References {.appendix}

Table: Sources referred to in this document

| Ref | Source |
|---|---|
| [1] | R. Elmasri and S. Navathe, *Fundamentals of Database Systems*, 7th edition, Pearson, 2016 (chapters 3, 4, 9, 14, 15) |
| [2] | Cloudflare, *D1: Define foreign keys* and *SQL statements*, developers.cloudflare.com, retrieved 5 October 2026 |
| [3] | Cloudflare, *D1 limits and pricing*, developers.cloudflare.com, retrieved 5 October 2026 |
| [4] | SQLite, *STRICT Tables* and *Generated Columns*, sqlite.org |
| [5] | UGC handbook and cut-off table 2025/26 (see `data/ugc/PROVENANCE.md`) |
| [6] | ZP-DOC-03 Software Requirements Specification |
