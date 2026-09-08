# Coherant Canary

Next.js (App Router) + TypeScript + Tailwind scaffold for the Coherant Canary lead page and members dashboard. Vercel-ready. Cloudflare Pages is an optional later host (static export / OpenNext adapters not wired yet).

## Hard stops (this scaffold)

- **No production deploy** from this branch work
- **No live Stripe charges** — Checkout / Portal are stubs
- **No email send** — newsletter POST logs / appends locally only

## Quick start

```bash
cp .env.example .env.local
# optional: edit MEMBERS_PASSWORD (default canary-dev)

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Members: [http://localhost:3000/members](http://localhost:3000/members) (password from `MEMBERS_PASSWORD`).

```bash
npm run build
```

## Env vars

| Var | Purpose |
| --- | --- |
| `MEMBERS_PASSWORD` | Cookie auth stub for `/members` + `/api/members` |
| `STRIPE_SECRET_KEY` | If missing, Stripe buttons toast/no-op |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Placeholder for future client Stripe.js |
| `STRIPE_PRICE_WEEKLY_LETTER` | Price stub — weekly letter |
| `STRIPE_PRICE_DASHBOARD` | Price stub — dashboard subscription |
| `STRIPE_PRICE_TV_INDICATORS` | Price stub — TradingView pack |
| `STRIPE_PRICE_TUITION_SESSION` | Price stub — paid 1-on-1 (limited/week) |
| `NEXT_PUBLIC_SITE_URL` | Local/site URL |

Never commit real secrets.

## Routes

| Path | Notes |
| --- | --- |
| `/` | Public lead — mine metaphor, traffic light + S + asOf only, proof blocks, newsletter CTA |
| `/members` | Env-gated dashboard — full table from fixture |
| `/members/login` | Password stub |
| `GET /api/public` | `light`, `S`, `asOf`, stance — **no full table** |
| `GET /api/members` | Full payload (auth) |
| `POST /api/newsletter` | Local store / log — **no email** |
| `POST /api/stripe/checkout` | Stub products |
| `POST /api/stripe/portal` | Stub portal |

## Data & scoring

- Fixture: `data/state.json` (all scores `0` → `S = 0` → **Amber**). UI labels **Fixture data — not a live reading**.
- Types: `src/lib/types.ts`. Composite helpers: `src/lib/composite.ts`.
- `S = sum(w_i * s_i)`. Lights: Green `S >= +0.6`; Amber `-0.3 <= S < +0.6`; Red `S < -0.3`.
- Veto: VIX/US10Y Danger Above 5 **and** NYSE A–D + % above 200-day both sick → cannot be Green.

### Canary weights (sum 1.00)

1. IWF / IWD — 0.10
2. % of stocks above 200-day MA — 0.12
3. (XLK+XLY) / (XLP+XLU) — 0.12
4. ES1! / JP30 — 0.07
5. XLF — 0.06
6. S&P Top 50 (XLG-style) — 0.08
7. VIX / US10Y — 0.12
8. S&P Equal Weight (RSP) — 0.08
9. NYSE Advances – Declines — 0.10
10. UVXY — 0.08
11. FINRA margin debt — 0.07

## Scaffolded vs stubbed

**Scaffolded (working locally)**

- Public lead UI + members dashboard UI
- Fixture `state.json` + TS types + composite/traffic-light math (incl. veto)
- Public vs members API split
- Members cookie/middleware auth stub
- Newsletter POST → console + `data/newsletter-signups.json` append
- Tailwind styling, production build path

**Stubbed / placeholders**

- Stripe Checkout + Customer Portal (no session creation / no charges)
- TradingView indicators link + tuition booking link
- Letter archive content (one fixture row)
- 13-week sparklines (zeros from fixture)
- Live market data feeds (intentionally not invented)
- Email delivery
- Production-hardened auth

## Owner next steps

1. Wire live data → refresh `data/state.json` (or DB) on a schedule
2. Replace cookie password stub with real auth (Clerk/Auth.js/etc.)
3. Configure Stripe products/prices and enable Checkout only after review
4. Connect an email provider for the weekly letter (double opt-in)
5. Deploy to Vercel when ready (or evaluate Cloudflare Pages later)
6. Replace fixture banner when first live reading ships

## License

Private — all rights reserved by the repo owner.
