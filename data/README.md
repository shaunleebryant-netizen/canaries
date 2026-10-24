# Site flock state

Copied from Scout/Scorekeeper source of truth:

```bash
cp /home/box/canaries/state.json data/state.json
# or
./scripts/refresh-state.sh
```

Re-copy after each Scout/Scorekeeper rescore. Local only — no deploy.

Do not invent scores; prefer fields written into the live JSON (composite, packMark, renormalization, per-canary status / weightEffective).

## Market regime (draft)

`regime-state.json` / `regime-stub.json` — ARCHIVED 2026-09-25 to `archive/regime-engine-2026-09-25/` (unused). Market Regime v2 uses `state.json` scores + `regime-history.json` (written by `scripts/refresh-decide.mjs`).
Do **not** deploy until owner review.
