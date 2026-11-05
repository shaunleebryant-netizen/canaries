#!/usr/bin/env python3
"""Build data/ticker-tape.json for the sitewide header tape.

Reads the latest fish, exhaustion, and (if present) cci-fairy alert JSON.
Keeps N=5 tickers per emoji group. A missing file is skipped. Composite
light / S / sessionDate are copied from data/state.json so the client does
not need a live API. When the light is red or amber, a warning string is included.

Does not invent prints. On failure it exits non-zero without replacing
ticker-tape.json, so the previous file stays.

  python3 scripts/build-ticker-tape.py
  python3 scripts/build-ticker-tape.py --self-test
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
from pathlib import Path

N = 5

# Education only. Same sentences as src/lib/redCompositeNotice.ts.
RED_WARNING = (
    "Canary Composite Score is red (Risk-Off). "
    "New long entries are outside this dashboard's risk guidance. Education only."
)
AMBER_WARNING = (
    "Canary Composite Score is amber (cautious). "
    "Remain cautious. Trade with at most half the account. Education only."
)

# (emoji, label, tone, source)
GROUPS = (
    ("🙂", "Smile", "bull", "smile"),
    ("🐟", "Fish", "bull", "fish"),
    ("🥵", "Sweaty", "bear", "sweaty"),
    ("💀", "Skull", "bear", "skull"),
    ("🧚", "Fairy", "bull", "fairy"),
)

FAIRY_FILES = (
    "cci-fairy-alerts.json",
    "fairy-alerts.json",
    "cci-fairy.json",
)


def repo_root() -> Path:
    return Path(__file__).resolve().parent.parent


def load_json(path: Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def ymd(value) -> str:
    if not isinstance(value, str):
        return ""
    text = value.strip()
    return text[:10] if len(text) >= 10 and text[4:5] == "-" else ""


def signals_of(doc) -> list:
    if isinstance(doc, list):
        return [row for row in doc if isinstance(row, dict)]
    if isinstance(doc, dict):
        rows = doc.get("signals")
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]
    return []


def file_asof(doc) -> str:
    if isinstance(doc, dict):
        return ymd(doc.get("asOf")) or ymd(doc.get("sessionDate"))
    return ""


def kinds(row: dict) -> set[str]:
    found: set[str] = set()
    signal = row.get("signal")
    if isinstance(signal, str) and signal.strip():
        found.add(signal.strip().lower())
    extra = row.get("signals")
    if isinstance(extra, list):
        for item in extra:
            if isinstance(item, str) and item.strip():
                found.add(item.strip().lower())
    return found


def mark_date(row: dict, *keys: str) -> str:
    for key in keys:
        day = ymd(row.get(key))
        if day:
            return day
    return ymd(row.get("asOf"))


def ticker_of(row: dict) -> str:
    raw = row.get("ticker") or row.get("symbol") or row.get("t")
    if not isinstance(raw, str):
        return ""
    return raw.strip().upper()


def top_tickers(rows: list[tuple[str, str, int]]) -> list[str]:
    """rows: (date, ticker, file_index). Newest date first, then file order. N unique."""
    rows.sort(key=lambda item: (-_date_key(item[0]), item[2]))
    out: list[str] = []
    seen: set[str] = set()
    for _date, ticker, _idx in rows:
        if not ticker or ticker in seen:
            continue
        seen.add(ticker)
        out.append(ticker)
        if len(out) >= N:
            break
    return out


def _date_key(day: str) -> int:
    # YYYY-MM-DD sorts lexicographically; empty dates sort last via the negation of 0.
    return int(day.replace("-", "")) if len(day) == 10 and day[4] == "-" else 0


def collect(doc, want: str) -> list[tuple[str, str, int]]:
    rows: list[tuple[str, str, int]] = []
    for idx, row in enumerate(signals_of(doc)):
        ticker = ticker_of(row)
        if not ticker:
            continue
        got = kinds(row)
        if want == "smile":
            if got & {"smile", "both"}:
                rows.append((mark_date(row, "smileAsOf"), ticker, idx))
        elif want == "fish":
            if got & {"fish", "both"}:
                rows.append((mark_date(row, "fishAsOf"), ticker, idx))
        elif want == "sweaty":
            if got & {"exhaustion", "sweaty"}:
                rows.append((mark_date(row, "exhaustionAsOf"), ticker, idx))
        elif want == "skull":
            if "skull" in got:
                rows.append((mark_date(row, "skullAsOf"), ticker, idx))
        elif want == "fairy":
            # A dedicated fairy file may omit signal. Mixed files must name the mark.
            if not got or got & {"fairy", "cci", "cci-fairy", "godmother"}:
                rows.append((mark_date(row), ticker, idx))
    return rows


def read_optional(path: Path):
    if not path.is_file():
        return None, "missing"
    try:
        return load_json(path), "ok"
    except (OSError, json.JSONDecodeError) as exc:
        print(f"skip {path.name}: {exc}", file=sys.stderr)
        return None, "bad"


def composite_from_state(state: dict) -> dict:
    comp = state.get("composite") if isinstance(state.get("composite"), dict) else {}
    light_raw = comp.get("light")
    light = light_raw.strip().lower() if isinstance(light_raw, str) else ""
    S = comp.get("S")
    if isinstance(S, bool) or not isinstance(S, (int, float)):
        S = None
    session = ymd(state.get("sessionDate")) or ymd(state.get("asOf"))
    out: dict = {}
    if session:
        out["sessionDate"] = session
    if S is not None:
        out["S"] = S
    if light in {"green", "amber", "yellow", "red"}:
        out["light"] = "amber" if light == "yellow" else light
    # Band is the pack's own light. Do not recompute over a present light.
    if out.get("light") == "red":
        out["warning"] = RED_WARNING
    elif out.get("light") == "amber":
        out["warning"] = AMBER_WARNING
    return out


def build(root: Path) -> dict:
    data = root / "data"
    sources: list[tuple[str, object]] = []
    asofs: list[str] = []

    fish, fish_status = read_optional(data / "fish-alerts.json")
    exh, exh_status = read_optional(data / "exhaustion-alerts.json")
    fairy_doc = None
    fairy_name = None
    for name in FAIRY_FILES:
        doc, status = read_optional(data / name)
        if status == "ok":
            fairy_doc = doc
            fairy_name = name
            break
        if status == "bad":
            fairy_name = name
            break

    if fish_status == "ok":
        sources.append(("fish", fish))
        day = file_asof(fish)
        if day:
            asofs.append(day)
    if exh_status == "ok":
        sources.append(("exhaustion", exh))
        day = file_asof(exh)
        if day:
            asofs.append(day)
    if fairy_doc is not None:
        sources.append(("fairy", fairy_doc))
        day = file_asof(fairy_doc)
        if day:
            asofs.append(day)

    if not sources:
        raise SystemExit("no readable fish, exhaustion, or cci-fairy alert file; previous ticker-tape.json kept")

    state_path = data / "state.json"
    try:
        state = load_json(state_path)
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"state.json unreadable ({exc}); previous ticker-tape.json kept")
    if not isinstance(state, dict):
        raise SystemExit("state.json is not an object; previous ticker-tape.json kept")

    by_source = {name: doc for name, doc in sources}
    groups = []
    for emoji, label, tone, want in GROUPS:
        if want in {"smile", "fish"}:
            doc = by_source.get("fish")
        elif want in {"sweaty", "skull"}:
            doc = by_source.get("exhaustion")
        else:
            doc = by_source.get("fairy")
        if doc is None:
            continue
        tickers = top_tickers(collect(doc, want))
        if not tickers:
            continue
        groups.append({"emoji": emoji, "label": label, "tone": tone, "tickers": tickers})

    as_of = max(asofs) if asofs else ""
    doc = {}
    if as_of:
        doc["asOf"] = as_of
    doc.update(composite_from_state(state))
    doc["groups"] = groups
    doc["_sources"] = {
        "fish": fish_status,
        "exhaustion": exh_status,
        "fairy": fairy_name if fairy_doc is not None else "missing",
    }
    # _sources is for the pack log only — strip before write.
    return doc


def write_tape(root: Path, doc: dict) -> None:
    sources = doc.pop("_sources", None)
    dest = root / "data" / "ticker-tape.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(doc, indent=2, ensure_ascii=False) + "\n"
    tmp = dest.with_suffix(".json.tmp")
    tmp.write_text(payload, encoding="utf-8")
    tmp.replace(dest)
    counts = ", ".join(f"{g['emoji']} {len(g['tickers'])}" for g in doc.get("groups", [])) or "(no groups)"
    light = doc.get("light") or "—"
    print(f"wrote {dest} asOf={doc.get('asOf')} light={light} {counts}")
    if sources:
        print(f"sources fish={sources['fish']} exhaustion={sources['exhaustion']} fairy={sources['fairy']}")


def self_test() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        data = root / "data"
        data.mkdir()
        fish = {
            "asOf": "2026-11-02",
            "signals": [
                {"ticker": "AAA", "signal": "both", "asOf": "2026-11-02", "smileAsOf": "2026-11-02", "fishAsOf": "2026-11-01"},
                {"ticker": "BBB", "signal": "smile", "asOf": "2026-10-30", "smileAsOf": "2026-10-30"},
                {"ticker": "CCC", "signal": "fish", "asOf": "2026-11-02", "fishAsOf": "2026-11-02"},
                {"ticker": "DDD", "signal": "smile", "asOf": "2026-11-02", "smileAsOf": "2026-11-02"},
                {"ticker": "EEE", "signal": "smile", "asOf": "2026-11-02", "smileAsOf": "2026-11-02"},
                {"ticker": "FFF", "signal": "smile", "asOf": "2026-11-02", "smileAsOf": "2026-11-02"},
                {"ticker": "GGG", "signal": "smile", "asOf": "2026-11-02", "smileAsOf": "2026-11-02"},
                {"ticker": "HHH", "signal": "smile", "asOf": "2026-10-01", "smileAsOf": "2026-10-01"},
            ],
        }
        exh = {
            "asOf": "2026-11-02",
            "signals": [
                {"ticker": "SSS", "signal": "skull", "asOf": "2026-11-02", "skullAsOf": "2026-11-02", "signals": ["exhaustion", "skull"], "exhaustionAsOf": "2026-10-28"},
            ],
        }
        state = {"sessionDate": "2026-11-02", "asOf": "2026-11-02T20:00:00.000Z", "composite": {"S": -0.362, "light": "red"}}
        (data / "fish-alerts.json").write_text(json.dumps(fish), encoding="utf-8")
        (data / "exhaustion-alerts.json").write_text(json.dumps(exh), encoding="utf-8")
        (data / "state.json").write_text(json.dumps(state), encoding="utf-8")
        doc = build(root)
        smile = next(g for g in doc["groups"] if g["emoji"] == "🙂")
        fish_g = next(g for g in doc["groups"] if g["emoji"] == "🐟")
        assert doc["asOf"] == "2026-11-02", doc["asOf"]
        assert doc["sessionDate"] == "2026-11-02"
        assert doc["S"] == -0.362
        assert doc["light"] == "red"
        assert doc["warning"] == RED_WARNING
        assert smile["tickers"] == ["AAA", "DDD", "EEE", "FFF", "GGG"], smile["tickers"]
        assert "HHH" not in smile["tickers"]
        assert fish_g["tickers"][0] == "CCC"
        assert "AAA" in fish_g["tickers"]
        assert not any(g["emoji"] == "🧚" for g in doc["groups"])
        sweaty = next(g for g in doc["groups"] if g["emoji"] == "🥵")
        skull = next(g for g in doc["groups"] if g["emoji"] == "💀")
        assert sweaty["tickers"] == ["SSS"]
        assert skull["tickers"] == ["SSS"]

        state["composite"]["light"] = "green"
        state["composite"]["S"] = 0.73
        (data / "state.json").write_text(json.dumps(state), encoding="utf-8")
        green = build(root)
        assert green["light"] == "green"
        assert "warning" not in green

        state["composite"]["light"] = "Amber"
        state["composite"]["S"] = 0.12
        (data / "state.json").write_text(json.dumps(state), encoding="utf-8")
        amber = build(root)
        assert amber["light"] == "amber"
        assert amber["warning"] == AMBER_WARNING

        state["composite"]["light"] = "yellow"
        (data / "state.json").write_text(json.dumps(state), encoding="utf-8")
        yellow = build(root)
        assert yellow["light"] == "amber"
        assert yellow["warning"] == AMBER_WARNING

        # Missing alerts must not write.
        empty = root / "empty"
        (empty / "data").mkdir(parents=True)
        (empty / "data" / "state.json").write_text(json.dumps(state), encoding="utf-8")
        try:
            build(empty)
        except SystemExit:
            pass
        else:
            raise AssertionError("expected exit when no alert files")
    print("self-test ok")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build data/ticker-tape.json")
    parser.add_argument("--root", type=Path, default=None, help="Repo root (default: parent of scripts/)")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    root = args.root.resolve() if args.root else repo_root()
    doc = build(root)
    write_tape(root, doc)


if __name__ == "__main__":
    main()
