-- Watchlist + alert preferences (PREVIEW). Apply locally only:
--   npx wrangler d1 migrations apply canary-members --local -c wrangler.members-local.jsonc
-- Ship day (owner approval needed): --remote. NOT applied to remote.
CREATE TABLE IF NOT EXISTS member_watchlist (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL COLLATE NOCASE,
  created_at INTEGER NOT NULL,           -- unix seconds
  PRIMARY KEY (user_id, ticker)
);
CREATE INDEX IF NOT EXISTS idx_member_watchlist_ticker ON member_watchlist(ticker);

CREATE TABLE IF NOT EXISTS member_alert_prefs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'daily' CHECK (mode IN ('instant','daily','off')),
  updated_at INTEGER NOT NULL
);
