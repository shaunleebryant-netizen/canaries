-- Indicator delivery (owner 2026-10-14: invite-only TradingView scripts, no code attachments).
-- One row per paid indicator order: "grant TradingView access to <tv_username>".
-- Created by the Stripe webhook on checkout.session.completed (metadata.kind = 'indicator').
-- Done by hand (or browser automation) under TradingView > script > Manage access, then marked 'done'.
CREATE TABLE IF NOT EXISTS indicator_grant_tasks (
  id TEXT PRIMARY KEY,                    -- random uuid
  order_id TEXT NOT NULL UNIQUE,          -- indicator_orders.id (one task per order)
  script_id TEXT NOT NULL,
  script_name TEXT NOT NULL,
  tv_username TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  stripe_session_id TEXT,
  email_status TEXT,                      -- sent | off | failed:<reason>
  created_at INTEGER NOT NULL,
  done_at INTEGER,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_indicator_grant_tasks_status ON indicator_grant_tasks(status);
