-- 0013: CR-014 groups for other paths (Praveen 2026-10-23, screen recording: instead of random course groups, "two for
-- these professional body interested people and one open university ... two government ones ... inspector of customs",
-- filled with sample chats; the demo must be able to join them). Designed in ZP-DOC-05 (CR-014). Schema only.
--
-- A third kind of group, PATH, keyed by a ZedPath path-group key (shared/groups.ts PATH_GROUPS, mirrored by the CHECK
-- below). SQLite cannot change a CHECK in place, so course_group is rebuilt. The three tables that point at it
-- (group_member, message_report, group_room_seen) are copied out and dropped FIRST, so dropping course_group runs no
-- ON DELETE CASCADE and no member, report or room-seen row is lost; they are recreated exactly as 0006, 0009 and 0012
-- left them and filled back. Group ids are kept, so every group's Durable Object room keeps its messages.
--
-- It also completes 0010's "expand, then contract": group_member.rules_version has not been read or written since 0010
-- (acceptance lives in group_rules_acceptance), and some databases migrated with an early 0009 never had it, so the
-- copy names only the columns every database has and the rebuilt table leaves it out.

CREATE TABLE zp0013_member AS SELECT group_id, account_id, joined_at FROM group_member;
CREATE TABLE zp0013_report AS SELECT group_id, message_id, reporter_id, reason, created_at FROM message_report;
CREATE TABLE zp0013_seen   AS SELECT account_id, group_id, first_at FROM group_room_seen;
DROP TABLE group_room_seen;
DROP TABLE message_report;
DROP TABLE group_member;

CREATE TABLE course_group_0013 (
  group_id       INTEGER PRIMARY KEY,
  kind           TEXT NOT NULL CHECK (kind IN ('COURSE','BATCH','PATH')),
  course_code    TEXT REFERENCES course(course_code),
  stream_code    TEXT REFERENCES stream(stream_code),
  district_code  TEXT REFERENCES district(district_code),
  path_key       TEXT CHECK (path_key IS NULL OR path_key IN ('PROF_ACCOUNTING','PROF_BUSINESS','OUSL','GOV_CUSTOMS','GOV_MSO')),
  created_at     TEXT NOT NULL,
  CHECK ((kind = 'COURSE') = (course_code IS NOT NULL)),
  CHECK ((kind = 'BATCH') = (stream_code IS NOT NULL AND district_code IS NOT NULL)),
  CHECK (kind = 'BATCH' OR (stream_code IS NULL AND district_code IS NULL)),
  CHECK ((kind = 'PATH') = (path_key IS NOT NULL))
) STRICT;
INSERT INTO course_group_0013 (group_id, kind, course_code, stream_code, district_code, path_key, created_at)
  SELECT group_id, kind, course_code, stream_code, district_code, NULL, created_at FROM course_group;
DROP TABLE course_group;
ALTER TABLE course_group_0013 RENAME TO course_group;
CREATE UNIQUE INDEX ux_course_group_course ON course_group(course_code) WHERE kind = 'COURSE';
CREATE UNIQUE INDEX ux_course_group_batch  ON course_group(stream_code, district_code) WHERE kind = 'BATCH';
CREATE UNIQUE INDEX ux_course_group_path   ON course_group(path_key) WHERE kind = 'PATH';

-- As 0006 (0009's rules_version contracted, see above).
CREATE TABLE group_member (
  group_id    INTEGER NOT NULL REFERENCES course_group(group_id) ON DELETE CASCADE,
  account_id  INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  joined_at   TEXT    NOT NULL,
  PRIMARY KEY (group_id, account_id)
) STRICT, WITHOUT ROWID;
CREATE INDEX idx_group_member_account ON group_member(account_id);
INSERT INTO group_member (group_id, account_id, joined_at) SELECT group_id, account_id, joined_at FROM zp0013_member;

-- As 0006.
CREATE TABLE message_report (
  group_id     INTEGER NOT NULL REFERENCES course_group(group_id) ON DELETE CASCADE,
  message_id   TEXT    NOT NULL CHECK (length(message_id) = 32 AND message_id NOT GLOB '*[^0-9a-f]*'),
  reporter_id  INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  reason       TEXT    NOT NULL CHECK (reason IN ('HARMFUL','WRONG_INFO','SPAM','OTHER')),
  created_at   TEXT    NOT NULL,
  PRIMARY KEY (group_id, message_id, reporter_id)
) STRICT, WITHOUT ROWID;
CREATE INDEX idx_message_report_reporter ON message_report(reporter_id);
INSERT INTO message_report (group_id, message_id, reporter_id, reason, created_at) SELECT group_id, message_id, reporter_id, reason, created_at FROM zp0013_report;

-- As 0012.
CREATE TABLE group_room_seen (
  account_id  INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  group_id    INTEGER NOT NULL REFERENCES course_group(group_id) ON DELETE CASCADE,
  first_at    TEXT    NOT NULL,
  PRIMARY KEY (account_id, group_id)
) STRICT, WITHOUT ROWID;
INSERT INTO group_room_seen (account_id, group_id, first_at) SELECT account_id, group_id, first_at FROM zp0013_seen;

DROP TABLE zp0013_member;
DROP TABLE zp0013_report;
DROP TABLE zp0013_seen;

-- The five path groups and the six popular course groups are created by the Worker the first time groups are listed
-- (INSERT OR IGNORE, worker/groups.ts ensureStandingGroups), so anyone, the demo included, can join them.
