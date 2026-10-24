-- Owner default (2026-09-25): failed renewal => 7-day grace while past_due, then lock.
-- past_due_since = when the subscription entered past_due (cleared when it recovers).
ALTER TABLE subscriptions ADD COLUMN past_due_since INTEGER;
