# Site flock state

Copied from Scout/Scorekeeper source of truth:

```bash
cp /home/box/canaries/state.json data/state.json
# or
./scripts/refresh-state.sh
```

Re-copy after each Scout/Scorekeeper rescore. Local only — no deploy.

Do not invent scores; prefer fields written into the live JSON (composite, packMark, renormalization, per-canary status / weightEffective).
