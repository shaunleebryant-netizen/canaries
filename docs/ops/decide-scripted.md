# Decide — scripted nightly points score

**For Scorekeeper.** Owner-approved 2026-09-25 (audit P2). This replaces the weekly hold of `state.json`: the Decide board is now scored every night by script. Scorekeeper fills **only FINRA and any failed feed**.

- Script: `scripts/refresh-decide.mjs` (full-pack step 2, `npm run refresh:decide -- --session-date YYYY-MM-DD [--dry-run]`)
- Rules version: `decide-points-v1-2026-09-25` (in `state.json` → `scoring.rulesVersion`)
- Writes: `data/state.prev.json` (previous file, saved first) → `data/state.json`, `data/regime-history.json`, `data/canary-sparklines.json`, all mirrored to `/home/box/canaries/`

## Weights (locked, unchanged)

From `weights.md` / `roster.md` (Option B). The script refuses to run if a row's weight drifts. **Composite S = Σ wᵢ·sᵢ over all 13 inputs** (rounded to 3 dp).

| Input | Weight | Input | Weight |
|---|---|---|---|
| cyclical-defensive | 0.0935 | sp600 (`^SP600` index) | 0.068 |
| xlf-kre | 0.0765 | rsp (price) | 0.068 |
| vix-vix3m (old VIX/US10Y slot) | 0.1135 | vix-vvix | 0.0565 |
| nyse-ad (NSHF) | 0.085 | finra-margin | 0.068 |
| pct-above-200dma (MMTH) | 0.0935 | qqq-sma20 | 0.08 |
| es1-jp30 (TVC:JP30 bond price, roll-adjusted) | 0.0595 | hyg-ief-sma20 | 0.07 |
| sp-top-50 (XLG) | 0.068 | **Sum** | **1.000** |

**Light (unchanged):** Green S ≥ +0.6 · Amber −0.3 ≤ S < +0.6 · Red S < −0.3.
**Veto (owner lock 2026-09-19):** VIX/VIX3M ≥ 1.00 AND NYSE A–D sick (≤ −1) AND MMTH sick (≤ −1) → cannot be Green.

## The points rule

For one series on the session date:

- **value** vs **SMA20** (20-session simple mean) → **+1 above / −1 below**
- **±2** when the **SMA20 slope over 5 sessions** (SMA20 today − SMA20 5 sessions ago) **and** the **9-session change** (close today − close 9 sessions ago) both agree with that side
- **Inverse inputs** (higher = worse, VIX-type): sign flipped

`rubric.md` / `read-rules-owner-2026-09-08.md` is used wherever it defines an input; the points rule only fills in where the rubric left the call to judgement (mostly the size of the score: ±1 vs ±2).

## Per input

