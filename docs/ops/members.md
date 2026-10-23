# Members accounts + Stripe (TEST MODE — not shipped)

Status (2026-09-25): built and tested locally behind a feature flag that is **OFF by default**.
Live site behaviour is unchanged: `MEMBERS_AUTH_MODE` is unset in production, so `/members`
still uses the shared `canary-dev` cookie login and every new `/account*`, `/api/account/*`,
`/api/stripe/webhook` and `/api/admin/export` route returns 404.

Owner context: no Airwallex. Stripe will be linked to the DBS corporate account later; until
then the flow ends at the Stripe payment button. **Not approved to ship.**

## Feature flag

| Var | Values | Effect |
|---|---|---|
| `MEMBERS_AUTH_MODE` | unset / `stub` (default) | Today's shared-password cookie gate (`canary_members`). New routes 404. |
| | `accounts` | Per-user accounts; `/members` needs a signed session **and** an active subscription in D1. `/members/login` redirects to `/account/login`; `/api/members/session` (shared password) returns 404. |
| `STRIPE_MOCK` | `1` | LOCAL ONLY. Mock Checkout/Portal that posts correctly signed test events to the real webhook. Ignored when `NODE_ENV=production`. |
| `SESSION_SECRET` | ≥32 random chars | HMAC key for session cookies (accounts mode fails closed without it). |
| `ADMIN_EMAILS` | comma list | Emails allowed to download the CSV ledger. |
| `MEMBERS_ALLOW_LIVE_STRIPE` | `1` | Required before a `sk_live_` key is used or live-mode webhook events are processed. Unset → live keys refused, live events ignored. |
| `MEMBERS_SITE_ORIGIN` | e.g. `https://canarydashboard.com` | Optional; origin for Stripe return URLs / reset links. |
| `STRIPE_PRICE_DASHBOARD` | `price_...` | Founding (first 100): $600/yr, lookup key `canary_founding_annual_usd`. |
| `STRIPE_PRICE_DASHBOARD_STANDARD_ANNUAL` | `price_...` | Standard annual (default after 100): $1,069/yr, `canary_standard_annual_usd`. |
| `STRIPE_PRICE_DASHBOARD_STANDARD` | `price_...` | Standard monthly: $99/mo, `canary_standard_monthly_usd`. |
| `MEMBERS_FIRST_100_CAP` | number (default 100) | Local testing only (e.g. `0` = founding sold out). |

**Never put `MEMBERS_AUTH_MODE`, `STRIPE_MOCK` or secrets in `.env.local` / `.dev.vars`** — OpenNext
compiles `.env*` files into the deployed worker. Use shell env vars locally and Worker vars/secrets on ship day.

## Pricing (owner update 2026-09-25, all USD)

Annual is the priority/default plan: shown first and highlighted.

| Plan id | Price | Billing | Lookup key | Env |
|---|---|---|---|---|
| `launch_annual` | $600/yr | annual, rate locked for life while renewing (first 100 active founding members) | `canary_founding_annual_usd` | `STRIPE_PRICE_DASHBOARD` |
| `standard_annual` | $1,069/yr | annual — default + "Recommended" after 100 | `canary_standard_annual_usd` | `STRIPE_PRICE_DASHBOARD_STANDARD_ANNUAL` |
| `standard_monthly` | $99/mo | monthly | `canary_standard_monthly_usd` | `STRIPE_PRICE_DASHBOARD_STANDARD` |

Picker (`/account`): while founding is open only the $600/yr founding plan is offered; after 100 the
standard annual card is first/highlighted and monthly is secondary. Checkout defaults to annual
(`resolvePlan()` in `src/lib/members/plans.ts`). Public page copy (homepage, `/signup`,
`MembersPricingNote`) is unchanged — proposal in `docs/ops/pricing-copy-proposal.md`.

**Stripe setup is ON HOLD until the owner sets up billing** — do not run
`scripts/stripe-sandbox-setup.mjs` or `stripe listen` until then.

## Owner-default decisions (2026-09-25 — easy to change)

| Decision | Default | Where to change |
|---|---|---|
| Failed renewal | 7-day grace while `past_due` (from `past_due_since`), then locked; `unpaid`/`canceled` locked | `MEMBERS_PAST_DUE_GRACE_DAYS` env, `src/lib/members/access.ts` |
| First-100 lock | Counts only **currently active** founding subs (`active`/`trialing`/`past_due`); lapsed members lose their spot | `countLaunchMembers()` in `src/lib/members/db.ts` |
| Password-reset email | Stubbed (no email sent; link shown/logged in test mode only) | `src/app/api/account/reset/request/route.ts` |
| Ledger | D1 + CSV export only (no Google Sheet mirror) | `/api/admin/export`, `scripts/members-export-csv.mjs` |
| Currency | USD (site copy: "US$50/mo", "$120 USD/hr") | `scripts/stripe-sandbox-setup.mjs` |

