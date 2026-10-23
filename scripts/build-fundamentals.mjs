#!/usr/bin/env node
/**
 * Fundamentals for the Main Scanner columns (owner approved 2026-10-10: Bullish / Bearish Setups get
 * P/E · EPS g y/y · EV/EBITDA columns). Members dashboard only. No AI/LLM at runtime.
 *
 * Source: SEC EDGAR XBRL company facts (public domain, official) + the pack's own closes
 * (public/_chartdata/<T>.json, built earlier in the pack). Small Yahoo chart calls (the same endpoint
 * the pack already uses) for recent stock splits and FX (EUR/TWD/... → USD) only.
 *
 * Per stock in data/fish-universe.json (plus any other stock that has a pack chart file):
 *   1. data.sec.gov/submissions/CIK##########.json — shared cache with the Insider Buying step
 *      (/home/box/canaries/cache/edgar-form4/sub, 12h TTL; the insider step runs first, so usually 0 requests)
 *   2. data.sec.gov/api/xbrl/companyfacts/CIK##########.json — cached under
 *      /home/box/canaries/cache/edgar-facts; RE-FETCHED ONLY when submissions show a new periodic filing
 *      (10-K/10-Q/20-F/40-F/6-K and amendments) since the cached copy.
 * Polite: named User-Agent, one request at a time, <= 5 req/s (SEC limit is 10 req/s).
 *
 * Metrics (TTM = last 12 months, GAAP as filed; education only):
 *   P/E        = close / TTM diluted EPS. n/m when EPS <= 0.
 *   EPS g y/y  = TTM diluted EPS / TTM EPS a year earlier - 1. n/m when either is <= 0.
 *   EV/EBITDA  = (market cap + debt - cash & short-term investments) / (operating income + D&A).
 *                n/m when EBITDA <= 0, EBITDA margin < 5%, the multiple > 100, or a bank / insurer /
 *                lender (BANK_INS list: SIC codes can't be used, 6199 also covers bitcoin miners).
 *   TTM = a 12-month fact, else prior fiscal year + year-to-date - prior year-to-date.
 *   Stale (latest period > 460 days old) → shown as "—". Missing tags → "—".
 *   EPS tag stale but net income fresh → EPS = TTM net income / latest-quarter diluted shares.
 *   No operating income tag → EBIT proxy = pretax income + interest expense (noted).
 *   Foreign annual filers (20-F/40-F): latest annual figures, flagged "a" († in the UI); reported currency
 *   converted at today's Yahoo FX; ADR ratios from the ADR table below.
 *   Splits: EPS / share counts filed before a recent split are adjusted by the split ratio (Yahoo split
 *   events; spin-off style ratios between 0.67 and 1.5 are ignored).
 *
 * Output: data/fundamentals.json { asOf, tickers:{T:{p,pe,pw,g,gw,ev,evw,a,fe,n,k}}, counts, fetch }
 *   pw/gw/evw = why the value is null: "nm" (not meaningful), "stale", "missing", "na" (not a company).
 * Exit 0 = written. Exit 1 = failed (previous file kept; the pack treats it as non-fatal).
 *
 *   node scripts/build-fundamentals.mjs [--session-date YYYY-MM-DD] [--cache <dir>] [--offline]
 */
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const OUT = join(DATA, "fundamentals.json");
const GS_OUT = join(DATA, "growth-score.json");
const CHARTS = join(ROOT, "public", "_chartdata");

const UA = "Canary Dashboard research shaun@canarydashboard.com";
const YAHOO_UA = "Mozilla/5.0 (compatible; CanaryDashboard/1.0)";
const MIN_GAP_MS = 200; // SEC: 5 req/s
const YAHOO_GAP_MS = 150;
const SUB_TTL_MS = 12 * 3600 * 1000;
const MAP_TTL_MS = 7 * 24 * 3600 * 1000;
const YAHOO_TTL_MS = 20 * 3600 * 1000;
const STALE_DAYS = 460;
const FORMS = new Set(["10-K", "10-Q", "10-K/A", "10-Q/A", "20-F", "20-F/A", "6-K", "6-K/A", "40-F", "40-F/A", "10-KT"]);
const PERIODIC = FORMS; // a new one of these → refetch company facts
const ANNUAL_FOREIGN = new Set(["20-F", "20-F/A", "40-F", "40-F/A", "6-K", "6-K/A"]);
/** Ordinary shares per US ADS (price is per ADS). */
const ADR = { TSM: 5, FMS: 0.5, ASML: 1, NVO: 1, BABA: 8 };
/** Banks, insurers, brokers and balance-sheet lenders: EV/EBITDA not meaningful (owner rule). */
const BANK_INS = new Set(["NU", "SOFI", "HOOD", "AFRM", "UPST", "LMND", "OSCR", "UNH", "CRCL"]);
const NON_STOCKS = new Set(["GLD", "SLV", "SOXX", "IGV", "CIBR", "URA", "NLR", "XAR"]);
const ALIAS = { GOOG: "GOOGL" };
/** Tags whose currency matters (FX is fetched only for currencies seen on these). */
const FX_TAGS = new Set([
  "EarningsPerShareDiluted", "DilutedEarningsLossPerShare", "OperatingIncomeLoss", "ProfitLossFromOperatingActivities",
  "DepreciationDepletionAndAmortization", "DepreciationAndAmortization", "DepreciationAndAmortisationExpense", "Depreciation",
  "Revenues", "Revenue", "RevenueFromContractWithCustomerExcludingAssessedTax", "CashAndCashEquivalents",
  "CashAndCashEquivalentsAtCarryingValue", "Borrowings", "LongTermDebt", "LongTermDebtNoncurrent", "NetIncomeLoss",
]);

const args = process.argv.slice(2);
const argVal = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : null;
};
const OFFLINE = args.includes("--offline");
const CACHE = argVal("--cache") || process.env.FUNDAMENTALS_CACHE_DIR ||
  (existsSync("/home/box/canaries") ? "/home/box/canaries/cache/edgar-facts" : join(tmpdir(), "canary-edgar-facts"));
const SUB_CACHE = process.env.INSIDER_CACHE_DIR ||
  (existsSync("/home/box/canaries") ? "/home/box/canaries/cache/edgar-form4" : join(tmpdir(), "canary-edgar-form4"));
for (const d of [join(CACHE, "facts"), join(CACHE, "yahoo"), join(SUB_CACHE, "sub")]) mkdirSync(d, { recursive: true });

