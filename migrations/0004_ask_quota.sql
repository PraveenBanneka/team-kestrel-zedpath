-- ZedPath D1 migration 0004: Ask ZedPath daily allowance (protects the free AI quota).
-- 30 questions a day per device and 300 a day per network (a school lab shares one IP, so the network cap is high).
-- Privacy: no IP address or device id is stored. `client` is SHA-256(PEPPER | day | scope | value), so a row cannot be
-- turned back into an address, and the same device gets a different, unlinkable value every day.
CREATE TABLE ask_quota (
  day     TEXT    NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  scope   TEXT    NOT NULL CHECK (scope IN ('DEVICE','IP')),
  client  TEXT    NOT NULL CHECK (length(client) = 64 AND client NOT GLOB '*[^0-9a-f]*'),
  used    INTEGER NOT NULL CHECK (used >= 0),
  PRIMARY KEY (day, scope, client)
) STRICT, WITHOUT ROWID;
