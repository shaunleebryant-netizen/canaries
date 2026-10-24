#!/usr/bin/env bash
# LEGACY (retired from the full pack 2026-09-25): Decide is now scored nightly by
# scripts/refresh-decide.mjs. Use this only to restore a Scorekeeper state.json by hand.
# Refresh site flock data from Scout/Scorekeeper source of truth.
# Run after each rescore. Local only — does not deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${CANARY_STATE_SRC:-/home/box/canaries/state.json}"
DEST="$ROOT/data/state.json"
if [[ ! -f "$SRC" ]]; then
  echo "Missing source: $SRC" >&2
  exit 1
fi
cp "$SRC" "$DEST"
echo "Copied $SRC → $DEST"
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); c=d.get(\"composite\") or {}; print(f\"fixture={d.get(\"fixture\")} packMark={d.get(\"packMark\")} S={c.get(\"S\")} light={c.get(\"light\")} asOf={d.get(\"asOf\")}\")" "$DEST"
