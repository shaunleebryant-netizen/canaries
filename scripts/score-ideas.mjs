#!/usr/bin/env node
// Score every logged idea at 5 / 20 / 60 trading days after its log date using Yahoo daily bars.
// Entry reference = mid of entry zone. Long "right" = close above ref; short "right" = close below.
// wrongFirst = wrong-if level touched (low ≤ / high ≥) before target; targetHit = target touched within horizon.
// Writes data/ideas-scores.json (per-idea + summaries). Groups with < MIN_N scored ideas show no rate.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, yahooChart, ymdInTz, pool, writeJson, nzNowIso } from "./lib/scan-common.mjs";

const MIN_N = 20, H = [5, 20, 60];
const dir = join(ROOT, "data/ideas-log");
const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort() : [];
const logs = files.map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
const tickers = [...new Set(logs.flatMap((l) => l.ideas.map((i) => i.t)))];
const bars = new Map();
await pool(tickers, 4, async (t) => {
  const r = (await yahooChart(t, { interval: "1d", range: "1y" })).data?.chart?.result?.[0];
  if (!r) return;
  const q = r.indicators.quote[0];
  bars.set(t, r.timestamp.map((ts, k) => ({ d: ymdInTz(ts, "America/New_York"), c: q.close[k], h: q.high[k], l: q.low[k] })).filter((b) => b.c != null));
});
const rows = [];
for (const log of logs) for (const i of log.ideas) {
  const b = bars.get(i.t); if (!b) continue;
  const after = b.filter((x) => x.d > log.date);
  const ref = (i.entryZone[0] + i.entryZone[1]) / 2, L = i.side === "long";
  const res = { date: log.date, light: log.light, t: i.t, side: i.side, play: i.play };
  for (const h of H) {
    if (after.length < h) { res[`d${h}`] = null; continue; }
    const win = after.slice(0, h); let wrong = null, tgt = null;
    win.forEach((x, k) => {
      if (wrong == null && (L ? x.l <= i.wrongIf : x.h >= i.wrongIf)) wrong = k;
      if (tgt == null && (L ? x.h >= i.target : x.l <= i.target)) tgt = k;
    });
    const move = (win[h - 1].c / ref - 1) * (L ? 1 : -1);
    res[`d${h}`] = { move: +move.toFixed(4), right: move > 0, wrongFirst: wrong != null && (tgt == null || wrong <= tgt), targetHit: tgt != null && (wrong == null || tgt < wrong) };
  }
  rows.push(res);
}
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const rate = (a, f) => (a.length >= MIN_N ? a.filter(f).length / a.length : null);
function group(key) {
  const g = new Map(); for (const r of rows) { const k = r[key]; if (!g.has(k)) g.set(k, []); g.get(k).push(r); }
  return [...g].map(([k, rs]) => { const s20 = rs.filter((r) => r.d20).map((r) => r.d20), s60 = rs.filter((r) => r.d60).map((r) => r.d60);
    return { key: k, n: s20.length, win20: rate(s20, (x) => x.right), wrong20: rate(s20, (x) => x.wrongFirst), tgt60: rate(s60, (x) => x.targetHit), med20: s20.length >= MIN_N ? med(s20.map((x) => x.move)) : null }; });
}
const out = { v: 1, builtAt: nzNowIso(), since: logs[0]?.date ?? null, logged: rows.length, minN: MIN_N,
  scored: Object.fromEntries(H.map((h) => [`d${h}`, rows.filter((r) => r[`d${h}`]).length])), byPlay: group("play"), byLight: group("light"), rows };
writeJson(join(ROOT, "data/ideas-scores.json"), out);
console.log(`score-ideas: ${logs.length} log days, ${rows.length} ideas, scored`, out.scored);
