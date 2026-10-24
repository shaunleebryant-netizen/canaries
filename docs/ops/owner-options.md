# Owner Options Scanner — private page `/owner`

The page lives at **canarydashboard.com/owner** (moved from `/owner/options` on 2026-09-26; `/owner/options` now redirects to `/owner` after the same JWT check).

**Private, personal use only. Options data: Cboe delayed.** Cboe's terms allow personal, non-commercial
use only, so members and the public must never see this data. Owner decision 2026-09-26: the scripted
options scan lives only on this owner-gated page (it replaced the removed "Trade Ideas from X" boxes on
`/members`, archived in `archive/trade-ideas-from-x-2026-09-26/`).

## Gating (two layers, fail closed)

1. **Cloudflare Access (Zero Trust)** — self-hosted application covering
   `canarydashboard.com/owner` and `canarydashboard.com/api/owner` (paths include everything below them).
   Policy: Allow, include email `shaunleebryant@gmail.com`. Login method: One-time PIN.
   **Live since 2026-09-26:** team `https://soft-silence-7009.cloudflareaccess.com`; app
   "Canary Dashboard — Owner area" id `8f8b549f-2a84-4e3c-acfa-af264396ebbb`, destinations
   `canarydashboard.com/owner` + `canarydashboard.com/api/owner`, session 24h, allowed IdP only
   One-time PIN (`7626d3ef-bad8-4b20-8059-6aed6294216b`), auto-redirect on; policy "Owner only (OTP)"
   id `d9dc1d8a-3bfe-44bb-8315-eee2a250e3a7`. AUD `cbb5b177…87cf1` (full value in `wrangler.jsonc` vars).
   `www.canarydashboard.com/owner*` is not behind Access; the Worker 404s it (no JWT).
2. **Worker JWT check** — `src/middleware.ts` (matcher `/owner/*`, `/api/owner/*`) and the page itself
   call `verifyAccessJwt()` (`src/lib/owner/accessJwt.ts`): the `Cf-Access-Jwt-Assertion` header must be
   an RS256 JWT signed by a key from `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`
   (cached 10 min, refetched on unknown `kid`), with `aud` containing the app's AUD tag, `iss` = the team
   domain, unexpired, and `email` = the owner. Anything else → plain **404** (`x-robots-tag: noindex, nofollow`).
   - Worker vars (plain vars in `wrangler.jsonc`, not secrets): `OWNER_ACCESS_TEAM_DOMAIN`, `OWNER_ACCESS_AUD`.
     **Unset → every /owner request is 404.**
   - Production only accepts `https://*.cloudflareaccess.com`; a loopback team domain is accepted only in
     `next dev` (for the local simulated-JWT test).
3. Page metadata `robots: noindex, nofollow`; response `cache-control: private, no-store`;
   `dynamic = "force-dynamic"` (never prerendered to a static asset). Not linked from any page, not in a sitemap.

## Data (server-side only)

- Scan: `scripts/scan-options-scanner.mjs [--session-date YYYY-MM-DD] [--limit N]` (`npm run scan:options`).
- **Thresholds/filters: one object, `scripts/lib/options-scan-config.mjs`** (copied into every output as
  `thresholds`; the page labels read from it). Settings/filters UI comes next.
- Output: `data/private/options-scan.json` + `data/private/options-iv-history.json`.
  `data/private/` is **gitignored** (the GitHub repo is public) and is **not** mirrored to
  `/home/box/canaries/` or `public/`. `scripts/ensure-private-data.mjs` (prebuild/predeploy) writes an
  empty placeholder on a fresh clone so the build compiles.
- Read only by `src/lib/owner/optionsScan.ts`, imported only by `src/app/owner/page.tsx`
  (server component). It is compiled into the Worker's server bundle; the client component
  `OwnerOptionsScanner` gets the rows as props inside the gated response only. No `/api` route serves it.
- Sources: Cboe public delayed-quotes JSON (`cdn.cboe.com/api/global/delayed_quotes/options/<SYM>.json`)
  for chains + IV30; Yahoo v8 daily bars for HV20. Universe: `data/fish-universe.json` (crypto/metal spot skipped).

## Main view: three filter stacks (2026-09-26)

All thresholds live in `scripts/lib/options-scan-config.mjs` (`proxies`, `stacks`, `history`); logic in
`scripts/lib/options-stacks.mjs` (pure, shared). Rows come from the latest session **plus the previous
session** (`LOOKBACK_SESSIONS: 2`) so yesterday's flags show their opening confirmation; one row per contract.
Global filters still apply: skip 0–3 DTE, skip >10% ITM.

