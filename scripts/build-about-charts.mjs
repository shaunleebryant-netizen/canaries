/**
 * About page "Recent examples" charts (owner 2026-10-10). Real data only:
 *   marks  ← data/signal-history.json (stocks only)
 *   prices ← public/_chartdata/<T>.json (daily bars from the nightly pack)
 * Writes public/about/example-<t>.webp (dashboard chart style: dark, green/red candles,
 * amber mark line, emoji markers) and data/about-examples.json (captions + hit-rate stats).
 * Needs a local Chrome + playwright-core (PLAYWRIGHT_CORE, default /tmp/pw/node_modules/playwright-core/index.mjs).
 * Re-run after a pack to refresh "now" figures:  node scripts/build-about-charts.mjs
 * Education only. Examples are picked by hand to illustrate; the stats line shows the whole record.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PW = process.env.PLAYWRIGHT_CORE || "/tmp/pw/node_modules/playwright-core/index.mjs";
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
const { chromium } = await import(PW);
const sharp = (await import("sharp")).default;

const EXAMPLES = [
  { t: "NU", mark: "2026-09-28", kind: "fish", from: "2026-08-12" },
  { t: "SMTC", mark: "2026-07-29", kind: "fish", from: "2026-06-15" },
  { t: "ENTG", mark: "2026-07-30", kind: "mfi", from: "2026-06-15" },
  { t: "SHOP", mark: "2026-09-09", kind: "smile", from: "2026-07-25" },
  { t: "CIEN", mark: "2026-09-03", kind: "fish", from: "2026-07-20" },
];
const EMOJI = { fish: "🐟", smile: "🙂", mfi: "💵" };
const LABEL = { fish: "Fish", smile: "Washout (Smiley)", mfi: "MFI Washout" };

const hist = JSON.parse(fs.readFileSync(path.join(ROOT, "data/signal-history.json"), "utf8"));
const key = (t) => t.toUpperCase().replace(/[^A-Z0-9.-]/g, "_");
const barsCache = {};
function bars(t) {
  if (barsCache[t] !== undefined) return barsCache[t];
  const p = path.join(ROOT, "public/_chartdata", `${key(t)}.json`);
  if (!fs.existsSync(p)) return (barsCache[t] = null);
  const d = JSON.parse(fs.readFileSync(p, "utf8"));
  return (barsCache[t] = d.b.map((x) => ({
    time: new Date((d.d0 + x[0]) * 864e5).toISOString().slice(0, 10),
    open: x[1], high: x[2], low: x[3], close: x[4],
  })));
}

/* ---------- whole-record stats (stocks only, every mark, N sessions later) ---------- */
function stats(kind, N) {
  let n = 0, up = 0, sum = 0;
  const rets = [];
  const seen = new Set();
  for (const r of hist.rows) {
    if (r.g !== "stock") continue;
    if (kind !== "any" && r.k !== kind) continue;
    if (kind === "any") {
      const id = `${r.t}|${r.d}`; // a fish + smile on the same day count once
      if (seen.has(id)) continue;
      seen.add(id);
    }
    const b = bars(r.t);
    if (!b) continue;
    const i = b.findIndex((x) => x.time === r.d);
    if (i < 0 || i + N >= b.length) continue;
    const ret = b[i + N].close / b[i].close - 1;
    n++; if (ret > 0) up++; sum += ret; rets.push(ret);
  }
  rets.sort((a, c) => a - c);
  const down10 = rets.filter((x) => x <= -0.1).length;
  return { n, down10Pct: +((down10 / n) * 100).toFixed(1), worstPct: +(rets[0] * 100).toFixed(1), hitPct: +((up / n) * 100).toFixed(1), avgPct: +((sum / n) * 100).toFixed(2), medianPct: +(rets[Math.floor(n / 2)] * 100).toFixed(2) };
}
const N = 10;
const record = {
  horizonSessions: N,
  windowStart: hist.windowStart,
  asOf: hist.asOf,
  method: `Every 🐟/🙂/💵 mark on a stock in data/signal-history.json (${hist.windowStart} to ${hist.asOf}) with ${N} sessions of data after it; close ${N} sessions later vs close on the mark day. A Fish and Smiley on the same stock and day count once in "all marks". History was backfilled by re-running today's rules, then extended nightly.`,
  all: stats("any", N),
  fish: stats("fish", N),
  smile: stats("smile", N),
  mfi: stats("mfi", N),
  all20: stats("any", 20),
  mfi20: stats("mfi", 20),
};

/* ---------- per-example captions ---------- */
const examples = EXAMPLES.map((e) => {
  const b = bars(e.t);
  const i = b.findIndex((x) => x.time === e.mark);
  if (i < 0) throw new Error(`${e.t}: no bar on ${e.mark}`);
  const markRow = hist.rows.find((r) => r.t === e.t && r.d === e.mark && r.k === e.kind);
  if (!markRow) throw new Error(`${e.t}: no ${e.kind} mark on ${e.mark} in signal-history`);
  const after = b.slice(i + 1);
  const last = b[b.length - 1];
  let peak = after[0];
  for (const x of after) if (x.close > peak.close) peak = x;
  const marks = hist.rows
    .filter((r) => r.t === e.t && r.d >= e.from && r.d <= last.time)
    .map((r) => ({ d: r.d, k: r.k }));
  return {
    ticker: e.t,
    name: hist.tickers[e.t]?.name ?? e.t,
    kind: e.kind,
    markDate: e.mark,
    sameDay: hist.rows.filter((r) => r.t === e.t && r.d === e.mark).map((r) => r.k),
    priceAtMark: b[i].close,
    lastDate: last.time,
    lastClose: last.close,
    pctNow: +((last.close / b[i].close - 1) * 100).toFixed(1),
    sessionsNow: b.length - 1 - i,
    peakDate: peak.time,
    peakClose: peak.close,
    pctPeak: +((peak.close / b[i].close - 1) * 100).toFixed(1),
    sessionsPeak: b.indexOf(peak) - i,
    image: `/about/example-${e.t.toLowerCase()}.webp`,
    from: e.from,
    marks,
  };
});