Stripe side (set in Dashboard → Billing → Revenue recovery when going live): retry failed renewals
within ~7 days, then mark the subscription **unpaid** or **cancel** it, so Stripe's state matches the grace window.

## Architecture

- **Auth** (`src/lib/members/*`): email + password, PBKDF2-SHA256 (100k iterations, the Workers cap,
  16-byte salt) via Web Crypto. Session cookie `canary_session` = base64url `{sid,uid,exp}` + HMAC-SHA256,
  `HttpOnly; Secure; SameSite=Lax`, 30 days. The `sessions` table allows revocation (logout, password reset
  revokes all). Middleware checks the signature (edge, no DB); pages/APIs check the session row + subscription.
- **Password reset**: token (32 random bytes) → only its SHA-256 is stored, 1 h expiry, single use.
  **Email sending is stubbed — no email is ever sent.** In test mode (mock or `sk_test_` key) the link is
  shown on the page and logged to the server console; otherwise the response is generic. Wire an email
  provider before enabling resets in production.
- **D1** (binding `MEMBERS_DB`, database `canary-members`, migrations in `migrations/members/`, 0001 init + 0002 `past_due_since`):
  `users`, `sessions`, `subscriptions`, `stripe_events` (idempotency + ledger), `password_resets`, `member_events`.
- **Stripe** (`stripe` 17.7, API `2025-02-24.acacia`, fetch HTTP client + SubtleCrypto so it runs on Workers):
  - `POST /api/account/checkout` → Checkout Session (`mode=subscription`, customer created per user,
    `client_reference_id` + metadata `user_id`/`plan`). First-100 cap: count of users with a currently active
    `launch_annual` subscription in D1; at 100 the standard plan is offered.
  - `POST /api/account/portal` → Stripe Customer Portal (turn off auto-renew, update card, invoices).
  - `POST /api/stripe/webhook` → verifies `Stripe-Signature` (`constructEventAsync`), idempotent on event id, handles
    `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.payment_failed`.
- **Access rule** (`src/lib/members/access.ts`): status `active|trialing` **and** now < `current_period_end`.
  Auto-renew off (`cancel_at_period_end`) keeps access until period end; `subscription.deleted` → no access;
  failed renewal (`past_due`) → 7-day grace, then locked; `unpaid` → locked. No refunds on annual.
- **Admin ledger**: D1 is the source of truth. `GET /api/admin/export?table=signups|payments|events|subscriptions|member_events`
  (admins only, CSV with formula-injection escaping) and `node scripts/members-export-csv.mjs [--remote]`.
  Google Sheet mirror: **deferred**.
- **Pages**: `/account/signup`, `/account/login`, `/account/reset`, `/account` (billing/status/admin links),
  plus local-only `/account/mock-checkout` and `/account/mock-portal` (clearly labelled "MOCK — not Stripe").
- **Unchanged**: `/signup` marketing page still shows the stub "Continue to Stripe" button; old
  `/api/stripe/checkout` + `/api/stripe/portal` stubs untouched.

## Local test (no remote resources)

```bash
# Use a separate copy so the default dev server / nightly deploy tree is not disturbed
npx wrangler d1 migrations apply canary-members --local -c wrangler.members-local.jsonc
MEMBERS_AUTH_MODE=accounts STRIPE_MOCK=1 SESSION_SECRET=$(openssl rand -hex 32) \
ADMIN_EMAILS=admin@example.test MEMBERS_WRANGLER_CONFIG=wrangler.members-local.jsonc \
  npx next dev --port 3100
ACCOUNTS_URL=http://127.0.0.1:3100 STUB_URL=http://127.0.0.1:3001 node scripts/members-e2e.mjs
# founding sold out: restart dev with MEMBERS_FIRST_100_CAP=0, then
ACCOUNTS_URL=http://127.0.0.1:3100 E2E_EXPECT=standard node scripts/members-e2e.mjs
```

Sandbox products/prices + Customer Portal (idempotent via lookup_keys; refuses non-`sk_test_`):
```bash
node scripts/stripe-sandbox-setup.mjs     # reads STRIPE_TEST_SECRET_KEY from the process env
```
Stripe CLI (installed locally, no sudo): `/workspace/tools/stripe-cli/stripe` (v1.52.0).