/* ---------- fetch ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = { sec: 0, secSub: 0, secFacts: 0, secMap: 0, yahoo: 0, factsFromCache: 0, failures: [] };
let lastSec = 0;
let lastYahoo = 0;
async function httpGet(url, { yahoo = false } = {}) {
  if (OFFLINE) return null;
  let err = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const gap = yahoo ? YAHOO_GAP_MS : MIN_GAP_MS;
    const wait = gap - (Date.now() - (yahoo ? lastYahoo : lastSec));
    if (wait > 0) await sleep(wait);
    if (yahoo) { lastYahoo = Date.now(); stats.yahoo++; } else { lastSec = Date.now(); stats.sec++; }
    try {
      const res = await fetch(url, {
        headers: yahoo ? { "User-Agent": YAHOO_UA, Accept: "application/json" } : { "User-Agent": UA, "Accept-Encoding": "gzip, deflate" },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.status === 404) return null;
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
function fresh(path, ttlMs) {
  if (!existsSync(path)) return false;
  const st = statSync(path);
  return st.size > 50 && (ttlMs == null || Date.now() - st.mtimeMs < ttlMs);
}
function writeAtomic(path, buf) {
  const tmp = `${path}.tmp${process.pid}`;
  writeFileSync(tmp, buf);
  renameSync(tmp, path);
}
async function cachedJson(path, url, ttlMs, opts = {}) {
  if (fresh(path, ttlMs)) return JSON.parse(readFileSync(path, "utf8"));
  try {
    const buf = await httpGet(url, opts);
    if (buf) {
      writeAtomic(path, buf);
      return JSON.parse(buf.toString("utf8"));
    }
  } catch (e) {
    stats.failures.push(`${url.slice(0, 90)}: ${e instanceof Error ? e.message : e}`);
  }
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null; // stale copy beats nothing
}
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

/* ---------- dates ---------- */
const D = (s) => Date.parse(`${s.slice(0, 10)}T00:00:00Z`);
const days = (a, b) => Math.round((D(b) - D(a)) / 86400000);
const shift = (s, n) => new Date(D(s) + n * 86400000).toISOString().slice(0, 10);

/* ---------- XBRL helpers (port of the preview engine) ---------- */
/** Best unit's de-duplicated facts for a tag (latest-filed per start/end), unit with the latest end wins. */
/**
 * Same period reported twice: keep the latest filed, except that for a full-year period (≥350 days) a
 * 10-K / 20-F / 40-F value beats a 10-Q / 6-K one. FIX's Q1-26 10-Q tagged a quarter as calendar 2025 and,
 * being filed later, replaced the 10-K figure (EV/EBITDA showed 74×).
 */
const ANNUAL_FORMS = new Set(["10-K", "10-K/A", "20-F", "20-F/A", "40-F", "40-F/A", "10-KT"]);
const annualRank = (x) => (x.start && days(x.start, x.end) >= 350 && ANNUAL_FORMS.has(x.form) ? 1 : 0);
const betterFact = (x, prev) => {
  const a = annualRank(x), b = annualRank(prev);
  return a !== b ? a > b : x.filed > prev.filed;
};
function rows(facts, tax, tag) {
  const g = facts?.[tax]?.[tag];
  if (!g) return { unit: null, rs: [] };
  let best = null;
  for (const [unit, list] of Object.entries(g.units || {})) {
    const by = new Map();
    for (const x of list) {
      if (!FORMS.has(x.form)) continue;
      const k = `${x.start ?? ""}|${x.end}`;
      const prev = by.get(k);
      if (!prev || betterFact(x, prev)) by.set(k, x);
    }
    const rs = [...by.values()];
    if (!rs.length) continue;
    const maxEnd = rs.reduce((m, r) => (r.end > m ? r.end : m), "");
    const cand = { unit, rs, maxEnd };
    if (!best || maxEnd > best.maxEnd || (maxEnd === best.maxEnd && unit.startsWith("USD") && !best.unit.startsWith("USD"))) best = cand;
  }
  return best ? { unit: best.unit, rs: best.rs } : { unit: null, rs: [] };
}
/** TTM by period end: 12-month facts, else prior FY + YTD - prior YTD. Returns Map(end → {v, form}). */
function ttm(rs, adj = (r) => r.val) {
  const dur = [];
  for (const r of rs) if (r.start) dur.push({ s: r.start, e: r.end, d: days(r.start, r.end), v: adj(r), form: r.form });
  const out = new Map();
  const ann = dur.filter((x) => x.d >= 350 && x.d <= 380);
  for (const a of ann) out.set(a.e, { v: a.v, form: a.form });
  for (const x of dur) {
    if (out.has(x.e) || x.d < 80 || x.d > 300) continue;
    const fy = ann.find((a) => Math.abs(days(a.e, shift(x.s, -1))) <= 7);
    const pv = dur.find((y) => Math.abs(y.d - x.d) <= 7 && Math.abs(days(y.e, shift(x.e, -365))) <= 10);
    if (fy && pv) out.set(x.e, { v: fy.v + x.v - pv.v, form: x.form });
  }
  return out;
}
const maxKey = (m) => [...m.keys()].reduce((a, b) => (b > a ? b : a), "");
function bestTtm(facts, cands, adj) {
  let best = null;
  for (const [tax, tag] of cands) {
    const { unit, rs } = rows(facts, tax, tag);
    if (!rs.length) continue;
    const m = ttm(rs, adj);
    if (m.size && (!best || maxKey(m) > maxKey(best.m))) best = { unit, m, tag, tax };
  }
  return best || { unit: null, m: new Map(), tag: null, tax: null };
}
/** Instant (balance-sheet) values; when the filer tags several currencies, use the income-statement unit. */
function inst(facts, tax, tag, unit = null, conv = (v) => v) {
  const m = new Map();
  const g = facts?.[tax]?.[tag];
  let u = unit;
  let list;
  if (unit && g?.units?.[unit]) list = rowsOfUnit(g.units[unit]);
  else ({ unit: u, rs: list } = rows(facts, tax, tag));
  for (const r of list) if (!r.start) m.set(r.end, conv(r.val, u));
  return m;
}
function rowsOfUnit(list) {
  const by = new Map();
  for (const x of list) {
    if (!FORMS.has(x.form)) continue;
    const k = `${x.start ?? ""}|${x.end}`;
    const prev = by.get(k);
    if (!prev || betterFact(x, prev)) by.set(k, x);
  }
  return [...by.values()];
}
const near = (m, end, back) => {
  for (const [k, v] of m) if (Math.abs(days(k, shift(end, -back))) <= 10) return v;
  return undefined;
};

