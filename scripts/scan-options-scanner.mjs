#!/usr/bin/env node
/**
 * Options Scanner scan for the PRIVATE owner page /owner (Cloudflare Access + JWT gated).
 * Run nightly by refresh:full-pack (step 9) on the pack's session; a failure never blocks the public pack.
 * All thresholds/filters live in scripts/lib/options-scan-config.mjs.
 *
 * DATA LICENSING: Cboe's terms allow personal, non-commercial use only. This output must never be
 * published: it lives in data/private/options-scan.json (gitignored), is read server-side by the owner page only, and is
 * NOT mirrored to public/ or any public API. See docs/ops/owner-options.md.
 *
 * Held rule: if the Cboe session != --session-date or < 80% of tickers load, the previous
 * data/private/options-scan.json is kept (held:true, heldSince = its own session) and the script exits 3.
 *
 * Data sources
 *   - Option chains: Cboe public delayed-quotes JSON (cdn.cboe.com/api/global/delayed_quotes/options/<SYM>.json)
 *     Yahoo's v7 options endpoint needs a cookie+crumb session and the crumb endpoint returns 429 from this box,
 *     so Yahoo chains are not usable here (see docs/ops/options-scan-test.md). Cboe gives per-contract
 *     bid/ask, volume, open interest, IV and greeks for every listed expiry, plus the ticker's IV30.
 *   - Daily bars for realized vol (HV20): Yahoo v8 chart (same stack as the other scans).
 *
 * Sections (all exclude 0–3 DTE, owner rule)
 *   (all sections also exclude contracts >10% in the money — mostly spread/stock-replacement legs)
 *   1. unusual   — contracts with volume ≥ 3× OI, volume ≥ 500, est. premium (vol × mid × 100) ≥ $100k, valid IV
 *   2. balance   — per-ticker call vs put volume + premium; strong lean when one side ≥ 75% of premium
 *                  and total premium ≥ $1M and total volume ≥ 2,000
 *   3. ivSpikes  — Cboe IV30 vs HV20 (Yahoo daily closes): flag IV30/HV20 ≥ 1.5 or IV30 day change ≥ +15%.
 *                  Also appends each run to data/private/options-iv-history.json to build a real IV baseline.
 *
 * Failed fetches are recorded in `failures`; nothing is invented.
 *
 *   node scripts/scan-options-scanner.mjs [--session-date YYYY-MM-DD]   # full universe
 *   node scripts/scan-options-scanner.mjs --limit 10                     # quick test
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { gzipSync, gunzipSync } from "node:zlib";
import { buildStacks, isFlagged } from "./lib/options-stacks.mjs";
import { join } from "node:path";
import { OPTIONS_SCAN_CONFIG } from "./lib/options-scan-config.mjs";
import { ROOT, YAHOO_UA, loadTickerList, FISH_UNIVERSE_PATH, sleep, nzNowIso } from "./lib/scan-common.mjs";

const OUT_PATH = join(ROOT, "data/private/options-scan.json");
const HIST_PATH = join(ROOT, "data/private/options-iv-history.json");
const CHIST_PATH = join(ROOT, "data/private/options-contract-history.json");
const RAW_DIR = join(ROOT, "data/private/raw");
const { thresholds: T, fetch: F, proxies: PX, history: H, stacks: ST } = OPTIONS_SCAN_CONFIG;
const MIN_OK_SHARE = F.MIN_OK_SHARE;
const NO_OPTIONS = new Set(OPTIONS_SCAN_CONFIG.noOptions);
const CONCURRENCY = F.CONCURRENCY;
const GAP_MS = F.GAP_MS;

import { OPTIONS_SCAN_ENABLED, OPTIONS_SCAN_PAUSED_REASON } from "./lib/options-scan-switch.mjs";

const args = process.argv.slice(2);
const limIdx = args.indexOf("--limit");
const LIMIT = limIdx >= 0 ? Number(args[limIdx + 1]) : Infinity;
const sdIdx = args.indexOf("--session-date");
const SESSION_DATE = sdIdx >= 0 ? args[sdIdx + 1] : null;
const rawIdx = args.indexOf("--from-raw");
const FROM_RAW = rawIdx >= 0 ? args[rawIdx + 1] : null; // re-run offline from data/private/raw/<session>/
const TRACKED = new Map(); // ticker -> Set(OCC symbol) flagged/stored on recent sessions (to record their OI today)

async function getJson(url, headers, label) {
  let last = "";
  const BACKOFF = F.BACKOFF_MS; // Cboe CDN rate-limits bursts (429) — back off politely
  for (let attempt = 1; attempt <= BACKOFF.length; attempt++) {
    try {
      const res = await fetch(url, { headers, redirect: "follow" });
      if (res.status === 429 || res.status >= 500) {
        last = `HTTP ${res.status}`;
        if (attempt < BACKOFF.length) await sleep(BACKOFF[attempt - 1]);
        continue;
      }
      if (!res.ok) return { error: `HTTP ${res.status}` };
      return { data: await res.json() };
    } catch (e) {
      last = String(e?.message || e);
      await sleep(1000 * attempt);
    }
  }
  return { error: `${label}: ${last} after ${BACKOFF.length} tries` };
}

const cboeSym = (t) => t.replace(".", "/"); // not needed for current universe; kept for BRK.B-style names
const cboeLive = (t) => getJson(`https://cdn.cboe.com/api/global/delayed_quotes/options/${encodeURIComponent(cboeSym(t))}.json`, { "User-Agent": YAHOO_UA, Accept: "application/json" }, "cboe");
async function cboe(t) {
  if (!OPTIONS_SCAN_ENABLED && !FROM_RAW) return { error: "options scan paused (no Cboe requests)" }; // belt and braces
  if (FROM_RAW) {
    const f = join(RAW_DIR, FROM_RAW, `${t}.json.gz`);
    if (!existsSync(f)) return { error: "no raw chain" };
    return { data: JSON.parse(gunzipSync(readFileSync(f)).toString("utf8")) };
  }
  return cboeLive(t);
}
function saveRaw(t, session, data) {
  if (FROM_RAW || !session) return;
  try {
    mkdirSync(join(RAW_DIR, session), { recursive: true });
    writeFileSync(join(RAW_DIR, session, `${t}.json.gz`), gzipSync(JSON.stringify(data)));
  } catch { /* raw copy is optional */ }
}
function aggressorOf(last, bid, ask, lastDate, session) {
  if (!(bid > 0 && ask > 0 && ask >= bid && last > 0) || lastDate !== session) return null;
  const mid = (bid + ask) / 2;
  if (last >= mid + PX.AT_ASK_SPREAD_FRACTION * (ask - mid)) return "ask";
  if (last <= mid - PX.AT_ASK_SPREAD_FRACTION * (mid - bid)) return "bid";
  return "mid";
}
const yahooDaily = (t) =>
  getJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(t)}?interval=1d&range=3mo&includePrePost=false`, { "User-Agent": YAHOO_UA, Accept: "application/json" }, "yahoo");

function parseOcc(sym) {
  const m = /^(.+?)(\d{6})([CP])(\d{8})$/.exec(sym);
  if (!m) return null;
  const [, root, ymd, cp, k] = m;
  return { root, expiry: `20${ymd.slice(0, 2)}-${ymd.slice(2, 4)}-${ymd.slice(4, 6)}`, type: cp === "C" ? "call" : "put", strike: Number(k) / 1000 };
}
const daysBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);

function hv(closes, len) {
  const c = closes.filter((x) => typeof x === "number" && x > 0);
  if (c.length < len + 1) return null;
  const r = [];
  for (let i = c.length - len; i < c.length; i++) r.push(Math.log(c[i] / c[i - 1]));
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const v = r.reduce((a, b) => a + (b - mean) ** 2, 0) / (r.length - 1);
  return Math.sqrt(v) * Math.sqrt(252);
}

function moneyness(type, strike, spot) {
  const pct = ((strike - spot) / spot) * 100;
  const otm = type === "call" ? pct : -pct; // + = OTM
  const label = Math.abs(pct) <= 2 ? "ATM" : otm > 0 ? "OTM" : "ITM";
  return { label, pctFromSpot: +pct.toFixed(1) };
}

async function scanTicker(t) {
  const out = { ticker: t };
  const c = await cboe(t);
  if (c.error) return { ...out, error: `chain ${c.error}` };
  const d = c.data?.data;
  if (!d || !Array.isArray(d.options) || !d.options.length) return { ...out, error: "chain empty" };
  const spot = d.current_price ?? d.close;
  const session = (d.last_trade_time || "").slice(0, 10);
  saveRaw(t, session, c.data);
  out.secType = d.security_type || null;
  out.spot = spot;
  out.session = session;
  out.iv30 = typeof d.iv30 === "number" ? d.iv30 : null; // percent
  out.iv30ChangePct = typeof d.iv30_change_percent === "number" ? d.iv30_change_percent : null;

  const contracts = [];
  for (const o of d.options) {
    const p = parseOcc(o.option);
    if (!p) continue;
    const dte = daysBetween(session, p.expiry);
    const bid = o.bid || 0, ask = o.ask || 0;
    const mid = bid > 0 && ask > 0 ? (bid + ask) / 2 : o.last_trade_price || 0;
    const last = o.last_trade_price || 0;
    const aggr = aggressorOf(last, bid, ask, (o.last_trade_time || "").slice(0, 10), session);
    contracts.push({ ...p, sym: o.option, dte, bid, ask, mid, last, aggr, volume: o.volume || 0, oi: o.open_interest || 0, iv: o.iv ?? null, delta: o.delta ?? null });
  }
  // Per-session snapshot rows (superset of every stack) + OI/volume of contracts tracked from recent sessions.
  const itm = (x) => (x.type === "call" ? (spot - x.strike) / spot : (x.strike - spot) / spot) * 100;
  const tracked = TRACKED.get(t) || new Set();
  out.snap = {};
  out.tracked = {};
  for (const x of contracts) {
    const premium = Math.round(x.volume * x.mid * 100);
    const isCand = x.dte >= T.MIN_DTE && x.mid > 0 && x.volume >= H.SNAPSHOT_MIN_VOL && premium >= H.SNAPSHOT_MIN_PREMIUM && x.volume >= H.SNAPSHOT_MIN_VOL_OI * x.oi;
    if (isCand) {
      const row = {
        t, type: x.type, k: x.strike, exp: x.expiry, dte: x.dte, v: x.volume, oi: x.oi, prem: premium,
        mid: +x.mid.toFixed(3), bid: x.bid, ask: x.ask, last: x.last, aggr: x.aggr, iv: x.iv != null ? +(x.iv * 100).toFixed(1) : null,
        spot, sec: out.secType, itm: +itm(x).toFixed(1),
      };
      row.flag = isFlagged(row, T) ? 1 : 0;
      out.snap[x.sym] = row;
    } else if (tracked.has(x.sym)) {
      out.tracked[x.sym] = { v: x.volume, oi: x.oi, dte: x.dte };
    }
  }
  const itmPct = (x) => (x.type === "call" ? (spot - x.strike) / spot : (x.strike - spot) / spot) * 100;
  const eligible = contracts.filter((x) => x.dte >= T.MIN_DTE && itmPct(x) <= T.DEEP_ITM_PCT);
  out.excludedDeepItmVolume = contracts.filter((x) => x.dte >= T.MIN_DTE && itmPct(x) > T.DEEP_ITM_PCT).reduce((a, x) => a + x.volume, 0);

  // 1. unusual
  out.unusual = eligible
    .filter((x) => x.volume >= T.UNUSUAL_MIN_VOL && x.volume >= T.UNUSUAL_VOL_OI * x.oi && x.mid > 0 && x.iv > 0) // iv 0 = no valid Cboe quote
    .map((x) => {
      const premium = Math.round(x.volume * x.mid * 100);
      return {
        ticker: t, type: x.type, strike: x.strike, expiry: x.expiry, dte: x.dte, volume: x.volume, oi: x.oi,
        volOi: x.oi > 0 ? +(x.volume / x.oi).toFixed(1) : null, iv: x.iv != null ? +(x.iv * 100).toFixed(1) : null,
        mid: +x.mid.toFixed(2), premium, ...moneyness(x.type, x.strike, spot),
      };
    })
    .filter((x) => x.premium >= T.UNUSUAL_MIN_PREMIUM);

  // 2. balance
  const sum = (type, f) => eligible.filter((x) => x.type === type).reduce((a, x) => a + f(x), 0);
  const callVol = sum("call", (x) => x.volume), putVol = sum("put", (x) => x.volume);
  const callPrem = Math.round(sum("call", (x) => x.volume * x.mid * 100)), putPrem = Math.round(sum("put", (x) => x.volume * x.mid * 100));
  const totPrem = callPrem + putPrem;
  const callShare = totPrem > 0 ? callPrem / totPrem : null;
  let lean = null;
  if (callShare != null && totPrem >= T.LEAN_MIN_PREMIUM && callVol + putVol >= T.LEAN_MIN_VOLUME) {
    if (callShare >= T.LEAN_SHARE) lean = "call";
    else if (callShare <= 1 - T.LEAN_SHARE) lean = "put";
  }
  out.balance = { callVol, putVol, putCallVolRatio: callVol > 0 ? +(putVol / callVol).toFixed(2) : null, callPrem, putPrem, callPremShare: callShare != null ? +callShare.toFixed(3) : null, lean };

  // 3. ATM IV (nearest expiry with DTE ≥ 7, strike nearest spot, avg call+put)
  const exps = [...new Set(contracts.filter((x) => x.dte >= T.ATM_MIN_DTE).map((x) => x.expiry))].sort();
  if (exps.length) {
    const e = exps[0];
    const atE = contracts.filter((x) => x.expiry === e && x.iv > 0);
    const k = atE.reduce((best, x) => (best == null || Math.abs(x.strike - spot) < Math.abs(best - spot) ? x.strike : best), null);
    const ivs = atE.filter((x) => x.strike === k).map((x) => x.iv);
    out.atm = ivs.length ? { expiry: e, dte: daysBetween(session, e), strike: k, iv: +((ivs.reduce((a, b) => a + b, 0) / ivs.length) * 100).toFixed(1) } : null;
  }

  await sleep(GAP_MS);
  const y = await yahooDaily(t);
  if (y.error) out.hvError = y.error;
  else {
    const closes = y.data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const h = hv(closes, T.HV_LEN);
    out.hv20 = h != null ? +(h * 100).toFixed(1) : null;
    if (h == null) out.hvError = "insufficient daily bars";
  }
  return out;
}

async function main() {
  if (!OPTIONS_SCAN_ENABLED && !FROM_RAW) {
    console.log(`${OPTIONS_SCAN_PAUSED_REASON}: OPTIONS_SCAN_ENABLED is not "true", so no Cboe requests were made. Last scan kept.`);
    process.exit(0);
  }
  const t0 = Date.now();
  const universe = loadTickerList(FISH_UNIVERSE_PATH);
  const tickers = universe.filter((t) => !NO_OPTIONS.has(t)).slice(0, LIMIT);
  const skipped = universe.filter((t) => NO_OPTIONS.has(t));
  console.log(`Options Scanner · universe ${universe.length} · scanning ${tickers.length} · skipped (no listed options) ${skipped.join(",")}`);

  // Contract history (per-session snapshots) → contracts to track today (their OI confirms yesterday's flags).
  const chist = existsSync(CHIST_PATH) ? JSON.parse(readFileSync(CHIST_PATH, "utf8")) : { note: "Per-session contract snapshots for opening confirmation + repeat flow (private, Cboe delayed)", sessions: {} };
  const recent = Object.keys(chist.sessions).sort().filter((d) => !SESSION_DATE || d < SESSION_DATE).slice(-Math.max(ST.repeat.WINDOW_SESSIONS, ST.LOOKBACK_SESSIONS));
  for (const d of recent) {
    for (const [sym, r] of Object.entries(chist.sessions[d].snap || {})) {
      if (!TRACKED.has(r.t)) TRACKED.set(r.t, new Set());
      TRACKED.get(r.t).add(sym);
    }
  }

  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < tickers.length) {
      const t = tickers[idx++];
      const r = await scanTicker(t);
      results.push(r);
      process.stdout.write(`${r.error ? "x" : "."}`);
      await sleep(GAP_MS);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log("");
  // Second pass: retry chain failures once, sequentially, after a pause.
  const retry = results.filter((r) => r.error).map((r) => r.ticker);
  if (retry.length) {
    console.log(`retrying ${retry.length} failed tickers after 60s pause…`);
    await sleep(60000);
    for (const t of retry) {
      const r = await scanTicker(t);
      const i = results.findIndex((x) => x.ticker === t);
      results[i] = r;
      process.stdout.write(`${r.error ? "x" : "."}`);
      await sleep(1500);
    }
    console.log("");
  }

  const ok = results.filter((r) => !r.error);
  const sessions = ok.map((r) => r.session).filter(Boolean);
  const counts = sessions.reduce((m, s) => ((m[s] = (m[s] || 0) + 1), m), {});
  const session = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const stale = ok.filter((r) => r.session !== session).map((r) => ({ ticker: r.ticker, session: r.session }));

  const unusual = ok.flatMap((r) => r.unusual).sort((a, b) => b.premium - a.premium);
  const balance = ok
    .map((r) => ({ ticker: r.ticker, ...r.balance }))
    .sort((a, b) => b.callPrem + b.putPrem - (a.callPrem + a.putPrem));
  const ivRows = ok
    .filter((r) => r.iv30 != null)
    .map((r) => ({
      ticker: r.ticker, iv30: +r.iv30.toFixed(1), iv30ChangePct: r.iv30ChangePct != null ? +r.iv30ChangePct.toFixed(1) : null,
      atmIv: r.atm?.iv ?? null, atmExpiry: r.atm?.expiry ?? null, hv20: r.hv20 ?? null,
      ivHv: r.hv20 ? +(r.iv30 / r.hv20).toFixed(2) : null,
    }));
  const ivSpikes = ivRows
    .filter((r) => (r.ivHv != null && r.ivHv >= T.IV_HV_SPIKE) || (r.iv30ChangePct != null && r.iv30ChangePct >= T.IV30_DAY_CHANGE_SPIKE_PCT))
    .sort((a, b) => (b.ivHv ?? 0) - (a.ivHv ?? 0));
  const failures = results.filter((r) => r.error).map((r) => ({ ticker: r.ticker, error: r.error }))
    .concat(ok.filter((r) => r.hvError).map((r) => ({ ticker: r.ticker, error: `hv20 ${r.hvError}` })));

  const prev = existsSync(OUT_PATH) ? JSON.parse(readFileSync(OUT_PATH, "utf8")) : null;
  const okShare = tickers.length ? ok.length / tickers.length : 0;
  const reasons = [];
  if (!session) reasons.push("no session in Cboe data");
  if (SESSION_DATE && session && session !== SESSION_DATE) reasons.push(`Cboe session ${session} != requested ${SESSION_DATE}`);
  if (okShare < MIN_OK_SHARE) reasons.push(`only ${ok.length}/${tickers.length} tickers loaded`);
  const runtimeSec = +((Date.now() - t0) / 1000).toFixed(1);

  if (reasons.length) {
    // Owner held rule: keep the last reading, label "held since <its session>". Never invent.
    const heldDoc = prev && prev.asOfSession
      ? { ...prev, held: true, heldSince: prev.asOfSession, lastAttempt: { at: nzNowIso(), reasons, failures: failures.length } }
      : { asOf: null, asOfSession: null, placeholder: true, held: true, heldSince: null, unusual: [], leans: [], ivSpikes: [], lastAttempt: { at: nzNowIso(), reasons } };
    writeFileSync(OUT_PATH, JSON.stringify(heldDoc, null, 2) + "\n");
    console.error(`HELD: ${reasons.join("; ")} — kept previous ${prev?.asOfSession ?? "(none)"}`);
    process.exit(3);
  }

  // Store this session's snapshot, prune, build the three stacks.
  const snap = {}, trackedToday = {};
  for (const r of ok) {
    if (r.session !== session) continue;
    Object.assign(snap, r.snap);
    Object.assign(trackedToday, r.tracked);
  }
  chist.sessions[session] = { storedAt: nzNowIso(), snap, tracked: trackedToday };
  const keep = Object.keys(chist.sessions).sort().slice(-H.KEEP_SESSIONS);
  chist.sessions = Object.fromEntries(keep.map((d) => [d, chist.sessions[d]]));
  const stacks = buildStacks(chist, session, OPTIONS_SCAN_CONFIG);

  const out = {
    box: "Options Scanner",
    asOf: session,
    asOfSession: session,
    held: false,
    heldSince: null,
    generatedAt: nzNowIso(),
    attribution: "Options data: Cboe (delayed). Realized vol: Yahoo daily bars.",
    method: "cboe-delayed-chains+yahoo-1d-hv20",
    thresholds: T,
    config: { proxies: PX, stacks: ST, history: { KEEP_SESSIONS: H.KEEP_SESSIONS } },
    stacks,
    historyInfo: { sessions: keep.length, dates: keep, snapshotContracts: Object.keys(snap).length, trackedContracts: Object.keys(trackedToday).length },
    runtimeSec,
    counts: { universe: universe.length, scanned: tickers.length, ok: ok.length, failures: failures.length, unusual: unusual.length, leans: balance.filter((b) => b.lean).length, ivSpikes: ivSpikes.length, skippedNoOptions: skipped },
    stale,
    unusual: unusual.slice(0, T.UNUSUAL_MAX_ROWS),
    leans: balance.filter((b) => b.lean),
    ivSpikes,
    failures,
  };
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");
  writeFileSync(CHIST_PATH, JSON.stringify(chist) + "\n");
  // prune raw chains
  if (existsSync(RAW_DIR)) {
    const rawDates = readdirSync(RAW_DIR).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
    for (const d of rawDates.slice(0, Math.max(0, rawDates.length - H.RAW_KEEP_SESSIONS))) rmSync(join(RAW_DIR, d), { recursive: true, force: true });
  }

  const hist = existsSync(HIST_PATH) ? JSON.parse(readFileSync(HIST_PATH, "utf8")) : { note: "Per-session IV30/ATM IV/HV20 snapshots from scan-options-scanner.mjs (IV-rank baseline)", sessions: {} };
  hist.sessions[session] = Object.fromEntries(ivRows.map((r) => [r.ticker, { iv30: r.iv30, atmIv: r.atmIv, hv20: r.hv20 }]));
  writeFileSync(HIST_PATH, JSON.stringify(hist, null, 2) + "\n");

  console.log(`stacks · aggressive ${stacks.aggressive.rows.length} · swing ${stacks.swing.rows.length} · repeat ${stacks.repeat.rows.length} · history ${keep.length} session(s)`);
  console.log(`session ${session} · ok ${ok.length}/${tickers.length} · failures ${failures.length} · stale ${stale.length} · unusual ${unusual.length} · leans ${out.counts.leans} · ivSpikes ${ivSpikes.length} · ${runtimeSec}s`);
}
main();
