-- ZedPath D1 migration 0007: contact details, compulsory at sign-up (CR-003, product owner's decision 2026-10-11:
-- "account creation should be compulsory at start, with name, email, mobile number" and the birthday moved to it).
-- Design: ZP-DOC-05 Section "Contact details (CR-003)". This REPLACES the CR-001 promise "a username only": the app,
-- README and business case now say exactly what is collected and why.
-- One row per account, in its own table: personal data kept apart from the identity table (shared by every role) and
-- from the student's results, so it can be audited, exported or deleted on its own. Deleted with the account.
-- Email and mobile are NOT unique: siblings may share a parent's number, and a uniqueness error would reveal that a
-- number or address is registered. They are NOT verified yet (no sending domain, no SMS service): the *_verified_at
-- columns stay NULL until verification exists, and nothing may rely on them before then.
CREATE TABLE student_contact (
  account_id         INTEGER PRIMARY KEY REFERENCES account(account_id) ON DELETE CASCADE,
  full_name          TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 80),
  email              TEXT NOT NULL CHECK (length(email) <= 254 AND email = lower(email) AND email GLOB '?*@?*.?*' AND email NOT GLOB '* *'),
  mobile             TEXT NOT NULL CHECK (mobile GLOB '+947[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),   -- Sri Lankan mobile, E.164
  birth_date         TEXT NOT NULL CHECK (birth_date GLOB '[12][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND date(birth_date) = birth_date),
  consent_version    TEXT NOT NULL CHECK (consent_version IN ('2026-10-11')),    -- the privacy wording agreed to
  consent_at         TEXT NOT NULL,
  email_verified_at  TEXT,
  mobile_verified_at TEXT,
  updated_at         TEXT NOT NULL
) STRICT;
