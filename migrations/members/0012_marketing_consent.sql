-- Optional marketing opt-in. Absent row means not opted in. No email is sent from this table.
CREATE TABLE IF NOT EXISTS marketing_consent (
  email TEXT PRIMARY KEY,
  opted_in INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
