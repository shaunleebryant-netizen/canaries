# Archived: unused regime engine (2026-09-25)

Retired by owner-approved audit item P3. Nothing in `src/` read these files
once the Regime box moved to v2 (`src/lib/regime/computeRegime.ts` computed from
`data/state.json` canary scores and `data/regime-history.json`).

| File | Was |
|------|-----|
| `data/regime-state.json` | Old scored daily closes, stamped by full-pack step 2 |
| `data/regime-stub.json` | Old v1 regime stub (only its `asOf`/`draft` were still read by `loadRegime.ts`) |
| `scripts/compute-regime.ts` | Old Yahoo raw → `scoreRegime` writer |
| `src/lib/regime/scoreRegime.ts` | Old v1 scoring engine |

Kept live: `src/lib/regime/computeRegime.ts`, `data/regime-history.json`.
Not deleted; restore with `git mv`/`mv` if ever needed.
