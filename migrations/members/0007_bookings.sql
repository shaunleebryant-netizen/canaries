-- Bookings (owner approved 2026-10-09, t595u): replaces the old /tuition form. One row per
-- /bookings submission. Two types: a 1-to-1 class (canaries / indicators) or a speaking request.
-- Additive only (new table + indexes). No email is sent (EMAIL_SENDING stays off); the 8:01 AM NZ
-- Drive sync exports this table (scripts/export-drive.mjs -> bookings.csv -> "Bookings" tab).
-- Apply to remote: npx wrangler d1 execute canary-members --remote --file migrations/members/0007_bookings.sql
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,                          -- random uuid (shown to the person as a reference)
  booking_type TEXT NOT NULL CHECK (booking_type IN ('class', 'speaking')),
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,           -- lower-cased + trimmed
  timezone TEXT,                                -- auto-detected in the browser, editable
  preferred_times TEXT,                         -- free text: preferred dates / times
  message TEXT,
  topic TEXT,                                   -- class: Canaries | Indicators | Other
  organisation TEXT,                            -- speaking
  event_name TEXT,                              -- speaking
  event_date TEXT,                              -- speaking (YYYY-MM-DD or free text)
  event_location TEXT,                          -- speaking: city, or "Online"
  audience_size TEXT,                           -- speaking
  origin TEXT,                                  -- page the form was sent from: bookings | members
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'replied', 'confirmed', 'declined', 'done', 'test')),
  is_test INTEGER NOT NULL DEFAULT 0,           -- 1 = internal test row, ignore in any export
  ip_hash TEXT,                                 -- salted sha256 (abuse only)
  created_at INTEGER NOT NULL,                  -- unix seconds
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_bookings_type ON bookings(booking_type);
