-- Record 0012 and 0013 only after their --file executes have succeeded.
-- Also outside migrations/members so it is not replayed as schema.
INSERT INTO d1_migrations (name)
SELECT '0012_marketing_consent.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0012_marketing_consent.sql');
INSERT INTO d1_migrations (name)
SELECT '0013_membership_backup_outbox.sql'
WHERE NOT EXISTS (SELECT 1 FROM d1_migrations WHERE name = '0013_membership_backup_outbox.sql');