/* ---------- render ---------- */
const lcJs = fs.readFileSync(path.join(ROOT, "node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js"), "utf8");
const W = 960, H = 540;
const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.error("  page error:", String(e)));
for (const ex of examples) {
  const data = bars(ex.ticker).filter((x) => x.time >= ex.from);
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#020617;font-family:Inter,"Segoe UI",system-ui,sans-serif;color:#e2e8f0}
  .card{width:${W}px;height:${H}px;box-sizing:border-box;padding:18px 20px 12px;background:linear-gradient(180deg,#0f172a,#020617);border:1px solid rgba(234,179,8,.25);border-radius:16px;display:flex;flex-direction:column}
  .top{display:flex;justify-content:space-between;align-items:flex-start}
  .tk{font-size:28px;font-weight:700;letter-spacing:.02em}.nm{font-size:14px;color:#94a3b8;margin-top:2px}
  .mk{font-size:14px;color:#eab308;margin-top:6px}
  .pct{font-size:40px;font-weight:800;color:#34d399;text-align:right;line-height:1}
  .sub{font-size:13px;color:#94a3b8;text-align:right;margin-top:6px}
  #c{flex:1;margin-top:8px}
  .ft{display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-top:4px}
  </style></head><body><div class="card">
  <div class="top"><div><div class="tk">${ex.ticker}</div><div class="nm">${ex.name}</div>
  <div class="mk">${ex.sameDay.map((k) => EMOJI[k]).join("")} ${ex.sameDay.map((k) => LABEL[k]).join(" + ")} · ${dmy(ex.markDate)} · close $${ex.priceAtMark.toFixed(2)}</div></div>
  <div><div class="pct">${ex.pctNow >= 0 ? "+" : ""}${ex.pctNow}%</div><div class="sub">to $${ex.lastClose.toFixed(2)} on ${dmy(ex.lastDate)} · ${ex.sessionsNow} sessions${ex.pctPeak > ex.pctNow + 0.5 ? `<br>peak +${ex.pctPeak}% (${dmy(ex.peakDate)})` : ""}</div></div></div>
  <div id="c"></div>
  <div class="ft"><span>Canary Dashboard · daily candles · marks from our own signal history</span><span>Education only · past examples don't guarantee future results</span></div>
  </div><script>${lcJs}</script><script>(()=>{
  const data=${JSON.stringify(data)};const marks=${JSON.stringify(ex.marks)};const E=${JSON.stringify(EMOJI)};
  const el=document.getElementById('c');
  const chart=LightweightCharts.createChart(el,{width:el.clientWidth,height:el.clientHeight,layout:{background:{type:'solid',color:'transparent'},textColor:'#94a3b8',fontSize:12,attributionLogo:false},
    grid:{vertLines:{color:'rgba(148,163,184,0.06)'},horzLines:{color:'rgba(148,163,184,0.06)'}},rightPriceScale:{borderColor:'rgba(148,163,184,0.15)'},
    timeScale:{borderColor:'rgba(148,163,184,0.15)'},crosshair:{mode:2},handleScroll:false,handleScale:false});
  const s=chart.addSeries(LightweightCharts.CandlestickSeries,{upColor:'#34d399',downColor:'#f87171',borderVisible:false,wickUpColor:'#34d399',wickDownColor:'#f87171',priceLineVisible:false,lastValueVisible:true});
  s.setData(data);
  s.createPriceLine({price:${ex.priceAtMark},color:'#eab308',lineWidth:1,lineStyle:2,axisLabelVisible:true,title:'mark close'});
  const ln=chart.addSeries(LightweightCharts.LineSeries,{color:'rgba(234,179,8,0.9)',lineWidth:2,lineStyle:2,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false});
  ln.setData([{time:'${ex.markDate}',value:${ex.priceAtMark}},{time:'${ex.lastDate}',value:${ex.lastClose}}]);
  const byDay={};for(const m of marks){(byDay[m.d]??=[]).push(E[m.k]);}
  LightweightCharts.createSeriesMarkers(s,Object.entries(byDay).sort().map(([d,em])=>({time:d,position:'belowBar',shape:'arrowUp',color:d==='${ex.markDate}'?'#eab308':'#64748b',text:em.join(''),size:d==='${ex.markDate}'?2:1})));
  chart.timeScale().fitContent();
  })();</script></body></html>`;
  await page.goto("about:blank");
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(400);
  const png = await page.locator(".card").screenshot({ omitBackground: false });
  const out = path.join(ROOT, "public", ex.image);
  await sharp(png).webp({ quality: 86 }).toFile(out);
  console.log(`${ex.ticker}: ${ex.kind} ${ex.markDate} $${ex.priceAtMark} → $${ex.lastClose} ${ex.pctNow}% in ${ex.sessionsNow} sessions (peak ${ex.pctPeak}% in ${ex.sessionsPeak}) → ${out}`);
}
await browser.close();

function dmy(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

fs.writeFileSync(
  path.join(ROOT, "data/about-examples.json"),
  JSON.stringify({ builtAt: new Date().toISOString(), asOf: hist.asOf, record, examples: examples.map(({ marks, from, ...x }) => x) }, null, 2) + "\n",
);
console.log(JSON.stringify(record, null, 1));
