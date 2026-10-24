#!/usr/bin/env node
/**
 * Members Signal History — post-close update (owner approved t566u 2026-10-07; History tab live).
 * Re-runs the CURRENT engines over Yahoo daily history and merges bullish marks into
 * data/signal-history.json:
 *   🐟 fish / 🙂 smile — Canary RelRSI daily (src/lib/canaryTopsBottoms.mjs, same config as the boxes)
 *   💵 mfi            — MFI Washout v6.1 (scripts/lib/mfi-washout-v6.1.mjs, owner t577u 2026-10-07),
 *                       MFI universe only (stocks ∪ Sector ETFs, same as the live MFI Scan box).
 *                       MFI_ENGINE=v6 rolls back. When the stored `mfiEngine` differs from the
 *                       current engine, ALL 💵 rows are rebuilt over the window (🐟/🙂 untouched).
 * Universes: fish-universe (stocks), etf-watch (Sector ETFs), etf-country (Countries), crypto-watch.
 *
 * Default (pack) mode — idempotent:
 *   · adds marks from the last --recent sessions (default 10, so a missed day self-heals) that are
 *     not already stored (key = date|ticker|kind); existing rows and their price-at-mark are kept;
 *   · refreshes price now (last completed close) for every ticker in the file;
 *   · tickers that left the universe keep their rows and are tagged removed ("Left universe");
 *   · prunes rows older than the rolling window (--sessions, default 126 ≈ 6 months).
 * --backfill rebuilds from scratch over the whole window.
 * "In a box now" is joined at render time from the same pack's box files (src/lib/loadSignalHistory.ts).
 * Refuses to write (exit 1) if too many fetches fail — the pack logs a warning and keeps the old file.
 *
 * row = { d, t, k: "fish"|"smile"|"mfi", g: "stock"|"sector"|"country"|"crypto", p: close on the mark bar }
 * tickers[t] = { name, g, last, lastAsOf, removed?, removedSince? }
 * PRIVATE members data. Thresholds are not stored.
 *
 * Usage: node scripts/update-signal-history.mjs [--session-date YYYY-MM-DD] [--recent 10]
 *        [--sessions 126] [--backfill] [--dry-run] [--limit N] [--out path] [--rebuild-mfi]
 *        [--backfill-tickers SIRI,XYZ]  — newly added tickers only: fetch just these and add their marks
 *        over the WHOLE window (other tickers' rows/meta untouched). Owner t631u 2026-10-10 (SIRI).
 */
import { existsSync, readFileSync, renameSync, writeFileSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { runCanaryTopsBottoms } from "../src/lib/canaryTopsBottoms.mjs";
import { CANARY_TOPS_BOTTOMS, CANARY_TOPS_BOTTOMS_VERSION } from "../src/lib/canaryTopsBottomsConfig.mjs";
import { mfiWashoutV6 } from "./lib/mfi-washout-v6.mjs";
import { mfiWashoutV61 } from "./lib/mfi-washout-v6.1.mjs";

const MFI_ENGINE = process.env.MFI_ENGINE === "v6" ? "v6" : "v6.1";
const mfiSignals = (bars) => (MFI_ENGINE === "v6" ? mfiWashoutV6(bars) : mfiWashoutV61(bars)).bottomSignal;
import { ROOT, MIRROR_DIR, YAHOO_UA, sleep, pool, nzNowIso } from "./lib/scan-common.mjs";

// Cached formatter per zone. (scan-common's ymdInTz builds a new Intl.DateTimeFormat per call, which
// across ~3.5M bars blew the box's memory — OOM 2026-10-07.)
const YMD_FMT = new Map();
function ymdInTz(unixSec, timeZone) {
  let f = YMD_FMT.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    YMD_FMT.set(timeZone, f);
  }
  return f.format(new Date(unixSec * 1000));
}
const KEEP_BARS = 200; // after the engines run, only recent bars are needed (calendar + prices)

