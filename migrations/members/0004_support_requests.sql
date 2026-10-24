-- Support page submissions (owner request 2026-09-28): one row per submission, so the owner has
-- every message in one place (exported to CSV by scripts/export-support.mjs for Google Drive).
-- notify_* records the owner-notification email attempt (SUPPORT_NOTIFY switch, Resend).
CREATE TABLE IF NOT EXISTS support_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,                  -- unix seconds
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  issue_type TEXT NOT NULL,                     -- login | billing | dashboard | other
  message TEXT NOT NULL,
  ip_hash TEXT,                                 -- salted sha256 (abuse only)
  notify_status TEXT,                           -- off | sent | failed
  notify_id TEXT,                               -- Resend email id when accepted
  notify_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_support_requests_created ON support_requests(created_at);
