# Full-pack refresh (local prepare)

**Command:** `npm run refresh:full-pack`  
**Script:** `scripts/refresh-full-pack.mjs`  
**Does not deploy.** Ship still needs owner yes. Never invent scores/prints.

## Owner locks

1. Any website ship must refresh **ALL** live boxes on **one shared as-of** (`sessionDate`). Never partial / staggered boxes.
2. Token cut = scripting this pack, not cutting boxes.
3. This command only prepares data under `data/` and mirrors to `/home/box/canaries/`.

## How to run

```bash
cd /workspace/repos/canaries
npm run refresh:full-pack
# optional:
node scripts/refresh-full-pack.mjs --session-date 2026-09-22
node scripts/refresh-full-pack.mjs --allow-gaps   # only if the owner accepts a listed failed/held public box
```

Set `--session-date` to the latest **closed** NY session. There are **no standing gaps** any more (Desk ideas + Unusual options were removed 2026-09-26), so a normal night exits `0` without `--allow-gaps`. A gap now means a scripted public step really failed: report it and ask the owner before using `--allow-gaps`.

## Held data (audit P3, 2026-09-25)

The pack as-of is **never** stamped onto a value that was not refreshed. `stampPackMeta` only sets `packAsOf` when the file's own `asOf` reached `sessionDate`; otherwise it writes `held: true` + `heldSince: <own asOf>`. The members page shows a small amber **"held since YYYY-MM-DD"** note on:

- each held Decide input (Canary readings table + a list under the traffic light),
- the Vol curve and Liquidity cards when their data is older than the pack session,
- a sparkline whose source failed (old line kept, `canary-sparklines.json` → `heldSince`).

Exit `1` if hard gaps remain (default). Manifest: `data/full-pack-manifest.json`.

## Scripted vs gap boxes