| Input | Rule in code | Source |
|---|---|---|
| cyclical-defensive | (XLK+XLY)/(XLP+XLU) — points rule (rubric's "+2 if clearly rising through SMA20" = slope + 9d agree) | Yahoo |
| xlf-kre | Each leg vs its own SMA20 (rubric). Both above → +1, both below → −1, split → 0. ±2 only when **both** legs score ±2 on the points rule | Yahoo XLF, KRE |
| vix-vix3m | Ratio bands (owner lock): **< 0.91 SAFE +2 · 0.91–0.95 CAUTION 0 · ≥ 0.96 DANGER −2** (0.95–0.96 stays CAUTION, as `bandFromMediumRatio`) | Yahoo `^VIX` ÷ `^VIX3M` |
| nyse-ad | **SMA20 of NSHF vs 0** (owner lock) → ±1; ±2 when the SMA20's 5-session slope and its 9-session change both agree. Raw print is cross-check only | TradingView guest `INDEX:NSHF` |
| pct-above-200dma | MMTH level (rubric): > 65 CONTRARIAN_HOT → 0 · 50–65 → +1 · 37–50 → −1 · ≤ 37 CONTRARIAN_WASHED → +1. ±2 inside 50–65 / 37–50 when the points rule on MMTH is ±2 the same way | TradingView guest `INDEX:MMTH` |
| es1-jp30 | ES ÷ JP30 bond price (rubric): rising (9d chg) **and** above SMA20 → +1; falling **and** under → −1; otherwise 0. ±2 when the SMA20 slope agrees too. JP30 is back-adjusted for benchmark rolls (see Data notes) | Yahoo `ES=F` ÷ TradingView guest `TVC:JP30` (+ `TVC:JP30Y` for roll detection) |
| sp-top-50 | XLG price — points rule | Yahoo XLG |
| sp600 | `^SP600` **index** (not SPSM/IJR) — points rule | Yahoo `^SP600` |
| rsp | RSP price (not RSP/SPY) — points rule | Yahoo RSP |
| vix-vvix | VIX level (rubric): < 19 → +1, > 19 → −1. ±2 when the **inverse** points rule on VIX agrees. > 30 CONTRARIAN_FEAR / < 15 CONTRARIAN_COMPLACENT are flags only. VVIX is not shown or scored (owner 2026-10-10; close kept in evidence.extra only) | Yahoo `^VIX` |
| finra-margin | MoM rising → +1 / falling → −1 (rubric). **Manual + monthly — always held until filled** | Scorekeeper |
| qqq-sma20 | Close vs SMA20 → **±1 only** (rubric is exact) | Yahoo QQQ |
| hyg-ief-sma20 | HYG ÷ IEF vs SMA20 → **±1 only** (rubric is exact) | Yahoo HYG, IEF |

Each row in `state.json` → `canaries[]` carries `evidence` {source, date, value, sma20, sma20Slope5, change9, text}, `fresh`, `heldSince`, `asOf`, plus the usual `lastReading` / `rationale` / `oneSentenceRead`.

### Data notes

- Yahoo daily closes are capped at `--session-date`. For futures (ES=F) the first bar per NY date wins, because Yahoo appends the next trade date's live bar on today's NY evening.
- TradingView guest series use the same WebSocket as `USI:UVOL` (`scripts/tv-guest-series.py`). `TVC:JP30` trades a 17:00→17:00 NY session, so a bar is dated to its trading day (start ≥ 12:00 local → next day). Without that, JP30 would be one day early.
- **JP30 benchmark rolls (added 2026-10-10, first live on the Tue 13 Oct 11:24 AM NZ run).** `TVC:JP30` is the *generic* Japan 30y benchmark bond **price**. About once a quarter (around the 8th–10th of Jan/Apr/Jul/Oct) it switches to a newly issued bond with a different coupon and maturity, so the price jumps with no market move. Example: 2026-10-09 it moved to the new 4.20% Sep-2056 bond, 97.473 → 101.946 (+4.59%), while the yield (`TVC:JP30Y`) only fell 13.5bp (≈ +2.29% in price). The SMA20 was still built on the old bond, which put es1-jp30 1.4% "under" its SMA20 and made the 9-day change −2.02 instead of −0.29.
  - **Fix:** `jp30Continuous()` in `scripts/lib/decide-series.mjs`, used by both `refresh-decide.mjs` (score + sparkline) and `build-canary-charts.mjs` (chart). For each day it compares the actual price change with the yield-implied change (−ModDur·Δy, where ModDur is a 30y semi-annual par bond at that yield, ≈ 17). If they differ by **> 1.0%**, the day is a roll. Normal days have a median gap of about 0.08%; past rolls were 1.6–7.6%. On a roll, every earlier price is multiplied by `new ÷ (old × (1 + implied))`, which back-adjusts the series like a continuous futures contract. Recent bars stay the real new-bond quote, so `lastReading` still shows the real price. The score and charts use the adjusted series.
  - **Evidence:** `evidence.extra.jp30Rolls` lists the last rolls (date, from → to, price % vs yield-implied %, factor). The rationale ends with "JP30 benchmark roll YYYY-MM-DD (…→…, back-adjusted ×f)".
  - **Fallback when `TVC:JP30Y` is unavailable:** a day-on-day price gap of more than 2.5% is treated as a roll. History before it is dropped, and the seat is marked **UNVERIFIED with score 0, heldSince = roll date** until the new bond has 26 sessions (the SMA20 plus the 5-day slope plus the 9-day change). This replaces a fake ±1. A missing JP30Y is **not** a fetch error for the pack.
  - **Rolls detected in the last ~600 sessions:** 2024-07-05, 2024-10-09, 2025-01-10, 2025-04-09, 2025-07-04, 2025-10-08, 2026-01-09, 2026-04-08, 2026-07-08, 2026-10-09.

## Held inputs, `needsFill` and Scorekeeper fills

If a feed fails, or its last bar is before the session date, the input **keeps its last score and reading**, gets `status: "HELD"`, `fresh: false`, `heldSince: <last refreshed date>`, and is listed in `needsFill` (in `state.json` and `data/full-pack-manifest.json`). The page shows "held since YYYY-MM-DD". Nothing is invented and held values are never re-stamped with the pack date.

**To fill** (FINRA each month, or a failed feed), write `/home/box/canaries/decide-fills.json`:

```json
{
  "finra-margin": {
    "score": 1,
    "asOf": "2026-10-21",
    "lastReading": "Sep-26 1,470,000 ($mm); MoM up vs Aug-26 1,453,832",
    "rationale": "MoM rising → +1.",
    "oneSentenceRead": "Latest official margin debt is higher month-over-month.",
    "source": "FINRA margin statistics (Sep-26 release)"
  }
}
```

The next pack uses a fill when its `asOf` is newer than the input's `heldSince`. A fill only replaces an input the script could not score; scripted inputs always win.

## Regime box v2 (locked, unchanged)

Computed by `src/lib/regime/computeRegime.ts` on the new scores:

- **R** = votes of QQQ20, Cyc/Def, VIX/VIX3M (band vote), HYG/IEF. **R ≥ 2 RISK_ON · R ≤ −2 RISK_OFF · else MIXED.**
- **Spec** from A–D + SP600: FULL / HALF / OFF; QQQ −1 or VIX3M −1 forces OFF.
- The pill changes only after **2 sessions in a row**. `regime-history.json` stores the shown state, the pending state/count and `priorDay` (the state before tonight), so rerunning the same session gives the same answer.

## Commentary

`scripts/refresh-commentary.mjs` (pack step 8b) runs after the scorer and reads the new `composite.S` / `light` / `regimeV2`.

## Retired

- `yahooRescoreFormulaSeats` (the old partial QQQ + HYG/IEF re-score) is removed from `refresh-full-pack.mjs`.
- `scripts/refresh-state.sh` (copying Scorekeeper's mirror over `data/state.json`) is no longer in the pack. Keep it only for a manual restore.
