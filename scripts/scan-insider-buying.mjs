#!/usr/bin/env node
/**
 * Insider Buying sub scanner (owner approved 2026-10-09, t595u). Members dashboard only.
 *
 * Source: SEC EDGAR Form 4 filings (public domain). Per stock in the universe:
 *   1. data.sec.gov/submissions/CIK##########.json  (re-fetched each run; cached 12h)
 *   2. each Form 4 / 4/A filed in the last FILE_DAYS: the ownership XML from www.sec.gov/Archives
 *      (cached forever by accession number: a filed document never changes)
 * Polite: named User-Agent, one request at a time, <= 5 req/s (SEC limit is 10 req/s).
 *
 * Rule (education only; never shown on the page):
 *   - open-market purchases only (transaction code P, acquired), with a price
 *   - excludes 10b5-1 plan trades (filing-level aff10b5One flag, or a referenced footnote saying the
 *     buy was made under a Rule 10b5-1 plan)
 *   - dedupe: 4/A repeats of the same owner / date / shares / price count once
 *   - a "buy" = one insider's purchases on one filing + date; buys under $25k are ignored
 *   - window: transaction date in the last 30 calendar days (sessionDate - 30 .. sessionDate)
 *   - qualifies if (>= 2 distinct insiders AND >= $100k total) OR (a single CEO / CFO / director
 *     buying >= $250k)
 * Universe: data/fish-universe.json stocks only (no ETFs, countries, crypto or metals).
 *
 * Output: data/insider-buying.json  { asOf, signals:[{ticker,totalUsd,insiders,roleTag,roles,latestTxnDate,...}] }
 *         data/insider-history.json (owner 2026-10-10, members Insiders tab "Past insider buys (3 months)"):
 *           every buy (same filters: universe, code P, not 10b5-1, >= $25k per insider buy) with a trade
 *           date in the last HIST_DAYS (90), one row per insider + trade date, newest first, with
 *           lastClose / pctSince from the pack's own closes (public/_chartdata/<T>.json, built earlier in
 *           the pack; data/signal-history.json "last" as fallback). Price at buy = the insider's average
 *           price. Never invented: no close → lastClose/pctSince null.
 *   --prices-only  re-price data/insider-history.json from the pack closes without touching EDGAR.
 * Exit 0 = written. Exit 1 = too many fetch failures (previous file kept; the pack treats it as
 * non-fatal and carries on).
 *
 *   node scripts/scan-insider-buying.mjs [--session-date YYYY-MM-DD] [--cache <dir>]
 */
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const OUT = join(DATA, "insider-buying.json");

const UA = "Canary Dashboard research shaun@canarydashboard.com";
const MIN_GAP_MS = 200; // 5 req/s
const WINDOW_DAYS = 30;
const HIST_DAYS = 90; // owner 2026-10-10: 3-month history box
const FILE_DAYS = HIST_DAYS + 15; // filings from the last 105 days (Form 4 is due within 2 business days; slack for late filers)
const MIN_BUY_USD = 25_000;
const MIN_GROUP_USD = 100_000;
const MIN_INSIDERS = 2;
const MIN_SINGLE_USD = 250_000;
const SUB_TTL_MS = 12 * 3600 * 1000;
const MAP_TTL_MS = 7 * 24 * 3600 * 1000;
const NON_STOCKS = new Set(["GLD", "SLV", "SOXX", "IGV", "CIBR", "URA", "NLR", "XAR"]);
const ALIAS = { GOOG: "GOOGL" };

const args = process.argv.slice(2);
const argVal = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : null;
};
function nyToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const sessionDate = argVal("--session-date") || nyToday();
if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
  console.error(`bad --session-date ${sessionDate}`);
  process.exit(2);
}
const CACHE =
  argVal("--cache") ||
  process.env.INSIDER_CACHE_DIR ||
  (existsSync("/home/box/canaries") ? "/home/box/canaries/cache/edgar-form4" : join(tmpdir(), "canary-edgar-form4"));
