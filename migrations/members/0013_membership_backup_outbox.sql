-- Membership backup queue. Access is stored on subscriptions before a row is queued.
-- pending is not a completed backup. Apply this migration in the deployment environment; do not infer it has run.
CREATE TABLE IF NOT EXISTS membership_backup_outbox (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  subscription_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS membership_backup_status ON membership_backup_outbox(status, updated_at);
