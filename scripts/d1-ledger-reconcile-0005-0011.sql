-- Ledger reconciliation only. Do not execute 0005-0011 DDL.
-- Live sqlite_master already has those tables. 0005 drops and rebuilds users.
-- This file is intentionally outside migrations/members so wrangler will not apply it as a migration.
INSERT INTO d1_migrations (name)
SELECT '0005_email_verify_google.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0005_email_verify_google.sql');
INSERT INTO d1_migrations (name)
SELECT '0006_indicator_orders.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0006_indicator_orders.sql');
INSERT INTO d1_migrations (name)
SELECT '0007_bookings.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0007_bookings.sql');
INSERT INTO d1_migrations (name)
SELECT '0008_indicator_grant_tasks.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0008_indicator_grant_tasks.sql');
INSERT INTO d1_migrations (name)
SELECT '0009_comp_access.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0009_comp_access.sql');
INSERT INTO d1_migrations (name)
SELECT '0010_watchlist_alerts.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0010_watchlist_alerts.sql');
INSERT INTO d1_migrations (name)
SELECT '0011_ticker_alert_prefs.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0011_ticker_alert_prefs.sql');