With real Stripe **test** keys instead of the mock (keys as shell env vars, not files):
```bash
/workspace/tools/stripe-cli/stripe listen --api-key "$STRIPE_TEST_SECRET_KEY" --forward-to localhost:3100/api/stripe/webhook   # prints whsec_... (local only)
MEMBERS_AUTH_MODE=accounts STRIPE_SECRET_KEY="$STRIPE_TEST_SECRET_KEY" STRIPE_WEBHOOK_SECRET=whsec_... \
STRIPE_PRICE_DASHBOARD=price_... SESSION_SECRET=... MEMBERS_WRANGLER_CONFIG=wrangler.members-local.jsonc npx next dev --port 3100
```
Pay with 4242 4242 4242 4242, cancel in the Customer Portal (enable "cancel at period end" in
Stripe Dashboard → Settings → Billing → Customer portal), and use `stripe trigger invoice.payment_failed`.

`wrangler.members-local.jsonc` only exists for the local D1 binding (placeholder id; never deployed).
`next.config.ts` uses it only when `MEMBERS_WRANGLER_CONFIG` is set.

## Ship-day checklist (owner approval required)

1. **DBS linked** to Stripe; activate the live account.
2. **Create remote D1**: `npx wrangler d1 create canary-members` → add to `wrangler.jsonc`:
   `"d1_databases": [{ "binding": "MEMBERS_DB", "database_name": "canary-members", "database_id": "<id>", "migrations_dir": "migrations/members" }]`
   (do NOT add this before the DB exists — it would break the nightly deploy).
3. **Apply migrations**: `npx wrangler d1 migrations apply canary-members --remote`.
4. **Live products/prices** in Stripe (same lookup keys): Founding $600/yr, Standard annual $1,069/yr, Standard monthly $99/mo (USD).
5. **Worker secrets** (`npx wrangler secret put ...`): `STRIPE_SECRET_KEY` (sk_live_), `STRIPE_WEBHOOK_SECRET`,
   `SESSION_SECRET` (new random 32+ bytes), `ADMIN_EMAILS`; vars: `STRIPE_PRICE_DASHBOARD`,
   `STRIPE_PRICE_DASHBOARD_STANDARD_ANNUAL`, `STRIPE_PRICE_DASHBOARD_STANDARD`, `MEMBERS_SITE_ORIGIN=https://canarydashboard.com`, `MEMBERS_ALLOW_LIVE_STRIPE=1`.
6. **Register live webhook** at `https://canarydashboard.com/api/stripe/webhook` for
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`.
7. **Configure the Customer Portal** (live): allow cancel at period end only (no immediate cancel / proration refunds), card update, invoice history.
8. **Email provider** for password resets (currently stubbed) — or accept manual resets at launch.
9. **Flip the flag**: `MEMBERS_AUTH_MODE=accounts` (Worker var) and deploy.
10. **Apply public pricing copy** (`docs/ops/pricing-copy-proposal.md`) once approved.
11. **Wire `/signup`** "Continue to Stripe" button → `/account/signup`; point header "Log in" to `/account/login`.
12. **Remove `canary-dev`**: delete the stub branch in `src/middleware.ts`, `src/lib/auth.ts`,
    `src/app/api/members/session/route.ts`, `/members/login`; unset `MEMBERS_PASSWORD`.
13. Existing members / comps: create accounts and grant access (e.g. a Stripe 100%-off coupon) before flipping.
14. Smoke test live with a real card + immediate refund, check CSV export.

## LIVE since 15/10/2026 (owner approved go-live)

- Worker vars: `MEMBERS_AUTH_MODE=accounts`, `MEMBERS_ALLOW_LIVE_STRIPE=1`, `MEMBERS_SITE_ORIGIN`, `EMAIL_SENDING=1` (Resend). `INDICATOR_CHECKOUT` is NOT set (indicator sales on hold).
- Worker secrets: `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET` (endpoint `we_1UQeua51XxEMe5QTZDoq1pOC` -> /api/stripe/webhook, 5 events), `SESSION_SECRET`, `ADMIN_EMAILS=shaun@canarydashboard.com`, `RESEND_API_KEY`, `EMAIL_TOKEN_SECRET`.
- Live price IDs are the defaults in `src/lib/members/plans.ts` (`LIVE_PRICE_IDS`; env vars override). Founding monthly US$75/mo (`launch_monthly`) counts toward the 100 cap.
- Production is ALWAYS accounts mode (`membersAuthMode()`); the shared `canary-dev` password only exists in local `next dev` previews (default stub there; `/api/members/session` 404s in production). Local previews are unchanged: `npx next dev` with the `canary_members=canary-dev` cookie.
- Admin (ADMIN_EMAILS) with a VERIFIED email bypasses the subscription gate on /members. Admin emails are no longer auto-verified in production (inbox ownership must be proven).
- Remote D1 migrations applied: 0005 (email verify/google, users table was empty) and 0008 (indicator grant tasks).