| Box | Scripted? | How |
|-----|-----------|-----|
| Vol curve | Yes (step 1) | `scripts/refresh-vol-curve.mjs` — Yahoo `^VIX` / `^VIX3M` daily closes → `vol-curve-stub.json` (feeds, 20-session `mediumHistory`, computed band). Owner-locked VIX/VIX3M-only bands: **< 0.91 SAFE · 0.91–0.95 CAUTION · ≥ 0.96 DANGER**. HYG/IEF (Yahoo) stays the optional credit confirm. Yahoo failure → file kept, `held: true` + `heldSince`, gap. |
| Decide / composite (`state.json`) | Yes (step 2) — **scripted nightly points score** | `scripts/refresh-decide.mjs` scores all 13 inputs (rubric in code; see `docs/ops/decide-scripted.md`), saves the previous file as `state.prev.json`, writes `state.json` with per-input evidence (source, value, SMA20, date) + `needsFill`. Scorekeeper fills **only** FINRA and failed feeds via `/home/box/canaries/decide-fills.json`. Replaces `refresh-state.sh` + the old `yahooRescoreFormulaSeats` path (both retired from the pack). |
| Market Regime v2 | Yes (step 2) | Same script: locked `src/lib/regime/computeRegime.ts` on the new scores (R = QQQ20 + Cyc/Def + VIX/VIX3M + HYG/IEF; Spec from A–D + SP600). 2-session pill hysteresis; prior-day state stored in `data/regime-history.json` → `priorDay` so same-session reruns are stable. |
| Canary sparklines | Yes (step 2) | Same script → `canary-sparklines.json`: last 10 sessions of the exact series each input is scored on. FINRA (monthly) has no line. A failed source keeps its old line + `heldSince`. |
| Liquidity (volume breadth) | Yes | `scripts/refresh-volume-breadth.mjs` — Yahoo UVOL/DVOL first; else TradingView guest `USI:UVOL`/`USI:DVOL`; else rebuild from cached `volume-breadth-tv-history.json`. Writes stub + history. |
| Commentary | Yes (step 8b) | `scripts/refresh-commentary.mjs` → `data/commentary.json` from the new scripted `state.json` (composite S / light / regimeV2) + vol-curve + volume-breadth + sector quotes. Does **not** change Decide S. |
| Vanna & Charm | Yes (calendar) | Writes `vanna-charm-pack.json`; UI also computes live |
| Fish | Yes | `scripts/scan-fish-v3.mjs` — **Canary Tops & Bottoms daily** (owner Pine `data/canary-tops-bottoms-daily.pine`; engine `src/lib/canaryTopsBottoms.mjs`; inputs `src/lib/canaryTopsBottomsConfig.mjs`; method `yahoo-1d-canary-tops-bottoms-daily-2026-09-29`) |
| Sweaty | Yes | Same scan → `exhaustion-alerts.json` (🥵/💀) |
| ETF Watch | Yes | `scripts/scan-etf-watch.mjs` → `etf-watch-alerts.json` (🙂/🐟 and/or 🥵/💀 on ETF/index/metals/uranium) |
| Crypto Watch | Yes | `scripts/scan-crypto-watch.mjs` → `crypto-watch-alerts.json` (🙂/🐟 and/or 🥵/💀 on crypto spot + related) |
| MFI Scan | Yes | `scripts/scan-mfi-washout.mjs` — **MFI Washout v6.1** 💵 bottomSignal on Yahoo 1d (canonical since 2026-10-08 run); universe = **fish ∪ ETF Watch** (deduped) |
| IBD Setups | Yes | `scripts/scan-ibd-setups.mjs` — Minervini MA/52w + IBD-style RS ≥70 vs SPY; prints `setup==true` on latest daily |
| Weekly State + Bullish & Strong | Yes | `scripts/scan-market-state.mjs` → `data/market-state.json` — owner weekly market-state Pine (ohlc4 EMAs 9/12/16/21, TV `ta.ema`) on Yahoo 1wk incl. current week; universe = fish ∪ ETF Watch. Boxes derived at render (`src/lib/marketState.ts`) |
| Monthly 20MA | Yes | `scripts/scan-monthly-20ma.mjs` → `data/monthly-20ma-alerts.json` — monthly close crosses above SMA20 (this month, or last month while still above); Yahoo 1mo; universe = fish ∪ ETF Watch |
| Bullish Setups (Main Scanner; was "Interesting Setups") | Yes (derived) | `scripts/refresh-setups-history.mjs` → `data/setups-history.json`. **≥2** distinct conditions **incl. ≥1 timing print** (🐟 Fish / 😊 Smiley / 🤑 MFI ≤20 within **14** calendar days of sessionDate). 🟢 weekly bull, 📈 Monthly 20MA and IBD count toward the total but cannot qualify a ticker alone. Tickers that also meet Bearish Setups are left out. Rules in `src/lib/setupsCore.mjs` (shared with members page) |
| Bearish Setups (Main Scanner) | Yes (derived) | Same script. **≥2** conditions **incl. ≥1 timing print** (😡 MFI ≥80 / 🥵 Sweaty / 💀 Skull within **14** days); 🔴 weekly bear counts toward the total |
| Ticker chart lightbox data (members) | Yes (step 8d) — **optional, never blocks the pack** | `scripts/build-ticker-charts.mjs --session-date <sessionDate>` → `public/_chartdata/<KEY>.json` + `index.json` (12 months of daily OHLCV + marks 🐟 🙂 💵 🥵 💀 📈, same engines as the scans; ~3.2 MB raw / ~1.2 MB gzipped, ~25 s). Served **members-only** via `/api/members/chart/[ticker]` (middleware + ASSETS binding); direct `/_chartdata/*` hits go Worker-first (`wrangler.jsonc` `assets.run_worker_first`) and `worker-entry.mjs` answers 404. On failure (or >20% tickers failing) the previous files are kept and the manifest `tickerCharts` / warnings record it. Owner approved t583s2392 2026-10-08. |
| Canary chart pop-up data (members) | Yes (step 8d2) — **optional, never blocks the pack** | `scripts/build-canary-charts.mjs --session-date <sessionDate>` → `public/_chartdata/canary/<id>.json` + `index.json` (~12 months of each canary's daily line, its 20-day average or fixed levels, and the Healthy / Neutral / Warning signal from replaying the same rule each day; same Yahoo / TradingView inputs as the scoring; ~5 s). FINRA margin (monthly, manual) is listed as `limited`, not charted. Served **members-only** via `/api/members/canary-chart/[id]`; direct hits 404 (same Worker-first `/_chartdata/*` block — a deep match, so it covers `canary/`; wrangler rejects an explicit `/_chartdata/canary/*` entry as redundant). A canary whose inputs fail or come back short keeps its previous file (noted in `index.json` `failed`); if nothing charts, the step exits 1, previous files + index are kept and the manifest `canaryCharts` / warnings record it. Owner approved 2026-10-09 7:25 PM NZ. |
| Insider Buying (members sub scanner) | Yes (step 8e) — **optional, never blocks the pack** | `scripts/scan-insider-buying.mjs --session-date <sessionDate>` → `data/insider-buying.json` (+ mirror). SEC EDGAR Form 4 filings for the stock universe (`data/fish-universe.json` minus ETFs / countries / crypto / metals): one `data.sec.gov/submissions` JSON per stock (~199 requests, cached 12 h) plus each new Form 4 XML (cached forever by accession in `/home/box/canaries/cache/edgar-form4/`). Named User-Agent, one request at a time, ≤ 5 req/s (SEC limit 10). ~45 s–2 min, $0. Rule (members-only data, never shown on the page): open-market buys (code P) only, 10b5-1 plan trades excluded, 4/A repeats deduped, buys < $25k ignored; qualifies if ≥ 2 distinct insiders and ≥ $100k total, or a single CEO / CFO / director ≥ $250k, by transaction date in the last 30 calendar days. Shown in the members **Insiders** tab → Insider Buying box (moved from Stocks / Sub Scanners 2026-10-10) (ticker, $ total, # insiders, role tag, latest buy date; ticker opens the chart lightbox). **Not** a Bullish Setups / Main Scanner condition; not on the public homepage. On failure (or >20% submissions failing) the previous file is kept and the manifest `insiderBuying` / warnings record it. Owner approved t595u 2026-10-09. |
| Past insider buys (3 months) (members **Insiders** tab, box under Insider Buying) | Yes (step 8e-ii, same run as 8e) — **optional, never blocks the pack** | The 8e scan (`scripts/scan-insider-buying.mjs --session-date <sessionDate>`) also writes `data/insider-history.json` (+ mirror): every qualifying buy (universe only, open-market code P, not 10b5-1, ≥ $25k per insider buy) with a trade date in the last 90 days, one row per insider + trade date, newest first. Filings are read back 105 days (same named User-Agent, ≤ 5 req/s, XML cached forever, so only new Form 4s hit SEC). Step 8e runs after the ticker charts, so each row is priced from the pack's own closes (`public/_chartdata/<T>.json`; `data/signal-history.json` "last" as fallback): Last close, and % since = last close vs price at buy. Price at buy = the insider's average price; if that is > 25% away from the trade-date close (foreign ordinary shares vs the ADR we chart, e.g. BABA, TSM) the trade-date close is used and the row is marked. If the scan fails, `scan-insider-buying.mjs --prices-only` re-prices the previous file from tonight's closes (no network). Manifest key `insiderBuying.history`. Owner approved 2026-10-10. |
| Fundamentals (members Main Scanner columns: Bullish / Bearish Setups P/E · EPS g y/y · EV/EBITDA) | Yes (step 8e3, after Insider Buying) — **optional, never blocks the pack** | `scripts/build-fundamentals.mjs --session-date <sessionDate>` → `data/fundamentals.json` (+ mirror). Every stock in `data/fish-universe.json` plus any other stock with a pack chart file (~199). SEC EDGAR: submissions JSON per stock from the **shared** 12 h cache `/home/box/canaries/cache/edgar-form4/sub/` (warm after step 8e → usually 0 requests); XBRL company facts cached in `/home/box/canaries/cache/edgar-facts/` and **re-fetched only when submissions show a new 10-K / 10-Q / 20-F / 40-F / 6-K** (or amendment) since the cached copy. Named User-Agent `shaun@canarydashboard.com`, one request at a time, ≤ 5 req/s. Yahoo chart endpoint (same as the pack) for recent splits (1 small call per stock, cached 20 h) and FX for non-USD filers. Prices = this pack's closes (`public/_chartdata/<T>.json`, built in step 8d). Cold run (empty cache): ~216 SEC requests + ~220 Yahoo, ~100 s. Typical night: 0–20 SEC (new filings only) + ~220 Yahoo, ~40–60 s. Offline re-run: `--offline` (cache only). $0, no AI at runtime. Rules: P/E = close / TTM diluted EPS; EPS g = TTM EPS vs a year earlier; EV/EBITDA = (market cap + debt − cash & short-term investments) / (operating income + D&A), GAAP as filed (stock pay not added back). **n/m**: EPS or EBITDA ≤ 0, EBITDA margin < 5 %, multiple > 100×, or bank / insurer / lender (`BANK_INS` list in the script: NU, SOFI, HOOD, AFRM, UPST, LMND, OSCR, UNH, CRCL; SIC codes can't be used because 6199 also covers the bitcoin miners). **—**: latest period > 460 days old or a needed tag missing (reason in the row tooltip). **†** (`a:1`): annual 20-F / 40-F figures; reported currency converted at Yahoo FX; ADR ratios in `ADR` (TSM 5, FMS 0.5, BABA 8). Stale EPS tag → TTM net income / latest-quarter diluted shares; no operating-income tag → pretax income + interest (noted). Splits after a filing adjust EPS (÷) and share counts (×); spin-off style ratios (0.67–1.5) ignored. Cover-page share count > 2× or < 0.5× the diluted weighted average is treated as a tagging slip. UI flag `NEXT_PUBLIC_MEMBERS_SETUPS_COLUMNS` (default ON; `=0` → the old chip rows). Manifest key `fundamentals`. Owner approved 2026-10-10. Full-year periods reported twice keep the 10-K / 20-F / 40-F value over a later 10-Q (FIX fix, 2026-10-10). |
| Growth Score (members: Growth column in Bullish / Bearish Setups, Growth Score ranking box, My Stocks) | Yes (same step 8e3 — written by `build-fundamentals.mjs`) — **optional, never blocks the pack** | `data/growth-score.json` (+ mirror). Uses the **same** cached company facts and submissions (SIC code) as Fundamentals: **no extra SEC or Yahoo requests**, adds ~1 s. Tags: revenue (largest of the revenue tags at the latest period end, so lease / rental revenue counts — URI, O, MARA), GrossProfit or revenue − CostOfRevenue / CostOfGoodsAndServicesSold, OperatingIncomeLoss, operating cash flow − capex (PaymentsToAcquirePropertyPlantAndEquipment), RevenueRemainingPerformanceObligation, ContractWithCustomerLiability / DeferredRevenue. EV and cash come from the Fundamentals EV build. **Score** 0–100 = weighted percentiles within our stock universe: revenue growth **40** (0.7 × 12-month y/y + 0.3 × latest quarter y/y) · gross-margin trend **20** (pp y/y) · EV/Sales ÷ SIC peer median **20** (3-digit SIC if ≥ 5 peers, else 2-digit, else universe; lower = better) · cash runway **10** ((cash + ST investments) ÷ yearly FCF burn; FCF ≥ 0 or ≥ 36 months = 100) · path to profit **10** (½ operating-margin percentile, ½ its y/y change). Missing parts are reweighted; under 60 % of the weight → partial (greyed, not ranked). Banks / insurers / lenders (`BANK_INS`) get no gross-margin, EV/Sales, runway or Danger. **Danger** = high burn (FCF margin < −15 % or runway < 18 months) AND at least one of: gross margin < −2pp y/y, operating margin < −2pp y/y, or a labelled **retention proxy** (RPO / deferred revenue growth < min(revenue growth − 10pp, +10 %); or latest-quarter growth > 15pp below 12-month growth and < 60 % of it). NRR is not in XBRL company facts (checked 2026-10-10: not tagged even by SNOW / DDOG / CRWD / NET / OKTA), hence the proxies. A Growth Score error keeps the previous `growth-score.json`; the manifest shows `fundamentals.growthScore`. UI flag `NEXT_PUBLIC_MEMBERS_GROWTH_SCORE` (default ON; `=0` hides the Growth column, ranking box and My Stocks score). Education only. Owner approved 2026-10-10. |
| X Rumours (members Stocks tab, full-width row under the Sub Scanners; Insider Buying moved to the Insiders tab 2026-10-10) | Yes (step 8f, refresh only) + **agent X step after the pack** — **optional, never blocks the pack** | Pack: `scripts/x-rumours-ingest.mjs --refresh-only --session-date <sessionDate>` → `data/x-rumours.json` (+ mirror): no X reads; refreshes "Move since" (Yahoo daily closes), the 10-session expiry and the SEC submissions re-check (Reported → Confirmed when an 8-K / 13D / tender / merger-proxy / 425 filing names the counterparty; named User-Agent, ≤ 5 req/s, submissions cached 12 h in `/home/box/canaries/cache/edgar-form4/sub/`). **Agent step** (X is only reachable through the agent's x connector): after the pack and before deploy, follow `docs/ops/x-rumours-refresh.md` (≤ 25 X reads a night): plan → x calls → `scripts/x-rumours-raw.mjs` → draft stories in our own words → `scripts/x-rumours-ingest.mjs --in <raw> --session-date <sessionDate>` (source gate, ≥ 2 independent sources or 1 + SEC filing, ticker match, own-words check, de-dup by ticker/type/counterparty, statuses Reported / Confirmed / Denied). Owner-only audit of filtered items → `data/private/x-rumours-audit.json` (shown on `/owner` only). Flag `NEXT_PUBLIC_MEMBERS_X_RUMOURS` (default ON). Manifest key `xRumours`. Owner approved 2026-10-10. |
| Sector Screener (members **ETFs** tab, top box) | Yes (step 8g, after X Rumours refresh) — **optional, never blocks the pack** | `scripts/build-sector-screener.mjs` → `data/sector-screener.json` (+ mirror). Yahoo daily closes (2y) for the 11 SPDR sectors + SPY, ~3 s, $0: 1D / 1W / 1M / 3M / YTD price returns, 1M / 3M vs SPY, and calendar-month rank (1–11) for the last 12 complete months + month-to-date. If fewer than 9 sectors come back the script exits 1 **without writing**, so the previous file is kept; the manifest `sectorScreener` / warnings record it. Flag `NEXT_PUBLIC_MEMBERS_SECTOR_SCREENER` (default ON; `=0` hides). Owner approved t693u 2026-10-14, first live with the Thu 15 Oct 11:24 AM NZ update. |
| ~~Country Screener~~ **REMOVED t697u 2026-10-14** (not run, not rendered; script kept on disk) | ~~Yes (step 8h, after Sector Screener) — **optional, never blocks the pack** | `scripts/build-country-screener.mjs` → `data/country-screener.json` (+ mirror). Yahoo daily closes for the top-20 country ETFs (`data/etf-country-universe.json`) + SPY, USD returns (include FX): same columns and monthly rank (1–20) as the Sector Screener. If fewer than 18 of 20 come back the script exits 1 **without writing**, so the previous file is kept; the manifest `countryScreener` / warnings record it. Flag `NEXT_PUBLIC_MEMBERS_COUNTRY_SCREENER` (default ON; `=0` hides). Owner approved t696u 2026-10-14, first live with the Thu 15 Oct 11:24 AM NZ update. |
| Options Scanner (**private owner page** `/owner`) | Yes (step 9) — **never blocks the pack** | `scripts/scan-options-scanner.mjs --session-date <sessionDate>` → `data/private/options-scan.json` (gitignored, server-only; **not mirrored**). Cboe delayed chains (personal use only) + Yahoo HV20. Thresholds: `scripts/lib/options-scan-config.mjs`. Cboe session ≠ sessionDate or < 80% tickers loaded → last reading kept, `held: true` + `heldSince`, recorded in manifest `privateOwnerPage.optionsScanner` — **not** a gap. See `docs/ops/owner-options.md`. |

## Decide sources + needsFill

- **Yahoo (the 9 Yahoo-able inputs + the ES leg of es1-jp30):** XLK/XLY/XLP/XLU, XLF + KRE, `^VIX`/`^VIX3M`, XLG, `^SP600`, RSP, `^VIX`, QQQ, HYG/IEF; ES=F.
- **TradingView guest** (`scripts/tv-guest-series.py`, same WebSocket as `USI:UVOL`): `INDEX:NSHF`, `INDEX:MMTH`, `TVC:JP30`. JP30's 17:00→17:00 NY session bars are dated to the trading day (bar start ≥ 12:00 local → next day).
- **FINRA margin debt:** manual + monthly → always held; listed in `needsFill`.
- Any input whose feed fails (or whose last bar is before `sessionDate`) keeps its last value with `heldSince` and is added to `needsFill` in `state.json` and `data/full-pack-manifest.json`.

## Archived (2026-09-26): Trade Ideas from X

"Desk ideas" and "Unusual options" (X-scraped, never scripted) were removed from `/members`, with their pack steps and the `--allow-gaps` exception. Files moved (not deleted) to `archive/trade-ideas-from-x-2026-09-26/`: `data/ideas.json`, `data/options-flow.json`, `DeskIdeas.tsx`, `UnusualOptions.tsx`, `loadIdeas.ts`, `loadOptionsFlow.ts`. The scripted options scan replaces them on the private owner page only.

**2026-10-10 (owner):** X Rumours ships with the Tue 13 Oct 11:24 AM NZ update: pack step 8f (refresh only, no X) plus the agent X step after the pack and before deploy, non-fatal — see `docs/ops/x-rumours-refresh.md`.

**2026-10-14 (owner t693u):** Sector Screener ships with the Thu 15 Oct 11:24 AM NZ update: pack step 8g (`build-sector-screener.mjs`), non-fatal, flag default ON.

**2026-10-14 (owner t696u):** Country Screener ships with the Thu 15 Oct 11:24 AM NZ update: pack step 8h (`build-country-screener.mjs`), non-fatal, flag default ON.

**2026-10-14 (owner t697u):** Countries removed from the members ETFs tab (Countries box and Country Screener no longer render; `MEMBERS_COUNTRY_SCREENER` default OFF). Pack step 8h skipped (`build-country-screener.mjs` kept on disk). The Countries scan (`scan-etf-country.mjs`) still runs because My Stocks and Backtest use its marks. Sector ETFs box: XAUUSD and XAGUSD removed (GLD/SLV cover them); SP600 was already in the list. Ships with the Thu 15 Oct 11:24 AM NZ update.

**2026-10-09 (owner):** Desk Ideas is revived on `/members` only, refreshed by the agent after the pack and before deploy (non-fatal) — see `docs/ops/desk-ideas-refresh.md`. Unusual Options stays archived.

## Archived (2026-09-25)

Old unused regime engine moved (not deleted) to `archive/regime-engine-2026-09-25/`: `data/regime-state.json`, `data/regime-stub.json`, `scripts/compute-regime.ts`, `src/lib/regime/scoreRegime.ts`. The pack's old "Regime stamp" step is gone. `archive/` is excluded from `tsconfig.json`.

## Fish / Sweaty / ETF Watch / Crypto Watch = Canary Tops & Bottoms daily (since 2026-09-29; section below describes the retired Bottom Finder v3.1)

- Authoritative Pine: `data/fish-indicator-bottom-finder-v3.1.pine` (`signalTF = "D"`, htf = `"D"`)
- Scanner: `npm run scan:fish` → `scripts/scan-fish-v3.mjs`
- ETF Watch: `npm run scan:etf-watch` → `--universe data/etf-watch-universe.json --out-prefix etf-watch` → `data/etf-watch-alerts.json`
- Crypto Watch: `npm run scan:crypto-watch` → `--universe data/crypto-watch-universe.json --out-prefix crypto-watch` → `data/crypto-watch-alerts.json`
- Sweaty keeps the latest 🥵 **and** the latest 💀 per ticker separately (`signals[]`, `exhaustionAsOf`, `skullAsOf`), like Fish `both`; the box shows every icon. Fish rows carry `smileAsOf` / `fishAsOf`; combined ETF/Crypto rows carry all four `*AsOf` fields (audit P6)
- Lightbox: `SignalCalcLightbox.tsx` — `variant="fish"` (full guide) | `"etf-watch"` | `"crypto-watch"` (short how-it-works); combined prints on curated lists

## MFI Scan = MFI Washout v6.1 (CANONICAL from the 2026-10-08 post-close run)

- Owner (t577u, 2026-10-07): "Ship the MFI changes. Our MFI scanner is better now."
- Engine: **MFI Washout v6.1** — Pine `/home/box/canaries/pine/mfi-washout-v6.1.pine` (repo copy `data/mfi-washout-v6.1.pine`), port `scripts/lib/mfi-washout-v6.1.mjs` = the v6 💵 plus two gates, both on: washout depth (lowest MFI over the oversold lookback) and a plotted 🐟/🙂 (Canary RelRSI, `src/lib/canaryTopsBottoms.mjs`) within the last few bars. Thresholds are private (never on the site). A v6 fire that a gate blocks still disarms, exactly like the Pine
- **Rollback:** `MFI_ENGINE=v6` (env, read by `scan-mfi-washout.mjs` and `update-signal-history.mjs`) → plain v6. v6 Pine/port kept: `data/mfi-washout-v6.pine`, `scripts/lib/mfi-washout-v6.mjs`
- Backtest (`data/signal-history.json`) stores `mfiEngine`; when it differs from the current engine the update step rebuilds every 💵 row in the window (🐟/🙂 untouched). Bullish Setups 💵 reads the same `money-flow-alerts.json` prints, so all three agree
- v6 history (2026-10-06 → 10-07): Owner: "for mfi, update to this code and discard old. ensure future updates uses this mfi instead."
- Scanner: `npm run scan:mfi` (alias `scan:money-flow`) → `scripts/scan-mfi-washout.mjs` → `data/money-flow-alerts.json`; full pack passes `--session-date`
- Yahoo `interval=1d`, **full history** (`period1=0`; `range=max` returns quarterly bars) — the 🐟/🙂 gate needs 500+ bars; completed bars only
- Box rows = 💵 `bottomSignal` on each ticker's latest completed bar (signal id `mfi_os`). `prints` = every 💵 fire within **14 calendar days** (Main Scanner 14-day rule → Bullish Setups)
- No sell-side signal (v6 has none): the old 🍒 caution zone (MFI ≥ 80) is gone, so MFI no longer feeds Bearish Setups
- Universe = `fish-universe.json` ∪ `etf-watch-universe.json` (deduped)
- Old zone scan (≤20 / ≥80) and its Pine are archived in `scripts/archive/mfi-zone-2026-10-06/` — do not re-wire
- Lightbox: `MoneyFlowLightbox.tsx` (plain-English, no thresholds)

## IBD Setups = Minervini + IBD-style RS (daily)

- Box prints names whose **latest daily** bar has full `setup == true` (not only the on-transition)
- Template: price above rising 50/150/200 stack (50>150>200), within 25% of 52w high, ≥30% above 52w low (Minervini; was 25% until 2026-09-26), RS ≥70
- RS is weighted 40/20/20/20 vs **SPY** mapped 1–99 — approximation, **not** official IBD percentile
- Owner Pine: `data/ibd-minervini-rs-setup.pine`
- Scanner: `npm run scan:ibd-setups` → `scripts/scan-ibd-setups.mjs` → `data/ibd-setups-alerts.json`
- Lightbox: `IbdSetups.tsx` how-it-works (education only)
- Members layout: first box under **Sub Scanners**; counts as the "IBD" condition in Bullish Setups

## Liquidity + commentary

```bash
npm run refresh:volume-breadth   # → data/volume-breadth-stub.json (+ tv-history)
npm run refresh:commentary       # → data/commentary.json (headline / paragraphs / whatToDo)
```

Members Decide “What to do” loads `data/commentary.json` via `loadCommentary()` — no hardcoded Amber copy.

## After prepare

Deploy is separate (owner-approved):

```bash
npm run deploy
```

### Post-deploy checks

Members-only chart JSON must never be public. Both must return **404** (not 200 / JSON):

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://canarydashboard.com/_chartdata/index.json          # ticker charts → 404
curl -s -o /dev/null -w "%{http_code}\n" https://canarydashboard.com/_chartdata/canary/index.json   # canary charts → 404
```

## Weekly Market State = owner Pine on weekly bars (Weekly State + Bullish & Strong)

- Scanner: `npm run scan:market-state` → `scripts/scan-market-state.mjs` → `data/market-state.json` (every scanned ticker: `state`, `weeksInState`, `prevState`, `sinceWeek`, EMAs)
- Yahoo `interval=1wk`, `range=3y`. Yahoo's extra "live" bar (stamped with the latest trade time) is merged into its week (high=max, low=min, close=last) so the current in-progress week is one bar, like TradingView
- `src = ohlc4`; EMAs fast 9 / mid1 12 / mid2 16 / slow 21 (alpha 2/(n+1), seeded with SMA of first n — TV `ta.ema`)
- `down = ((f<m1) != (f<sl)) or ((m2<sl) != (f<sl))`; `bear = !down and f<sl`; `bull = !down and !bear` → white / blue / black background
- `weeksInState` = consecutive weekly bars (incl. current) in the current state; `historyCapped=true` when the run reaches the first defined bar (count is a floor)
- **Weekly State** box: bull (🟢) and bear (🔴) with `weeksInState ≤ 3`, dots = min(weeks,3); bulls first ordered 3→2→1, then bears 3→2→1
- **Bullish & Strong** box: all bull, sorted by `weeksInState` desc; 🟢🟢🟢 at ≥3 weeks
- Current week is in-progress: state can flip before the weekly close
- Lightbox opens a weekly TradingView chart (`TickerLink interval="W"`)

## Monthly 20MA = monthly close cross above SMA20

- Scanner: `npm run scan:monthly-20ma` → `scripts/scan-monthly-20ma.mjs` → `data/monthly-20ma-alerts.json`
- Yahoo `interval=1mo`, `range=5y` (needs ≥21 months; names with less history are skipped + counted in `failed`)
- `this_month`: current (in-progress) month close > SMA20 and prior month close ≤ prior SMA20
- `last_month`: last completed month crossed and the current month is still above its SMA20 (tagged "last month" in the box)
- Box shows ticker, close, SMA20, % above; lightbox opens a monthly chart (`TickerLink interval="M"`)
- Shared helpers (universe loader, Yahoo period-bar fetch/merge): `scripts/lib/scan-common.mjs` (MFI Scan imports its universe loader from here)

## Main Scanner = Bullish Setups + Bearish Setups (2+ conditions, at least one a recent timing print)

- Members layout: **Main Scanner** label → Bullish Setups (left) | Bearish Setups (right), stacked on mobile. Then **Sub Scanners** label → IBD Setups, Weekly State, Bullish & Strong, Monthly 20MA, Fish, Sweaty, MFI Scan, ETF Watch, Crypto Watch
- Rules: `src/lib/setupsCore.mjs` — imported by the members page (`src/lib/mainScanner.ts`) **and** `scripts/refresh-setups-history.mjs`, so page and pack report use identical logic on the same pack data, as-of = pack `sessionDate`
- **Rule (v2, audit P1 2026-09-25):** ≥2 conditions **and** ≥1 **timing print** within 14 calendar days of as-of (`SETUPS_RULES_VERSION = 2`)
- **Bullish** (each once): timing 🐟 Fish (equity Fish box fish/both) · 😊 Smiley (Fish box smile/both or ETF Watch smile) · 🤑 MFI ≤20; plus 🟢 weekly Market State bull (white + dots = ONE condition) · 📈 Monthly 20MA (this or last month) · IBD Setups box — these three count toward the total but can't qualify a ticker on their own
- **Bullish excludes Bearish (owner 2026-09-25):** a ticker that also qualifies for Bearish Setups on the same as-of is left out of Bullish Setups; Bearish keeps it. Done in `computeMainScanner` (shared by the page and `refresh-setups-history.mjs`). Left-out tickers are listed in `setups-history.json` → `excludedFromBullish` and manifest `mainScanner.excludedFromBullish`, and drop out of the bullish history (added date resets on re-entry). Bullish popup: "Tickers that also meet Bearish Setups are left out."
- **Bearish** (each once): timing 😡 MFI ≥80 · 🥵 Sweaty · 💀 Skull; plus 🔴 weekly bear (one condition, can't qualify alone)
- Per-kind print dates: explicit `${kind}AsOf` fields first (`smileAsOf`, `fishAsOf`, `exhaustionAsOf`, `skullAsOf`), then note tags (`smile@…`, `🐟@…`, `🥵@…`, `💀@…`), else row asOf. MFI uses the 14-day `prints` history plus current rows
- Chips show condition icons only (no per-condition dates), a count, and one **added** date
- **Added date** = date the ticker first qualified under v2: the later of (2nd-earliest condition date, earliest timing-print date). Condition dates: prints → earliest in-window print; weekly → first week of the weeks-in-state run; Monthly 20MA → first day of the cross month; IBD → IBD scan date
- **History:** `data/setups-history.json` (mirrored to `/home/box/canaries/`, carries `rulesVersion`). Each nightly pack keeps a ticker's original added date while it stays qualified; a drop-out (e.g. no timing print left in the window) is removed so its date resets on re-entry. A history written under a different `rulesVersion` is discarded, so v1-only tickers leave the list
- Sort: condition count desc, then added date desc (newest first), then ticker
- Manifest: `mainScanner.bullishSetups` / `mainScanner.bearishSetups` (ticker, count, conditions, added) + `excludedFromBullish`. A standalone `refresh-setups-history.mjs` run refreshes the manifest block when its `sessionDate` matches

## Step 8i: Indicator buyers backup (owner approved 2026-10-14)

- **Script (non-fatal, runs inside the pack):** `scripts/export-indicator-buyers.mjs` makes a read-only SELECT on remote D1 and writes `/workspace/backups/indicator-buyers/indicator-buyers-YYYY-MM-DD.csv` + `latest.csv`. These files are OUTSIDE the repo, so they are never deployed or committed, and they have 0600 permissions. If the grant-task table (0008) isn't on remote yet, the script falls back to orders only. On failure the pack continues and the manifest records `indicatorBuyers.ok=false`.
- **Agent step after the pack (post-close routine):** if `indicatorBuyers.ok` and `latest.csv` has data rows, mirror it to the owner's private Google Sheet **"Canary Indicator Buyers"**, id `1t5yERtBuQxCdJksfZeL6tCw-eBLZnYLynQrs53p6G8s`, tab `Buyers`:
  1. Read `latest.csv`.
  2. Clear `Buyers!A2:J`, using `user-Google-sheets` batch_clear_values.
  3. `write_range` from A1 with every row, header included (parseInput=false, so values are stored literally).
  - Never share the Sheet. It is owner-only and was verified as such on 14/10/2026. Skip the step if there are 0 buyers or the CSV is missing, and note it in the run summary.
- **Owner UI:** `/owner/indicators` (list, Mark granted, Download CSV).
