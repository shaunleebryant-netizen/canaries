# Membership Drive backup

The release backup is a compressed membership business-data snapshot in the private Canary Dashboard Backups Drive folder. The command does not call Google and does not store a credential. The parent routine uploads with its Drive connector, downloads the stored bytes, and checks the SHA-256. The outbox is acknowledged only after that check.

This runs once a day at 08:01 Pacific/Auckland. The parent keeps seven days of files. A change after 08:01 stays pending until the next run. It is not a real-time backup.

The full live database stays on the deployment machine, outside this repository. This snapshot is not that database. It omits `sessions`, `email_verifications`, `password_resets`, `rate_limits`, and `d1_migrations`, and it omits password and token hashes. It keeps users, subscriptions, comp access, watchlists and alert preferences, member and Stripe events, support requests, indicator orders, bookings, leads, and, once those migrations exist, `marketing_consent` and `membership_backup_outbox`.

A restored account needs a password reset. Stripe still has to be re-synced. Table shapes and the migration ledger come from the repository, not from the file. This is not a full disaster-recovery image.

The optional Canary Members sheet writer can still run. It does not mark outbox rows synced.

```
DIR=exports/membership-drive/$(date -u +%F)
node scripts/membership-drive-backup.mjs capture --remote --out "$DIR"
node scripts/membership-drive-backup.mjs export --remote --capture "$DIR/capture.json" --out "$DIR"
```

The parent uploads `$DIR/membership-business.json.gz` and `$DIR/manifest.json`, downloads those Drive files, and compares the snapshot bytes with `manifest.snapshotSha256`. Then:

```
node scripts/membership-drive-backup.mjs ack --remote \
  --capture "$DIR/capture.json" \
  --manifest "$DIR/manifest.json" \
  --snapshot "$DIR/membership-business.json.gz" \
  --drive-file-id "$SNAPSHOT_FILE_ID" \
  --manifest-drive-file-id "$MANIFEST_FILE_ID" \
  --verified-sha256 "$DOWNLOADED_SHA256"
```

`export` never acknowledges a row. `ack` updates only the pending or failed ids stored in that capture, and only when the manifest, the local file, and the downloaded hash all match. A second `ack` with the same evidence updates nothing. A hash mismatch, a missing Drive file id, or a manifest from another capture is refused. Files under `exports/` are mode 0600. The command prints counts and the checksum, not member rows.