let OUT = join(ROOT, "data/signal-history.json");
const MAX_FAIL_SHARE = 0.2;
const SYMBOL_CANDIDATES = {
  BTCUSD: ["BTC-USD"], ETHUSD: ["ETH-USD"], SOLUSD: ["SOL-USD"], BNBUSD: ["BNB-USD"], XRPUSD: ["XRP-USD"],
  TRXUSD: ["TRX-USD"], FIGRHELOCUSD: ["FIGRHELOC-USD"], ZECUSD: ["ZEC-USD"], HYPEUSD: ["HYPE32196-USD", "HYPE-USD"],
  DOGEUSD: ["DOGE-USD"], LINKUSD: ["LINK-USD"], XMRUSD: ["XMR-USD"], WBTUSD: ["WBT-USD"], ADAUSD: ["ADA-USD"],
  LEOUSD: ["LEO-USD"], RAINUSD: ["RAIN38341-USD", "RAIN-USD"], XLMUSD: ["XLM-USD"], NEARUSD: ["NEAR-USD"],
  BCHUSD: ["BCH-USD"], UNIUSD: ["UNI7083-USD", "UNI-USD"], DIMEUSD: ["DIME39656-USD", "DIME-USD"],
  TOTAL: ["TOTAL", "TOTAL.D", "^CMC200"], XAUUSD: ["GC=F", "XAUUSD=X"], XAGUSD: ["SI=F", "XAGUSD=X"],
  SPX: ["^GSPC"], SP600: ["^SP600"],
};

function parseArgs(argv) {
  const o = { sessions: 126, recent: 10, sessionDate: null, backfill: false, dryRun: false, limit: 0 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--sessions") o.sessions = Number(argv[++i]);
    else if (a === "--recent") o.recent = Number(argv[++i]);
    else if (a === "--session-date") o.sessionDate = argv[++i];
    else if (a === "--backfill") o.backfill = true;
    else if (a === "--dry-run") o.dryRun = true;
    else if (a === "--limit") o.limit = Number(argv[++i]);
    else if (a === "--backfill-tickers") o.backfillTickers = argv[++i].split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
    else if (a === "--out") o.out = argv[++i]; // testing: read/write another file, no mirror
    else if (a === "--rebuild-mfi") o.rebuildMfi = true;
  }
  return o;
}

const readU = (f) => {
  const d = JSON.parse(readFileSync(join(ROOT, "data", f), "utf8"));
  const t = Array.isArray(d.tickers) && d.tickers.length ? d.tickers : (d.groups || []).flatMap((g) => g.tickers || []);
  return { tickers: [...new Set(t)], names: d.names || {} };
};

