# Canary live weights — 13-seat (OWNER LOCKED 2026-09-19 Option B)

> Owner lock 2026-09-19 **Option B**: drop binary **VIX curve** seat. Keep **VIX / VIX3M** (ratio) + **VIX + VVIX**. Original 11 × **0.85**, plus QQQ vs SMA20 **0.08** and HYG/IEF vs SMA20 **0.07**. Then tip **0.02** from VIX+VVIX into VIX/VIX3M. Sum **1.00**.
>
> VIX/VIX3M bands (Vol-curve stub + seat-3 scoring): **&lt;0.91 SAFE · 0.91–0.95 CAUTION · ≥0.96 DANGER**. No VIX9D bird.
>
> Prior: 14-seat regime stub (2026-09-18); US10Y → VIX/VIX3M seat rename earlier 2026-09-19.

Score logic for flock seats unchanged except seat-3 read rules. Missing feeds → score 0, status UNVERIFIED, contribution 0 (do not block). Apply on next Wed VERIFIED pack — no midweek invent/rescore.

## Per-canary weights

| Canary | \(w_i\) |
|--------|--------:|
| (XLK+XLY) / (XLP+XLU) | 0.0935 |
| XLF and KRE | 0.0765 |
| VIX / VIX3M | **0.1135** |
| NSHF + NYSE Adv–Dec | 0.0850 |
| MMTH (% above 200-day) | 0.0935 |
| ES1! / JP30 (JP30 = TVC:JP30 bond **price**) | 0.0595 |
| XLG | 0.0680 |
| SP600 | 0.0680 |
| RSP (price, not RSP/SPY) | 0.0680 |
| VIX and VVIX | **0.0565** |
| FINRA margin debt | 0.0680 |
| QQQ vs SMA20 | 0.0800 |
| HYG / IEF vs SMA20 | 0.0700 |
| **Total** | **1.0000** |

## Seat rules (add-ons + seat 3)

| Canary | Score | Read |
|--------|-------|------|
| VIX / VIX3M | Map ratio bands → score via rubric (SAFE / CAUTION / DANGER). | Medium vol curve. |
| QQQ vs SMA20 | +1 if QQQ close > SMA20 else −1 | Fast Nasdaq trend. |
| HYG / IEF vs SMA20 | +1 if HYG/IEF ratio above its 20-day SMA else −1 | Credit risk appetite. |

**Dropped:** binary “VIX curve” (0.08) — same feeds as seat 3; was double-count.

## Composite S (traffic light / CanaryTable)

Weighted sum of all **13** Option B seats above. Unchanged. Regime box does **not** drive S.

## Regime box v2 (members stub — draft)

**Separate from S.** Six inputs only — not a dump of all 13 / not the old C bands.

| Role | ids |
|------|-----|
| Core → R | `qqq-sma20`, `cyclical-defensive`, `vix-vix3m`, `hyg-ief-sma20` |
| Spec gates | `nyse-ad`, `sp600` |

**Votes:** each seat +1 / 0 / −1 (score ≥1 → +1, ≤−1 → −1, else 0). VIX/VIX3M prefers vol-curve band when ratio present: SAFE→+1, CAUTION→0, DANGER→−1.

**R** = sum of 4 core votes ∈ [−4, +4]

| Band | Condition |
|------|-----------|
| RISK_ON | R ≥ +2 |
| MIXED | −1 ≤ R ≤ +1 |
| RISK_OFF | R ≤ −2 |

Hysteresis: `stateShown` (regime pill) flips only after **2 consecutive sessions** in the new band. Spec has **no** hysteresis.

**Spec** (after raw regime):

| Level | Rule |
|-------|------|
| FULL | RISK_ON and A–D ≥ 0 and SP600 ≥ 0 |
| HALF | RISK_ON and exactly one of A–D / SP600 ≥ 0 |
| OFF | MIXED or RISK_OFF, **or** QQQ20 = −1, **or** VIX/VIX3M = −1 (one-session flip) |

Leave out of box (table only): MMTH, XLG, RSP, VIX+VVIX, XLF+KRE, ES1/JP30, FINRA.

## Green veto

**VIX/VIX3M ≥ 1.00** AND NYSE A-D sick AND MMTH sick → light cannot be green (replaces former US10Y >4.5).
