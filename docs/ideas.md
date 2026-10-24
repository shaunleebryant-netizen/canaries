# Ideas (preview, not shipped)

Built by `scripts/build-ideas.mjs` → `data/ideas.json`, rendered by `src/components/ideas/IdeasSection.tsx` right under the Today strip on `/members`.
Education only. Rough chart levels for study, not advice. No return claims. Dates are shown DD/MM/YYYY. Every number comes from data files or Yahoo daily bars, and none are invented.

## Inputs
- **Prices:** Yahoo 1y daily bars with adjusted close (`events=split`) for 25 sector ETFs, SPY, every Canary Score ticker and every Setups ticker. Only bars up to `asOf` are used.
- **Emojis:** a signal counts if it fired in the last 5 sessions. The sources are `fish-alerts` (🐟 Fish, 🙂 Smile), `money-flow-alerts` (💵 MFI) and `exhaustion-alerts` (🥵 Sweaty, 💀 Skull).
- **Setups:** `setups-history.json`, Bullish and Bearish, with the conditions count.
- **Canary Score (gs), Rev Growth (rg) and the danger flag:** `growth-score.json`.
- **Pessimism Board:** `pessimism-board.json`.
- **Sector strength:** score = 0.6 × (4-week return − SPY) + 0.4 × (1-week return − SPY), in percentage points, ranked 1 to N. This uses the same method as `owner-weekly-preview`, and the same ticker→sector map.
- **Light and regime:** `state.json` composite light, and `commentary.json` inputs.regime.

## Play types and levels (ATR = 14-day ATR)
| Side | Play | Trigger | Entry zone | Wrong if | Target |
|---|---|---|---|---|---|
| Long | Bounce | 🐟 or 💵 in 5d, RSI ≤ 40 within 5d, close ≤ 10-day low +10% | 10d low → +1 ATR | 10d low − 0.5 ATR | prior 20-day high (or +2 ATR if that is too close) |
| Long | Pullback | 50d > 200d, close within 3% of 20d or 50d | MA ± 0.5 ATR | min(50d − 1 ATR, MA − 1 ATR) | 60-day high (else +3 ATR) |
| Long | Breakout | close above a 20-day pivot (base ≤ 15% deep), above 50d | pivot → +0.5 ATR | pivot − 1 ATR | measured move (pivot + base depth) |
| Long | Early leader | RS line vs SPY at a 1y high while price ≥ 3% under its high, above 50d | close − 0.5 ATR → close | 50d − 0.5 ATR | prior 52w high |
| Short | Breakdown | close below the prior 20-day low, below 50d | pivot − 0.5 ATR → pivot | pivot + 1 ATR | pivot − min(base height, 3 ATR) |
| Short | Failed bounce | below 50d < 200d, 5d high reached the 20/50d, close back under the 20d | close → lower MA | upper MA + 0.5 ATR | 20-day low |
| Short | Rolling over | 🥵 or 💀 in 5d, RSI ≥ 65 within 10d, close < 20d | close → +0.5 ATR | 10d high + 0.25 ATR | 50d (else −2.5 ATR) |
| Short | Fading sector | Bearish Setup in a bottom-3 sector, close < 20d | close → 20d | 20-day high | 60-day low |

**The Target column above is replaced by a single target method used for both sides** (revised 24/10/2026):
- Reference price = the 23/10 close, clamped into the entry zone.
- ATR target = reference + 2×ATR for Longs, or reference − 2×ATR for Shorts.
- Swing cap: if the nearest swing level in the trade direction is closer than the ATR target, it becomes the target. For Longs that is the 10/20/60-day high, for Shorts the 10/20/60-day low, and the level must be at least 1 ATR from the reference. The card shows which basis was used.
- R:R = reward ÷ risk, both measured from the reference price, where risk is the distance to the wrong-if level from the pattern stop. Ideas with R:R below 1 are dropped.
- Ratios therefore depend on where tonight's close sits inside the zone, and on whether a swing level caps the target. The most a target can be is 2 ATR.
- Longs are skipped for names with the Canary danger flag.

