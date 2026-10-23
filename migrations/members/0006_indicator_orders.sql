-- TradingView indicator orders (owner request 2026-10-05). One row per buy-form submission.
-- Invite-only scripts are granted by TradingView username under Manage Access, so we collect the
-- buyer's TradingView username + email BEFORE payment. Stripe is not live yet: rows stay
-- 'pending_payment' until checkout is wired (then 'paid' -> 'granted' once access is added).
-- Separate from `leads` on purpose: not on the letter list, not in the daily Drive member sync.
-- Applied to remote with `wrangler d1 execute canary-members --remote --file` (idempotent).
CREATE TABLE IF NOT EXISTS indicator_orders (
  id TEXT PRIMARY KEY,                          -- random uuid (shown to the buyer as a reference)
  script_id TEXT NOT NULL,                      -- vanna-charm | fish-sweaty (src/lib/indicatorCatalog.ts)
  script_name TEXT NOT NULL,
  tradingview_url TEXT NOT NULL,
  price_cents INTEGER NOT NULL,                 -- 1900
  currency TEXT NOT NULL DEFAULT 'usd',
  tv_username TEXT NOT NULL,                    -- as typed (trimmed, leading @ removed)
  email TEXT NOT NULL COLLATE NOCASE,           -- lower-cased + trimmed
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'paid', 'granted', 'refunded', 'cancelled', 'test')),
  is_test INTEGER NOT NULL DEFAULT 0,           -- 1 = internal test row, ignore in any export
  stripe_session_id TEXT,
  paid_at INTEGER,
  granted_at INTEGER,
  note TEXT,
  ip_hash TEXT,                                 -- salted sha256 (abuse only)
  created_at INTEGER NOT NULL,                  -- unix seconds
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_indicator_orders_status ON indicator_orders(status);
CREATE INDEX IF NOT EXISTS idx_indicator_orders_created ON indicator_orders(created_at);
