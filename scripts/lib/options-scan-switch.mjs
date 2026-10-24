/**
 * OPTIONS SCAN PAUSE SWITCH (owner, Mon 28 Sep 2026 9:58 PM NZ; reconfirmed Fri 2 Oct 2026 — keep paused, no options pulls for /owner).
 * Cboe's delayed-quotes pages prohibit automated download, so the nightly Cboe options download is
 * PAUSED until the owner picks a licensed data source. While paused, nothing in this repo may request
 * cdn.cboe.com / cdn-api.cboe.com:
 *   - scripts/refresh-full-pack.mjs step 9 skips the scan (no gap, public pack unaffected) and marks
 *     data/private/options-scan.json `paused: true` so /owner shows the last scan + a paused note;
 *   - scripts/scan-options-scanner.mjs exits 0 without any network call (offline --from-raw re-runs
 *     of already-saved chains still work, and never fall back to a live Cboe request);
 *   - scripts/capture-cboe-chains.mjs exits 0 without any network call.
 * Default OFF. Re-enable only with owner approval AND a licensed source: OPTIONS_SCAN_ENABLED=true.
 */
export const OPTIONS_SCAN_ENABLED = process.env.OPTIONS_SCAN_ENABLED === "true";
export const OPTIONS_SCAN_PAUSED_REASON = "Options scan paused (data source under review)";
export const OPTIONS_SCAN_PAUSED_SINCE = "2026-09-28";
