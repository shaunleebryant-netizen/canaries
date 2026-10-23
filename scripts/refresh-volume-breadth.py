#!/usr/bin/env python3
"""
Refresh Liquidity (volume breadth) stub from NYSE UVOL/DVOL.

Priority:
  1) Yahoo ^UVOL/^DVOL (rejected if closes look like ETF ~$35)
  2) TradingView guest WebSocket USI:UVOL / USI:DVOL (how the stub was built)
  3) Rebuild from existing data/volume-breadth-tv-history.json if still the newest

Writes:
  data/volume-breadth-stub.json
  data/volume-breadth-tv-history.json
  mirrors under /home/box/canaries/

Never invents prints. Exit 1 if no usable bars.
"""

from __future__ import annotations

import json
import math
import re
import ssl
import sys
import time
import uuid
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MIRROR = Path("/home/box/canaries")
STUB = DATA / "volume-breadth-stub.json"
TV_HIST = DATA / "volume-breadth-tv-history.json"
YAHOO_UA = "Mozilla/5.0 (compatible; CanaryDashboard/1.0; +https://canarydashboard.com)"


def ny_today() -> str:
    parts = datetime.now(timezone.utc).astimezone(
        __import__("zoneinfo").ZoneInfo("America/New_York")
    )
    return parts.strftime("%Y-%m-%d")


def parse_args(argv):
    session = None
    i = 1
    while i < len(argv):
        if argv[i] == "--session-date" and i + 1 < len(argv):
            session = argv[i + 1]
            i += 2
        else:
            i += 1
    return session or ny_today()


def ema_series(values: list[float], period: int) -> list[float | None]:
    out: list[float | None] = []
    if len(values) < period:
        return [None] * len(values)
    k = 2 / (period + 1)
    e = sum(values[:period]) / period
    for i in range(period - 1):
        out.append(None)
    out.append(e)
    for i in range(period, len(values)):
        e = values[i] * k + e * (1 - k)
        out.append(e)
    return out


def volume_ratio(uvol: float, dvol: float) -> float | None:
    den = uvol + dvol
    if not math.isfinite(uvol) or not math.isfinite(dvol) or den == 0:
        return None
    return (uvol - dvol) / den


def classify(ratio, ema13, ema34, prior_ema34=None) -> str:
    if ratio is None or ema13 is None or ema34 is None:
        return "PENDING"
    near_zero = abs(ratio) < 0.05
    flat34 = prior_ema34 is not None and abs(ema34 - prior_ema34) < 0.01
    if near_zero and (flat34 or abs(ema13 - ema34) < 0.02):
        return "NO_REGIME"
    if ratio > 0 and ema13 > ema34:
        return "RISK_ON"
    if ratio < 0 and ema13 < ema34:
        return "RISK_OFF"
    return "NO_REGIME"


def one_liner(regime: str) -> str:
    if regime == "RISK_ON":
        return "Ratio above 0 with 13 EMA above 34 — real risk-on volume."
    if regime == "RISK_OFF":
        return "Ratio below 0 with 13 EMA below 34 — real risk-off volume."
    if regime == "NO_REGIME":
        return "Cross near 0 or flat 34 — no clear volume regime; ignore."
    return "Volume breadth pending — no UVOL/DVOL prints yet."


def compute_from_pairs(pairs: list[dict]) -> dict:
    ratios: list[float] = []
    dates: list[str] = []
    uvols: list[float] = []
    dvols: list[float] = []
    for p in pairs:
        r = volume_ratio(p["uvol"], p["dvol"])
        if r is None:
            continue
        ratios.append(r)
        dates.append(p["date"])
        uvols.append(p["uvol"])
        dvols.append(p["dvol"])
    e13 = ema_series(ratios, 13)
    e34 = ema_series(ratios, 34)
    history = []
    for i, date in enumerate(dates):
        history.append(
            {
                "date": date,
                "uvol": uvols[i],
                "dvol": dvols[i],
                "ratio": ratios[i],
                "ema13": e13[i],
                "ema34": e34[i],
            }
        )
    last = history[-1] if history else None
    prior = history[-2] if len(history) > 1 else None
    ratio = last["ratio"] if last else None
    ema13 = last["ema13"] if last else None
    ema34 = last["ema34"] if last else None
    regime = classify(ratio, ema13, ema34, prior["ema34"] if prior else None)
    return {
        "asOf": last["date"] if last else None,
        "uvol": last["uvol"] if last else None,
        "dvol": last["dvol"] if last else None,
        "ratio": ratio,
        "ema13": ema13,
        "ema34": ema34,
        "regime": regime,
        "oneLiner": one_liner(regime),
        "history": history,
        "status": "VERIFIED"
        if ratio is not None and ema13 is not None and ema34 is not None
        else ("PARTIAL" if ratio is not None else "PENDING"),
    }


