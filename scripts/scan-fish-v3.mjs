#!/usr/bin/env node
/**
 * Canary RelRSI (DAILY ONLY) 🙂🐟🥵💀 — daily print filter for the Fish, Sweaty,
 * ETF watch and Crypto watch boxes (owner's final Pine v6, 2026-09-29 01:10 NZ).
 * Reference Pine: data/canary-tops-bottoms-daily.pine
 * Engine (faithful bar-by-bar port): src/lib/canaryTopsBottoms.mjs
 * Inputs (one shared config, same names/defaults as Pine): src/lib/canaryTopsBottomsConfig.mjs
 *
 * Daily bars only, full Yahoo history (range=max) so RSI/EMA and the `var` state match a
 * TradingView daily chart. Only completed daily bars are used:
 *  - US-listed symbols: the regular-session bar (NY date); a session still in progress is dropped.
 *  - Spot crypto (Yahoo instrumentType CRYPTOCURRENCY): 24/7 UTC daily candles as they come
 *    (no US calendar), dated by the UTC day (candle closes 00:00 UTC); today's forming candle is dropped.
 * The previous engine (Bottom Finder v3.1) is kept for reference in data/fish-indicator-bottom-finder-v3.1.pine.
 *
 * Never invent prints. Soft-fail missing symbols.
 *
 * Usage:
 *   node scripts/scan-fish-v3.mjs
 *   node scripts/scan-fish-v3.mjs --limit 8
 *   node scripts/scan-fish-v3.mjs --universe data/etf-watch-universe.json --out-prefix etf-watch
 *   node scripts/scan-fish-v3.mjs --hitlist /workspace/exports/fishsweaty/hitlist-fish.json   (extra per-ticker dump)
 *
 * --universe PATH   tickers JSON (default: data/fish-universe.json)
 * --out-prefix NAME default → fish-alerts.json + exhaustion-alerts.json;
 *                   any non-null prefix → data/${outPrefix}-alerts.json (combined 🙂/🐟/🥵/💀)
 * --hitlist PATH    also write every ticker's latest-bar marks, recent signals and state
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCanaryTopsBottoms } from "../src/lib/canaryTopsBottoms.mjs";
import { CANARY_TOPS_BOTTOMS, CANARY_TOPS_BOTTOMS_VERSION } from "../src/lib/canaryTopsBottomsConfig.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const UNIVERSE_PATH = join(ROOT, "data/fish-universe.json");
const FISH_OUT = join(ROOT, "data/fish-alerts.json");
const EXH_OUT = join(ROOT, "data/exhaustion-alerts.json");
const MIRROR_DIR = "/home/box/canaries";

const YAHOO_UA =
  "Mozilla/5.0 (compatible; CanaryDashboard/1.0; +https://canarydashboard.com)";

const METHOD = `yahoo-1d-${CANARY_TOPS_BOTTOMS_VERSION}`;
const TZ = "America/New_York";
const RECENT_SESSIONS = 20;
const CONCURRENCY = 4;
const DELAY_MS = 180;
const RANGE = "max"; // full daily history, like a TradingView daily chart

const SYMBOL_CANDIDATES = {
  BTCUSD: ["BTC-USD"],
  ETHUSD: ["ETH-USD"],
  SOLUSD: ["SOL-USD"],
  BNBUSD: ["BNB-USD"],
  XRPUSD: ["XRP-USD"],
  TRXUSD: ["TRX-USD"],
  FIGRHELOCUSD: ["FIGRHELOC-USD"],
  ZECUSD: ["ZEC-USD"],
  HYPEUSD: ["HYPE32196-USD", "HYPE-USD"],
  DOGEUSD: ["DOGE-USD"],
  LINKUSD: ["LINK-USD"],
  XMRUSD: ["XMR-USD"],
  WBTUSD: ["WBT-USD"],
  ADAUSD: ["ADA-USD"],
  LEOUSD: ["LEO-USD"],
  RAINUSD: ["RAIN38341-USD", "RAIN-USD"],
  XLMUSD: ["XLM-USD"],
  NEARUSD: ["NEAR-USD"],
  BCHUSD: ["BCH-USD"],
  UNIUSD: ["UNI7083-USD", "UNI-USD"],
  DIMEUSD: ["DIME39656-USD", "DIME-USD"],
  TOTAL: ["TOTAL", "TOTAL.D", "^CMC200"],
  XAUUSD: ["GC=F", "XAUUSD=X"],
  XAGUSD: ["SI=F", "XAGUSD=X"],
  SPX: ["^GSPC"],
  SP600: ["^SP600"],
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(argv) {
  const out = { limit: 0, universe: null, outPrefix: null, hitlist: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--limit") out.limit = Number(argv[++i] || 0);
    else if (argv[i] === "--universe") out.universe = String(argv[++i] || "");
    else if (argv[i] === "--out-prefix") out.outPrefix = String(argv[++i] || "");
    else if (argv[i] === "--hitlist") out.hitlist = String(argv[++i] || "");
  }
  return out;
}

function nyParts(unixSec) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(unixSec * 1000));
  const g = (t) => parts.find((p) => p.type === t)?.value;
  return {
    y: Number(g("year")),
    m: Number(g("month")),
    d: Number(g("day")),
    h: Number(g("hour")),
    min: Number(g("minute")),
  };
}

function utcParts(unixSec) {
  const d = new Date(unixSec * 1000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes() };
}

function ymd(p) {
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

function nzNowIso() {
  const d = new Date();
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const g = (t) => parts.find((p) => p.type === t)?.value;
  // NZ is UTC+12 in Sep 2026 (NZDT starts late Sep; 22 Sep 2026 is NZST +12)
  const offset = "Pacific/Auckland";
  // Derive offset from the formatted instant vs UTC
  const asUtc = Date.UTC(
    Number(g("year")),
    Number(g("month")) - 1,
    Number(g("day")),
    Number(g("hour")),
    Number(g("minute")),
    Number(g("second"))
  );
  const diffMin = Math.round((asUtc - d.getTime()) / 60000);
  const sign = diffMin >= 0 ? "+" : "-";
  const abs = Math.abs(diffMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}:${g("second")}${sign}${hh}:${mm}`;
  void offset;
}

async function yahooChart(symbol, { interval, range }) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    // range "max" + interval 1d silently returns MONTHLY bars on Yahoo, so full daily history
    // is requested with period1=0 / period2=now instead.
    (range === "max"
      ? `?interval=${interval}&period1=0&period2=${Math.floor(Date.now() / 1000)}&includePrePost=false`
      : `?interval=${interval}&range=${range}&includePrePost=false`);
  const res = await fetch(url, {
    headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
  });
  if (res.status === 429) {
    await sleep(1200);
    const retry = await fetch(url, {
      headers: { "User-Agent": YAHOO_UA, Accept: "application/json" },
    });
    if (!retry.ok) return { error: `HTTP ${retry.status}` };
    return { data: await retry.json() };
  }
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return { data: await res.json() };
}


async function fetchDaily(symbol) {
  const got = await yahooChart(symbol, { interval: "1d", range: RANGE });
  if (got.error) return { error: got.error };
  const root = got.data;
  const err = root?.chart?.error;
  const result = root?.chart?.result?.[0];
  if (err || !result) return { error: err?.description ?? "no chart result" };
  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const opens = q.open ?? [];
  const highs = q.high ?? [];
  const lows = q.low ?? [];
  const closes = q.close ?? [];
  const volumes = q.volume ?? [];
  const meta = result.meta ?? {};
  const isCrypto = String(meta.instrumentType || "").toUpperCase() === "CRYPTOCURRENCY";
  const bars = [];
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    const o = opens[i];
    const h = highs[i];
    const l = lows[i];
    const c = closes[i];
    const v = volumes[i];
    if (t == null || o == null || h == null || l == null || c == null) continue;
    if ([o, h, l, c].some((x) => Number.isNaN(Number(x)))) continue;
    const p = isCrypto ? utcParts(t) : nyParts(t);
    bars.push({
      t,
      open: Number(o),
      high: Number(h),
      low: Number(l),
      close: Number(c),
      volume: v == null || Number.isNaN(Number(v)) ? null : Number(v),
      asOf: ymd(p),
    });
  }
  // Completed bars only.
  const nowSec = Date.now() / 1000;
  if (bars.length) {
    const lastBar = bars[bars.length - 1];
    if (isCrypto) {
      // 24/7 UTC daily candle: drop today's forming candle (it closes at the next 00:00 UTC).
      if (lastBar.asOf === ymd(utcParts(nowSec))) bars.pop();
    } else {
      const reg = meta.currentTradingPeriod?.regular;
      if (reg && nowSec < reg.end && lastBar.t >= reg.start - 43200) bars.pop(); // session in progress
    }
  }
  if (bars.length < 70) return { error: `too few daily bars (${bars.length})` };
  return {
    bars,
    yahooSymbol: meta.symbol ?? symbol,
    calendar: isCrypto ? "crypto-utc-daily" : "exchange-session-daily",
  };
}


function recentCutoff(bars) {
  const dates = [];
  const seen = new Set();
  for (let i = bars.length - 1; i >= 0; i--) {
    const d = bars[i].asOf;
    if (!seen.has(d)) {
      seen.add(d);
      dates.push(d);
      if (dates.length >= RECENT_SESSIONS) break;
    }
  }
  return dates.length ? dates[dates.length - 1] : "0000-00-00";
}

function lastHits(events, cutoff) {
  const inWin = events.filter((e) => e.asOf >= cutoff);
  const last = (kind) => {
    for (let i = inWin.length - 1; i >= 0; i--) {
      if (inWin[i].kind === kind) return inWin[i];
    }
    return null;
  };
  return {
    smile: last("smile"),
    fish: last("fish"),
    exhaustion: last("exhaustion"),
    skull: last("skull"),
  };
}

async function scanTicker(ticker) {
  const candidates = SYMBOL_CANDIDATES[ticker] ?? [ticker];
  const tried = [];
  let lastErr = "no candidates";
  for (const sym of candidates) {
    tried.push(sym);
    // Canary RelRSI on daily bars only.
    const daily = await fetchDaily(sym);
    if (daily.error) {
      lastErr = `${sym}: ${daily.error}`;
      continue;
    }
    const bars = daily.bars;
    if (bars.length < 70) {
      lastErr = `${sym}: too few daily bars (${bars.length})`;
      continue;
    }
    const { events, state } = runCanaryTopsBottoms(bars, CANARY_TOPS_BOTTOMS);
    const cutoff = recentCutoff(bars);
    const hits = lastHits(events, cutoff);
    // Last 5 bars' events for the hit list (not written to the box JSON).
    const last5From = bars[Math.max(0, bars.length - 5)].asOf;
    return {
      ok: true,
      ticker,
      yahoo: daily.yahooSymbol,
      calendar: daily.calendar,
      barsDaily: bars.length,
      firstAsOf: bars[0].asOf,
      cutoff,
      latestAsOf: bars[bars.length - 1].asOf,
      hits,
      recent5: events.filter((e) => e.asOf >= last5From).map(({ kind, asOf, rsi, score, why }) => ({ kind, asOf, rsi, score: score ?? null, why })),
      state,
    };
  }
  return { ok: false, ticker, error: lastErr, tried };
}

async function pool(items, n, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
      await sleep(DELAY_MS);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return results;
}

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n");
}

function loadUniverse(universePath) {
  const path = universePath || UNIVERSE_PATH;
  const raw = JSON.parse(readFileSync(path, "utf8"));
  let tickers = Array.isArray(raw.tickers) ? raw.tickers : [];
  // Also accept grouped fish-universe shape
  if (!tickers.length && Array.isArray(raw.groups)) {
    tickers = raw.groups.flatMap((g) => (Array.isArray(g?.tickers) ? g.tickers : []));
  }
  return [...new Set(tickers.map((t) => String(t).trim()).filter(Boolean))];
}

async function main() {
  const args = parseArgs(process.argv);
  const universePath = args.universe
    ? (args.universe.startsWith("/") ? args.universe : join(ROOT, args.universe))
    : UNIVERSE_PATH;
  const outPrefix = args.outPrefix || null;
  const combinedMode = Boolean(outPrefix);

  let tickers = loadUniverse(universePath);
  const universeCount = tickers.length;
  if (args.limit > 0) tickers = tickers.slice(0, args.limit);

  const label = combinedMode ? outPrefix : "fish/sweaty";
  console.log(
    `Canary RelRSI scan · universe ${universeCount} · running ${tickers.length} · daily · ${METHOD}` +
      (combinedMode ? ` · ${outPrefix} combined` : "") +
      `\n  universe file: ${universePath}`
  );

  let done = 0;
  const rows = await pool(tickers, CONCURRENCY, async (ticker) => {
    const r = await scanTicker(ticker);
    done += 1;
    const tag = r.ok
      ? `ok 1D=${r.barsDaily}`
      : `FAIL ${r.error}`;
    if (done % 10 === 0 || !r.ok) {
      console.log(`[${done}/${tickers.length}] ${ticker} ${tag}`);
    }
    return r;
  });

  if (args.hitlist) {
    const hl = args.hitlist.startsWith("/") ? args.hitlist : join(ROOT, args.hitlist);
    mkdirSync(dirname(hl), { recursive: true });
    writeJson(hl, { universePath, universeCount, method: METHOD, config: CANARY_TOPS_BOTTOMS, rows });
    console.log(`wrote hit list dump ${hl}`);
  }

  const failed = [];
  const fishSignals = [];
  const exhSignals = [];
  const combinedSignals = [];
  let scannedCount = 0;
  let lastAsOf = "1970-01-01";
  let lastSessionAsOf = "1970-01-01"; // latest US-session bar; crypto UTC candles can be a weekend date

  const emoji = { smile: "🙂", fish: "🐟", exhaustion: "🥵", skull: "💀" };

  for (const r of rows) {
    if (!r.ok) {
      failed.push({ ticker: r.ticker, error: r.error });
      continue;
    }
    scannedCount += 1;
    if (r.latestAsOf > lastAsOf) lastAsOf = r.latestAsOf;
    if (r.calendar !== "crypto-utc-daily" && r.latestAsOf > lastSessionAsOf) lastSessionAsOf = r.latestAsOf;

    const { smile, fish, exhaustion, skull } = r.hits;

    if (combinedMode) {
      const fired = [];
      const noteBits = [];
      let bestAsOf = null;
      for (const hit of [smile, fish, exhaustion, skull]) {
        if (!hit) continue;
        fired.push(hit.kind);
        const e = emoji[hit.kind] || hit.kind;
        if (hit.kind === "smile") noteBits.push(`${e}@${hit.asOf} ${hit.why}`);
        else if (hit.kind === "fish") noteBits.push(`${e}@${hit.asOf} RSI=${hit.rsi.toFixed(1)}`);
        else if (hit.kind === "exhaustion") noteBits.push(`${e}@${hit.asOf} ${hit.why} RSI=${hit.rsi.toFixed(1)}`);
        else noteBits.push(`${e}@${hit.asOf} ${hit.why}`);
        if (!bestAsOf || hit.asOf > bestAsOf) bestAsOf = hit.asOf;
      }
      if (fired.length) {
        const row = {
          ticker: r.ticker,
          signals: fired,
          asOf: bestAsOf,
          timeframe: "1D",
          note: noteBits.join(" · "),
        };
        // Per-kind latest dates (latest 🙂 / 🐟 / 🥵 / 💀 kept separately).
        for (const hit of [smile, fish, exhaustion, skull]) {
          if (hit) row[`${hit.kind}AsOf`] = hit.asOf;
        }
        combinedSignals.push(row);
      }
      continue;
    }

    if (smile || fish) {
      const asOf =
        smile && fish
          ? smile.asOf >= fish.asOf
            ? smile.asOf
            : fish.asOf
          : (fish ?? smile).asOf;
      const signal = smile && fish ? "both" : fish ? "fish" : "smile";
      const noteBits = [];
      if (smile) noteBits.push(`smile@${smile.asOf} ${smile.why}`);
      if (fish) noteBits.push(`fish@${fish.asOf} RSI=${fish.rsi.toFixed(1)}`);
      fishSignals.push({
        ticker: r.ticker,
        signal,
        asOf,
        timeframe: "1D",
        note: noteBits.join(" · "),
        ...(smile ? { smileAsOf: smile.asOf } : {}),
        ...(fish ? { fishAsOf: fish.asOf } : {}),
      });
    }
    // Latest 🥵 AND latest 💀 per ticker, kept separately (like Fish `both`).
    // `signal` = the most recent of the two (display/back-compat); `signals`
    // lists every kind present with its own date (exhaustionAsOf / skullAsOf).
    // If both occur on the same bar, 💀 is the display `signal`.
    const topHit =
      exhaustion && skull
        ? skull.i >= exhaustion.i
          ? skull
          : exhaustion
        : (skull ?? exhaustion);
    if (topHit) {
      const isSkull = topHit.kind === "skull";
      const kinds = [];
      const noteBits = [];
      const row = {
        ticker: r.ticker,
        signal: isSkull ? "skull" : "exhaustion",
        asOf: topHit.asOf,
        timeframe: "1D",
      };
      if (exhaustion) {
        kinds.push("exhaustion");
        row.exhaustionAsOf = exhaustion.asOf;
        noteBits.push(`🥵@${exhaustion.asOf} ${exhaustion.why} RSI=${exhaustion.rsi.toFixed(1)}`);
      }
      if (skull) {
        kinds.push("skull");
        row.skullAsOf = skull.asOf;
        noteBits.push(`💀@${skull.asOf} ${skull.why}`);
      }
      row.signals = kinds;
      row.note = noteBits.join(" · ");
      exhSignals.push(row);
    }
  }

  const scannedAt = nzNowIso();
  const asOf =
    lastSessionAsOf !== "1970-01-01"
      ? lastSessionAsOf
      : lastAsOf === "1970-01-01"
        ? scannedAt.slice(0, 10)
        : lastAsOf;

  if (combinedMode) {
    combinedSignals.sort((a, b) => {
      if (a.asOf !== b.asOf) return a.asOf < b.asOf ? 1 : -1;
      return a.ticker.localeCompare(b.ticker);
    });
    const combinedOut = join(ROOT, `data/${outPrefix}-alerts.json`);
    const displayName = outPrefix
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const combinedDoc = {
      asOf,
      scannedAt,
      universeCount,
      scannedCount,
      failed: failed.map((f) => f.ticker),
      failedDetail: failed,
      signals: combinedSignals,
      method: METHOD,
      note: `${displayName} · Canary RelRSI daily (🙂/🐟 and/or 🥵/💀) · last ${RECENT_SESSIONS} sessions · Yahoo 1d full history (crypto: UTC daily candles) · universe ${universePath}. Never invented.`,
    };
    writeJson(combinedOut, combinedDoc);
    if (existsSync(MIRROR_DIR)) {
      try {
        copyFileSync(combinedOut, join(MIRROR_DIR, `${outPrefix}-alerts.json`));
      } catch (e) {
        console.warn("mirror skip:", e instanceof Error ? e.message : e);
      }
    }
    const counts = { smile: 0, fish: 0, exhaustion: 0, skull: 0 };
    for (const row of combinedSignals) {
      for (const k of row.signals) if (counts[k] != null) counts[k] += 1;
    }
    console.log(`\n=== ${displayName} summary (Canary RelRSI daily) ===`);
    console.log(`universe ${universeCount}  scanned ${scannedCount}  failed ${failed.length}`);
    console.log(`rows with any print ${combinedSignals.length}`);
    console.log(`🙂 ${counts.smile} · 🐟 ${counts.fish} · 🥵 ${counts.exhaustion} · 💀 ${counts.skull}`);
    if (failed.length) {
      console.log("failed:", failed.map((f) => `${f.ticker} (${f.error})`).join(" | "));
    }
    if (combinedSignals.length) {
      console.log("printed:");
      for (const s of combinedSignals) {
        const marks = s.signals.map((k) => emoji[k] || k).join("");
        console.log(`  ${s.ticker} ${marks} @${s.asOf}`);
      }
    }
    console.log(`wrote ${combinedOut}`);
    return;
  }

  const rank = { both: 0, fish: 1, smile: 2 };
  fishSignals.sort((a, b) => {
    if (a.asOf !== b.asOf) return a.asOf < b.asOf ? 1 : -1;
    return (rank[a.signal] ?? 9) - (rank[b.signal] ?? 9);
  });
  exhSignals.sort((a, b) => (a.asOf < b.asOf ? 1 : a.asOf > b.asOf ? -1 : 0));

  const fishDoc = {
    asOf,
    scannedAt,
    universeCount,
    scannedCount,
    failed: failed.map((f) => f.ticker),
    failedDetail: failed,
    signals: fishSignals,
    method: METHOD,
    note: `Canary RelRSI (🙂/🐟) on daily bars only · last ${RECENT_SESSIONS} sessions · Yahoo 1d full history. Never invented.`,
  };
  const exhDoc = {
    asOf,
    scannedAt,
    universeCount,
    scannedCount,
    failed: failed.map((f) => f.ticker),
    failedDetail: failed,
    signals: exhSignals,
    method: METHOD,
    note: `Canary RelRSI daily Sweaty 🥵/💀 only · last ${RECENT_SESSIONS} sessions · Yahoo 1d full history. Never invented.`,
  };

  writeJson(FISH_OUT, fishDoc);
  writeJson(EXH_OUT, exhDoc);

  if (existsSync(MIRROR_DIR)) {
    try {
      copyFileSync(FISH_OUT, join(MIRROR_DIR, "fish-alerts.json"));
      copyFileSync(EXH_OUT, join(MIRROR_DIR, "exhaustion-alerts.json"));
    } catch (e) {
      console.warn("mirror skip:", e instanceof Error ? e.message : e);
    }
  }

  const smileN = fishSignals.filter((s) => s.signal === "smile").length;
  const fishN = fishSignals.filter((s) => s.signal === "fish").length;
  const bothN = fishSignals.filter((s) => s.signal === "both").length;
  const hotN = exhSignals.filter((s) => s.signal === "exhaustion").length;
  const skullN = exhSignals.filter((s) => s.signal === "skull").length;

  console.log("\n=== Canary RelRSI scan summary (daily) ===");
  console.log(`universe ${universeCount}  scanned ${scannedCount}  failed ${failed.length}`);
  console.log(`🙂/🐟 rows ${fishSignals.length}  (smile ${smileN} · fish ${fishN} · both ${bothN})`);
  console.log(`🥵/💀 (Sweaty) rows ${exhSignals.length}  (🥵 ${hotN} · 💀 ${skullN})`);
  if (failed.length) {
    console.log("failed:", failed.map((f) => `${f.ticker} (${f.error})`).join(" | "));
  }
  console.log(`wrote ${FISH_OUT}`);
  console.log(`wrote ${EXH_OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
