-- Email list + inbound leads (owner-approved 2026-09-26).
--
-- One row per PERSON (unique email), not per email+source. Why: double opt-in and
-- unsubscribe are about a person, not a form. With one row, a single confirmation
-- covers every list they joined, one unsubscribe stops everything, and nurture can never
-- mail the same person twice. Which forms they used is kept in `tags` (JSON array) and
-- every individual submission (incl. tuition details / support messages) is kept in
-- `lead_submissions`, so nothing is lost by merging.
--
-- consent = 1 only when the person ticked the letter consent (newsletter form). Tuition /
-- support contacts are stored with consent = 0 and are NOT on the mailing list.
-- Nurture/letter sends must use: consent = 1 AND status = 'verified'.
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,                          -- random uuid
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,    -- stored lower-cased + trimmed
  name TEXT,
  source TEXT NOT NULL,                         -- first form used: letter | seminar | tuition | support
  tags TEXT NOT NULL DEFAULT '[]',              -- JSON array: letter, founding_interest, seminar, tuition, support
  consent INTEGER NOT NULL DEFAULT 0,           -- 1 = agreed to receive the letter
  consent_text TEXT,                            -- exact consent wording shown at the time
  consent_at INTEGER,
  status TEXT NOT NULL DEFAULT 'pending'        -- pending | verified | unsubscribed
    CHECK (status IN ('pending', 'verified', 'unsubscribed')),
  verify_token_hash TEXT UNIQUE,                -- sha256 of the emailed token (raw never stored)
  verify_expires_at INTEGER,
  verify_sent_at INTEGER,
  verified_at INTEGER,
  unsubscribe_token_hash TEXT UNIQUE,           -- sha256 of the (HMAC-derived) unsubscribe token
  unsubscribed_at INTEGER,
  ip_hash TEXT,                                 -- salted sha256 of the first IP (abuse only)
  created_at INTEGER NOT NULL,                  -- unix seconds
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- Every form submission (append-only). payload = JSON of the form fields other than
-- email (tuition answers, support message, letter note). Owner-only via the export.
CREATE TABLE IF NOT EXISTS lead_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  source TEXT NOT NULL,                         -- letter | seminar | tuition | support
  payload TEXT,
  ip_hash TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_lead ON lead_submissions(lead_id);

-- Fixed-window per-IP rate limit for the public form routes.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,                         -- "<route>:<ip_hash>:<window start>"
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);
