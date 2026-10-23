# Membership tracking: audit (2026-09-26) and daily sheet

## Audit summary
- **No signup is stored anywhere in production.** The live Worker has no D1, KV or R2 bindings
  (account has 0 D1 databases, 0 KV namespaces, R2 not enabled).
- `/api/newsletter`, `/api/tuition` and `/api/support` are stubs: they `console.log` the entry and then
  `appendFileSync` to `data/*.json`. The Worker has no writable project filesystem, so on
  Cloudflare the write fails after the log line. Nothing persists; the only trace was the Workers
  log (7-day retention).
- The homepage NewsletterForm (weekly letter + Singapore seminar waitlist) exists in the committed
  HEAD but is **not** in the current working tree / live homepage. `/signup` "Continue to Stripe" is
  a stub (`/api/stripe/checkout` returns `stub: true`, collects no email). There is no founding-list
  form and no FormSubmit anywhere in code or git history.
- Workers logs 2026-09-19..26 (max window): 0 POSTs to `/api/newsletter`, `/api/support`, `/api/tuition`;
  0 `*-stub]` log lines. Anything submitted before 2026-09-19 cannot be recovered.

## Daily sheet
- Sheet: "Canary Members" (native Google Sheet) in Drive folder "Canary Dashboard Backups",
  id `12kYo2BehTgE-7EyNHLze8KNCkkf0v9h61ARO0iFHiJ4`. Tabs: Signups, Members, Payments, Cancellations, Log.
- Rows come from `node scripts/export-members-sheet.mjs --remote` (CSV per tab + `sheet-bundle.json`).
  Stripe is read only if `STRIPE_SECRET_KEY` is set; today it logs "skipped".
- Daily run: export -> replace rows 2+ of Signups/Members/Payments/Cancellations with the bundle,
  append the Log row. Output contains emails: keep under /exports (gitignored).

## Proposed fix (BUILT 2026-09-26, owner-approved; ships with the next deploy)
1. Create remote D1 `canary-members`; add `MEMBERS_DB` binding to `wrangler.jsonc`; apply
   `migrations/members/*` plus a new `0003_leads.sql`:
   `leads(id TEXT PK, email TEXT NOT NULL COLLATE NOCASE, name TEXT, source TEXT NOT NULL,
   note TEXT, consent INTEGER, status TEXT DEFAULT 'new', ip_hash TEXT, created_at INTEGER NOT NULL,
   UNIQUE(email, source))`.
2. Replace the fs code in `/api/newsletter` (and tuition/support) with `INSERT OR IGNORE INTO leads`,
   plus validation, a honeypot field and a per-IP rate limit. Never return the stored rows.
   No read endpoint is public; reading is only via `wrangler d1 execute --remote` (the export
   script) or the existing admin-only `/api/admin/export`.
3. Stop logging raw emails (`console.log` of the entry) once D1 is the store.
4. Put a form back on the site (homepage founding list / letter) pointing at the fixed route,
   with honest copy ("we'll email you when founding seats open").

## What was built (2026-09-26)
- Remote D1 `canary-members` (id 7093abc8-1c56-4230-a432-df4d41479fee, region APAC; the first ENAM database was empty and deleted), binding
  `MEMBERS_DB` in wrangler.jsonc, migrations 0001-0003 applied remotely.
- `leads` = one row per person (unique email) + `tags`; every form post also goes to
  `lead_submissions`; `rate_limits` backs the per-IP limit (newsletter/support 5 per 10 min,
  tuition 3 per 10 min).
- Routes: POST /api/newsletter, /api/support, /api/tuition (D1, honeypot `hp_field`, same-origin
  check, no raw emails in logs, generic responses). GET /api/verify|unsubscribe?token= only
  redirect to /letter (button page); POST does the change. RFC 8058 one-click unsubscribe supported.
- Email: src/lib/email/sender.ts, EMAIL_SENDING default OFF; provider Resend
  (RESEND_API_KEY Worker secret, From "Canary Dashboard <letter@canarydashboard.com>").
  When sending is turned on, EMAIL_TOKEN_SECRET (>=32 chars) must also be set as a Worker secret.
  Rows created while sending was off have no tokens; a "send pending confirmations" job is needed
  when the email content is approved.
- DNS: `_dmarc` TXT `v=DMARC1; p=none;` added. Resend domain + DKIM/SPF/return-path records: run
  `node scripts/setup-resend-domain.mjs` with RESEND_API_KEY, then add the records it writes to
  exports/resend-dns-records.json to the Cloudflare zone.

## Daily sheet routine
    cd /workspace/repos/canaries
    GOOGLE_SERVICE_ACCOUNT_JSON=/path/sa.json OUT_DIR=/workspace/exports/members-sheet \
      node scripts/export-members-sheet.mjs --remote --push
Needs: wrangler logged in (reads remote D1) and a Google service account key with Editor access
to the sheet (share the sheet with the service account's client_email). Without the key the
export still runs and writes CSVs; the push step exits 2 and the sheet is not touched.
