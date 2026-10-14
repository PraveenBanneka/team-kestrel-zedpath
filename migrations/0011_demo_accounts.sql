-- 0011: CR-007 (Praveen 2026-10-15): "Try the demo" on the Welcome screen. Each tap makes a private throwaway account
-- with the sample student, deleted 24 hours later. Designed in ZP-DOC-05, CR-007.
--
-- A demo account is an ordinary ACCOUNT with an expiry: no new table, so every child row (profile, list, journey,
-- sessions, memberships) already cascades when it is deleted. NULL = a real account, the behaviour before CR-007.
ALTER TABLE account ADD COLUMN demo_expires_at TEXT CHECK (demo_expires_at IS NULL OR demo_expires_at > created_at);

-- Cleanup finds expired demo accounts without scanning real ones (partial index: real accounts are not in it).
CREATE INDEX idx_account_demo_expires ON account(demo_expires_at) WHERE demo_expires_at IS NOT NULL;
