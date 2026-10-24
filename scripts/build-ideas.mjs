#!/usr/bin/env node
/**
 * Ideas (PREVIEW): one ranked Top 10 Longs / Top 10 Shorts from every existing signal.
 * Writes data/ideas.json. Rules: docs/ideas.md. Education only; numbers come from pack JSON + Yahoo daily bars.
 * Run after build-pessimism-board.mjs. Does not mirror to /home/box/canaries.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, yahooChart, ymdInTz, pool, writeJson, nzNowIso } from "./lib/scan-common.mjs";

const J = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const growth = J("data/growth-score.json").tickers;
const fish = J("data/fish-alerts.json"), mfi = J("data/money-flow-alerts.json"), exh = J("data/exhaustion-alerts.json");
const sh = J("data/setups-history.json"), state = J("data/state.json"), comm = J("data/commentary.json");
const pess = J("data/pessimism-board.json");
const asOf = fish.asOf;

// Sector/theme map (same hand map as the owner weekly preview).
const SEC = {};
const m = (e, s) => s.split(" ").forEach((t) => (SEC[t] = e));
m("SMH", "NVDA AMD AVGO TSM MU INTC MRVL ARM QCOM AMAT LRCX KLAC ASML ALAB CRDO CBRS MPWR SITM SMTC RMBS TER ON LSCC NXPI VICR ENTG FORM ADI MCHP ACLS KEYS FN AMKR GFS ONTO");
m("XLK", "AAPL APH ZBRA HPE GRMN COHR LITE CIEN AAOI ANET CLS GLW SNDK STX WDC DELL SMCI NTAP IONQ");
m("IGV", "MSFT CRM NOW SNPS ORCL PLTR APP SHOP SNOW NET MDB DDOG CRWD ZS PANW FTNT RBRK S PATH OKTA SOUN ZETA U ACN FRSH NCNO TEM CRWV NBIS INTU ADBE WDAY CHKP TEAM RBLX HUBS");
m("XLC", "META GOOG NFLX SNAP SIRI");
m("XLY", "TSLA AMZN CAKE MELI RIVN NIO CVNA SE DKNG DASH UBER GRAB ABNB");
m("XLP", "EL CELH");
m("XLI", "ROK CAT CTAS GEV PWR VRT FIX EME BE DE SYM STRL BA MTZ");
m("ITA", "RKLB ASTS AVAV KTOS ONDS RDW SPCX");
m("XLV", "ISRG LLY HIMS OSCR FMS SYK DXCM PODD");
m("IBB", "VKTX MRNA WGS GH");
m("XLF", "PYPL HOOD SOFI AFRM UPST NU XYZ CRCL LMND COIN");
m("IBIT", "IREN APLD HUT RIOT CORZ CLSK BMNR");
m("URA", "OKLO LEU CCJ NXE UUUU BWXT");
m("TAN", "FSLR ENPH");
m("XME", "ALB FCX");
m("GDX", "HL PAAS WPM NEM");
m("XLRE", "O");
const SNAME = { SMH: "Semiconductors", IGV: "Software", XLK: "Technology", XLC: "Communication", XLY: "Discretionary", XLP: "Staples", XLI: "Industrials", ITA: "Aerospace & defence", XLV: "Health care", IBB: "Biotech", XLF: "Financials", KRE: "Regional banks", XLE: "Energy", XME: "Metals & mining", GDX: "Gold miners", GLD: "Gold", SLV: "Silver", URA: "Uranium", TAN: "Solar", IBIT: "Bitcoin", XLB: "Materials", XLU: "Utilities", XLRE: "Real estate", KWEB: "China internet", IWM: "Small caps" };

async function bars(sym) {
  const got = await yahooChart(sym, { interval: "1d", range: "1y&events=split" });
  const r = got.data?.chart?.result?.[0];
  if (!r) return null;
  const q = r.indicators.quote[0], adj = r.indicators.adjclose?.[0]?.adjclose ?? [];
  const out = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const d = ymdInTz(r.timestamp[i], "America/New_York");
    if (d > asOf || q.close[i] == null || q.high[i] == null || q.low[i] == null) continue;
    const k = adj[i] != null ? adj[i] / q.close[i] : 1;
    out.push({ d, c: q.close[i], h: q.high[i], l: q.low[i], v: q.volume[i] ?? 0, ac: q.close[i] * k, ah: q.high[i] * k });
  }
  return { bars: out, splits: Object.values(r.events?.splits ?? {}).map((s) => ({ d: ymdInTz(s.date, "America/New_York"), ratio: s.splitRatio })) };
}
const sma = (a, n, end = a.length) => a.slice(end - n, end).reduce((s, x) => s + x, 0) / n;
function rsi(c, n = 14) { const o = []; let g = 0, l = 0; for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; d > 0 ? (g += d) : (l -= d); } g /= n; l /= n; for (let i = 0; i <= n; i++) o.push(null); o[n] = 100 - 100 / (1 + g / (l || 1e-9)); for (let i = n + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; o.push(100 - 100 / (1 + g / (l || 1e-9))); } return o; }
function atr(b, n = 14) { const tr = b.map((x, i) => (i ? Math.max(x.h - x.l, Math.abs(x.h - b[i - 1].c), Math.abs(x.l - b[i - 1].c)) : x.h - x.l)); return sma(tr, n); }

// Sectors
const P = {};
const etfs = [...Object.keys(SNAME), "SPY"];
const tickers = [...new Set([...Object.keys(growth), ...Object.keys(sh.bullish), ...Object.keys(sh.bearish)])];
await pool([...etfs, ...tickers], 4, async (s) => { P[s] = await bars(s); });
const spy = P.SPY.bars, ret = (x, n) => x[x.length - 1].ac / x[x.length - 1 - n].ac - 1;
const secs = Object.keys(SNAME).filter((e) => P[e]?.bars.at(-1)?.d === asOf).map((e) => {
  const x = P[e].bars; const rs1 = (ret(x, 5) - ret(spy, 5)) * 100, rs4 = (ret(x, 20) - ret(spy, 20)) * 100;
  return { etf: e, name: SNAME[e], rs1w: +rs1.toFixed(2), rs4w: +rs4.toFixed(2), score: +(0.6 * rs4 + 0.4 * rs1).toFixed(2) };
}).sort((a, b) => b.score - a.score).map((s, i) => ({ ...s, rank: i + 1 }));
const SR = Object.fromEntries(secs.map((s) => [s.etf, s.rank])), NS = secs.length, HALF = Math.ceil(NS / 2);

// Emojis fired in the last 5 sessions
const since = spy[spy.length - 5].d;
const EMO = {}; const add = (t, e) => ((EMO[t] ??= new Set()).add(e));
for (const s of fish.signals) { if ((s.fishAsOf ?? "") >= since) add(s.ticker, "🐟"); if ((s.smileAsOf ?? "") >= since) add(s.ticker, "🙂"); }
for (const s of mfi.signals) if ((s.asOf ?? "") >= since) add(s.ticker, "💵");
for (const s of exh.signals) { if ((s.exhaustionAsOf ?? "") >= since) add(s.ticker, "🥵"); if ((s.skullAsOf ?? "") >= since) add(s.ticker, "💀"); }
const pessBy = new Map(pess.rows.map((r) => [r.t, r]));

const r2 = (x) => +x.toFixed(2);
const TGT_ATR = 2;
const filtered = [];
const longs = [], shorts = [], skipped = [];
for (const t of tickers) {
  const P0 = P[t]; if (!P0 || P0.bars.length < 210 || P0.bars.at(-1).d !== asOf) { skipped.push(t); continue; }
  const b = P0.bars, c = b.map((x) => x.c), L = c.length - 1, close = c[L];
  const s20 = sma(c, 20), s50 = sma(c, 50), s200 = sma(c, 200), A = atr(b), R = rsi(c);
  const minR5 = Math.min(...R.slice(-5)), maxR10 = Math.max(...R.slice(-10));
  const hi = (n, end = b.length) => Math.max(...b.slice(end - n, end).map((x) => x.h));
  const lo = (n, end = b.length) => Math.min(...b.slice(end - n, end).map((x) => x.l));
  const hiRaw = Math.max(...b.map((x) => x.h)), hiAdj = Math.max(...b.map((x) => x.ah));
  const offRaw = 1 - close / hiRaw, offAdj = 1 - b[L].ac / hiAdj;
  const rsLine = b.map((x, i) => x.ac / spy[spy.length - b.length + i].ac);
  const g = growth[t] ?? {}, emo = [...(EMO[t] ?? [])], sec = SEC[t] ?? null, sr = sec ? SR[sec] ?? null : null;
  const bull = sh.bullish[t], bear = sh.bearish[t], pb = pessBy.get(t);
  const spark = c.slice(-60).map(r2);
  const base = { t, close: r2(close), sector: sec, sectorName: sec ? SNAME[sec] : "Unmapped", sectorRank: sr, sectorOf: NS, gs: g.gs ?? null, rg: g.rg ?? null, danger: !!g.d,
    emojis: emo, rsi: +R[L].toFixed(1), atr: r2(A), sma20: r2(s20), sma50: r2(s50), sma200: r2(s200), offHigh: +offAdj.toFixed(4), offHighRaw: +offRaw.toFixed(4),
    splitCheck: Math.abs(offAdj - offRaw) > 0.05 ? "raw and adjusted % off high differ by >5pp" : "ok", splits: P0.splits, spark,
    setup: bull ? { side: "bullish", count: bull.count, conditions: bull.conditions, added: bull.added } : bear ? { side: "bearish", count: bear.count, conditions: bear.conditions, added: bear.added } : null,
    pessimism: pb ? { turning: pb.turning } : null };
  const plan = (side, play, pattern, lo_, hi_, wrong, target, why) => {
    // One target method for both sides: mid-entry ± TGT_ATR × ATR, capped at the nearest swing level
    // (10/20/60-day high for longs, low for shorts) that sits at least 1 ATR away. Pattern targets are ignored.
    // Reference price = tonight's close clamped into the entry zone (what an entry today would actually pay).
    const entry = Math.min(Math.max(close, Math.min(lo_, hi_)), Math.max(lo_, hi_)), L_ = side === "long";
    const entryRef = entry; const swings = L_ ? [hi(10), hi(20), hi(60)].filter((x) => x >= entry + A) : [lo(10), lo(20), lo(60)].filter((x) => x <= entry - A);
    const atrT = L_ ? entry + TGT_ATR * A : entry - TGT_ATR * A;
    const near = swings.length ? (L_ ? Math.min(...swings) : Math.max(...swings)) : null;
    const tgt = near != null && (L_ ? near < atrT : near > atrT) ? near : atrT;
    const targetBasis = tgt === atrT ? `${TGT_ATR}×ATR` : "nearest swing " + (L_ ? "high" : "low");
    const risk = L_ ? entry - wrong : wrong - entry, reward = L_ ? tgt - entry : entry - tgt;
    return { ...base, side, play, pattern, entryZone: [r2(Math.min(lo_, hi_)), r2(Math.max(lo_, hi_))], wrongIf: r2(wrong), target: r2(Math.max(0.01, tgt)), targetBasis, entryRef: r2(entryRef), rr: risk > 0 && reward > 0 ? +(reward / risk).toFixed(2) : null, why };
  };
  const has = (e) => emo.includes(e);
  const topHalf = sr != null && sr <= HALF, botHalf = sr != null && sr > HALF;
  const cand = [];
  // ── Longs ──
  if (!g.d) {
    const l10 = lo(10), h20 = hi(20);
    if ((has("🐟") || has("💵")) && minR5 <= 40 && close <= l10 * 1.10)
      cand.push(plan("long", "Bounce", `Sold-off name near its 10-day low (${r2(l10)}); RSI low ${minR5.toFixed(0)} in 5 days`, l10, l10 + A, l10 - 0.5 * A, h20 > l10 + 2 * A ? h20 : close + 2 * A, `${emo.join("")} washout signal near support`));
    if (s50 > s200 && close >= 0.98 * s50 && (Math.abs(close / s20 - 1) <= 0.03 || Math.abs(close / s50 - 1) <= 0.03)) {
      const ma = Math.abs(close / s20 - 1) <= 0.03 ? s20 : s50, h60 = hi(60);
      cand.push(plan("long", "Pullback", `Orderly dip to the ${ma === s20 ? "20" : "50"}-day average in an uptrend (50 > 200-day)`, ma - 0.5 * A, ma + 0.5 * A, Math.min(s50 - A, ma - A), h60 > close + A ? h60 : close + 3 * A, "Healthy pullback in a leader"));
    }
    const piv = hi(20, b.length - 3), baseLo = lo(20, b.length - 3);
    if (Math.max(...c.slice(-3)) > piv && close > piv && close > s50 && (piv - baseLo) / piv <= 0.15)
      cand.push(plan("long", "Breakout", `Cleared a 20-day base pivot ${r2(piv)} (base depth ${(((piv - baseLo) / piv) * 100).toFixed(0)}%)`, piv, piv + 0.5 * A, piv - A, piv + (piv - baseLo), "Measured-move breakout from a tight base"));
    const rsHi = Math.max(...rsLine.slice(0, -3));
    if (Math.max(...rsLine.slice(-3)) >= rsHi && offRaw >= 0.03 && close > s50)
      cand.push(plan("long", "Early leader", `Relative strength at a 1-year high while price is ${(offRaw * 100).toFixed(0)}% under its high`, close - 0.5 * A, close, s50 - 0.5 * A, hiRaw, "RS leads price"));
  }
  // ── Shorts ──
  {
    const piv = lo(20, b.length - 3), baseHi = hi(20, b.length - 3);
    if (Math.min(...c.slice(-3)) < piv && close < piv && close < s50)
      cand.push(plan("short", "Breakdown", `Lost the 20-day low ${r2(piv)}`, piv - 0.5 * A, piv, piv + A, Math.max(0.01, piv - Math.min(baseHi - piv, 3 * A)), "Support broke"));
    if ((has("🥵") || has("💀")) && maxR10 >= 65 && close < s20)
      cand.push(plan("short", "Rolling over", `Overbought (RSI high ${maxR10.toFixed(0)} in 10 days) and slipped under the 20-day`, close, close + 0.5 * A, hi(10) + 0.25 * A, s50 < close ? s50 : close - 2.5 * A, `${emo.filter((e) => e === "🥵" || e === "💀").join("")} exhaustion turned down`));
    if (close < s50 && s50 < s200 && hi(5) >= 0.98 * Math.min(s20, s50) && close < s20)
      cand.push(plan("short", "Failed bounce", "Bounce into the falling 20/50-day average rejected", close, Math.min(s20, s50), Math.max(s20, s50) + 0.5 * A, lo(20), "Downtrend bounce failed at resistance"));
    if (sr != null && sr > NS - 3 && bear && close < s20)
      cand.push(plan("short", "Fading sector", `Bearish Setup in a bottom-3 sector (${SNAME[sec]})`, close, s20, hi(20), lo(60), "Weak name in a weak group"));
  }
  for (const p of cand) {
    if (p.rr == null || p.rr < 1) continue; // need at least 1:1
    const quality = p.play === "Bounce" && pb && (g.gs ?? 0) >= 40;
    // Sector-first: longs only from top-half (leading) sectors, shorts only from bottom-half (fading). No exceptions.
    if (p.side === "long" && !topHalf) { filtered.push({ t, side: "long", play: p.play, rr: p.rr, sectorName: base.sectorName, sectorRank: sr, why: sr == null ? "sector unmapped" : `sector #${sr}/${NS} is not in the leading half` }); continue; }
    if (p.side === "short" && !botHalf) { filtered.push({ t, side: "short", play: p.play, rr: p.rr, sectorName: base.sectorName, sectorRank: sr, why: sr == null ? "sector unmapped" : `sector #${sr}/${NS} is not in the fading half` }); continue; }
    const secTerm = sr ? (p.side === "long" ? (NS - sr) / NS : (sr - 1) / NS) * 3 : 0;
    let score;
    if (p.side === "long") score = (bull ? bull.count * 2 : 0) - (bear ? bear.count * 2 : 0) + ["🐟", "🙂", "💵"].filter(has).length - ["🥵", "💀"].filter(has).length + (g.gs ?? 0) / 20 + ((g.rg ?? 0) > 0.2 ? 1 : (g.rg ?? 0) < 0 ? -1 : 0) + secTerm + (pb ? 2 + (pb.turning.length ? 1 : 0) : 0) + Math.min(p.rr, 4) * 0.5;
    else score = (bear ? bear.count * 2 : 0) - (bull ? bull.count * 2 : 0) + ["🥵", "💀"].filter(has).length - ["🐟", "💵"].filter(has).length + (100 - (g.gs ?? 50)) / 25 + ((g.rg ?? 0) < 0 ? 1 : 0) + secTerm + Math.min(p.rr, 4) * 0.5 - (pb ? 2 : 0);
    (p.side === "long" ? longs : shorts).push({ ...p, score: +score.toFixed(2), qualityBounce: !!quality });
  }
}
const best = (arr) => { const seen = new Set(); return arr.sort((a, b) => b.score - a.score).filter((x) => !seen.has(x.t) && seen.add(x.t)); };
const light = state.composite.light, regime = comm.inputs?.regime ?? null;
let L = best(longs), S = best(shorts), order = "balanced", banner = "Amber: mixed signals, so longs and shorts are shown side by side. Be selective.";
if (light === "red" || regime === "RISK_OFF") { L = L.filter((x) => x.play === "Bounce"); order = "shorts-first"; banner = `Red / Risk-Off: the backdrop favours caution, so Shorts lead and Longs are limited to the strongest Bounce setups. Size small.`; }
else if (light === "green") { L.sort((a, b) => (["Pullback", "Breakout"].includes(b.play) ? 1 : 0) - (["Pullback", "Breakout"].includes(a.play) ? 1 : 0) || b.score - a.score); order = "longs-first"; banner = "Green: conditions supportive, so Longs lead with Pullbacks and Breakouts first."; }
// Filtered-out list: best gated play per ticker (plus Longs cut by the red-light Bounce-only rule), not already shown
const shown = new Set([...L.slice(0, 10), ...S.slice(0, 10)].map((x) => `${x.side}-${x.t}`));
if (light === "red" || regime === "RISK_OFF") for (const x of best(longs)) if (x.play !== "Bounce") filtered.push({ t: x.t, side: "long", play: x.play, rr: x.rr, sectorName: x.sectorName, sectorRank: x.sectorRank, why: "red light: Longs limited to Bounce" });
const fSeen = new Set();
const filteredOut = filtered.sort((a, b) => (b.rr ?? 0) - (a.rr ?? 0)).filter((f) => !shown.has(`${f.side}-${f.t}`) && !fSeen.has(`${f.side}-${f.t}`) && fSeen.add(`${f.side}-${f.t}`)).sort((a, b) => a.side.localeCompare(b.side) || a.t.localeCompare(b.t));
writeJson(join(ROOT, "data/ideas.json"), { v: 1, asOf, builtAt: nzNowIso(), light, regime, S: state.composite.S, order, banner, sectors: secs,
  counts: { scanned: tickers.length - skipped.length, longCandidates: longs.length, shortCandidates: shorts.length }, skipped,
  longs: L.slice(0, 10), shorts: S.slice(0, 10), filtered: filteredOut, note: "Education only. Rough chart levels, not advice; no returns implied." });
console.log("ideas:", light, regime, "longs", L.length, "shorts", S.length, "skipped", skipped.length);
for (const x of [...S.slice(0, 10), ...L.slice(0, 10)]) console.log(x.side, x.t, x.play, x.entryZone.join("-"), "wrong", x.wrongIf, "tgt", x.target, "rr", x.rr, x.targetBasis, "sc", x.score, x.sectorName, x.sectorRank, x.splitCheck);