mkdirSync(join(CACHE, "sub"), { recursive: true });
mkdirSync(join(CACHE, "xml"), { recursive: true });

const dayShift = (iso, d) => {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + d);
  return t.toISOString().slice(0, 10);
};
const WIN_START = dayShift(sessionDate, -WINDOW_DAYS);
const HIST_START = dayShift(sessionDate, -HIST_DAYS);
const HIST_OUT = join(DATA, "insider-history.json");
const FILE_FROM = dayShift(sessionDate, -FILE_DAYS);

/* ---------- polite fetch ---------- */
let last = 0;
let requests = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  let err = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = MIN_GAP_MS - (Date.now() - last);
    if (wait > 0) await sleep(wait);
    last = Date.now();
    requests++;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Encoding": "gzip, deflate" },
        signal: AbortSignal.timeout(40_000),
      });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let buf = Buffer.from(await res.arrayBuffer());
      if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
      return buf;
    } catch (e) {
      err = e;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw err;
}
async function cached(path, url, ttlMs) {
  if (existsSync(path)) {
    const st = statSync(path);
    if (st.size > 50 && (ttlMs == null || Date.now() - st.mtimeMs < ttlMs)) return readFileSync(path);
  }
  const buf = await get(url);
  if (buf) writeFileSync(path, buf);
  return buf;
}

/* ---------- universe ---------- */
function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}
function stockUniverse() {
  const fish = readJson(join(DATA, "fish-universe.json"));
  const raw = Array.isArray(fish.tickers) && fish.tickers.length ? fish.tickers : (fish.groups ?? []).flatMap((g) => g.tickers ?? []);
  const etf = new Set();
  for (const f of ["etf-watch-universe.json", "etf-country-universe.json", "crypto-watch-universe.json"]) {
    try {
      const u = readJson(join(DATA, f));
      for (const t of u.tickers ?? []) etf.add(String(typeof t === "string" ? t : t?.ticker ?? "").toUpperCase());
    } catch {
      /* optional */
    }
  }
  return [...new Set(raw.map((t) => String(t).trim().toUpperCase()))].filter(
    (t) => t && !/USD$/.test(t) && !NON_STOCKS.has(t) && !etf.has(t),
  );
}

/* ---------- Form 4 XML (small, regular schema; parsed without a dependency) ---------- */
const ent = (s) =>
  String(s ?? "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&").trim();
const blocks = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => m[1]);
const tagText = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!m) return "";
  const v = m[1].match(/<value\b[^>]*>([\s\S]*?)<\/value>/);
  return ent(v ? v[1] : m[1].replace(/<[^>]+>/g, ""));
};
const truthy = (s) => s === "1" || s.toLowerCase() === "true";
const PLAN_RE = /pursuant to (?:a |an )?(?:rule )?10b5-1/i;

function parseForm4(xml) {
  const owners = blocks(xml, "reportingOwner").map((ro) => ({
    cik: tagText(ro, "rptOwnerCik"),
    name: tagText(ro, "rptOwnerName"),
    director: truthy(tagText(ro, "isDirector")),
    officer: truthy(tagText(ro, "isOfficer")),
    tenPct: truthy(tagText(ro, "isTenPercentOwner")),
    title: tagText(ro, "officerTitle"),
  }));
  const docPlan = truthy(tagText(xml, "aff10b5One"));
  const notes = {};
  for (const m of xml.matchAll(/<footnote\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/footnote>/g)) notes[m[1]] = ent(m[2]);
  const txs = blocks(xml, "nonDerivativeTransaction").map((tx) => {
    const ids = [...tx.matchAll(/footnoteId\s+id="([^"]+)"/g)].map((m) => m[1]);
    const plan = ids.some((id) => PLAN_RE.test(notes[id] ?? "") && !/\bnot\b[^.]{0,40}10b5-1/i.test(notes[id] ?? ""));
    return {
      code: tagText(tx, "transactionCode"),
      date: tagText(tx, "transactionDate").slice(0, 10),
      shares: Number(tagText(tx, "transactionShares")),
      price: Number(tagText(tx, "transactionPricePerShare")),
      ad: tagText(tx, "transactionAcquiredDisposedCode"),
      plan,
    };
  });
  return { owners, docPlan, txs };
}