/* ---------- per-ticker metrics ---------- */
function metrics({ ticker, price, facts, splits, fx, asOf }) {
  const notes = [];
  const r = { p: price };
  const splitAdj = (row) => {
    let a = 1;
    for (const s of splits) if (s.date > row.filed) a *= s.ratio;
    return row.val / a;
  };
  /** Share counts filed before a split scale UP by the ratio (EPS scales down). */
  const shareAdj = (row) => {
    let a = 1;
    for (const s of splits) if (s.date > row.filed) a *= s.ratio;
    return row.val * a;
  };
  const adr = ADR[ticker] ?? 1;
  const fxOf = (unit) => {
    const ccy = String(unit || "USD").split("/")[0];
    if (ccy === "USD") return 1;
    if (fx[ccy] == null) throw new Error(`no FX for ${ccy}`);
    if (!notes.some((n) => n.startsWith("reports in"))) notes.push(`reports in ${ccy}, converted at ${fx[ccy]}`);
    return fx[ccy];
  };
  if (ADR[ticker]) notes.push(`1 ADS = ${adr} ordinary shares`);
  let annual = false;

  // --- EPS
  let { unit: eu, m: eps } = bestTtm(facts, [["us-gaap", "EarningsPerShareDiluted"], ["ifrs-full", "DilutedEarningsLossPerShare"], ["us-gaap", "EarningsPerShareBasicAndDiluted"]], splitAdj);
  if (!eps.size || days(maxKey(eps), asOf) > STALE_DAYS) {
    const ni = bestTtm(facts, [["us-gaap", "NetIncomeLossAvailableToCommonStockholdersDiluted"], ["us-gaap", "NetIncomeLoss"], ["ifrs-full", "ProfitLossAttributableToOrdinaryEquityHoldersOfParentEntity"]]);
    const sh = new Map();
    for (const row of rows(facts, "us-gaap", "WeightedAverageNumberOfDilutedSharesOutstanding").rs)
      if (row.start && days(row.start, row.end) >= 80 && days(row.start, row.end) <= 100) sh.set(row.end, shareAdj(row));
    if (ni.m.size && days(maxKey(ni.m), asOf) <= STALE_DAYS) {
      const m2 = new Map();
      for (const [k, v] of ni.m) if (sh.get(k)) m2.set(k, { v: v.v / sh.get(k), form: v.form });
      if (m2.size) { eps = m2; eu = ni.unit; notes.push("EPS = TTM net income / latest-quarter diluted shares"); }
    }
  }
  if (eps.size) {
    const e = maxKey(eps);
    const k = fxOf(eu) * adr;
    const cur = eps.get(e).v * k;
    if (ANNUAL_FOREIGN.has(eps.get(e).form)) annual = true;
    const prevRaw = near(eps, e, 365);
    const prev = prevRaw ? prevRaw.v * k : null;
    if (days(e, asOf) > STALE_DAYS) {
      Object.assign(r, { pe: null, pw: "stale", g: null, gw: "stale" });
      notes.push(`latest EPS period ${e}`);
    } else {
      r.pe = price != null && cur > 0 ? price / cur : null;
      r.pw = r.pe == null ? (price == null ? "missing" : "nm") : null;
      if (prev == null) Object.assign(r, { g: null, gw: "missing" });
      else if (cur > 0 && prev > 0) Object.assign(r, { g: cur / prev - 1, gw: null });
      else Object.assign(r, { g: null, gw: "nm" });
    }
    r.fe = e;
  } else Object.assign(r, { pe: null, pw: "missing", g: null, gw: "missing" });

  // --- EV / EBITDA
  const done = (why, detail) => {
    Object.assign(r, { ev: null, evw: why });
    if (detail) notes.push(detail);
    return r;
  };
  const finish = () => {
    if (annual) r.a = 1;
    if (notes.length) r.n = notes.join("; ");
    return r;
  };
  if (BANK_INS.has(ticker)) { notes.push("bank / insurer / lender: EV/EBITDA not meaningful"); done("nm"); return finish(); }
  let { unit: ou, m: oi, tax } = bestTtm(facts, [["us-gaap", "OperatingIncomeLoss"], ["ifrs-full", "ProfitLossFromOperatingActivities"]]);
  if (!oi.size || days(maxKey(oi), asOf) > STALE_DAYS) {
    const pt = bestTtm(facts, [["us-gaap", "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"], ["us-gaap", "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"]]);
    const ie = bestTtm(facts, [["us-gaap", "InterestExpense"], ["us-gaap", "InterestExpenseNonoperating"], ["us-gaap", "InterestExpenseDebt"]]);
    if (pt.m.size && ie.m.size && ie.m.has(maxKey(pt.m))) {
      const m2 = new Map();
      for (const [k, v] of pt.m) if (ie.m.has(k)) m2.set(k, { v: v.v + ie.m.get(k).v, form: v.form });
      oi = m2; ou = pt.unit; tax = "us-gaap";
      notes.push("EBIT proxy = pretax income + interest expense");
    }
  }
  if (!oi.size || days(maxKey(oi), asOf) > STALE_DAYS) { done(oi.size ? "stale" : "missing", "no current operating income tag"); return finish(); }
  const e = maxKey(oi);
  if (ANNUAL_FOREIGN.has(oi.get(e).form)) annual = true;
  const usd = (v, unit) => v * fxOf(unit);
  // D&A
  let da = null;
  const daTags = tax === "us-gaap"
    ? ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization", "DepreciationAmortizationAndAccretionNet", "DepreciationAmortizationAndOther"]
    : ["DepreciationAndAmortisationExpense", "DepreciationAmortisationAndImpairmentLossReversalOfImpairmentLossRecognisedInProfitOrLoss", "DepreciationExpense"];
  for (const tg of daTags) {
    const { unit: du, rs } = rows(facts, tax, tg);
    const m = ttm(rs);
    if (m.has(e)) { da = usd(m.get(e).v, du); break; }
  }
  if (da == null) {
    const pairs = tax === "us-gaap"
      ? [["Depreciation", "AmortizationOfIntangibleAssets"], ["DepreciationNonproduction", "AmortizationOfIntangibleAssets"]]
      : [["AdjustmentsForDepreciationExpense", "AdjustmentsForAmortisationExpense"], ["DepreciationPropertyPlantAndEquipmentIncludingRightofuseAssets", "AmortisationIntangibleAssetsOtherThanGoodwill"]];
    for (const [a, b] of pairs) {
      const ra = rows(facts, tax, a), rb = rows(facts, tax, b);
      const ma = ttm(ra.rs), mb = ttm(rb.rs);
      if (ma.has(e)) { da = usd(ma.get(e).v, ra.unit) + (mb.has(e) ? usd(mb.get(e).v, rb.unit) : 0); break; }
    }
  }
  // No D&A → EV/EBITDA stays "missing", but EV itself is still built (Growth Score EV/Sales needs it).
  const noDA = da == null;
  // revenue at the same period end
  let rev = null;
  for (const [tx, tg] of [["us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax"], ["us-gaap", "Revenues"], ["us-gaap", "RevenueFromContractWithCustomerIncludingAssessedTax"], ["us-gaap", "SalesRevenueNet"], ["ifrs-full", "Revenue"], ["ifrs-full", "RevenueFromContractsWithCustomers"]]) {
    const { unit: ru, rs } = rows(facts, tx, tg);
    const m = ttm(rs);
    if (m.has(e)) { rev = usd(m.get(e).v, ru); break; }
  }
  // debt and cash at the period end
  let debt;
  let cash;
  if (tax === "us-gaap") {
    const I = (tg) => inst(facts, tax, tg, ou, usd);
    const [ltd, ltdn, ltdc, dc, lnl, npc, stb, cp] = ["LongTermDebt", "LongTermDebtNoncurrent", "LongTermDebtCurrent", "DebtCurrent", "LongTermNotesAndLoans", "NotesPayableCurrent", "ShortTermBorrowings", "CommercialPaper"].map(I);
    const cvn = ["ConvertibleDebtNoncurrent", "ConvertibleLongTermNotesPayable", "ConvertibleNotesPayable", "ConvertibleDebtCurrent", "ConvertibleNotesPayableCurrent", "ConvertibleSeniorNotesPayable"].map(I);
    if (ltdn.has(e)) debt = ltdn.get(e) + (ltdc.get(e) ?? dc.get(e) ?? 0);
    else if (ltd.has(e)) debt = ltd.get(e) + (ltdc.has(e) ? 0 : dc.get(e) ?? 0);
    else if (lnl.has(e)) debt = lnl.get(e) + (npc.get(e) ?? 0);
    else debt = cvn.reduce((s, m) => s + (m.get(e) ?? 0), 0);
    debt += stb.get(e) ?? cp.get(e) ?? 0;
    let c = I("CashAndCashEquivalentsAtCarryingValue");
    if (!c.has(e)) c = I("CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents");
    if (c.has(e)) {
      const s1 = I("ShortTermInvestments"), s2 = I("MarketableSecuritiesCurrent"), s3 = I("AvailableForSaleSecuritiesDebtSecuritiesCurrent");
      cash = c.get(e) + (s1.get(e) ?? s2.get(e) ?? s3.get(e) ?? 0);
    }
  } else {
    const b = inst(facts, tax, "Borrowings", ou, usd);
    debt = b.has(e) ? b.get(e) : (inst(facts, tax, "LongtermBorrowings", ou, usd).get(e) ?? 0) + (inst(facts, tax, "CurrentBorrowingsAndCurrentPortionOfNoncurrentBorrowings", ou, usd).get(e) ?? 0);
    const c = inst(facts, tax, "CashAndCashEquivalents", ou, usd);
    if (c.has(e)) cash = c.get(e) + (inst(facts, tax, "CurrentFinancialAssetsAtAmortisedCost", ou, usd).get(e) ?? 0);
  }
  if (cash == null) { done("missing", noDA ? "no D&A tag" : "no cash tag"); return finish(); }
  // shares: cover page (sum of classes on the latest filing) if recent, else latest diluted weighted average
  let shares = null;
  const dei = facts?.dei?.EntityCommonStockSharesOutstanding?.units?.shares ?? [];
  if (dei.length) {
    const le = dei.reduce((m, x) => (x.end > m ? x.end : m), "");
    if (days(le, asOf) < 200) {
      const fl = dei.filter((x) => x.end === le).reduce((m, x) => (x.filed > m ? x.filed : m), "");
      const seen = new Set();
      shares = 0;
      for (const x of dei) {
        if (x.end !== le || x.filed !== fl) continue;
        const key = `${x.accn}|${x.val}|${x.frame ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);
        shares += x.val;
      }
      for (const s of splits) if (s.date > fl) shares *= s.ratio;
    }
  }
  // Sanity: a cover-page count far from the diluted weighted average is a tagging slip (BABA FY26 cover
  // page dropped a digit) → use the weighted average instead.
  let wavg = null;
  {
    let w = rows(facts, tax, tax === "us-gaap" ? "WeightedAverageNumberOfDilutedSharesOutstanding" : "AdjustedWeightedAverageShares").rs;
    if (!w.length && tax !== "us-gaap") w = rows(facts, tax, "WeightedAverageShares").rs;
    w = w.filter((x) => x.start);
    if (w.length) {
      w.sort((a, b) => (a.end === b.end ? days(a.start, a.end) - days(b.start, b.end) : a.end < b.end ? 1 : -1));
      wavg = shareAdj(w[0]);
    }
  }
  if (shares && wavg && (shares / wavg > 2 || shares / wavg < 0.5)) {
    notes.push("cover-page share count looked wrong; used diluted weighted average");
    shares = null;
  }
  if (!shares) shares = wavg;
  if (!shares) {
    let w = rows(facts, tax, tax === "us-gaap" ? "WeightedAverageNumberOfDilutedSharesOutstanding" : "AdjustedWeightedAverageShares").rs;
    if (!w.length && tax !== "us-gaap") w = rows(facts, tax, "WeightedAverageShares").rs;
    w = w.filter((x) => x.start);
    if (w.length) {
      w.sort((a, b) => (a.end === b.end ? days(a.start, a.end) - days(b.start, b.end) : a.end < b.end ? 1 : -1));
      shares = shareAdj(w[0]);
    }
  }
  if (!shares || price == null) { done("missing", noDA ? "no D&A tag" : !shares ? "no share count" : "no close"); return finish(); }
  const mcap = (price / adr) * shares;
  const ev = mcap + debt - cash;
  // Growth Score input (USD): stripped before fundamentals.json is written.
  Object.defineProperty(r, "_x", { value: { ev, cash, e }, enumerable: false });
  if (noDA) { done("missing", "no D&A tag"); return finish(); }
  const ebitda = usd(oi.get(e).v, ou) + da;
  r.fe = r.fe && r.fe > e ? r.fe : e;
  const ok = ebitda > 0 && rev && ebitda / rev >= 0.05 && ev / ebitda <= 100;
  Object.assign(r, { ev: ok ? ev / ebitda : null, evw: ok ? null : "nm" });
  return finish();
}

/* ---------- Growth Score (owner approved 2026-10-10, preview v2; flag MEMBERS_GROWTH_SCORE) ----------
 * Same company-facts files as above (no extra SEC requests); SIC from the cached submissions.
 * Weights: revenue growth 40 · gross-margin trend 20 · EV/Sales vs SIC peers 20 · cash runway 10 ·
 * path to profit 10. Each part is a percentile (0–100) within our stock universe; missing parts are
 * reweighted; under 60% of the weight available → partial (greyed, not ranked).
 * Danger = high burn (FCF margin < −15% or runway < 18 months) AND (gross margin −2pp y/y, operating
 * margin −2pp y/y, or a retention proxy: RPO/deferred revenue lagging sales, or sales slowing sharply).
 * Customer retention (NRR) is not in XBRL company facts, hence the proxies. Education only. */
const GS_W = { rev: 40, gm: 20, evs: 20, run: 10, path: 10 };
const GS_REV = [["us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax"], ["us-gaap", "Revenues"], ["us-gaap", "RevenueFromContractWithCustomerIncludingAssessedTax"], ["us-gaap", "SalesRevenueNet"], ["ifrs-full", "Revenue"], ["ifrs-full", "RevenueFromContractsWithCustomers"]];
const GS_GP = [["us-gaap", "GrossProfit"], ["ifrs-full", "GrossProfit"]];
const GS_COST = [["us-gaap", "CostOfRevenue"], ["us-gaap", "CostOfGoodsAndServicesSold"], ["us-gaap", "CostOfGoodsSold"], ["us-gaap", "CostOfGoodsAndServiceExcludingDepreciationDepletionAndAmortization"], ["ifrs-full", "CostOfSales"]];
const GS_OI = [["us-gaap", "OperatingIncomeLoss"], ["ifrs-full", "ProfitLossFromOperatingActivities"]];
const GS_CFO = [["us-gaap", "NetCashProvidedByUsedInOperatingActivities"], ["us-gaap", "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations"], ["ifrs-full", "CashFlowsFromUsedInOperatingActivities"]];
const GS_CAPEX = [["us-gaap", "PaymentsToAcquirePropertyPlantAndEquipment"], ["us-gaap", "PaymentsToAcquireProductiveAssets"], ["ifrs-full", "PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities"], ["ifrs-full", "PurchaseOfPropertyPlantAndEquipment"]];
const GS_RPO = [["us-gaap", "RevenueRemainingPerformanceObligation"]];
const GS_DEF = [["us-gaap", "ContractWithCustomerLiability"], ["us-gaap", "DeferredRevenue"]];
const GS_DEFPARTS = [["us-gaap", "ContractWithCustomerLiabilityCurrent", "ContractWithCustomerLiabilityNoncurrent"], ["us-gaap", "DeferredRevenueCurrent", "DeferredRevenueNoncurrent"]];
const vmap = (m) => new Map([...m].map(([k, v]) => [k, v.v]));
const ago = (m, e, back = 365, tol = 12) => {
  for (const [k, v] of m) if (Math.abs(days(k, shift(e, -back))) <= tol) return v;
  return null;
};
/** Quarter values by end: 3-month facts, plus Q4 = FY − 9-month YTD (same start). */
function quarters(rs) {
  const dur = rs.filter((r) => r.start).map((r) => ({ s: r.start, e: r.end, d: days(r.start, r.end), v: r.val }));
  const q = new Map();
  for (const x of dur) if (x.d >= 80 && x.d <= 100) q.set(x.e, x.v);
  for (const x of dur) {
    if (x.d < 350 || x.d > 380 || q.has(x.e)) continue;
    const nine = dur.find((y) => y.s === x.s && y.d >= 260 && y.d <= 290);
    if (nine) q.set(x.e, x.v - nine.v);
  }
  return q;
}
function bestMap(facts, cands, fn) {
  let best = { unit: null, m: new Map(), tag: null };
  for (const [tax, tag] of cands) {
    const { unit, rs } = rows(facts, tax, tag);
    if (!rs.length) continue;
    const m = fn(rs);
    if (m.size && (!best.m.size || maxKey(m) > maxKey(best.m))) best = { unit, m, tag };
  }
  return best;
}
const ttmV = (rs) => vmap(ttm(rs));
function instFirst(facts, cands) {
  for (const [tax, tag] of cands) {
    const { rs } = rows(facts, tax, tag);
    if (rs.length) return new Map(rs.filter((r) => !r.start).map((r) => [r.end, r.val]));
  }
  return new Map();
}
/** Raw Growth Score inputs for one company (ratios are currency-neutral; ccy kept for runway / EV/Sales). */
function growthRaw({ facts, asOf }) {
  const r = { notes: [] };
  let { unit: ru, m: rv, tag: rtag } = bestMap(facts, GS_REV, ttmV);
  if (!rv.size) { r.notes.push("No revenue data in SEC filings"); return r; }
  {
    // Revenue tag alignment: among tags reaching the latest end take the largest (rental / lease revenue
    // sits outside the ASC 606 tag at URI, O, MARA-type filers).
    const le = maxKey(rv);
    for (const [tax, tag] of GS_REV) {
      const { unit, rs } = rows(facts, tax, tag);
      if (!rs.length) continue;
      const m = ttmV(rs);
      if (m.has(le) && m.get(le) > rv.get(le) && ago(m, le) != null) { ru = unit; rv = m; rtag = tag; }
    }
  }
  const e = maxKey(rv);
  r.e = e;
  if (days(e, asOf) > STALE_DAYS) { r.stale = true; r.notes.push(`Latest SEC figures are from ${e.slice(8, 10)}/${e.slice(5, 7)}/${e.slice(0, 4)} (too old)`); return r; }
  const rtRows = rows(facts, ...GS_REV.find((x) => x[1] === rtag)).rs;
  r.annual = !rtRows.some((x) => x.start && days(x.start, x.end) >= 80 && days(x.start, x.end) <= 100);
  const rev = rv.get(e);
  const rp = ago(rv, e);
  r.rev = rev;
  r.ccy = String(ru || "USD").split("/")[0];
  r.rg = rp && rp > 0 ? rev / rp - 1 : null;
  if (!(rp && rp > 0)) r.notes.push("No year-ago revenue in SEC data");
  const cfoB = bestMap(facts, GS_CFO, ttmV), cxB = bestMap(facts, GS_CAPEX, ttmV);
  if (rev <= 0) {
    r.prerev = true; r.notes.push("Pre-revenue / no 12-month revenue");
    if (cfoB.m.has(e)) r.fcf = cfoB.m.get(e) - (cxB.m.get(e) ?? 0);
    return r;
  }
  r.rpUsdSmall = rp != null && rp > 0; // tiny-base check done with FX in the caller
  r.rp = rp;
  const qv = quarters(rtRows);
  r.qg = null;
  if (qv.has(e)) { const qp = ago(qv, e); r.qg = qp && qp > 0 ? qv.get(e) / qp - 1 : null; }
  // gross margin (GrossProfit, else revenue − cost of revenue)
  let gp = bestMap(facts, GS_GP, ttmV).m, src = "GrossProfit";
  if (!gp.has(e) || ago(gp, e) == null) {
    const co = bestMap(facts, GS_COST, ttmV);
    if (co.m.has(e) && ago(co.m, e) != null) {
      gp = new Map([...co.m].filter(([k]) => rv.has(k)).map(([k, v]) => [k, rv.get(k) - v]));
      src = `revenue − ${co.tag}`;
    } else gp = new Map();
  }
  if (gp.has(e) && ago(gp, e) != null && ago(rv, e)) {
    const gm = gp.get(e) / rev, gm0 = ago(gp, e) / ago(rv, e);
    if (gm > -1 && gm <= 1 && gm0 > -1 && gm0 <= 1) Object.assign(r, { gm, gmd: (gm - gm0) * 100, gmSrc: src });
  }
  // operating margin
  const oi = bestMap(facts, GS_OI, ttmV).m;
  if (oi.has(e)) {
    r.om = oi.get(e) / rev;
    if (ago(oi, e) != null && ago(rv, e)) r.omd = (oi.get(e) / rev - ago(oi, e) / ago(rv, e)) * 100;
  }
  // free cash flow
  if (cfoB.m.has(e)) {
    r.fcf = cfoB.m.get(e) - (cxB.m.get(e) ?? 0);
    r.fcfm = r.fcf / rev;
    if (!cxB.m.has(e)) r.notes.push("No capex tag (FCF = operating cash flow)");
  }
  // retention proxy: RPO, else deferred revenue, growth vs revenue growth
  for (const [kind, cands] of [["RPO", GS_RPO], ["deferred revenue", GS_DEF]]) {
    let m = instFirst(facts, cands);
    if (kind === "deferred revenue" && !m.has(e)) {
      for (const [tax, a, b] of GS_DEFPARTS) {
        const ma = instFirst(facts, [[tax, a]]), mb = instFirst(facts, [[tax, b]]);
        if (ma.has(e)) { m = new Map([...ma].map(([k, v]) => [k, v + (mb.get(k) ?? 0)])); break; }
      }
    }
    const p = m.has(e) ? ago(m, e, 365, 15) : null;
    if (m.has(e) && p && p > 0 && m.get(e) > 0 && m.get(e) >= 0.05 * rev) { r.bkKind = kind; r.bkg = m.get(e) / p - 1; break; }
  }
  return r;
}
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b), n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
};
/** Score the universe. R: {ticker: raw}; ev: {ticker: {ev, cash, e}} (USD). */
function scoreGrowth(R, evx, fx) {
  const fxOf = (c) => (c && c !== "USD" ? fx[c] ?? 1 : 1);
  for (const [t, r] of Object.entries(R)) {
    if (r.rp != null && r.rp * fxOf(r.ccy) < 50e6 && r.rp > 0) { r.tiny = true; r.notes.push("Year-ago revenue under $50M: growth % from a tiny base"); }
    const x = evx[t];
    if (BANK_INS.has(t) || !x || r.stale || x.e !== r.e) continue;
    if (x.ev > 0 && r.rev > 0) { r.evs = x.ev / (r.rev * fxOf(r.ccy)); r.cash = x.cash; }
  }
  const have = Object.values(R).filter((r) => r.evs != null);
  for (const r of have) {
    let done = false;
    for (const n of [3, 2]) {
      const g = have.filter((o) => r.sic && o.sic.slice(0, n) === r.sic.slice(0, n)).map((o) => o.evs);
      if (g.length >= 5) { r.pm = median(g); r.pg = `SIC ${r.sic.slice(0, n)}${"x".repeat(4 - n)} (${g.length})`; done = true; break; }
    }
    if (!done) { r.pm = median(have.map((o) => o.evs)); r.pg = `universe (${have.length})`; }
    r.rel = r.evs / r.pm;
  }
  for (const [t, r] of Object.entries(R)) {
    if (r.fcf != null && r.cash != null && !BANK_INS.has(t)) r.runway = r.fcf >= 0 ? null : r.cash / ((-r.fcf * fxOf(r.ccy)) / 12);
    if (r.rg != null) r.blend = r.qg != null ? 0.7 * r.rg + 0.3 * r.qg : r.rg;
  }
  const pct = (key, invert = false) => {
    const vals = Object.values(R).filter((r) => r[key] != null).map((r) => r[key]);
    const xs = [...vals].sort((a, b) => a - b), n = xs.length;
    for (const r of Object.values(R)) {
      if (r[key] == null) continue;
      const v = r[key];
      let below = 0, eq = 0;
      for (const x of xs) { if (x < v) below++; else if (x === v) eq++; }
      const p = ((below + 0.5 * eq) / n) * 100;
      r[`${key}_p`] = invert ? 100 - p : p;
    }
  };
  pct("blend"); pct("gmd"); pct("rel", true); pct("om"); pct("omd");
  const out = {};
  for (const [t, r] of Object.entries(R)) {
    const s = {};
    if (r.blend_p != null) s.rev = r.blend_p;
    if (!BANK_INS.has(t) && r.gmd_p != null) s.gm = r.gmd_p;
    if (r.rel_p != null) s.evs = r.rel_p;
    if (r.fcf != null && !BANK_INS.has(t)) {
      if (r.fcf >= 0) s.run = 100;
      else if (r.runway != null) s.run = Math.min(r.runway / 36, 1) * 100;
    }
    if (r.om_p != null) s.path = 0.5 * r.om_p + 0.5 * (r.omd_p ?? r.om_p);
    const why = r.notes.length ? r.notes[r.notes.length - 1] : "No revenue data";
    if (s.rev == null) { out[t] = { gs: null, why: r.stale || r.prerev || r.rg == null ? why : "No revenue growth" }; continue; }
    const w = Object.keys(s).reduce((a, k) => a + GS_W[k], 0);
    const score = Object.entries(s).reduce((a, [k, v]) => a + GS_W[k] * v, 0) / w;
    const miss = Object.keys(GS_W).filter((k) => s[k] == null);
    let danger = false;
    const dw = [];
    const burn = !BANK_INS.has(t) && r.fcf != null && r.fcf < 0 && ((r.fcfm ?? 0) < -0.15 || (r.runway != null && r.runway < 18));
    if (burn) {
      const weak = [];
      const P = (v) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(0)}%`;
      if (r.gmd != null && r.gmd < -2) weak.push(`Gross margin ${r.gmd.toFixed(1)}pp y/y`);
      if (r.omd != null && r.omd < -2) weak.push(`Operating margin ${r.omd.toFixed(1)}pp y/y`);
      if (r.bkg != null && r.rg != null && r.bkg < Math.min(r.rg - 0.1, 0.1)) weak.push(`Retention proxy: ${r.bkKind} ${P(r.bkg)} vs revenue ${P(r.rg)}`);
      if (r.qg != null && r.rg != null && r.qg < r.rg - 0.15 && (r.rg <= 0 || r.qg < 0.6 * r.rg)) weak.push(`Retention proxy: sales slowing (latest quarter ${P(r.qg)} vs 12 months ${P(r.rg)})`);
      if (weak.length) {
        danger = true;
        dw.push(`High burn: FCF margin ${P(r.fcfm)}${r.runway != null ? `, runway ${r.runway.toFixed(0)} months` : ""}`, ...weak);
      }
    }
    const R1 = (v, d = 1) => (v == null ? null : Math.round(v * 10 ** d) / 10 ** d);
    out[t] = {
      gs: R1(score, 1), pt: w < 60 ? 1 : 0, cov: w, miss, d: danger ? 1 : 0, dw,
      s: Object.fromEntries(Object.keys(GS_W).map((k) => [k, s[k] == null ? null : Math.round(s[k])])),
      rg: R1(r.rg, 4), qg: R1(r.qg, 4), tiny: r.tiny ? 1 : 0, an: r.annual ? 1 : 0,
      gm: R1(r.gm, 4), gmd: R1(r.gmd, 2), evs: R1(r.evs, 2), pm: R1(r.pm, 2), pg: r.pg ?? null, rel: R1(r.rel, 3),
      run: r.fcf == null || BANK_INS.has(t) ? null : r.fcf >= 0 ? "cash+" : r.runway == null ? null : Math.round(r.runway),
      fcfm: R1(r.fcfm, 4), om: R1(r.om, 4), omd: R1(r.omd, 2),
      ...(r.bkg != null ? { bk: [r.bkKind, R1(r.bkg, 4)] } : {}),
      ...(r.notes.length ? { n: r.notes.join("; ") } : {}),
    };
  }
  return out;
}

/* ---------- main ---------- */
async function main() {
  const t0 = Date.now();
  const sessionDate = argVal("--session-date") || new Date().toISOString().slice(0, 10);
  const universe = readJson(join(DATA, "fish-universe.json")).tickers;
  const index = existsSync(join(CHARTS, "index.json")) ? readJson(join(CHARTS, "index.json")).tickers || {} : {};
  const all = [...new Set([...universe, ...Object.keys(index)])];
  const close = (t) => {
    const p = join(CHARTS, `${t}.json`);
    if (!existsSync(p)) return { price: null, asOf: null };
    try {
      const b = readJson(p);
      const last = b.b?.[b.b.length - 1];
      return { price: last ? last[4] : null, asOf: b.asOf ?? null };
    } catch {
      return { price: null, asOf: null };
    }
  };
  const isStock = (t) => !NON_STOCKS.has(t) && !/USD$/.test(t) && (index[t] ? index[t].g === "stock" : universe.includes(t));

  const mapPath = join(SUB_CACHE, "company_tickers.json");
  const map = await cachedJson(mapPath, "https://www.sec.gov/files/company_tickers.json", MAP_TTL_MS);
  if (!map) throw new Error("SEC ticker map unavailable");
  const byTicker = {};
  for (const row of Object.values(map)) {
    const k = String(row.ticker).toUpperCase();
    if (!byTicker[k]) byTicker[k] = Number(row.cik_str);
  }

  const metaPath = join(CACHE, "meta.json");
  const meta = existsSync(metaPath) ? readJson(metaPath) : {};
  const out = {};
  const prev = existsSync(OUT) ? readJson(OUT) : null;
  const fxNeed = new Set();
  const work = [];
  for (const t of all) {
    const { price } = close(t);
    if (!isStock(t)) {
      out[t] = { p: price, pe: null, pw: "na", g: null, gw: "na", ev: null, evw: "na", k: index[t]?.g ?? "non-equity" };
      continue;
    }
    const cik = byTicker[t] ?? byTicker[ALIAS[t] ?? ""];
    if (!cik) {
      out[t] = { p: price, pe: null, pw: "missing", g: null, gw: "missing", ev: null, evw: "missing", n: "no SEC CIK" };
      continue;
    }
    work.push({ t, cik, price });
  }

  // 1) submissions (shared 12h cache) → refetch company facts only on a new periodic filing
  let factsFailed = 0;
  for (const w of work) {
    const pad = String(w.cik).padStart(10, "0");
    const subPath = join(SUB_CACHE, "sub", `${w.cik}.json`);
    const hadSub = fresh(subPath, SUB_TTL_MS);
    const sub = await cachedJson(subPath, `https://data.sec.gov/submissions/CIK${pad}.json`, SUB_TTL_MS);
    if (!hadSub && sub) stats.secSub++;
    w.sic = String(sub?.sic ?? "");
    const rec = sub?.filings?.recent ?? {};
    let latestAcc = null;
    (rec.form ?? []).some((f, i) => {
      if (PERIODIC.has(f)) { latestAcc = rec.accessionNumber[i]; return true; }
      return false;
    });
    const fPath = join(CACHE, "facts", `${w.cik}.json`);
    const m = meta[w.cik];
    const need = !existsSync(fPath) || !m || (latestAcc && m.acc !== latestAcc);
    if (need && !OFFLINE) {
      try {
        const buf = await httpGet(`https://data.sec.gov/api/xbrl/companyfacts/CIK${pad}.json`);
        stats.secFacts++;
        if (buf) {
          writeAtomic(fPath, buf);
          meta[w.cik] = { t: w.t, acc: latestAcc, fetchedAt: new Date().toISOString() };
        }
      } catch (e) {
        factsFailed++;
        stats.failures.push(`${w.t} facts: ${e instanceof Error ? e.message : e}`);
      }
    } else stats.factsFromCache++;
    w.fPath = fPath;
  }
  writeAtomic(metaPath, JSON.stringify(meta));

  // 2) recent splits (Yahoo, cached 20h) and FX
  const yahooJson = async (sym, range, interval) =>
    cachedJson(join(CACHE, "yahoo", `${sym.replace(/[^A-Z0-9=.-]/gi, "_")}_${range}.json`),
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}&events=splits`,
      YAHOO_TTL_MS, { yahoo: true });
  for (const w of work) {
    w.splits = [];
    try {
      const j = await yahooJson(w.t, "1y", "1mo");
      const ev = j?.chart?.result?.[0]?.events?.splits ?? {};
      for (const s of Object.values(ev)) {
        const ratio = s.numerator / s.denominator;
        if (ratio >= 1.5 || ratio <= 0.67) w.splits.push({ date: new Date(s.date * 1000).toISOString().slice(0, 10), ratio });
      }
    } catch { /* no split info: treated as none */ }
  }

  // 3) metrics
  const fx = {};
  const loadFacts = (w) => {
    try {
      return existsSync(w.fPath) ? readJson(w.fPath).facts : null;
    } catch {
      return null;
    }
  };
  // currencies used (any non-USD unit on the main tags)
  for (const w of work) {
    const f = loadFacts(w);
    if (!f) continue;
    for (const tax of ["us-gaap", "ifrs-full"]) {
      for (const [tag, g] of Object.entries(f[tax] ?? {})) {
        if (!FX_TAGS.has(tag)) continue;
        for (const unit of Object.keys(g.units ?? {})) {
          const c = unit.split("/")[0];
          if (/^[A-Z]{3}$/.test(c) && c !== "USD") fxNeed.add(c);
        }
      }
    }
  }
  for (const c of fxNeed) {
    try {
      const j = await yahooJson(`${c}USD=X`, "5d", "1d");
      const v = j?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof v === "number" && v > 0) fx[c] = v;
    } catch { /* fall back below */ }
    if (fx[c] == null && prev?.fx?.[c]) fx[c] = prev.fx[c];
  }
  const errors = [];
  const evx = {};
  const gsRaw = {};
  const gsErrors = [];
  for (const w of work) {
    const facts = loadFacts(w);
    if (!facts) {
      out[w.t] = prev?.tickers?.[w.t] ? { ...prev.tickers[w.t], p: w.price, n: "kept from previous run (facts unavailable)" } : { p: w.price, pe: null, pw: "missing", g: null, gw: "missing", ev: null, evw: "missing" };
      continue;
    }
    try {
      out[w.t] = metrics({ ticker: w.t, price: w.price, facts, splits: w.splits, fx, asOf: sessionDate });
      if (out[w.t]._x) evx[w.t] = out[w.t]._x;
      try {
        gsRaw[w.t] = { ...growthRaw({ facts, asOf: sessionDate }), sic: w.sic || "" };
      } catch (e) {
        gsErrors.push(`${w.t}: ${e instanceof Error ? e.message : e}`);
      }
    } catch (e) {
      errors.push(`${w.t}: ${e instanceof Error ? e.message : e}`);
      out[w.t] = { p: w.price, pe: null, pw: "missing", g: null, gw: "missing", ev: null, evw: "missing", n: "calc error" };
    }
  }
  // round
  for (const v of Object.values(out)) {
    if (v.pe != null) v.pe = Math.round(v.pe * 10) / 10;
    if (v.ev != null) v.ev = Math.round(v.ev * 10) / 10;
    if (v.g != null) v.g = Math.round(v.g * 1000) / 1000;
  }
  const stocks = Object.values(out).filter((v) => v.pw !== "na");
  const count = (k, w) => ({ value: stocks.filter((v) => v[k] != null).length, nm: stocks.filter((v) => v[w] === "nm").length, stale: stocks.filter((v) => v[w] === "stale").length, missing: stocks.filter((v) => v[w] === "missing").length });
  if (work.length && factsFailed > work.length * 0.5) throw new Error(`too many company-facts failures (${factsFailed}/${work.length})`);
  const doc = {
    v: 1,
    asOf: sessionDate,
    builtAt: new Date().toISOString(),
    source: "SEC EDGAR XBRL company facts (TTM, GAAP as filed) + pack closes; Yahoo for recent splits and FX",
    method: "P/E = close / TTM diluted EPS · EPS g = TTM EPS vs a year earlier · EV/EBITDA = (mcap + debt − cash & ST investments) / (operating income + D&A). n/m: negative, margin <5%, >100×, banks/insurers/lenders.",
    fx,
    counts: { tickers: Object.keys(out).length, stocks: stocks.length, pe: count("pe", "pw"), epsGrowth: count("g", "gw"), evEbitda: count("ev", "evw") },
    fetch: { secRequests: stats.sec, submissionsFetched: stats.secSub, factsFetched: stats.secFacts, factsFromCache: stats.factsFromCache, yahooRequests: stats.yahoo, failures: stats.failures.slice(0, 20), errors: errors.slice(0, 20), seconds: Math.round((Date.now() - t0) / 100) / 10 },
    tickers: Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b))),
  };
  writeAtomic(OUT, JSON.stringify(doc, null, 1) + "\n");
  console.log(`fundamentals: ${stocks.length} stocks · P/E ${doc.counts.pe.value} · EPS g ${doc.counts.epsGrowth.value} · EV/EBITDA ${doc.counts.evEbitda.value} · SEC ${stats.sec} req (facts ${stats.secFacts}, submissions ${stats.secSub}) · Yahoo ${stats.yahoo} · ${doc.fetch.seconds}s`);
  if (errors.length) console.warn(`  calc errors: ${errors.join(" | ")}`);

  // Growth Score: its own file; a failure here keeps the previous growth-score.json and never blocks fundamentals.
  try {
    const tg = Date.now();
    const scored = scoreGrowth(gsRaw, evx, fx);
    for (const t of Object.keys(out)) if (out[t].pw !== "na" && !scored[t]) scored[t] = { gs: null, why: out[t].n === "no SEC CIK" ? "No SEC data" : "No SEC data" };
    const ranked = Object.entries(scored).filter(([, v]) => v.gs != null && !v.pt).sort((a, b) => b[1].gs - a[1].gs).map(([t]) => t);
    const vals = Object.values(scored);
    const gsDoc = {
      v: 1,
      asOf: sessionDate,
      builtAt: new Date().toISOString(),
      method: "Percentiles within our stock universe. Revenue growth 40% (0.7 × 12-month y/y + 0.3 × latest quarter y/y) · gross-margin trend 20% (pp y/y) · EV/Sales ÷ SIC peer median 20% (lower = better) · cash runway 10% ((cash + ST investments) ÷ FCF burn; FCF ≥ 0 or ≥ 36 months = 100) · path to profit 10% (½ operating margin, ½ its y/y change). Missing parts reweighted; < 60% of the weight → partial, not ranked. Danger = high burn (FCF margin < −15% or runway < 18 months) AND (gross margin < −2pp y/y, operating margin < −2pp y/y, or retention proxy: RPO / deferred revenue growth < min(revenue growth − 10pp, +10%), or latest-quarter growth > 15pp below 12-month growth and < 60% of it). NRR is not in XBRL company facts.",
      weights: GS_W,
      counts: { stocks: vals.length, scored: vals.filter((v) => v.gs != null).length, ranked: ranked.length, partial: vals.filter((v) => v.pt).length, full: vals.filter((v) => v.gs != null && v.miss.length === 0).length, danger: vals.filter((v) => v.d).length },
      errors: gsErrors.slice(0, 20),
      seconds: Math.round((Date.now() - tg) / 100) / 10,
      ranked,
      tickers: Object.fromEntries(Object.entries(scored).sort(([a], [b]) => a.localeCompare(b))),
    };
    writeAtomic(GS_OUT, JSON.stringify(gsDoc) + "\n");
    console.log(`growth score: ${gsDoc.counts.scored} scored · ${gsDoc.counts.ranked} ranked · ${gsDoc.counts.partial} partial · Danger ${gsDoc.counts.danger} · ${gsDoc.seconds}s`);
  } catch (e) {
    console.warn("growth score failed (previous growth-score.json kept):", e instanceof Error ? e.message : e);
  }
}

main().catch((e) => {
  console.error("build-fundamentals failed (previous file kept):", e instanceof Error ? e.message : e);
  process.exit(1);
});