**Cboe fields available** (per contract): `option` (OCC symbol), `bid`, `ask`, `bid_size`, `ask_size`,
`last_trade_price`, `last_trade_time`, `volume` (day), `open_interest` (start of day), `iv`, greeks, `theo`,
`open/high/low`, `change`, `prev_day_close`. Per underlying: `security_type` (stock/etf/index),
`current_price`, `close`, `iv30`, `iv30_change_percent`, `last_trade_time`. **Not available:** individual
prints, sweep/block/condition codes, trade side, the quote at the time of each print.

**Proxies (labelled on the page):**
- *At/above ask* ("bought" proxy): `last_trade_price ≥ mid + 0.5 × (ask − mid)` (top 25% of the closing spread),
  with bid > 0, ask > 0 and the last trade on the session date. Mirror rule = *at/below bid*. It judges one
  print against the **closing** quote, not the day's volume. (`proxies.AT_ASK_SPREAD_FRACTION`)
- *Opening confirmed*: next session's OI − this session's start-of-day OI ≥ 50% of the flagged volume
  (`proxies.OPEN_CONFIRM_SHARE`). *Unconfirmed* = next session not in yet; *not confirmed* = came in short.
- *Est. premium* = volume × mid × 100.

**Stack 1 — Aggressive directional:** premium ≥ $250k; vol/OI ≥ 5× (OI 0 = new, passes); at/above ask;
DTE 7–45 on the flag date; single names only (`security_type === "stock"`, minus `EXCLUDE_TICKERS`, empty by
default). Calls-bought / puts-bought toggle. Sorted by premium.
**Stack 2 — Swing positioning:** premium ≥ $500k; strictly OTM (call strike > spot, put strike < spot);
DTE 14–180; vol/OI ≥ 2× (owner 2026-09-26; was 1×); single names only;
no aggressor rule. Opening-confirmed first, then unconfirmed, then not confirmed; then premium.
**Stack 3 — Repeat flow:** same contract *flagged* (vol ≥ 3× OI, ≥ 500, premium ≥ $100k, valid IV) on ≥ 2 of the
last 10 stored sessions; combined premium on flagged sessions ≥ $250k (configurable up to $500k); latest session
vol/OI ≥ 2× (still elevated). Shows flagged dates, OI change since first flag and the latest next-day confirmation.
Until 2 sessions are stored it shows "Building history: N sessions so far". Never invented rows.

Secondary (collapsed): call/put leans (one side ≥ 75% of premium, ≥ $1M, ≥ 2,000 contracts) and IV spikes
(IV30 ÷ HV20 ≥ 1.5× or IV30 +15%).

**History:** `data/private/options-contract-history.json` — per session, every contract passing the snapshot
superset (vol ≥ 500, premium ≥ $100k, vol ≥ 1× OI, DTE ≥ 4) plus the OI/volume of contracts stored in the last 10
sessions (so their next-day OI is known). Keeps 60 sessions. Raw gz chains: `data/private/raw/<session>/`
(last 5 sessions) — re-run offline with `node scripts/scan-options-scanner.mjs --from-raw <session> --session-date <session>`.
`scripts/capture-cboe-chains.mjs` saves raw chains only. History and raw files are **not** in the Worker upload
(only `options-scan.json` is compiled in, server-side).

## Nightly + held rule
- `refresh:full-pack` step 9 runs the scan with the pack's `--session-date`. It **never adds a gap** and never
  blocks the public pack. If the Cboe session ≠ sessionDate, < 80% of tickers load, or the script crashes,
  the last reading is kept with `held: true` + `heldSince: <its session>` and the page shows
  "held since <date>". Status: manifest `privateOwnerPage.optionsScanner`.
- Politeness: 1 request at a time, 0.5 s gap, backoff 3/8/20/40 s on 429/5xx, one sequential retry pass.
  Runtime ~5–10 min for 207 tickers.

## Limits
- Delayed OI is start-of-day: vol/OI can't tell opening from closing, or buys from sells. No sweep/block detection.
- Premium is an estimate from the mid. IV/HV flags pre-earnings names (no earnings calendar yet).

## Local checks
- `next dev` with `OWNER_ACCESS_TEAM_DOMAIN=http://127.0.0.1:8788 OWNER_ACCESS_AUD=local-test-aud` and a local
  JWKS server (see the 2026-09-26 report): valid owner JWT → 200; no JWT / wrong email / wrong AUD / expired /
  forged signature → 404. Production build (`opennextjs-cloudflare build` + `wrangler dev`) → 404 without Access.