function roleOf(o) {
  const t = (o.title || "").toLowerCase();
  const roles = [];
  if (/\bceo\b|chief executive/.test(t)) roles.push("CEO");
  if (/\bcfo\b|chief financial/.test(t)) roles.push("CFO");
  if (o.director) roles.push("Director");
  if (o.officer && !roles.some((r) => r === "CEO" || r === "CFO")) roles.push("Officer");
  if (o.tenPct) roles.push("10% owner");
  return roles.length ? roles : ["Insider"];
}

/* ---------- main ---------- */
async function main() {
  const t0 = Date.now();
  const stocks = stockUniverse();
  const mapBuf = await cached(join(CACHE, "company_tickers.json"), "https://www.sec.gov/files/company_tickers.json", MAP_TTL_MS);
  if (!mapBuf) throw new Error("SEC ticker map unavailable");
  const byTicker = {};
  for (const row of Object.values(JSON.parse(mapBuf.toString("utf8")))) {
    const k = String(row.ticker).toUpperCase();
    if (!byTicker[k]) byTicker[k] = row;
  }
  const mapped = [];
  const unmapped = [];
  for (const t of stocks) {
    const row = byTicker[t] ?? byTicker[ALIAS[t] ?? ""];
    if (row) mapped.push({ ticker: t, cik: Number(row.cik_str) });
    else unmapped.push(t);
  }

  // 1) submissions -> Form 4 list
  const forms = [];
  const subFail = [];
  for (const { ticker, cik } of mapped) {
    try {
      const buf = await cached(join(CACHE, "sub", `${cik}.json`), `https://data.sec.gov/submissions/CIK${String(cik).padStart(10, "0")}.json`, SUB_TTL_MS);
      if (!buf) {
        subFail.push(ticker);
        continue;
      }
      const rec = JSON.parse(buf.toString("utf8"))?.filings?.recent ?? {};
      (rec.form ?? []).forEach((f, i) => {
        if ((f === "4" || f === "4/A") && rec.filingDate[i] >= FILE_FROM && rec.filingDate[i] <= dayShift(sessionDate, 3)) {
          forms.push({ ticker, cik, form: f, filingDate: rec.filingDate[i], accession: rec.accessionNumber[i], primary: rec.primaryDocument[i] });
        }
      });
    } catch (e) {
      subFail.push(ticker);
      console.warn(`  submissions ${ticker}: ${e instanceof Error ? e.message : e}`);
    }
  }
  if (subFail.length > Math.max(10, mapped.length * 0.2)) {
    console.error(`insider-buying: ${subFail.length}/${mapped.length} submissions failed — previous file kept`);
    process.exit(1);
  }

  // 2) Form 4 XML -> purchase rows
  const rows = [];
  const xmlFail = [];
  let fetchedNew = 0;
  for (const f of forms) {
    const acc = f.accession.replace(/-/g, "");
    const path = join(CACHE, "xml", `${acc}.xml`);
    const name = String(f.primary).split("/").pop();
    let buf;
    try {
      const had = existsSync(path);
      buf = await cached(path, `https://www.sec.gov/Archives/edgar/data/${f.cik}/${acc}/${name}`, null);
      if (!had && buf) fetchedNew++;
    } catch (e) {
      xmlFail.push(`${f.ticker} ${f.accession}`);
      continue;
    }
    if (!buf) {
      xmlFail.push(`${f.ticker} ${f.accession} 404`);
      continue;
    }
    const xml = buf.toString("utf8");
    if (!/<ownershipDocument\b/.test(xml)) {
      xmlFail.push(`${f.ticker} ${f.accession} not xml`);
      continue;
    }
    const doc = parseForm4(xml);
    const owner = doc.owners[0]; // joint filers (person + their entity) report one purchase: count it once
    if (!owner) continue;
    for (const tx of doc.txs) {
      if (tx.code !== "P" || (tx.ad && tx.ad !== "A")) continue;
      if (doc.docPlan || tx.plan) continue;
      if (!(tx.shares > 0) || !(tx.price > 0) || !tx.date) continue;
      if (tx.date < HIST_START || tx.date > sessionDate) continue;
      rows.push({
        ticker: f.ticker, cik: f.cik, accession: f.accession, form: f.form, filingDate: f.filingDate, txnDate: tx.date,
        ownerKey: owner.cik || owner.name, owner: owner.name, roles: roleOf(owner),
        shares: tx.shares, price: tx.price, usd: tx.shares * tx.price,
      });
    }
  }

  // 3) dedupe (4/A repeats), then group into buys (one insider, one filing date-of-trade)
  const seen = new Set();
  const uniq = rows.filter((r) => {
    const k = `${r.ticker}|${r.ownerKey}|${r.txnDate}|${r.shares.toFixed(2)}|${r.price.toFixed(4)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const buysMap = new Map();
  for (const r of uniq) {
    const k = `${r.ticker}|${r.ownerKey}|${r.txnDate}`;
    const b = buysMap.get(k) ?? { ticker: r.ticker, ownerKey: r.ownerKey, owner: r.owner, roles: r.roles, txnDate: r.txnDate, filingDate: r.filingDate, usd: 0, shares: 0, cik: r.cik, accession: r.accession };
    b.usd += r.usd;
    b.shares += r.shares;
    if (r.filingDate > b.filingDate) {
      b.filingDate = r.filingDate;
      b.accession = r.accession;
    }
    buysMap.set(k, b);
  }
  const allBuys = [...buysMap.values()].filter((b) => b.usd >= MIN_BUY_USD);
  const buys = allBuys.filter((b) => b.txnDate >= WIN_START);

  // 4) per ticker
  const byT = new Map();
  for (const b of buys) {
    const t = byT.get(b.ticker) ?? { ticker: b.ticker, totalUsd: 0, owners: new Map(), latestTxnDate: "", latestFilingDate: "", buys: [] };
    t.totalUsd += b.usd;
    t.buys.push(b);
    const o = t.owners.get(b.ownerKey) ?? { name: b.owner, roles: new Set(), usd: 0 };
    o.usd += b.usd;
    b.roles.forEach((r) => o.roles.add(r));
    t.owners.set(b.ownerKey, o);
    if (b.txnDate > t.latestTxnDate) t.latestTxnDate = b.txnDate;
    if (b.filingDate > t.latestFilingDate) t.latestFilingDate = b.filingDate;
    byT.set(b.ticker, t);
  }
  const ROLE_ORDER = ["CEO", "CFO", "Director", "Officer", "10% owner", "Insider"];
  const signals = [];
  for (const t of byT.values()) {
    const owners = [...t.owners.values()];
    const group = owners.length >= MIN_INSIDERS && t.totalUsd >= MIN_GROUP_USD;
    const single = owners.some((o) => o.usd >= MIN_SINGLE_USD && (o.roles.has("CEO") || o.roles.has("CFO") || o.roles.has("Director")));
    if (!group && !single) continue;
    const roles = ROLE_ORDER.filter((r) => owners.some((o) => o.roles.has(r)));
    const roleTag = owners.length > 1 ? (roles.includes("CEO") ? "CEO +" : roles.includes("CFO") ? "CFO +" : "Group") : roles[0];
    signals.push({
      ticker: t.ticker,
      totalUsd: Math.round(t.totalUsd),
      insiders: owners.length,
      roleTag,
      roles,
      latestTxnDate: t.latestTxnDate,
      latestFilingDate: t.latestFilingDate,
      basis: [group ? "group" : null, single ? "single" : null].filter(Boolean),
      buyers: owners
        .sort((a, b) => b.usd - a.usd)
        .map((o) => ({ name: o.name, roles: ROLE_ORDER.filter((r) => o.roles.has(r)), usd: Math.round(o.usd) })),
      // Owner 2026-10-10: one row per buy (insider + trade date) for the members table, newest first.
      trades: t.buys
        .sort((a, b) => (a.txnDate !== b.txnDate ? (a.txnDate < b.txnDate ? 1 : -1) : b.usd - a.usd))
        .map((b) => ({
          name: b.owner,
          roles: ROLE_ORDER.filter((r) => b.roles.includes(r)),
          txnDate: b.txnDate,
          filingDate: b.filingDate,
          shares: Math.round(b.shares),
          avgPrice: Number((b.usd / b.shares).toFixed(4)),
          usd: Math.round(b.usd),
          url: `https://www.sec.gov/Archives/edgar/data/${b.cik}/${b.accession.replace(/-/g, "")}/${b.accession}-index.htm`,
        })),
    });
  }
  signals.sort((a, b) => b.totalUsd - a.totalUsd || a.ticker.localeCompare(b.ticker));

  const doc = {
    asOf: sessionDate,
    windowStart: WIN_START,
    scannedAt: new Date().toISOString(),
    source: "SEC EDGAR Form 4 (open-market purchases, code P)",
    note: "Members only. Education only. Form 4 is filed up to 2 business days after the trade.",
    universeCount: stocks.length,
    mappedCount: mapped.length,
    unmapped,
    filingsChecked: forms.length,
    purchaseRows: uniq.filter((r) => r.txnDate >= WIN_START).length,
    buysCounted: buys.length,
    fetch: { requests, newFilings: fetchedNew, submissionFailures: subFail, xmlFailures: xmlFail.slice(0, 50), xmlFailureCount: xmlFail.length },
    signals,
  };
  writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");

  // 5) 3-month history (every qualifying buy, not only the tickers that pass the 30-day rule)
  const ROLE_ORDER_H = ["CEO", "CFO", "Director", "Officer", "10% owner", "Insider"];
  const hist = {
    asOf: sessionDate,
    windowStart: HIST_START,
    days: HIST_DAYS,
    scannedAt: new Date().toISOString(),
    source: "SEC EDGAR Form 4 (open-market purchases, code P; not 10b5-1; >= $25k per insider buy)",
    note: "Members only. Education only. Past insider buys don't predict returns.",
    buys: allBuys
      .sort((a, b) => (a.txnDate !== b.txnDate ? (a.txnDate < b.txnDate ? 1 : -1) : b.usd - a.usd))
      .map((b) => ({
        ticker: b.ticker,
        name: b.owner,
        roles: ROLE_ORDER_H.filter((r) => b.roles.includes(r)),
        txnDate: b.txnDate,
        filingDate: b.filingDate,
        shares: Math.round(b.shares),
        avgPrice: Number((b.usd / b.shares).toFixed(4)),
        usd: Math.round(b.usd),
        url: `https://www.sec.gov/Archives/edgar/data/${b.cik}/${b.accession.replace(/-/g, "")}/${b.accession}-index.htm`,
      })),
  };
  writeHistory(priceHistory(hist));
  console.log(
    `insider-buying: ${signals.length} qualify (${signals.map((s) => s.ticker).join(", ") || "none"}) · ` +
      `${stocks.length} stocks (${unmapped.length} unmapped) · ${forms.length} Form 4s · ${requests} SEC requests ` +
      `(${fetchedNew} new filings) · ${xmlFail.length} xml failures · ${((Date.now() - t0) / 1000).toFixed(0)}s`,
  );
}

