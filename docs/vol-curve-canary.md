# Vol Curve Canary (DRAFT)

Education only. The Vol Curve card is a sizing/checklist stub under **MarketRegime**. It remains `draft: true`; do not deploy.

## Input and stance bands

The card uses the spot **VIX / VIX3M** ratio only. Missing prints stay `PENDING`; no values are invented.

| Ratio | Stance | Sizing hint |
|------:|--------|-------------|
| `< 0.91` | **SAFE** | Full size in the draft policy. |
| `0.91–0.95` inclusive | **CAUTION** | Trim tactical / short-vol / overnight risk; core hold. |
| `≥ 0.96` | **DANGER** | Reduce risk; defense / optional long-vol only. |

The gap between 0.95 and 0.96 remains in the lower band until the 0.96 danger tripwire.

The ratio is a sizing aid, not a top call. Slope chips (recent rises, moving averages, and EMA 5>20 when enough history exists) provide context only.

## Optional credit confirm

The existing HYG/IEF chip is retained as an optional confirmation:

- HYG/IEF below its MA or rolling over while VIX/VIX3M climbs through 0.91 → **Confirming**.
- VIX/VIX3M elevated while HYG/IEF remains strong → **Fighting**.
- Otherwise → **Quiet** (or **Pending** when the feed is missing).

Credit does not create another stance or flock score.

## Checklist

1. VIX/VIX3M — ratio, stance band, and 5-day change.
2. HYG/IEF — optional credit confirmation.

## Data and placement

- `data/vol-curve-stub.json` — written nightly by `scripts/refresh-vol-curve.mjs` (full-pack step 1) from Yahoo `^VIX` / `^VIX3M` daily closes; `held: true` + `heldSince` if Yahoo fails (never re-stamped).
- `src/lib/volCurve/computeVolCurve.ts` — pure VIX/VIX3M computation.
- `src/lib/loadVolCurve.ts` — loads the draft stub without inventing prints.
- `src/components/VolCurveCanary.tsx` — card rendered beneath MarketRegime.
