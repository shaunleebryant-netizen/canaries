# UX preview (t733u): Today strip · Folded boxes · Pessimism Board
PREVIEW ONLY, not deployed. Education only, no return claims.

## Pessimism Board (`scripts/build-pessimism-board.mjs` → `data/pessimism-board.json`)
Universe: every stock in data/growth-score.json (198). Yahoo 1y daily bars, cut at the pack as-of.
- Washed out: ≥25% below the 52-week high AND (RSI(14, Wilder) ≤ 35 on any of the last 5 sessions OR a close below the lower Bollinger band (20, 2σ) in the last 5).
- Healthy: 12-month revenue growth > 0, Canary Score ≥ 40, not Danger, not partial.
- Rank: % off high + (50 − lowest 5-day RSI) + 5 if below the lower band.
- Turning: close back above the 20-day average after being below it in the last 5 sessions, or Fish/Smile (fish-alerts) or MFI (money-flow-alerts) fired in the last 5 sessions.
Nightly: run `node scripts/build-pessimism-board.mjs` after the scans and fundamentals.

## Today strip, "3 worth a look"
1. Bullish Setups that are also on the Pessimism Board, Turning first, then by Canary Score.
2. Fill: other Bullish Setups with a Canary Score of 40+ and no Danger flag, by mark count, then by score.
"Since last session": Decide S vs state.prev.json; new Setups = setups-history `added` == as-of. Drop-offs need a saved prior list (not in pack yet).

## Folded boxes
`src/components/FoldBox.tsx`: one-line summary, tap to open, state in localStorage `canary.fold.<id>`; collapsed by default. The strip and the Pessimism Board are always open.