/* ---------- 3-month history pricing (pack closes, no network) ---------- */
const chartKey = (t) => String(t).toUpperCase().replace(/[^A-Z0-9.-]/g, "_");
function closesFor(ticker) {
  const p = join(ROOT, "public/_chartdata", `${chartKey(ticker)}.json`);
  if (!existsSync(p)) return null;
  try {
    const d = JSON.parse(readFileSync(p, "utf8"));
    if (!Array.isArray(d.b) || !d.b.length || typeof d.d0 !== "number") return null;
    return d.b.map((x) => ({ date: new Date((d.d0 + x[0]) * 86400000).toISOString().slice(0, 10), close: x[4] }));
  } catch {
    return null;
  }
}
function priceHistory(hist) {
  let sh = null;
  try {
    sh = JSON.parse(readFileSync(join(DATA, "signal-history.json"), "utf8")).tickers ?? null;
  } catch {
    sh = null;
  }
  const cache = new Map();
  let priced = 0;
  for (const b of hist.buys) {
    if (!cache.has(b.ticker)) cache.set(b.ticker, closesFor(b.ticker));
    const bars = cache.get(b.ticker);
    let last = bars?.length ? bars[bars.length - 1] : null;
    const fb = sh?.[b.ticker];
    if (fb?.last != null && fb.lastAsOf && (!last || fb.lastAsOf > last.date)) last = { date: fb.lastAsOf, close: fb.last };
    // Close on the trade date (or the last session before it, for weekend/holiday trade dates).
    let onDay = null;
    for (const x of bars ?? []) {
      if (x.date > b.txnDate) break;
      onDay = x;
    }
    if (onDay && dayShift(b.txnDate, -7) > onDay.date) onDay = null;
    b.closeOnTradeDate = onDay ? Number(onDay.close.toFixed(4)) : null;
    b.closeOnTradeDateDate = onDay ? onDay.date : null;
    // Price at buy = the insider's average price. If it is >25% away from that day's close the Form 4
    // is in another share class / unit (e.g. BABA, TSM ordinary shares vs the US ADR we chart), so we
    // use the trade-date close instead and say so (priceBasis "close") — never a fake +500%.
    const mismatch = onDay && b.avgPrice > 0 && Math.abs(b.avgPrice / onDay.close - 1) > 0.25;
    const unitsUnknown = !onDay && b.avgPrice > 0 && last && Math.abs(b.avgPrice / last.close - 1) > 0.6;
    b.priceBasis = mismatch ? "close" : unitsUnknown ? "unknown" : "avg";
    b.priceAtBuy = mismatch ? b.closeOnTradeDate : unitsUnknown ? null : b.avgPrice;
    b.lastClose = last ? Number(last.close.toFixed(4)) : null;
    b.lastCloseDate = last ? last.date : null;
    b.pctSince = last && b.priceAtBuy > 0 ? Number(((last.close / b.priceAtBuy - 1) * 100).toFixed(2)) : null;
    if (b.pctSince != null) priced++;
  }
  hist.pricedAt = new Date().toISOString();
  hist.priced = priced;
  return hist;
}
function writeHistory(hist) {
  writeFileSync(`${HIST_OUT}.tmp`, JSON.stringify(hist) + "\n");
  renameSync(`${HIST_OUT}.tmp`, HIST_OUT);
  console.log(`insider-history: ${hist.buys.length} buys ${hist.windowStart} → ${hist.asOf} · ${hist.priced} priced`);
}

if (args.includes("--prices-only")) {
  if (!existsSync(HIST_OUT)) {
    console.error("insider-history: no data/insider-history.json yet — run the full scan first");
    process.exit(1);
  }
  writeHistory(priceHistory(JSON.parse(readFileSync(HIST_OUT, "utf8"))));
  process.exit(0);
}

main().catch((e) => {
  console.error("insider-buying failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
