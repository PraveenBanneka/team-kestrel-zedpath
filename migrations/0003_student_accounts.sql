-- ZedPath D1 migration 0003: student accounts (CR-001, approved by Praveen 2026-10-05 "oo accounts").
-- Design: ZP-DOC-05 Section "Student accounts". One identity table (account) for every role; each way of signing in
-- is its own table hanging off it (password_login now, an identity provider such as Google later).
-- Privacy (NFR-030): a username only. No name, email or phone is ever stored. Deleting an account deletes every row
-- below it (ON DELETE CASCADE), enforced by D1, which always enforces foreign keys.

-- account: add the STUDENT role. SQLite cannot change a CHECK in place, so the table is rebuilt. It holds no rows
-- yet in any environment (no staff accounts exist), so the copy is a no-op kept for correctness.
CREATE TABLE account_v2 (
  account_id           INTEGER PRIMARY KEY,
  auth_subject         TEXT NOT NULL UNIQUE,         -- opaque: 'local:<32 hex>' for password logins, provider subject later
  role                 TEXT NOT NULL CHECK (role IN ('CURATOR','SENIOR','TEACHER','STUDENT')),
  verified_for_letter  TEXT REFERENCES institution(letter),
  class_code           TEXT UNIQUE,
  created_at           TEXT NOT NULL,
  CHECK ((role = 'SENIOR')  = (verified_for_letter IS NOT NULL)),
  CHECK ((role = 'TEACHER') = (class_code IS NOT NULL))
) STRICT;
INSERT INTO account_v2 SELECT account_id, auth_subject, role, verified_for_letter, class_code, created_at FROM account;
DROP TABLE account;
ALTER TABLE account_v2 RENAME TO account;

-- Username + password. The phone derives key = PBKDF2-SHA256(password, salt, 600000) and sends only the key;
-- the server stores verifier = SHA-256(key). Salt = HMAC(PEPPER, username), stored so a PEPPER change never locks
-- anyone out; unknown usernames get the same HMAC, so the salt endpoint does not reveal which usernames exist.
CREATE TABLE password_login (
  account_id  INTEGER PRIMARY KEY REFERENCES account(account_id) ON DELETE CASCADE,
  username    TEXT NOT NULL UNIQUE CHECK (length(username) BETWEEN 3 AND 24 AND username NOT GLOB '*[^a-z0-9_.]*'),
  salt        TEXT NOT NULL CHECK (length(salt) = 32 AND salt NOT GLOB '*[^0-9a-f]*'),
  verifier    TEXT NOT NULL CHECK (length(verifier) = 64 AND verifier NOT GLOB '*[^0-9a-f]*'),
  kdf         TEXT NOT NULL CHECK (kdf IN ('PBKDF2-SHA256-600000')),
  updated_at  TEXT NOT NULL
) STRICT;

-- Sessions: the cookie holds a random token; only its SHA-256 is stored, so a leaked table cannot be replayed.
CREATE TABLE session (
  token_hash  TEXT PRIMARY KEY CHECK (length(token_hash) = 64 AND token_hash NOT GLOB '*[^0-9a-f]*'),
  account_id  INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  CHECK (expires_at > created_at)
) STRICT, WITHOUT ROWID;
CREATE INDEX idx_session_account ON session(account_id);

-- Recovery codes replace "forgot password" emails (the Free plan cannot send email). 80 random bits, so a plain
-- SHA-256 is enough; one active code per account, replaced on every use.
CREATE TABLE recovery_code (
  account_id  INTEGER PRIMARY KEY REFERENCES account(account_id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL CHECK (length(code_hash) = 64 AND code_hash NOT GLOB '*[^0-9a-f]*'),
  created_at  TEXT NOT NULL
) STRICT;

-- The student's results: the same facts the phone keeps (FR-101..105), now kept for them across devices.
CREATE TABLE student_profile (
  account_id     INTEGER PRIMARY KEY REFERENCES account(account_id) ON DELETE CASCADE,
  stream_code    TEXT    NOT NULL REFERENCES stream(stream_code),
  district_code  TEXT    NOT NULL REFERENCES district(district_code),
  z_e4           INTEGER NOT NULL CHECK (z_e4 BETWEEN -40000 AND 40000),
  updated_at     TEXT    NOT NULL
) STRICT;
CREATE INDEX idx_student_profile_stream ON student_profile(stream_code);
CREATE INDEX idx_student_profile_district ON student_profile(district_code);

-- Exactly three subjects: position 1..3 caps it at three in the database; the API refuses fewer.
CREATE TABLE student_subject (
  account_id    INTEGER NOT NULL REFERENCES student_profile(account_id) ON DELETE CASCADE,
  position      INTEGER NOT NULL CHECK (position BETWEEN 1 AND 3),
  subject_code  TEXT    NOT NULL REFERENCES subject(subject_code),
  grade         TEXT    NOT NULL CHECK (grade IN ('A','B','C','S')),
  PRIMARY KEY (account_id, position),
  UNIQUE (account_id, subject_code)
) STRICT, WITHOUT ROWID;
CREATE INDEX idx_student_subject_subject ON student_subject(subject_code);

CREATE TABLE student_achievement (
  achievement_id  INTEGER PRIMARY KEY,
  account_id      INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  position        INTEGER NOT NULL CHECK (position BETWEEN 1 AND 30),
  activity        TEXT    NOT NULL CHECK (length(trim(activity)) BETWEEN 1 AND 80),
  kind            TEXT    NOT NULL CHECK (kind IN ('SPORT','COMPETITION','CLUB','ARTS','OTHER')),
  level           TEXT    NOT NULL CHECK (level IN ('SCHOOL','ZONAL','DISTRICT','PROVINCIAL','NATIONAL','INTERNATIONAL')),
  place           TEXT    NOT NULL CHECK (place IN ('FIRST','SECOND','THIRD','TAKING_PART')),
  year            INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  UNIQUE (account_id, position)
) STRICT;

-- Mirrors shared/account.ts INTERESTS (pinned by worker/account.test.ts).
CREATE TABLE student_interest (
  account_id  INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  interest    TEXT    NOT NULL CHECK (interest IN ('Building apps','Maths','Science and labs','Working with people',
                'Business and money','Teaching','Health and caring','Art and design','Languages','Law and society',
                'Nature and farming','Making and engineering','Sport')),
  PRIMARY KEY (account_id, interest)
) STRICT, WITHOUT ROWID;

-- Only student accounts carry student data (enforced here as well as in the API).
CREATE TRIGGER trg_student_profile_role BEFORE INSERT ON student_profile
WHEN (SELECT role FROM account WHERE account_id = NEW.account_id) IS NOT 'STUDENT'
BEGIN SELECT RAISE(ABORT, 'student_profile requires a STUDENT account'); END;
CREATE TRIGGER trg_student_achievement_role BEFORE INSERT ON student_achievement
WHEN (SELECT role FROM account WHERE account_id = NEW.account_id) IS NOT 'STUDENT'
BEGIN SELECT RAISE(ABORT, 'student_achievement requires a STUDENT account'); END;
CREATE TRIGGER trg_student_interest_role BEFORE INSERT ON student_interest
WHEN (SELECT role FROM account WHERE account_id = NEW.account_id) IS NOT 'STUDENT'
BEGIN SELECT RAISE(ABORT, 'student_interest requires a STUDENT account'); END;
