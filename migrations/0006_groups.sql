-- ZedPath D1 migration 0006: course groups, verified-senior invites, reports and blocks (CR-002, Praveen's GO
-- 2026-10-11). Design: ZP-DOC-05 Section "Groups". Messages are NOT stored here: each group's messages live in that
-- group's own Durable Object (GroupRoom, SQLite storage), so a busy chat never touches this database.
-- Privacy (NFR-030): still a username only. Deleting an account deletes its memberships, reports, blocks and any
-- redeemed invite (ON DELETE CASCADE); the Worker also tells each of its groups to delete that account's messages.

-- A verified senior is a SENIOR account (the role and account.verified_for_letter already exist, migration 0003).
-- Praveen checks a senior himself and hands over a one-time code; only the code's SHA-256 is stored. Redeeming it at
-- sign-up creates the SENIOR account and marks the invite in one atomic batch.
CREATE TABLE senior_invite (
  invite_id           INTEGER PRIMARY KEY,
  code_hash           TEXT    NOT NULL UNIQUE CHECK (length(code_hash) = 64 AND code_hash NOT GLOB '*[^0-9a-f]*'),
  course_code         TEXT    NOT NULL REFERENCES course(course_code),
  institution_letter  TEXT    NOT NULL REFERENCES institution(letter),
  study_year          INTEGER NOT NULL CHECK (study_year BETWEEN 1 AND 6),
  created_at          TEXT    NOT NULL,
  expires_at          TEXT    NOT NULL,
  redeemed_by         INTEGER UNIQUE REFERENCES account(account_id) ON DELETE CASCADE,   -- one invite per account
  redeemed_at         TEXT,
  CHECK (expires_at > created_at),
  CHECK ((redeemed_by IS NULL) = (redeemed_at IS NULL))
) STRICT;

-- An invite can only be redeemed by a SENIOR account verified for the invite's institution, and never twice.
CREATE TRIGGER trg_senior_invite_redeem BEFORE UPDATE OF redeemed_by ON senior_invite
WHEN NEW.redeemed_by IS NOT NULL AND (
  OLD.redeemed_by IS NOT NULL
  OR (SELECT role FROM account WHERE account_id = NEW.redeemed_by) IS NOT 'SENIOR'
  OR (SELECT verified_for_letter FROM account WHERE account_id = NEW.redeemed_by) IS NOT NEW.institution_letter)
BEGIN SELECT RAISE(ABORT, 'senior_invite: invalid redemption'); END;

-- A group is either one target course (all universities) or one A/L batch (stream + district). Created on first join.
CREATE TABLE course_group (
  group_id       INTEGER PRIMARY KEY,
  kind           TEXT NOT NULL CHECK (kind IN ('COURSE','BATCH')),
  course_code    TEXT REFERENCES course(course_code),
  stream_code    TEXT REFERENCES stream(stream_code),
  district_code  TEXT REFERENCES district(district_code),
  created_at     TEXT NOT NULL,
  CHECK ((kind = 'COURSE') = (course_code IS NOT NULL)),
  CHECK ((kind = 'BATCH') = (stream_code IS NOT NULL AND district_code IS NOT NULL)),
  CHECK (kind = 'BATCH' OR (stream_code IS NULL AND district_code IS NULL))
) STRICT;
-- Partial unique indexes, not UNIQUE(kind, course, stream, district): SQLite treats NULLs as distinct in UNIQUE.
CREATE UNIQUE INDEX ux_course_group_course ON course_group(course_code) WHERE kind = 'COURSE';
CREATE UNIQUE INDEX ux_course_group_batch  ON course_group(stream_code, district_code) WHERE kind = 'BATCH';

CREATE TABLE group_member (
  group_id    INTEGER NOT NULL REFERENCES course_group(group_id) ON DELETE CASCADE,
  account_id  INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  joined_at   TEXT    NOT NULL,
  PRIMARY KEY (group_id, account_id)
) STRICT, WITHOUT ROWID;
CREATE INDEX idx_group_member_account ON group_member(account_id);

-- One report per member per message. message_id is the GroupRoom's id for the message (128 random bits, hex).
CREATE TABLE message_report (
  group_id     INTEGER NOT NULL REFERENCES course_group(group_id) ON DELETE CASCADE,
  message_id   TEXT    NOT NULL CHECK (length(message_id) = 32 AND message_id NOT GLOB '*[^0-9a-f]*'),
  reporter_id  INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  reason       TEXT    NOT NULL CHECK (reason IN ('HARMFUL','WRONG_INFO','SPAM','OTHER')),
  created_at   TEXT    NOT NULL,
  PRIMARY KEY (group_id, message_id, reporter_id)
) STRICT, WITHOUT ROWID;
CREATE INDEX idx_message_report_reporter ON message_report(reporter_id);

-- Blocks hide the blocked account's messages from the blocker, in every group.
CREATE TABLE account_block (
  blocker_id  INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  blocked_id  INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  created_at  TEXT    NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
) STRICT, WITHOUT ROWID;
CREATE INDEX idx_account_block_blocked ON account_block(blocked_id);