## Gates
Sector first, with no exceptions (revised 24/10/2026):
- **Longs:** only from leading sectors, ranks 1–13 of 25.
- **Shorts:** only from fading sectors, ranks 14–25.
- **Unmapped tickers** (ETFs, a few names) are dropped from both sides.
- **The same sector can't feed both lists.**
- **Red light:** Longs are limited to Bounce plays.
- **Filtered out (internal only, not shown):** every play dropped by these rules (or by red-light Bounce-only) appears with its reason in the folded list under the two Ideas lists.

## Score (one ranked list per side, best play per ticker)
- **Long:** 2×Bullish conditions − 2×Bearish conditions + (🐟 🙂 💵 count) − (🥵 💀 count) + gs/20 + rev growth term (+1 if > 20%, −1 if < 0) + sector term (0–3) + min(R:R, 4)×0.5 + 2 if on the Pessimism Board and Turning.
- **Short:** the mirror image: (100 − gs)/25, +1 if rev growth < 0, and −2 if on the Pessimism Board, because washed-out names make poor shorts.

## Regime order
- **Red or RISK_OFF:** Shorts listed first. Longs are limited to Bounce. A banner tells members to size small.
- **Green:** Longs listed first, with Pullback and Breakout promoted.
- **Amber:** balanced, side by side.

## Tidy-ups
- Rev growth above +300% is shown as "300%+ (small base)", both in Ideas and on the Pessimism Board.
- % off high uses adjusted closes and highs. Raw and adjusted values are both kept. If they differ by more than 5 percentage points, the idea gets `splitCheck` and a ⚠ split flag. Run of 23/10/2026: 0 flagged.

## Track record
- `scripts/log-ideas.mjs` runs nightly after build-ideas and writes `data/ideas-log/YYYY-MM-DD.json` (ticker, side, play, entry zone, wrong-if, target, R:R, light).
- `scripts/score-ideas.mjs` scores each logged idea at 5, 20 and 60 trading days and writes `data/ideas-scores.json`. It records:
  - the % move from mid-entry, signed by side
  - whether the wrong-if level was touched first
  - whether the target was touched first
- The "How past ideas played out" panel shows hit rates by play type and by light. A rate only appears once a group has 20 or more scored ideas. Until then the panel shows "Collecting since DD/MM/YYYY". The example-layout row is labelled as example and contains no numbers.

## Watchlist alerts
- **Migration:** `migrations/members/0010_watchlist_alerts.sql` creates `member_watchlist(user_id, ticker, created_at)` and `member_alert_prefs(user_id, mode instant|daily|off, default daily)`. It has been applied **locally only**.
- **API:** `GET/POST/DELETE /api/members/watchlist` and `GET/POST /api/account/alert-prefs`. Both need a signed-in account session. In stub or preview mode, the star button falls back to localStorage.
- **Script:** `scripts/watchlist-alerts.mjs --dry-run [--sample]` runs after the nightly pack. For each starred name it finds three events: the name entered Ideas tonight, it got a new Setup (added == asOf), or it crossed the wrong-if level of a previously logged idea. It builds one digest per member, skips members with alerts set to off, and writes a sample to `/workspace/ux-preview-shots/alert-email-sample.html`.
- `--send` exits with an error, and Resend is never called. Ship day needs owner approval, a Resend send path and `--remote` migration.

## Member-facing UI changes (24/10/2026, owner t739u)
- The Pessimism Board fold box has been removed from /members, Stocks tab included, along with the folded "Filtered out" list.
- Both still feed the build internally. `pessimism-board.json` feeds Bounce ideas and the Long score, and `data/ideas.json` keeps its `filtered` array for audit. Neither is shown to members.
- No member-facing text mentions the Pessimism Board. The Today strip reason now reads "Bullish Setup, washed out".
- Sector-first filtering is unchanged.