// Full DAILY history. Yahoo range=max + 1d silently returns quarterly/monthly bars, so request
// period1=0 → now instead (same as scan-fish-v3.mjs).
async function yahooDailyMax(symbol) {
  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=1d&period1=0&period2=${Math.floor(Date.now() / 1000)}&includePrePost=false`;
  const opts = { headers: { "User-Agent": YAHOO_UA, Accept: "application/json" } };
  let res = await fetch(url, opts);
  if (res.status === 429) {
    await sleep(1500);
    res = await fetch(url, opts);
  }
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return { data: await res.json() };
}

async function fetchBars(symbol, sessionDate) {
  let got;
  try {
    got = await yahooDailyMax(symbol);
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  if (got.error) return { error: got.error };
  const r = got.data?.chart?.result?.[0];
  if (!r) return { error: got.data?.chart?.error?.description || "no result" };
  const meta = r.meta || {};
  const isCrypto = String(meta.instrumentType || "").toUpperCase() === "CRYPTOCURRENCY";
  const tz = isCrypto ? "UTC" : "America/New_York";
  const q = r.indicators?.quote?.[0] || {};
  const byDate = new Map();
  (r.timestamp || []).forEach((t, i) => {
    const [o, h, l, c, v] = [q.open?.[i], q.high?.[i], q.low?.[i], q.close?.[i], q.volume?.[i]];
    if (t == null || o == null || h == null || l == null || c == null) return;
    if (![o, h, l, c].every((x) => Number.isFinite(Number(x)))) return;
    byDate.set(ymdInTz(t, tz), { t, open: +o, high: +h, low: +l, close: +c, volume: v == null ? null : +v, asOf: ymdInTz(t, tz) });
  });
  let bars = [...byDate.values()].sort((a, b) => a.t - b.t);
  const now = Date.now() / 1000;
  if (bars.length) {
    // Completed bars only (same rule as scan-fish-v3.mjs).
    const last = bars[bars.length - 1];
    if (isCrypto) {
      if (last.asOf === ymdInTz(now, "UTC")) bars.pop();
    } else {
      const reg = meta.currentTradingPeriod?.regular;
      if (reg && now < reg.end && last.t >= reg.start - 43200) bars.pop();
    }
  }
  if (sessionDate) bars = bars.filter((b) => b.asOf <= sessionDate);
  if (bars.length < 70) return { error: `too few bars (${bars.length})` };
  return { bars, name: meta.longName || meta.shortName || null, isCrypto };
}

function loadExisting() {
  if (!existsSync(OUT)) return null;
  try {
    const d = JSON.parse(readFileSync(OUT, "utf8"));
    return Array.isArray(d.rows) && d.tickers ? d : null;
  } catch {
    return null;
  }
}

async function main() {
  const a = parseArgs(process.argv);
  if (a.out) OUT = a.out;
  const existing = a.backfill ? null : loadExisting();
  const mode = existing ? "update" : "backfill";

  const universes = [
    ["stock", readU("fish-universe.json"), true],
    ["sector", readU("etf-watch-universe.json"), true],
    ["country", readU("etf-country-universe.json"), false],
    ["crypto", readU("crypto-watch-universe.json"), false],
  ];
  const jobs = [];
  const inUniverse = new Set();
  for (const [g, u, mfi] of universes) {
    for (const t of u.tickers) {
      if (inUniverse.has(t)) continue;
      inUniverse.add(t);
      jobs.push({ t, g, mfi, name: u.names[t] || null, priceOnly: false });
    }
  }
  // Tickers that left the universe: keep their history, refresh price now only (no new marks).
  for (const [t, m] of Object.entries(existing?.tickers ?? {})) {
    if (!inUniverse.has(t)) jobs.push({ t, g: m.g || "stock", mfi: false, name: m.name || null, priceOnly: true });
  }
  const only = a.backfillTickers?.length ? new Set(a.backfillTickers) : null;
  if (only && !existing) {
    console.error("--backfill-tickers needs an existing signal-history.json (use --backfill for a full rebuild).");
    process.exit(1);
  }
  const picked = only ? jobs.filter((j) => only.has(j.t) && !j.priceOnly) : jobs;
  if (only && picked.length !== only.size) {
    console.error(`--backfill-tickers: not in any universe: ${[...only].filter((t) => !picked.some((j) => j.t === t)).join(", ")}`);
    process.exit(1);
  }
  const list = a.limit ? picked.slice(0, a.limit) : picked;
  console.log(
    `Signal history ${mode}${a.dryRun ? " (dry run)" : ""} · ${list.length} tickers` +
      ` (${list.filter((j) => j.priceOnly).length} left universe) · window ${a.sessions} sessions` +
      (only ? ` · backfill ${[...only].join(", ")} over the whole window` : mode === "update" ? ` · add marks from last ${a.recent} sessions` : "")
  );

  const results = await pool(list, 4, async (job) => {
    let err = "no candidates";
    for (const sym of SYMBOL_CANDIDATES[job.t] || [job.t]) {
      const got = await fetchBars(sym, a.sessionDate);
      if (got.error) {
        err = `${sym}: ${got.error}`;
        continue;
      }
      const { bars } = got;
      const marks = [];
      if (!job.priceOnly) {
        const { events } = runCanaryTopsBottoms(bars, CANARY_TOPS_BOTTOMS);
        for (const e of events) if (e.kind === "fish" || e.kind === "smile") marks.push({ d: e.asOf, k: e.kind, i: e.i });
        if (job.mfi && bars.slice(-20).some((b) => (b.volume || 0) > 0)) {
          const bottomSignal = mfiSignals(bars);
          bottomSignal.forEach((s, i) => s && marks.push({ d: bars[i].asOf, k: "mfi", i }));
        }
      }
      // Keep only what the merge needs (marks carry their price now; calendar uses recent bars).
      const cut = Math.max(0, bars.length - KEEP_BARS);
      const kept = marks
        .filter((m) => m.i >= cut)
        .map((m) => ({ d: m.d, k: m.k, p: +bars[m.i].close.toFixed(4) }));
      return { ok: true, job, bars: bars.slice(cut), marks: kept, name: job.name || got.name };
    }
    return { ok: false, job, err };
  }, 160);

  const failed = results.filter((r) => !r.ok).map((r) => ({ ticker: r.job.t, error: r.err }));
  const failShare = failed.length / Math.max(1, results.length);
  if (failShare > MAX_FAIL_SHARE) {
    console.error(`ABORT: ${failed.length}/${results.length} fetches failed (> ${MAX_FAIL_SHARE * 100}%). Existing file kept.`);
    process.exit(1);
  }

  // Session calendar from US-listed stocks.
  const counts = new Map();
  const eq = results.filter((r) => r.ok && (r.job.g === "stock" || only) && !r.job.priceOnly);
  for (const r of eq) for (const b of r.bars.slice(-a.sessions - 10)) counts.set(b.asOf, (counts.get(b.asOf) || 0) + 1);
  const sessions = [...counts].filter(([, c]) => c >= eq.length / 2).map(([d]) => d).sort();
  if (sessions.length < Math.min(a.sessions, 20)) {
    console.error(`ABORT: session calendar too short (${sessions.length}). Existing file kept.`);
    process.exit(1);
  }
  const windowSessions = sessions.slice(-a.sessions);
  const windowStart = windowSessions[0];
  const asOf = windowSessions[windowSessions.length - 1];
  if (existing?.asOf && asOf < existing.asOf) {
    console.warn(`note: computed session ${asOf} is older than stored ${existing.asOf} (older --session-date?); merging anyway.`);
  }
  const addFrom = mode === "update" && !only ? sessions.slice(-a.recent)[0] : windowStart;

  // 💵 engine change (e.g. v6 → v6.1): rebuild every 💵 row in the window for tickers scanned OK.
  const rebuildMfi = mode === "update" && (a.rebuildMfi || (existing?.mfiEngine ?? "v6") !== MFI_ENGINE);
  const okTickers = new Set(results.filter((r) => r.ok && !r.job.priceOnly).map((r) => r.job.t));

  // Merge rows (idempotent on date|ticker|kind; stored price-at-mark wins).
  const rowMap = new Map();
  const before = existing?.rows?.length ?? 0;
  let mfiDropped = 0;
  for (const r of existing?.rows ?? []) {
    if (rebuildMfi && r.k === "mfi" && okTickers.has(r.t)) {
      mfiDropped++;
      continue;
    }
    rowMap.set(`${r.d}|${r.t}|${r.k}`, r);
  }
  let added = 0;
  for (const r of results) {
    if (!r.ok || r.job.priceOnly) continue;
    const lastAsOf = r.bars[r.bars.length - 1].asOf;
    for (const m of r.marks) {
      const from = rebuildMfi && m.k === "mfi" ? windowStart : addFrom;
      if (m.d < from || m.d < windowStart) continue;
      if (r.job.g !== "crypto" && m.d > asOf) continue;
      if (m.d > lastAsOf) continue;
      const key = `${m.d}|${r.job.t}|${m.k}`;
      if (rowMap.has(key)) continue;
      rowMap.set(key, { d: m.d, t: r.job.t, k: m.k, g: r.job.g, p: m.p });
      added++;
    }
  }
  let pruned = 0;
  for (const [key, r] of rowMap) {
    if (r.d < windowStart) {
      rowMap.delete(key);
      pruned++;
    }
  }
  const rows = [...rowMap.values()].sort((x, y) =>
    x.d !== y.d ? (x.d < y.d ? 1 : -1) : x.k.localeCompare(y.k) || x.t.localeCompare(y.t)
  );

  // Ticker meta: refresh price now; tag left-universe tickers instead of deleting them.
  const used = new Set(rows.map((r) => r.t));
  const tickers = {};
  const prevMeta = existing?.tickers ?? {};
  const byTicker = new Map(results.map((r) => [r.job.t, r]));
  const leftUniverse = [];
  for (const t of new Set([...Object.keys(prevMeta), ...results.filter((r) => r.ok).map((r) => r.job.t)])) {
    const prev = prevMeta[t] ?? {};
    const r = byTicker.get(t);
    const removed = !inUniverse.has(t);
    if (removed && !used.has(t)) continue; // left the universe and its rows aged out
    const meta = { name: prev.name ?? null, g: prev.g ?? r?.job.g ?? "stock" };
    if (r?.ok) {
      const last = r.bars[r.bars.length - 1];
      meta.name = r.job.name || prev.name || r.name || null;
      if (!r.job.priceOnly) meta.g = r.job.g;
      meta.last = +last.close.toFixed(4);
      meta.lastAsOf = last.asOf;
    } else {
      if (prev.last != null) meta.last = prev.last;
      if (prev.lastAsOf) meta.lastAsOf = prev.lastAsOf;
    }
    if (removed) {
      meta.removed = true;
      meta.removedSince = prev.removedSince ?? asOf;
      leftUniverse.push(t);
    }
    tickers[t] = meta;
  }

  const doc = {
    asOf,
    windowStart,
    sessions: windowSessions.length,
    builtAt: existing?.builtAt ?? nzNowIso(),
    updatedAt: nzNowIso(),
    method: `fish/smile ${CANARY_TOPS_BOTTOMS_VERSION} · mfi MFI Washout ${MFI_ENGINE} · Yahoo 1d · ${mode}`,
    mfiEngine: MFI_ENGINE,
    note:
      "Members-only signal history (🐟 / 🙂 / 💵). Backfilled by re-running the current engines, then each post-close run adds new marks. Never invented.",
    counts: rows.reduce((o, r) => ((o[r.k] = (o[r.k] || 0) + 1), o), {}),
    failed,
    lastRun: { mode, added, pruned, leftUniverse: leftUniverse.length, addFrom, mfiRebuilt: rebuildMfi, mfiDropped, at: nzNowIso() },
    rows,
    tickers,
  };
  console.log(
    `window ${windowStart} → ${asOf} (${windowSessions.length} sessions) · rows ${before} → ${rows.length}` +
      ` (+${added} added, −${pruned} pruned${rebuildMfi ? `, 💵 rebuilt with ${MFI_ENGINE}: −${mfiDropped} old 💵 rows` : ""}) · left universe ${leftUniverse.length} · failed ${failed.length}`
  );
  if (failed.length) console.log("failed:", failed.map((f) => `${f.ticker} (${f.error})`).join(" | "));
  if (a.dryRun) return;
  const tmp = `${OUT}.tmp`;
  writeFileSync(tmp, JSON.stringify(doc) + "\n");
  renameSync(tmp, OUT);
  if (!a.out && existsSync(MIRROR_DIR)) {
    try {
      copyFileSync(OUT, join(MIRROR_DIR, "signal-history.json"));
    } catch (e) {
      console.warn("mirror skip signal-history.json:", e instanceof Error ? e.message : e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