def yahoo_daily(symbol: str, range_: str = "6mo") -> list[dict]:
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(symbol)}"
        f"?interval=1d&range={range_}&includePrePost=false"
    )
    req = urllib.request.Request(
        url, headers={"User-Agent": YAHOO_UA, "Accept": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as res:
            data = json.loads(res.read().decode())
    except Exception as e:
        print(f"yahoo {symbol}: {e}")
        return []
    result = (data.get("chart") or {}).get("result") or []
    if not result:
        return []
    r0 = result[0]
    ts = r0.get("timestamp") or []
    closes = ((r0.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
    out = []
    for i, t in enumerate(ts):
        c = closes[i] if i < len(closes) else None
        if c is None:
            continue
        # America/New_York calendar date
        dt = datetime.fromtimestamp(t, tz=timezone.utc).astimezone(
            __import__("zoneinfo").ZoneInfo("America/New_York")
        )
        out.append({"date": dt.strftime("%Y-%m-%d"), "close": float(c)})
    return out


def try_yahoo() -> tuple[list[dict], list[str]]:
    tried: list[str] = []
    u_bars = []
    d_bars = []
    u_sym = d_sym = None
    for s in ("^UVOL", "UVOL"):
        tried.append(s)
        bars = yahoo_daily(s)
        if bars:
            u_bars, u_sym = bars, s
            break
    for s in ("^DVOL", "DVOL"):
        tried.append(s)
        bars = yahoo_daily(s)
        if bars:
            d_bars, d_sym = bars, s
            break
    if not u_bars or not d_bars:
        return [], tried
    last_u = u_bars[-1]["close"]
    last_d = d_bars[-1]["close"]
    if last_u < 1000 or last_d < 1000:
        print(f"yahoo reject ETF-like closes u={last_u} d={last_d} ({u_sym}/{d_sym})")
        return [], tried
    dmap = {b["date"]: b["close"] for b in d_bars}
    pairs = []
    for b in u_bars:
        dv = dmap.get(b["date"])
        if dv is None or b["close"] < 1000 or dv < 1000:
            continue
        pairs.append({"date": b["date"], "uvol": b["close"], "dvol": dv})
    return pairs, tried


def tv_fetch_bars(symbol: str, n: int = 320) -> list[dict]:
    try:
        import websocket
    except ImportError:
        import subprocess

        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "websocket-client", "-q"]
        )
        import websocket

    ws = websocket.create_connection(
        "wss://data.tradingview.com/socket.io/websocket",
        header=[
            "Origin: https://www.tradingview.com",
            "User-Agent: Mozilla/5.0",
        ],
        sslopt={"cert_reqs": ssl.CERT_NONE},
        timeout=30,
    )

    def send(func, args):
        msg = json.dumps({"m": func, "p": args})
        ws.send(f"~m~{len(msg)}~m~{msg}")

    session = "cs_" + uuid.uuid4().hex[:12]
    send("set_auth_token", ["unauthorized_user_token"])
    send("chart_create_session", [session, ""])
    send(
        "resolve_symbol",
        [session, "sds_sym_1", f'={{"symbol":"{symbol}","adjustment":"splits"}}'],
    )
    send("create_series", [session, "sds_1", "s1", "sds_sym_1", "1D", n, ""])

    bars: list[dict] = []
    buf = ""
    deadline = time.time() + 25
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
            if obj.get("m") == "timescale_update":
                p = obj.get("p") or []
                data = p[1] if len(p) > 1 else {}
                sds = data.get("sds_1") or {}
                for row in sds.get("s") or []:
                    v = row.get("v") or []
                    if len(v) >= 5:
                        bars.append({"t": v[0], "c": float(v[4])})
            if obj.get("m") == "series_error":
                print("tv series_error", obj)
                ws.close()
                return []
        if len(bars) >= max(40, int(n * 0.7)):
            break
    try:
        ws.close()
    except Exception:
        pass
    # TradingView daily bars are typically exchange-local; use UTC date of ts
    out = []
    for b in bars:
        d = datetime.fromtimestamp(b["t"], tz=timezone.utc).strftime("%Y-%m-%d")
        out.append({"date": d, "close": b["c"]})
    # dedupe by date keeping last
    by = {}
    for b in out:
        by[b["date"]] = b["close"]
    return [{"date": d, "close": by[d]} for d in sorted(by)]


def try_tradingview() -> tuple[list[dict], list[str]]:
    print("TV guest fetch USI:UVOL / USI:DVOL …")
    u = tv_fetch_bars("USI:UVOL", 320)
    d = tv_fetch_bars("USI:DVOL", 320)
    tried = ["USI:UVOL", "USI:DVOL"]
    if not u or not d:
        print(f"TV incomplete u={len(u)} d={len(d)}")
        return [], tried
    dmap = {b["date"]: b["close"] for b in d}
    pairs = []
    for b in u:
        dv = dmap.get(b["date"])
        if dv is None or b["close"] < 1000 or dv < 1000:
            continue
        pairs.append({"date": b["date"], "uvol": b["close"], "dvol": dv})
    return pairs, tried


def pairs_from_tv_history() -> list[dict]:
    if not TV_HIST.exists():
        return []
    doc = json.loads(TV_HIST.read_text())
    u = {b["date"]: b["close"] for b in doc.get("uvol") or []}
    d = {b["date"]: b["close"] for b in doc.get("dvol") or []}
    pairs = []
    for date in sorted(set(u) & set(d)):
        if u[date] < 1000 or d[date] < 1000:
            continue
        pairs.append({"date": date, "uvol": u[date], "dvol": d[date]})
    return pairs


def write_outputs(pairs: list[dict], source: str, symbols: dict, tried: list[str], session_date: str):
    computed = compute_from_pairs(pairs)
    if not computed["asOf"]:
        raise SystemExit("no computed asOf — refusing to write")

    stub = {
        "draft": False,
        "status": computed["status"],
        "asOf": computed["asOf"],
        "asOfNote": f"{source} daily closes.",
        "source": source,
        "symbols": symbols,
        "symbolsTried": tried,
        "sessionDate": session_date,
        "uvol": computed["uvol"],
        "dvol": computed["dvol"],
        "ratio": computed["ratio"],
        "ema13": computed["ema13"],
        "ema34": computed["ema34"],
        "regime": computed["regime"],
        "oneLiner": computed["oneLiner"],
        "history": computed["history"],
        "note": f"Liquidity refresh {session_date}; never invented.",
    }
    STUB.write_text(json.dumps(stub, indent=2) + "\n")

    # TV history mirror (uvol/dvol series) — keep full pair history
    tv_doc = {
        "source": source,
        "asOf": computed["asOf"],
        "uvol": [{"date": p["date"], "close": p["uvol"]} for p in pairs],
        "dvol": [{"date": p["date"], "close": p["dvol"]} for p in pairs],
    }
    TV_HIST.write_text(json.dumps(tv_doc, indent=2) + "\n")

    if MIRROR.exists():
        for name, path in (
            ("volume-breadth-stub.json", STUB),
            ("volume-breadth-tv-history.json", TV_HIST),
        ):
            try:
                (MIRROR / name).write_bytes(path.read_bytes())
            except Exception as e:
                print("mirror skip", name, e)

    print(
        f"Liquidity OK asOf={computed['asOf']} regime={computed['regime']} "
        f"ratio={computed['ratio']:.4f} bars={len(pairs)} via {source}"
    )


def main():
    session_date = parse_args(sys.argv)
    print(f"refresh-volume-breadth · sessionDate={session_date}")

    pairs, tried = try_yahoo()
    source = "yahoo"
    symbols = {"uvol": "^UVOL", "dvol": "^DVOL"}
    if pairs and pairs[-1]["date"] >= session_date:
        print(f"Yahoo pairs {len(pairs)} last={pairs[-1]['date']}")
    elif pairs:
        print(f"Yahoo pairs last={pairs[-1]['date']} < session {session_date}; still usable")
    else:
        pairs, tried = try_tradingview()
        source = "tradingview-guest"
        symbols = {"uvol": "USI:UVOL", "dvol": "USI:DVOL"}

    if not pairs:
        hist = pairs_from_tv_history()
        if hist:
            print(
                f"FALLBACK: using existing TV history last={hist[-1]['date']} "
                f"(may be stale vs session {session_date})"
            )
            pairs = hist
            source = "tradingview-guest-cached"
            symbols = {"uvol": "USI:UVOL", "dvol": "USI:DVOL"}
            tried = tried + ["volume-breadth-tv-history.json"]
        else:
            print("FAIL: no Yahoo, no TV, no cached history")
            sys.exit(1)

    write_outputs(pairs, source, symbols, tried, session_date)
    if pairs[-1]["date"] < session_date:
        print(
            f"WARN: latest bar {pairs[-1]['date']} < sessionDate {session_date} "
            "(holiday/weekend or feed lag) — not invented."
        )


if __name__ == "__main__":
    main()
