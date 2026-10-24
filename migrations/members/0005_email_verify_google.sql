-- Phase 1 DRAFT: email verification + Google identity columns.
-- Apply LOCALLY only (`wrangler d1 migrations apply canary-members --local`
-- with wrangler.members-local.jsonc). Do NOT apply to remote/production D1
-- until Phase B preview + owner OK. Does not flip MEMBERS_AUTH_MODE.

-- Token table (mirrors password_resets: store SHA-256 of raw token only).
CREATE TABLE IF NOT EXISTS email_verifications (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,           -- unix seconds
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);

-- Rebuild users so password_hash can be NULL (Google-only) and new columns exist.
-- SQLite/D1 cannot ALTER COLUMN to drop NOT NULL.
PRAGMA foreign_keys=OFF;

CREATE TABLE users__p1_verify (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT,                    -- NULL = Google-only (no local password)
  stripe_customer_id TEXT UNIQUE,
  is_admin INTEGER NOT NULL DEFAULT 0,
  email_verified_at INTEGER,             -- unix seconds; NULL = must verify before /members
  auth_provider TEXT NOT NULL DEFAULT 'password',  -- password | google | both
  google_sub TEXT,                       -- Google OIDC `sub`; unique when set
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT INTO users__p1_verify (
  id, email, password_hash, stripe_customer_id, is_admin,
  email_verified_at, auth_provider, google_sub, created_at, updated_at
)
SELECT
  id, email, password_hash, stripe_customer_id, is_admin,
  NULL, 'password', NULL, created_at, updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users__p1_verify RENAME TO users;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
  ON users(google_sub) WHERE google_sub IS NOT NULL;

PRAGMA foreign_keys=ON;
