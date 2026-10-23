-- Permanent complimentary ("comp") member access, keyed by email (owner 2026-10-15).
-- Not a Stripe subscription: never counts toward the founding-100 cap or revenue, no expiry, and
-- Stripe webhooks never touch this table. Applies once the person has an account with a VERIFIED email
-- (so it can be pre-provisioned before they sign up). Manage by hand: INSERT/DELETE rows.
CREATE TABLE IF NOT EXISTS comp_access (
  email TEXT PRIMARY KEY COLLATE NOCASE,   -- lower-cased
  note TEXT,
  created_at INTEGER NOT NULL
);
