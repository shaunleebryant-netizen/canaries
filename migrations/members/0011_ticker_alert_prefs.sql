-- Per-ticker My Stocks alert prefs (DRAFT 2026-11-02, owner t959u). Apply locally only:
--   npx wrangler d1 migrations apply canary-members --local -c wrangler.members-local.jsonc
-- Ship day (owner approval needed): --remote, together with 0010. NOT applied to remote.
-- conds = comma list of: fish,cci_fairy,mfi_os,smile,sweaty,skull  or 'any'. Row absent = alerts off.
-- Read by scripts/watchlist-alerts.mjs (post-pack email digest; --send gated by EMAIL_SENDING=1).
CREATE TABLE IF NOT EXISTS member_ticker_alerts (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL COLLATE NOCASE,
  conds TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, ticker)
);
