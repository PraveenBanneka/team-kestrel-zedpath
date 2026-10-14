-- 0012: security audit run-1, lead 3 (Praveen 2026-10-15: "do all hardening"). Deleting an account must remove its
-- messages from every group room it used, including rooms it later left. Messages live in each room's Durable Object,
-- outside D1's cascade, so the Worker needs to know which rooms to purge. Designed in ZP-DOC-05 (lead 3).
--
-- One row per account per room it opened (written when the live chat connects). It is deleted with the account or the
-- group (CASCADE); the Worker reads it, with current memberships, BEFORE deleting the account.
CREATE TABLE group_room_seen (
  account_id  INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  group_id    INTEGER NOT NULL REFERENCES course_group(group_id) ON DELETE CASCADE,
  first_at    TEXT    NOT NULL,
  PRIMARY KEY (account_id, group_id)
) STRICT, WITHOUT ROWID;
-- Rooms a member is in today were opened by them or not; seed with current memberships so nothing is missed.
INSERT OR IGNORE INTO group_room_seen (account_id, group_id, first_at) SELECT account_id, group_id, joined_at FROM group_member;
