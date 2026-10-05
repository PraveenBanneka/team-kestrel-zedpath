-- ZedPath D1 schema, migration 0001.
-- Designed in ZP-DOC-05 Data Design (conceptual EER -> relational mapping -> normalisation to BCNF/4NF).
-- Conventions: STRICT tables; snake_case; exact Z-scores as INTEGER ten-thousandths (z_e4 = Z x 10000,
-- e.g. 1.4821 -> 14821) so comparisons are exact (NFR-051); timestamps as ISO 8601 UTC text;
-- every published fact has a row in `fact` and at least one `citation` (BO-2, NFR-050).
-- D1 enforces foreign keys by default (equivalent to PRAGMA foreign_keys = ON).

-- ---------------------------------------------------------------- provenance (needed first: other tables reference fact)

CREATE TABLE fact (
  fact_id          INTEGER PRIMARY KEY,
  kind             TEXT    NOT NULL CHECK (kind IN ('CUTOFF','OFFERING_YEAR','RULE','DEADLINE','ROUTE')),
  state            TEXT    NOT NULL DEFAULT 'PUBLISHED' CHECK (state IN ('PUBLISHED','WITHDRAWN')),
  current_version  INTEGER NOT NULL DEFAULT 1 CHECK (current_version >= 1),
  updated_at       TEXT    NOT NULL CHECK (updated_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T*Z')
) STRICT;

CREATE TABLE source_document (
  source_id     INTEGER PRIMARY KEY,
  publisher     TEXT NOT NULL,
  title         TEXT NOT NULL,
  edition       TEXT NOT NULL,                       -- e.g. 'Academic year 2025/2026'
  issue_date    TEXT CHECK (issue_date IS NULL OR issue_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  language      TEXT NOT NULL CHECK (language IN ('EN','SI','TA')),
  sha256        TEXT NOT NULL UNIQUE CHECK (length(sha256) = 64 AND sha256 NOT GLOB '*[^0-9a-f]*'),
  storage_key   TEXT NOT NULL UNIQUE,                -- R2 object key; the file itself is never redistributed
  url           TEXT,
  retrieved_at  TEXT NOT NULL
) STRICT;

CREATE TABLE citation (
  fact_id    INTEGER NOT NULL REFERENCES fact(fact_id) ON DELETE CASCADE,
  source_id  INTEGER NOT NULL REFERENCES source_document(source_id),
  page       INTEGER NOT NULL CHECK (page >= 1),     -- printed page number in the source
  quote      TEXT,                                   -- short verbatim quote, where useful
  PRIMARY KEY (fact_id, source_id, page)
) STRICT;
CREATE INDEX idx_citation_source ON citation(source_id);

CREATE TABLE account (
  account_id           INTEGER PRIMARY KEY,
  auth_subject         TEXT NOT NULL UNIQUE,         -- identity-provider subject; no passwords stored
  role                 TEXT NOT NULL CHECK (role IN ('CURATOR','SENIOR','TEACHER')),
  verified_for_letter  TEXT REFERENCES institution(letter),
  class_code           TEXT UNIQUE,
  created_at           TEXT NOT NULL,
  CHECK ((role = 'SENIOR')  = (verified_for_letter IS NOT NULL)),
  CHECK ((role = 'TEACHER') = (class_code IS NOT NULL))
) STRICT;

CREATE TABLE fact_revision (
  fact_id        INTEGER NOT NULL REFERENCES fact(fact_id) ON DELETE CASCADE,
  version        INTEGER NOT NULL CHECK (version >= 1),
  snapshot_json  TEXT    NOT NULL CHECK (json_valid(snapshot_json)),
  changed_at     TEXT    NOT NULL,
  changed_by     INTEGER REFERENCES account(account_id),
  reason         TEXT    NOT NULL,
  PRIMARY KEY (fact_id, version)
) STRICT;

-- ---------------------------------------------------------------- reference data

CREATE TABLE stream (
  stream_code  TEXT PRIMARY KEY CHECK (stream_code IN ('ARTS','COMMERCE','BIO','PHYS','ET','BST')),
  name_en      TEXT NOT NULL,
  name_si      TEXT,
  name_ta      TEXT
) STRICT;

CREATE TABLE subject (
  subject_code  TEXT PRIMARY KEY CHECK (length(subject_code) BETWEEN 2 AND 12 AND subject_code NOT GLOB '*[^A-Z0-9_]*'),
  name_en       TEXT NOT NULL UNIQUE,
  name_si       TEXT,
  name_ta       TEXT,
  arts_basket   INTEGER CHECK (arts_basket IS NULL OR arts_basket BETWEEN 1 AND 4)
) STRICT;

CREATE TABLE stream_subject (
  stream_code   TEXT NOT NULL REFERENCES stream(stream_code),
  subject_code  TEXT NOT NULL REFERENCES subject(subject_code),
  PRIMARY KEY (stream_code, subject_code)
) STRICT, WITHOUT ROWID;

CREATE TABLE district (
  district_code     TEXT PRIMARY KEY CHECK (length(district_code) = 3 AND district_code NOT GLOB '*[^A-Z]*'),
  name_en           TEXT NOT NULL UNIQUE,
  name_si           TEXT,
  name_ta           TEXT,
  is_disadvantaged  INTEGER NOT NULL CHECK (is_disadvantaged IN (0,1))   -- BR-007
) STRICT;

-- Specialisation UNIVERSITY / CAMPUS / HIGHER_ED_INSTITUTE mapped to one table with a discriminator
-- (Elmasri and Navathe option 8C): the subclasses have almost no own attributes.
CREATE TABLE institution (
  letter         TEXT PRIMARY KEY CHECK (length(letter) = 1 AND letter GLOB '[A-Z]'),
  name_en        TEXT NOT NULL UNIQUE,
  kind           TEXT NOT NULL CHECK (kind IN ('UNIVERSITY','CAMPUS','HEI')),
  parent_letter  TEXT REFERENCES institution(letter),
  CHECK ((kind = 'CAMPUS') = (parent_letter IS NOT NULL))
) STRICT;

CREATE TABLE course (
  course_code  TEXT PRIMARY KEY CHECK (course_code GLOB '[0-9][0-9][0-9]'),
  name_en      TEXT NOT NULL,
  field        TEXT
) STRICT;

-- Weak entity OFFERING, identified by COURSE and INSTITUTION; the Uni-Code is derived (BR-015).
CREATE TABLE offering (
  course_code         TEXT NOT NULL REFERENCES course(course_code),
  institution_letter  TEXT NOT NULL REFERENCES institution(letter),
  uni_code            TEXT GENERATED ALWAYS AS (course_code || institution_letter) STORED,
  PRIMARY KEY (course_code, institution_letter)
) STRICT;
CREATE UNIQUE INDEX idx_offering_uni_code ON offering(uni_code);

CREATE TABLE intake_year (
  academic_year  TEXT PRIMARY KEY CHECK (academic_year GLOB '[0-9][0-9][0-9][0-9]/[0-9][0-9][0-9][0-9]'),
  exam_year      INTEGER NOT NULL,
  CHECK (exam_year = CAST(substr(academic_year, 1, 4) AS INTEGER)),
  CHECK (CAST(substr(academic_year, 6, 4) AS INTEGER) = exam_year + 1)
) STRICT;

-- ---------------------------------------------------------------- requirement rules (recursive rule tree)
-- Kinds: ALL / ANY (boolean), AT_LEAST n of the children, SUBJECT (leaf: subject at min_grade),
-- ANY_SUBJECTS n (n further subjects of any kind), GRADE_COUNT (at least n of the child subjects at min_grade,
-- a check on subjects already used), STREAM_IS (leaf), PREDICATE (named check implemented in code, e.g. ARTS_BASKETS),
-- OL_SUBJECT (leaf: G.C.E. O/L subject at min_grade). Semantics in ZP-DOC-05 Section "Rule grammar".
CREATE TABLE rule_node (
  node_id         INTEGER PRIMARY KEY,
  parent_id       INTEGER REFERENCES rule_node(node_id) ON DELETE CASCADE,
  position        INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  kind            TEXT    NOT NULL CHECK (kind IN ('ALL','ANY','AT_LEAST','SUBJECT','ANY_SUBJECTS','GRADE_COUNT',
                                                   'STREAM_IS','PREDICATE','OL_SUBJECT')),
  threshold       INTEGER CHECK (threshold IS NULL OR threshold BETWEEN 1 AND 3),
  subject_code    TEXT REFERENCES subject(subject_code),
  min_grade       TEXT CHECK (min_grade IS NULL OR min_grade IN ('A','B','C','S')),
  stream_code     TEXT REFERENCES stream(stream_code),
  predicate_name  TEXT CHECK (predicate_name IS NULL OR predicate_name IN ('ARTS_BASKETS')),
  fact_id         INTEGER UNIQUE REFERENCES fact(fact_id),   -- set on root nodes only: the rule is the cited fact
  CHECK (kind NOT IN ('SUBJECT','OL_SUBJECT') OR (subject_code IS NOT NULL AND min_grade IS NOT NULL)),
  CHECK (kind NOT IN ('AT_LEAST','ANY_SUBJECTS','GRADE_COUNT') OR threshold IS NOT NULL),
  CHECK (kind <> 'GRADE_COUNT' OR min_grade IS NOT NULL),
  CHECK (kind <> 'ANY_SUBJECTS' OR min_grade IS NOT NULL),
  CHECK ((kind = 'STREAM_IS') = (stream_code IS NOT NULL)),
  CHECK ((kind = 'PREDICATE') = (predicate_name IS NOT NULL)),
  CHECK (subject_code IS NULL OR kind IN ('SUBJECT','OL_SUBJECT')),
  CHECK (fact_id IS NULL OR parent_id IS NULL)
) STRICT;
CREATE INDEX idx_rule_node_parent ON rule_node(parent_id, position);

-- ---------------------------------------------------------------- offerings per year, selection groups, cut-offs

CREATE TABLE offering_year (
  offering_year_id       INTEGER PRIMARY KEY,
  course_code            TEXT NOT NULL,
  institution_letter     TEXT NOT NULL,
  academic_year          TEXT NOT NULL REFERENCES intake_year(academic_year),
  proposed_intake        INTEGER CHECK (proposed_intake IS NULL OR proposed_intake >= 0),
  duration_text          TEXT,
  selection_basis        TEXT NOT NULL CHECK (selection_basis IN ('QUOTA','MERIT_ONLY')),   -- BR-013, BR-014
  has_aptitude_test      INTEGER NOT NULL CHECK (has_aptitude_test IN (0,1)),              -- BR-025
  is_suspended           INTEGER NOT NULL DEFAULT 0 CHECK (is_suspended IN (0,1)),         -- BR-026
  other_requirements     TEXT,                                                             -- BR-023 (not evaluated)
  fact_id                INTEGER NOT NULL UNIQUE REFERENCES fact(fact_id),
  FOREIGN KEY (course_code, institution_letter) REFERENCES offering(course_code, institution_letter),
  UNIQUE (course_code, institution_letter, academic_year)
) STRICT;
CREATE INDEX idx_offering_year_year ON offering_year(academic_year);

-- Multi-valued attribute Medium (4NF: independent of every other offering-year attribute).
CREATE TABLE offering_year_medium (
  offering_year_id  INTEGER NOT NULL REFERENCES offering_year(offering_year_id) ON DELETE CASCADE,
  medium            TEXT    NOT NULL CHECK (medium IN ('SI','TA','EN')),
  PRIMARY KEY (offering_year_id, medium)
) STRICT, WITHOUT ROWID;

-- Weak entity SELECTION_GROUP: most offerings have one group 'ALL'; a few split their seats by stream or category
-- (e.g. Food Business Management: Biological/Physical Science vs Commerce), each with its own rule and cut-offs.
CREATE TABLE selection_group (
  group_id          INTEGER PRIMARY KEY,
  offering_year_id  INTEGER NOT NULL REFERENCES offering_year(offering_year_id) ON DELETE CASCADE,
  group_code        TEXT    NOT NULL DEFAULT 'ALL' CHECK (length(group_code) BETWEEN 1 AND 16),
  label_en          TEXT,
  seat_share_pct    INTEGER CHECK (seat_share_pct IS NULL OR seat_share_pct BETWEEN 1 AND 100),
  al_rule_root_id   INTEGER REFERENCES rule_node(node_id),
  ol_rule_root_id   INTEGER REFERENCES rule_node(node_id),
  UNIQUE (offering_year_id, group_code)
) STRICT;

-- Weak entity CUTOFF, identified by SELECTION_GROUP and DISTRICT (BR-028, BR-029).
CREATE TABLE cutoff (
  group_id       INTEGER NOT NULL REFERENCES selection_group(group_id) ON DELETE CASCADE,
  district_code  TEXT    NOT NULL REFERENCES district(district_code),
  status         TEXT    NOT NULL CHECK (status IN ('VALUE','NQC')),
  min_z_e4       INTEGER CHECK (min_z_e4 IS NULL OR min_z_e4 BETWEEN -40000 AND 40000),
  fact_id        INTEGER NOT NULL UNIQUE REFERENCES fact(fact_id),
  CHECK ((status = 'VALUE') = (min_z_e4 IS NOT NULL)),
  PRIMARY KEY (group_id, district_code)
) STRICT;
CREATE INDEX idx_cutoff_district ON cutoff(district_code, group_id);

-- ---------------------------------------------------------------- other routes (specialisation ROUTE)
-- Superclass table + subclass tables for the subclasses with their own constrained attributes
-- (option 8A); single-attribute subclasses keep that attribute on the superclass with a guard CHECK.

CREATE TABLE route (
  route_id        INTEGER PRIMARY KEY,
  route_group     TEXT NOT NULL CHECK (route_group IN ('PRIVATE_DEGREE','DIPLOMA','PROFESSIONAL','VOCATIONAL',
                                                       'JOB_EXAM','SCHOLARSHIP_ABROAD')),
  name_en         TEXT NOT NULL,
  provider        TEXT NOT NULL,
  duration_text   TEXT,
  cost_min_lkr    INTEGER CHECK (cost_min_lkr IS NULL OR cost_min_lkr >= 0),
  cost_max_lkr    INTEGER CHECK (cost_max_lkr IS NULL OR cost_max_lkr >= 0),
  intake_timing   TEXT,
  nvq_level       INTEGER CHECK (nvq_level IS NULL OR (route_group = 'VOCATIONAL' AND nvq_level BETWEEN 1 AND 7)),
  country         TEXT    CHECK (country IS NULL OR route_group = 'SCHOLARSHIP_ABROAD'),
  rule_root_id    INTEGER REFERENCES rule_node(node_id),
  fact_id         INTEGER NOT NULL UNIQUE REFERENCES fact(fact_id),
  CHECK (cost_min_lkr IS NULL OR cost_max_lkr IS NULL OR cost_min_lkr <= cost_max_lkr)
) STRICT;

CREATE TABLE route_private_degree (
  route_id            INTEGER PRIMARY KEY REFERENCES route(route_id) ON DELETE CASCADE,
  awarding_body       TEXT NOT NULL,
  recognition_status  TEXT NOT NULL CHECK (recognition_status IN ('LISTED','NOT_LISTED','UNKNOWN'))
) STRICT;

CREATE TABLE route_job_exam (
  route_id   INTEGER PRIMARY KEY REFERENCES route(route_id) ON DELETE CASCADE,
  age_min    INTEGER CHECK (age_min IS NULL OR age_min BETWEEN 14 AND 60),
  age_max    INTEGER CHECK (age_max IS NULL OR age_max BETWEEN 14 AND 60),
  closes_on  TEXT CHECK (closes_on IS NULL OR closes_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  CHECK (age_min IS NULL OR age_max IS NULL OR age_min <= age_max)
) STRICT;

-- ---------------------------------------------------------------- journey: deadlines and reminders

CREATE TABLE deadline (
  deadline_id    INTEGER PRIMARY KEY,
  academic_year  TEXT NOT NULL REFERENCES intake_year(academic_year),
  kind           TEXT NOT NULL CHECK (kind IN ('UGC_APPLICATION_OPEN','UGC_APPLICATION_CLOSE','PREFERENCE_CHANGE_CLOSE',
                                               'APTITUDE_APPLICATION','APTITUDE_TEST','CUTOFF_RELEASE','APPEAL_CLOSE',
                                               'REGISTRATION_CLOSE','ROUTE_INTAKE','JOB_EXAM_CLOSE','OTHER')),
  title_en       TEXT NOT NULL,
  due_on         TEXT NOT NULL CHECK (due_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  certainty      TEXT NOT NULL CHECK (certainty IN ('CONFIRMED','ESTIMATED')),                -- BR / FR-402
  basis_text     TEXT,
  route_id       INTEGER REFERENCES route(route_id),
  fact_id        INTEGER NOT NULL UNIQUE REFERENCES fact(fact_id),
  CHECK (certainty = 'CONFIRMED' OR basis_text IS NOT NULL)
) STRICT;
CREATE INDEX idx_deadline_year_due ON deadline(academic_year, due_on);

CREATE TABLE deadline_offering_year (
  deadline_id       INTEGER NOT NULL REFERENCES deadline(deadline_id) ON DELETE CASCADE,
  offering_year_id  INTEGER NOT NULL REFERENCES offering_year(offering_year_id) ON DELETE CASCADE,
  PRIMARY KEY (deadline_id, offering_year_id)
) STRICT, WITHOUT ROWID;

-- Only data a student explicitly opted in to (NFR-030): a push endpoint, never a name or contact detail.
CREATE TABLE push_subscription (
  subscription_id  TEXT PRIMARY KEY CHECK (length(subscription_id) = 32),
  endpoint         TEXT NOT NULL UNIQUE CHECK (endpoint GLOB 'https://*'),
  p256dh           TEXT NOT NULL,
  auth             TEXT NOT NULL,
  created_at       TEXT NOT NULL
) STRICT;

CREATE TABLE push_subscription_deadline (
  subscription_id  TEXT    NOT NULL REFERENCES push_subscription(subscription_id) ON DELETE CASCADE,
  deadline_id      INTEGER NOT NULL REFERENCES deadline(deadline_id) ON DELETE CASCADE,
  PRIMARY KEY (subscription_id, deadline_id)
) STRICT, WITHOUT ROWID;

-- ---------------------------------------------------------------- extraction, review and reports

CREATE TABLE extraction_run (
  run_id       INTEGER PRIMARY KEY,
  source_id    INTEGER NOT NULL REFERENCES source_document(source_id),
  started_at   TEXT NOT NULL,
  finished_at  TEXT,
  status       TEXT NOT NULL CHECK (status IN ('RUNNING','SUCCEEDED','FAILED','PAUSED')),
  n_published  INTEGER NOT NULL DEFAULT 0 CHECK (n_published >= 0),
  n_queued     INTEGER NOT NULL DEFAULT 0 CHECK (n_queued >= 0),
  n_rejected   INTEGER NOT NULL DEFAULT 0 CHECK (n_rejected >= 0),
  CHECK ((status = 'RUNNING') = (finished_at IS NULL))
) STRICT;

-- REVIEWS (1:N, with attributes) is mapped into candidate_fact with the foreign-key approach (mapping step 4).
CREATE TABLE candidate_fact (
  candidate_id          INTEGER PRIMARY KEY,
  run_id                INTEGER NOT NULL REFERENCES extraction_run(run_id) ON DELETE CASCADE,
  kind                  TEXT    NOT NULL CHECK (kind IN ('CUTOFF','OFFERING_YEAR','RULE','DEADLINE','ROUTE')),
  payload_json          TEXT    NOT NULL CHECK (json_valid(payload_json)),
  page                  INTEGER NOT NULL CHECK (page >= 1),
  extractor_confidence  REAL    NOT NULL CHECK (extractor_confidence BETWEEN 0 AND 1),
  checker_verdict       TEXT    CHECK (checker_verdict IS NULL OR checker_verdict IN ('AGREE','DISAGREE')),
  checker_confidence    REAL    CHECK (checker_confidence IS NULL OR checker_confidence BETWEEN 0 AND 1),
  state                 TEXT    NOT NULL CHECK (state IN ('AUTO_PUBLISHED','QUEUED','APPROVED','CORRECTED','REJECTED')),
  published_fact_id     INTEGER REFERENCES fact(fact_id),
  reviewer_id           INTEGER REFERENCES account(account_id),
  review_note           TEXT,
  reviewed_at           TEXT,
  CHECK ((state IN ('AUTO_PUBLISHED','APPROVED','CORRECTED')) = (published_fact_id IS NOT NULL)),
  CHECK ((state IN ('APPROVED','CORRECTED','REJECTED')) = (reviewer_id IS NOT NULL AND reviewed_at IS NOT NULL)),
  CHECK (state <> 'AUTO_PUBLISHED' OR (checker_verdict = 'AGREE' AND extractor_confidence >= 0.90
                                        AND checker_confidence >= 0.90))                     -- FR-905
) STRICT;
CREATE INDEX idx_candidate_queue ON candidate_fact(state) WHERE state = 'QUEUED';

CREATE TABLE mistake_report (
  report_id    INTEGER PRIMARY KEY,
  fact_id      INTEGER NOT NULL REFERENCES fact(fact_id),
  note         TEXT CHECK (note IS NULL OR length(note) <= 1000),
  created_at   TEXT NOT NULL,
  state        TEXT NOT NULL DEFAULT 'OPEN' CHECK (state IN ('OPEN','FIXED','CLOSED')),
  resolved_by  INTEGER REFERENCES account(account_id),
  resolution   TEXT,
  CHECK ((state = 'OPEN') = (resolved_by IS NULL))
) STRICT;
CREATE INDEX idx_report_open ON mistake_report(state) WHERE state = 'OPEN';
