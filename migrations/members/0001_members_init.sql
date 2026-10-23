-- Canary Dashboard members schema (D1 / SQLite). Applied locally in test mode only.
-- Ship day: `npx wrangler d1 migrations apply canary-members --remote` (see docs/ops/members.md).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,          -- pbkdf2-sha256$<iter>$<salt b64url>$<hash b64url>
  stripe_customer_id TEXT UNIQUE,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,          -- unix seconds
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,                  -- Stripe subscription id (sub_...)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  plan TEXT NOT NULL,                   -- launch_annual | standard | unknown
  price_id TEXT,
  status TEXT NOT NULL,                 -- Stripe status: active, trialing, past_due, unpaid, canceled, incomplete...
  current_period_end INTEGER,           -- unix seconds; access ends here
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  canceled_at INTEGER,
  ended_at INTEGER,
  last_payment_failed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id);

-- Every verified Stripe webhook event (idempotency + admin ledger).
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,                  -- evt_...
  type TEXT NOT NULL,
  livemode INTEGER NOT NULL,
  stripe_created INTEGER NOT NULL,
  received_at INTEGER NOT NULL,
  user_id TEXT,
  subscription_id TEXT,
  amount INTEGER,                       -- minor units when relevant
  currency TEXT,
  summary TEXT
);
CREATE INDEX IF NOT EXISTS idx_events_type ON stripe_events(type);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,          -- sha256 hex of the token; raw token never stored
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

-- App-level audit trail (signups, logins, resets) for the admin ledger.
CREATE TABLE IF NOT EXISTS member_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  type TEXT NOT NULL,                   -- signup | login | logout | reset_requested | reset_completed | checkout_started
  at INTEGER NOT NULL,
  detail TEXT
);
