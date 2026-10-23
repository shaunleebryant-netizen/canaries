# RETIRED — old MFI zone scan (archived 2026-10-06)

Owner 2026-10-06: "for mfi, update to this code and discard old. ensure future updates uses this mfi instead."

- `scan-money-flow.mjs`: old engine (latest daily MFI(14) ≤ 20 → 💵 buy zone, ≥ 80 → 🍒 caution zone).
- `money-flow-mfi-bottom-finder.pine`: old Pine reference ("MFI Bottom Finder").
- `money-flow-alerts.last-old-engine-2026-10-05.json`: the last box output from the old engine.

Do NOT run or re-wire these. The canonical engine is **MFI Washout v6**:
- Pine: `/home/box/canaries/pine/mfi-washout-v6.pine` (repo copy `data/mfi-washout-v6.pine`)
- Port: `scripts/lib/mfi-washout-v6.mjs`; scanner `scripts/scan-mfi-washout.mjs` (npm `scan:mfi`)
