-- 0009: group rules (CR-005, video 2 2026-10-11: "Groups should have rules too"). Designed in ZP-DOC-05, CR-005.
-- A member accepts the group rules before taking part; the accepted version is recorded on the membership, so a new
-- version of the rules can be asked for again. NULL = joined before rules existed (or not yet accepted): the Worker
-- then keeps the live room closed until the member accepts (enforced in worker/groups.ts, not only on the phone).
-- Reuses group_member (one row per member per group) instead of a new table: acceptance is a fact about that row.
ALTER TABLE group_member ADD COLUMN rules_version TEXT CHECK (rules_version IS NULL OR rules_version IN ('2026-10-11'));
