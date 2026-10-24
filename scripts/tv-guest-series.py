#!/usr/bin/env python3
"""
TradingView guest WebSocket daily-close fetcher — same approach as
refresh-volume-breadth.py (USI:UVOL / USI:DVOL), plus correct trading-date
labels for overnight-session symbols.

TradingView stamps each daily bar at its SESSION START in the symbol's
timezone. US cash indices (INDEX:NSHF, INDEX:MMTH, USI:*) start 09:30 NY, so
the date is the NY date. TVC:JP30 uses a 17:00→17:00 NY session, so the bar
that starts 17:00 NY on day D is trading day D+1 (like futures). Rule: local
start hour >= 12 → next calendar day.

Usage: python3 scripts/tv-guest-series.py SYMBOL [SYMBOL ...] [--bars N]
Prints JSON {symbol: {"ok", "bars": [{"date","close"}], "timezone", "session", "error"}}.
Never invents prints: a symbol that returns no bars is ok=false.
"""
from __future__ import annotations

import json
import re
import ssl
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo


def fetch(symbol: str, n: int = 120) -> dict:
    import websocket  # websocket-client (already used by refresh-volume-breadth.py)

    ws = websocket.create_connection(
        "wss://data.tradingview.com/socket.io/websocket",
        header=["Origin: https://www.tradingview.com", "User-Agent: Mozilla/5.0"],
        sslopt={"cert_reqs": ssl.CERT_NONE},
        timeout=20,
    )

    def send(func, args):
        msg = json.dumps({"m": func, "p": args})
        ws.send(f"~m~{len(msg)}~m~{msg}")

    session = "cs_" + uuid.uuid4().hex[:12]
    send("set_auth_token", ["unauthorized_user_token"])
    send("chart_create_session", [session, ""])
    send("resolve_symbol", [session, "sds_sym_1", f'={{"symbol":"{symbol}","adjustment":"splits"}}'])
    send("create_series", [session, "sds_1", "s1", "sds_sym_1", "1D", n, ""])

    tzname = "America/New_York"
    sess = None
    raw_bars: list[tuple[int, float]] = []
    buf = ""
    deadline = time.time() + 25
    err = None
    while time.time() < deadline:
        try:
            raw = ws.recv()
        except Exception:
            break
        if isinstance(raw, bytes):
            raw = raw.decode()
        buf += raw
        while True:
            m = re.match(r"~m~(\d+)~m~", buf)
            if not m:
                break
            ln = int(m.group(1))
            start = m.end()
            if len(buf) < start + ln:
                break
            payload = buf[start : start + ln]
            buf = buf[start + ln :]
            if payload.startswith("~h~"):
                ws.send(f"~m~{len(payload)}~m~{payload}")
                continue
            try:
                obj = json.loads(payload)
            except Exception:
                continue
            if obj.get("m") == "symbol_resolved":
                info = (obj.get("p") or [None, None, {}])[2] or {}
                tzname = info.get("timezone") or tzname
                sess = info.get("session")
            if obj.get("m") == "timescale_update":
                p = obj.get("p") or []
                data = p[1] if len(p) > 1 else {}
                for row in (data.get("sds_1") or {}).get("s") or []:
                    v = row.get("v") or []
                    if len(v) >= 5:
                        raw_bars.append((int(v[0]), float(v[4])))
            if obj.get("m") == "series_completed" and raw_bars:
                deadline = 0
                break
            if obj.get("m") in ("series_error", "symbol_error"):
                err = obj.get("m")
                deadline = 0
                break
        if deadline == 0 or len(raw_bars) >= n:
            break
    try:
        ws.close()
    except Exception:
        pass

    tz = ZoneInfo(tzname)
    by: dict[str, float] = {}
    for t, c in raw_bars:
        local = datetime.fromtimestamp(t, tz=timezone.utc).astimezone(tz)
        day = local.date() + (timedelta(days=1) if local.hour >= 12 else timedelta(0))
        by[day.isoformat()] = c
    bars = [{"date": d, "close": by[d]} for d in sorted(by)]
    return {
        "ok": bool(bars) and err is None,
        "bars": bars,
        "timezone": tzname,
        "session": sess,
        "error": err if err else (None if bars else "no bars"),
    }


def main():
    args = sys.argv[1:]
    n = 120
    syms = []
    i = 0
    while i < len(args):
        if args[i] == "--bars" and i + 1 < len(args):
            n = int(args[i + 1])
            i += 2
        else:
            syms.append(args[i])
            i += 1
    out = {}
    for s in syms:
        try:
            out[s] = fetch(s, n)
        except Exception as e:  # noqa: BLE001
            out[s] = {"ok": False, "bars": [], "error": str(e)[:200]}
    print(json.dumps(out))


if __name__ == "__main__":
    main()
