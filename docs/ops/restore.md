# Restore the Canary Dashboard site

Backups are made by `scripts/backup-site.sh` (owner-approved 2026-09-25):

| Where | What |
|---|---|
| Google Drive → **Canary Dashboard Backups** | `canary-site-YYYY-MM-DD.tar.gz` (site repo + `/home/box/canaries` data in `backup-data/`) |
| Box `/workspace/backups/` | same tarballs, newest 30 kept |
| GitHub **private** `shaunleebryant-netizen/canary-dashboard-backup` (branch `main`) | same content as a git history (without `backup-data/book/`) |

**Secrets are never in a backup.** `env.required.txt` lists the variable *names* to re-add; `BACKUP-EXCLUDED.txt` lists what was left out.

## 1. Get the code + data

Either download the newest tarball from Drive and unpack it:

```bash
tar -xzf canary-site-YYYY-MM-DD.tar.gz
cd canary-site-YYYY-MM-DD
```

or clone the private repo (needs a GitHub login with access):

```bash
gh repo clone shaunleebryant-netizen/canary-dashboard-backup canaries
cd canaries
```

## 2. Put the data mirror back (box only)

```bash
mkdir -p /home/box/canaries
cp -a backup-data/. /home/box/canaries/
rm -rf backup-data          # optional: the site repo does not need it
```

## 3. Install and re-add secrets

```bash
npm ci
```

Re-create local env files from `env.required.txt` (values from the owner / Stripe / Cloudflare dashboards):

- `.env.local` and `.dev.vars` — `MEMBERS_PASSWORD`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_*`, `NEXT_PUBLIC_SITE_URL`
- Cloudflare Worker `coherant-canary` secrets (if the Worker itself was lost): `npx wrangler secret put MEMBERS_PASSWORD` (and the Stripe keys the same way)
- Log wrangler in to Cloudflare: `npx wrangler login`

## 4. Deploy

```bash
npm run deploy     # builds with OpenNext and deploys coherant-canary; prints "Current Version ID"
```

Then check `https://canarydashboard.com/members` (members cookie `canary_members`).

## 5. Resume the nightly routine

`node scripts/refresh-full-pack.mjs --session-date <latest closed NY session> --allow-gaps` rebuilds every box from live feeds; Decide fills for FINRA / failed feeds go in `/home/box/canaries/decide-fills.json` (see `docs/ops/decide-scripted.md`).
