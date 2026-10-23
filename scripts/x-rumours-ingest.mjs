#!/usr/bin/env node
/**
 * X Rumours (owner approved 2026-10-10). Members Stocks tab, full-width row under Insider Buying.
 *
 * Two steps, because X can only be read through the agent's x connector (same as Desk Ideas):
 *   1. The routine agent runs the X searches (docs/ops/x-rumours-refresh.md, <= 25 reads) and saves
 *      the raw results plus its draft stories to /home/box/canaries/cache/x-rumours/raw-<date>.json.
 *   2. This script verifies every draft story mechanically and writes the box data:
 *
 *   node scripts/x-rumours-ingest.mjs --in <raw.json> [--session-date YYYY-MM-DD] [--dry-run] [--no-sec]
 *   node scripts/x-rumours-ingest.mjs --refresh-only [--session-date YYYY-MM-DD]   (pack step: no X)
 *
 * Checks per draft story (rules in data/x-rumours-config.json):
 *   a. ticker is a stock in data/fish-universe.json (no ETFs, metals, crypto); type is allowed
 *   b. evidence ids exist in the raw X results (posts / news stories) — nothing typed in by hand
 *   c. SOURCE GATE: a named outlet (allowlist) appears in the evidence, or a party source
 *      (company / index provider / activist letter / SEC filing) with announcement wording
 *   d. CORROBORATION: >= 2 independent evidence items (distinct authors; an X news story counts
 *      as one), or one item + a matching SEC filing. Otherwise "Unconfirmed" (hidden, audit only)
 *   e. TICKER MATCH: the company (name, or cashtag) is the subject of a deal verb in an
 *      outlet-citing item by name, or in >= 2 items. Catches "wrong ticker" posts
 *   f. OWN WORDS: our line must not share any 8-word run with the evidence text (no copying)
 *   g. SEC: data.sec.gov submissions JSON for the company; 8-K (items 1.01/2.01/7.01/8.01), 13D,
 *      SC TO-T/TO-C, SC 14D9, DEFM14A/PREM14A or 425 filed since 5 days before first seen whose
 *      document mentions the counterparty keyword -> Confirmed (link to the filing)
 * Status: Denied (ONLY when the row's own company denies it: story.deniedBy = one of the ticker's names,
 *   named next to denial wording) > Confirmed (party source / SEC) > Reported (named outlet).
 *   A denial or dispute by another party keeps Reported/Confirmed and adds `note` (shown under the line).
 * One row per story (key = ticker | type | counterparty); merged with the previous file; a row
 * with no update for 10 sessions goes Stale and leaves the box (kept in the log).
 * Move since = last daily close vs the close before the story first appeared (Yahoo, as the pack).
 *
 * Output: data/x-rumours.json (members: rows + log of every row ever shown and when)
 *         data/private/x-rumours-audit.json (owner only, /owner: filtered items + per-check results)
 * Exit 0 = written; 1 = input unusable (previous files kept); 2 = usage.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { ymdInTz, sleep } from "./lib/scan-common.mjs";
import { yahooDaily } from "./lib/decide-series.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const OUT = join(DATA, "x-rumours.json");
const AUDIT = join(DATA, "private", "x-rumours-audit.json");
const MIRROR = "/home/box/canaries";
const CFG = JSON.parse(readFileSync(join(DATA, "x-rumours-config.json"), "utf8"));
const UA = "Canary Dashboard research shaun@canarydashboard.com";

const args = process.argv.slice(2);
const arg = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : null;
};
const has = (k) => args.includes(k);
const inPath = arg("--in");
const refreshOnly = has("--refresh-only");
const dryRun = has("--dry-run");
const noSec = has("--no-sec");
if (!refreshOnly && !has("--sec-test") && (!inPath || !existsSync(inPath))) {
  console.error("usage: node scripts/x-rumours-ingest.mjs --in <raw.json> [--session-date YYYY-MM-DD] [--dry-run] [--no-sec]\n       node scripts/x-rumours-ingest.mjs --refresh-only [--session-date YYYY-MM-DD]");
  process.exit(2);
}
const nyDate = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const nyHour = (d) => Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hourCycle: "h23" }).format(d));
const sessionDate = arg("--session-date") || nyDate();

/* ---------------- universe + names ---------------- */
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
const NON_STOCKS = new Set(["GLD", "SLV", "SOXX", "IGV", "CIBR", "URA", "NLR", "XAR"]);
function stockUniverse() {
  const fish = readJson(join(DATA, "fish-universe.json"));
  const raw = Array.isArray(fish.tickers) && fish.tickers.length ? fish.tickers : (fish.groups ?? []).flatMap((g) => g.tickers ?? []);
  const etf = new Set();
  for (const f of ["etf-watch-universe.json", "etf-country-universe.json", "crypto-watch-universe.json"]) {
    try {
      for (const t of readJson(join(DATA, f)).tickers ?? []) etf.add(String(typeof t === "string" ? t : t?.ticker ?? "").toUpperCase());
    } catch {
      /* optional */
    }
  }
  return new Set(raw.map((t) => String(t).trim().toUpperCase()).filter((t) => t && !/USD$/.test(t) && !NON_STOCKS.has(t) && !etf.has(t)));
}
const UNIVERSE = stockUniverse();

const EDGAR_CACHE = existsSync(MIRROR) ? join(MIRROR, "cache", "edgar-form4") : join(ROOT, ".cache", "edgar-form4");
const DOC_CACHE = existsSync(MIRROR) ? join(MIRROR, "cache", "x-rumours", "sec-docs") : join(ROOT, ".cache", "x-rumours-sec-docs");
mkdirSync(join(EDGAR_CACHE, "sub"), { recursive: true });
mkdirSync(DOC_CACHE, { recursive: true });

/* ---------------- polite SEC fetch (<= 5 req/s, SEC limit 10) ---------------- */
let lastReq = 0;
let secRequests = 0;
async function secGet(url) {
  let err = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const wait = 200 - (Date.now() - lastReq);
    if (wait > 0) await sleep(wait);
    lastReq = Date.now();
    secRequests++;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Encoding": "gzip, deflate" }, signal: AbortSignal.timeout(30_000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let buf = Buffer.from(await res.arrayBuffer());
      if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
      return buf;
    } catch (e) {
      err = e;
      await sleep(1200 * (attempt + 1));
    }
  }
  throw err;
}
async function cached(path, url, ttlMs) {
  if (existsSync(path)) {
    const st = statSync(path);
    if (st.size > 50 && (ttlMs == null || Date.now() - st.mtimeMs < ttlMs)) return readFileSync(path);
  }
  const buf = await secGet(url);
  if (buf) writeFileSync(path, buf);
  return buf;
}
let tickerMap = null;
async function cikOf(ticker) {
  if (!tickerMap) {
    const buf = await cached(join(EDGAR_CACHE, "company_tickers.json"), "https://www.sec.gov/files/company_tickers.json", 7 * 24 * 3600e3);
    tickerMap = new Map();
    for (const v of Object.values(JSON.parse(buf.toString("utf8")))) tickerMap.set(String(v.ticker).toUpperCase(), { cik: Number(v.cik_str), title: v.title });
  }
  return tickerMap.get(ticker === "GOOG" ? "GOOGL" : ticker) ?? null;
}

/* ---------------- names ---------------- */
const SUFFIX = /\b(inc|incorporated|corp|corporation|co|company|holdings?|plc|ltd|limited|group|technolog(?:y|ies)|n\.?v\.?|s\.?a\.?|ag|se|class [a-z]|the)\b\.?/gi;
async function namesFor(ticker) {
  const out = new Set(CFG.nameAliases?.[ticker] ?? []);
  try {
    const m = await cikOf(ticker);
    if (m?.title) {
      const clean = m.title.replace(/[,.&]/g, " ").replace(SUFFIX, " ").replace(/\s+/g, " ").trim();
      const first = clean.split(" ")[0] ?? "";
      if (first.length >= 4) out.add(first);
      if (clean.split(" ").length >= 2) out.add(clean.split(" ").slice(0, 2).join(" "));
    }
  } catch {
    /* offline: aliases only */
  }
  return [...out].filter(Boolean);
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const reI = (s) => new RegExp(s, "i");
const OUTLETS = CFG.outlets.map((o) => ({ name: o.name, re: reI(o.re), handles: new Set((o.handles ?? []).map((h) => h.toLowerCase())) }));
// An outlet counts when the text names it or the post comes from its own X account (e.g. @business = Bloomberg).
const outletMatch = (o, e) => o.re.test(e.text) || (e.kind === "post" && o.handles.has(e.author));
const PARTY = CFG.partySources.map((o) => ({ name: o.name, re: reI(o.re) }));
const DEAL = reI(CFG.dealVerbs);
const DENY = reI(CFG.denialWords);

/* ---------------- helpers ---------------- */
const words = (s) => String(s).toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9$%.\s-]/g, " ").split(/\s+/).filter(Boolean);
function copiesText(line, texts, n = 8) {
  const w = words(line);
  if (w.length < n) return null;
  const grams = new Set();
  for (const t of texts) {
    const tw = words(t);
    for (let i = 0; i + n <= tw.length; i++) grams.add(tw.slice(i, i + n).join(" "));
  }
  for (let i = 0; i + n <= w.length; i++) {
    const g = w.slice(i, i + n).join(" ");
    if (grams.has(g)) return g;
  }
  return null;
}
const slug = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const keyOf = (s) => `${s.ticker}|${s.type}|${slug((s.partyKeywords ?? [])[0] || words(s.line).slice(0, 4).join(" "))}`;
function subjectHit(text, ticker, names) {
  // name or $TICKER followed (within 120 chars) by a deal verb, or deal verb then name within 60 chars
  const pats = [...names.map((n) => ({ re: new RegExp(`\\b${esc(n)}\\b`, "i"), byName: true })), { re: new RegExp(`\\$${esc(ticker)}\\b`, "i"), byName: false }];
  let best = null;
  for (const p of pats) {
    const m = p.re.exec(text);
    if (!m) continue;
    const after = text.slice(m.index, m.index + 120);
    const before = text.slice(Math.max(0, m.index - 60), m.index + m[0].length);
    if (DEAL.test(after.slice(m[0].length)) || DEAL.test(before)) {
      if (p.byName) return "name";
      best = "cashtag";
    }
  }
  return best;
}

/* ---------------- prices (Yahoo daily closes, same source as the pack) ---------------- */
const priceCache = new Map();
async function closes(ticker) {
  if (priceCache.has(ticker)) return priceCache.get(ticker);
  let bars = null;
  try {
    // Shared helper: fills Yahoo's null close on the latest session from meta.regularMarketPrice.
    const got = await yahooDaily(ticker, { range: "6mo", sessionDate });
    bars = got.bars ?? null;
  } catch {
    bars = null;
  }
  await sleep(150);
  priceCache.set(ticker, bars);
  return bars;
}
/** Close before the story was public: first seen before 16:00 ET -> previous session; after -> that day. */
function refBar(bars, firstSeenAt) {
  const d = new Date(firstSeenAt);
  const day = nyDate(d);
  const afterClose = nyHour(d) >= 16;
  const cands = bars.filter((b) => (afterClose ? b.date <= day : b.date < day));
  return cands.at(-1) ?? null;
}

/* ---------------- SEC confirmation ---------------- */
const SEC_FORMS = /^(8-K|8-K\/A|SC 13D|SC 13D\/A|SCHEDULE 13D|SCHEDULE 13D\/A|SC TO-T|SC TO-T\/A|SC TO-C|SC TO-I|SC 14D9|SC14D9C|DEFM14A|PREM14A|425)$/;
const SEC_TYPES = new Set(["M&A", "Activist", "Partnership", "Supply deal", "Financing", "Spin-off"]);
async function secCheck(ticker, type, keywords, firstSeenDate) {
  if (noSec || !SEC_TYPES.has(type) || !keywords?.length) return { checked: false, reason: noSec ? "skipped (--no-sec)" : "type or keyword not checkable" };
  const m = await cikOf(ticker);
  if (!m) return { checked: false, reason: "no CIK" };
  const cik10 = String(m.cik).padStart(10, "0");
  const buf = await cached(join(EDGAR_CACHE, "sub", `${m.cik}.json`), `https://data.sec.gov/submissions/CIK${cik10}.json`, 12 * 3600e3);
  if (!buf) return { checked: false, reason: "submissions 404" };
  const r = JSON.parse(buf.toString("utf8")).filings?.recent ?? {};
  const from = new Date(`${firstSeenDate}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 5);
  const fromIso = from.toISOString().slice(0, 10);
  const cands = [];
  for (let i = 0; i < (r.form?.length ?? 0); i++) {
    if (r.filingDate[i] < fromIso) continue;
    const form = r.form[i];
    if (!SEC_FORMS.test(form)) continue;
    if (/^8-K/.test(form) && !/(1\.01|2\.01|7\.01|8\.01)/.test(r.items?.[i] ?? "")) continue;
    cands.push({ form, date: r.filingDate[i], acc: r.accessionNumber[i], doc: r.primaryDocument[i], items: r.items?.[i] ?? "" });
  }
  const kw = keywords.map((k) => new RegExp(`\\b${esc(k)}\\b`, "i"));
  for (const c of cands.slice(0, 6)) {
    const accNo = c.acc.replace(/-/g, "");
    const url = `https://www.sec.gov/Archives/edgar/data/${m.cik}/${accNo}/${c.doc}`;
    let text = "";
    try {
      const doc = await cached(join(DOC_CACHE, `${accNo}.txt`), url, null);
      text = doc ? doc.toString("utf8").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ") : "";
    } catch {
      continue;
    }
    if (kw.some((re) => re.test(text))) {
      return { checked: true, match: { form: c.form, date: c.date, items: c.items, url: `https://www.sec.gov/Archives/edgar/data/${m.cik}/${accNo}/` }, candidates: cands.length };
    }
  }
  return { checked: true, match: null, candidates: cands.length };
}

/* ---------------- SEC self-test: --sec-test TICKER "keyword" YYYY-MM-DD [type] ---------------- */
if (has("--sec-test")) {
  const i = args.indexOf("--sec-test");
  const [t, k, d, ty] = args.slice(i + 1, i + 5);
  const res = await secCheck(String(t).toUpperCase(), ty || "M&A", [k], d);
  console.log(JSON.stringify({ ticker: t, keyword: k, from: d, ...res, secRequests }, null, 2));
  process.exit(0);
}

/* ---------------- previous state ---------------- */
const prev = existsSync(OUT) ? readJson(OUT) : { rows: [], log: [] };
const prevRows = new Map((prev.rows ?? []).map((r) => [r.key, r]));
const log = new Map((prev.log ?? []).map((l) => [l.key, l]));

/* ---------------- verify new drafts ---------------- */
const audit = { asOf: sessionDate, generatedAt: new Date().toISOString(), input: inPath ?? null, filtered: [], checks: [] };
let raw = null;
if (!refreshOnly) {
  try {
    raw = readJson(inPath);
  } catch (e) {
    console.error("raw file unreadable:", e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
const items = new Map();
for (const p of raw?.posts ?? []) items.set(String(p.id), { id: String(p.id), kind: "post", author: String(p.author ?? p.username ?? "").toLowerCase(), text: String(p.text ?? ""), at: p.created_at, url: p.url ?? `https://x.com/i/status/${p.id}` });
for (const n of raw?.news ?? []) items.set(String(n.id), { id: String(n.id), kind: "news", author: `xnews:${n.id}`, text: [n.name, n.hook, n.summary].filter(Boolean).join(" \n"), at: n.updated_at, url: n.url });
for (const r of raw?.rejected ?? []) audit.filtered.push({ ticker: r.ticker, why: `agent: ${r.why}`, link: r.link || null, stage: "agent" });

const accepted = [];
for (const s of raw?.stories ?? []) {
  const ticker = String(s.ticker ?? "").toUpperCase();
  const chk = { ticker, type: s.type, line: s.line, key: null, passed: [], failed: [] };
  const fail = (why, stage) => {
    chk.failed.push(why);
    audit.filtered.push({ ticker, line: s.line, why, stage, link: s.link ?? null });
    audit.checks.push(chk);
  };
  if (!UNIVERSE.has(ticker)) { fail("not a stock in our universe", "universe"); continue; }
  if (!CFG.types.includes(s.type)) { fail(`type "${s.type}" not allowed`, "type"); continue; }
  chk.key = keyOf({ ...s, ticker });
  const ev = (s.evidence ?? []).map((id) => items.get(String(id))).filter(Boolean);
  if (!ev.length) { fail("no evidence found in the raw X results", "evidence"); continue; }
  chk.passed.push(`evidence ${ev.length}`);
  const allText = ev.map((e) => e.text);
  const names = await namesFor(ticker);

  // c. source gate
  const outletHits = ev.filter((e) => OUTLETS.some((o) => outletMatch(o, e)));
  const outletNames = [...new Set(ev.flatMap((e) => OUTLETS.filter((o) => outletMatch(o, e)).map((o) => o.name)))];
  const partyHits = ev.filter((e) => PARTY.some((p) => p.re.test(e.text)) && (e.kind === "news" || /official|announce|agreed|signed|letter|filing/i.test(e.text)));
  const claimedParty = /company|index|letter|sec|filing|nasdaq|s&p/i.test(String(s.source ?? ""));
  if (!outletHits.length && !(claimedParty && partyHits.length)) { fail("no named outlet or party source in the evidence", "source"); continue; }
  chk.passed.push(`source: ${outletNames.join(", ") || "party"}`);

  // e. ticker match
  const hits = ev.map((e) => subjectHit(e.text, ticker, names));
  const byNameOutlet = ev.some((e, i) => hits[i] === "name" && (OUTLETS.some((o) => outletMatch(o, e)) || e.kind === "news"));
  const nHits = hits.filter(Boolean).length;
  if (!byNameOutlet && nHits < 2) { fail(`ticker match failed: ${ticker} (${names.join("/") || "no name"}) is not the subject of the deal in the evidence`, "ticker"); continue; }
  chk.passed.push("ticker match");

  // f. own words
  const copied = copiesText(s.line, allText);
  if (copied) { fail(`line copies post text ("${copied}")`, "own-words"); continue; }
  if (String(s.line ?? "").length > 220) { fail("line too long (> 220 chars)", "own-words"); continue; }

  // d. corroboration
  const authors = new Set(ev.map((e) => e.author));
  const firstSeenAt = ev.map((e) => e.at).filter(Boolean).sort()[0] ?? new Date().toISOString();
  const firstSeen = nyDate(new Date(firstSeenAt));
  const sec = await secCheck(ticker, s.type, s.partyKeywords, firstSeen).catch((e) => ({ checked: false, reason: `SEC error: ${e instanceof Error ? e.message : e}` }));
  chk.sec = sec;
  const corroborated = authors.size >= CFG.minIndependentEvidence || (authors.size >= 1 && sec.match);
  if (!corroborated) {
    chk.failed.push("single source");
    audit.filtered.push({ ticker, line: s.line, why: "Unconfirmed: only one source so far", stage: "corroboration", link: s.link ?? ev[0].url });
    audit.checks.push(chk);
    continue;
  }
  chk.passed.push(`corroborated (${authors.size} sources${sec.match ? " + SEC" : ""})`);

  // status
  const denyEv = (s.denialEvidence ?? []).map((id) => items.get(String(id))).filter((e) => e && DENY.test(e.text));
  const confEv = (s.confirmEvidence ?? []).map((id) => items.get(String(id))).filter((e) => e && PARTY.some((p) => p.re.test(e.text)));
  let status = "Reported";
  let statusNote = s.statusNote ?? null;
  let note = null;
  if (sec.match) { status = "Confirmed"; statusNote = `${sec.match.form} filed ${sec.match.date}`; }
  else if (confEv.length && s.claim !== "reported") status = "Confirmed";
  // Owner rule 2026-10-10: Denied ONLY when the row's own company (the ticker) denies it. The story
  // must name the denier in `deniedBy`; it must be one of the ticker's names, and a denial item must
  // have that name followed closely by denial wording. A denial or dispute by any other party keeps
  // the status (Reported / Confirmed) and adds a short note shown under the rumour line.
  if (denyEv.length) {
    const by = String(s.deniedBy ?? "").trim();
    const isSubject = !!by && (by.toUpperCase() === ticker || names.some((n) => n.toLowerCase() === by.toLowerCase()));
    const near = isSubject && denyEv.some((e) => new RegExp(`\\b${esc(by)}\\b[^.!?]{0,80}?${CFG.denialWords}`, "i").test(e.text));
    if (near) {
      status = "Denied";
      chk.passed.push(`denied by ${by} (the row's own company)`);
    } else {
      const company = names[0] ?? ticker;
      note = String(s.denialNote ?? `${by || "Another party"} disputed the report; ${company} hasn't commented.`).trim();
      chk.passed.push(`dispute by ${by || "another party"} (not ${ticker}) → status kept as ${status}, note added`);
      if (s.claim === "denied") chk.failed.push(`claimed denied but the denier (${by || "unnamed"}) is not ${ticker}'s own company; kept as ${status}`);
    }
  }
  if (s.claim === "denied" && !denyEv.length) chk.failed.push("claimed denied but no denial wording found; kept as " + status);
  if (s.claim === "confirmed" && status === "Reported") chk.failed.push("claimed confirmed but no party/SEC evidence; kept as Reported");
  const lastUpdateAt = [...ev, ...denyEv, ...confEv].map((e) => e.at).filter(Boolean).sort().at(-1) ?? firstSeenAt;
  const link = (s.link && [...items.values()].some((e) => e.url === s.link)) ? s.link : (outletHits[0] ?? ev[0]).url;
  accepted.push({
    key: chk.key, ticker, type: s.type, line: String(s.line).trim(), source: String(s.source ?? outletNames.join(" / ")).trim(),
    outlets: outletNames, link, firstSeenAt, firstSeen, lastUpdate: nyDate(new Date(lastUpdateAt)), status, statusNote, note,
    sec: sec.match ?? null, evidence: ev.map((e) => e.url), partyKeywords: s.partyKeywords ?? [],
  });
  chk.status = status;
  audit.checks.push(chk);
}

/* ---------------- merge + refresh ---------------- */
const RANK = { Reported: 0, Confirmed: 1, Denied: 2 };
const merged = new Map(prevRows);
for (const a of accepted) {
  const p = merged.get(a.key);
  if (!p) { merged.set(a.key, a); continue; }
  const keep = a.lastUpdate >= p.lastUpdate ? a : p;
  merged.set(a.key, {
    ...p, ...keep,
    firstSeenAt: p.firstSeenAt < a.firstSeenAt ? p.firstSeenAt : a.firstSeenAt,
    firstSeen: p.firstSeen < a.firstSeen ? p.firstSeen : a.firstSeen,
    status: a.lastUpdate >= p.lastUpdate || RANK[a.status] > RANK[p.status] ? a.status : p.status,
    sec: a.sec ?? p.sec ?? null,
    evidence: [...new Set([...(p.evidence ?? []), ...(a.evidence ?? [])])],
  });
}

const rows = [];
for (const r of merged.values()) {
  // SEC re-check for rows still Reported (a filing can land days later)
  if (r.status === "Reported" && !r.sec) {
    const sec = await secCheck(r.ticker, r.type, r.partyKeywords, r.firstSeen).catch(() => null);
    if (sec?.match) { r.sec = sec.match; r.status = "Confirmed"; r.statusNote = `${sec.match.form} filed ${sec.match.date}`; r.lastUpdate = sec.match.date > r.lastUpdate ? sec.match.date : r.lastUpdate; }
  }
  const bars = await closes(r.ticker);
  let sessionsSince = null;
  if (bars?.length) {
    const ref = refBar(bars, r.firstSeenAt);
    const lastB = bars.at(-1);
    r.refDate = ref?.date ?? null; r.refClose = ref ? +ref.close.toFixed(4) : null;
    r.lastDate = lastB.date; r.lastClose = +lastB.close.toFixed(4);
    r.movePct = ref ? +(((lastB.close / ref.close) - 1) * 100).toFixed(2) : null;
    sessionsSince = bars.filter((b) => b.date > r.lastUpdate).length;
  } else {
    r.movePct = r.movePct ?? null;
    sessionsSince = Math.floor((Date.parse(sessionDate) - Date.parse(r.lastUpdate)) / 86400e3 * 5 / 7);
  }
  const L = log.get(r.key) ?? { key: r.key, ticker: r.ticker, type: r.type, line: r.line, source: r.source, link: r.link, firstSeen: r.firstSeen, firstShown: sessionDate, statusHistory: [] };
  L.line = r.line; L.link = r.link;
  if (!L.statusHistory.length || L.statusHistory.at(-1).status !== r.status) L.statusHistory.push({ date: sessionDate, status: r.status });
  if (sessionsSince != null && sessionsSince > CFG.expirySessions) {
    if (!L.removed) L.removed = { date: sessionDate, reason: `Stale: no update for ${sessionsSince} sessions` };
    if (L.statusHistory.at(-1).status !== "Stale") L.statusHistory.push({ date: sessionDate, status: "Stale" });
    log.set(r.key, L);
    continue;
  }
  delete L.removed;
  log.set(r.key, L);
  rows.push(r);
}
const ORDER = { Reported: 0, Confirmed: 1, Denied: 2 };
rows.sort((a, b) => (a.firstSeenAt !== b.firstSeenAt ? (a.firstSeenAt < b.firstSeenAt ? 1 : -1) : ORDER[a.status] - ORDER[b.status]));

const out = {
  asOf: sessionDate,
  generatedAt: new Date().toISOString(),
  method: "x-rumours-v1 (agent X reads + scripted source gate, corroboration, ticker match, SEC submissions check)",
  source: "X posts and X news stories (links out); SEC EDGAR submissions; Yahoo daily closes",
  note: "Members only. Rumours aren't facts. We list what named outlets or the parties said, credit them and link out. Education only.",
  expirySessions: CFG.expirySessions,
  xReads: raw?.xReads ?? prev.xReads ?? null,
  rawFile: inPath ?? prev.rawFile ?? null,
  secRequests,
  counts: { shown: rows.length, reported: rows.filter((r) => r.status === "Reported").length, confirmed: rows.filter((r) => r.status === "Confirmed").length, denied: rows.filter((r) => r.status === "Denied").length, filteredTonight: refreshOnly ? (prev.counts?.filteredTonight ?? 0) : audit.filtered.length },
  // partyKeywords stay on the row: the nightly --refresh-only SEC re-check needs them (counterparty names only).
  rows: rows.map(({ evidence, outlets, ...r }) => r),
  log: [...log.values()].sort((a, b) => (a.firstShown < b.firstShown ? 1 : -1)),
};
if (refreshOnly && existsSync(AUDIT)) {
  try {
    const pa = readJson(AUDIT);
    audit.filtered = pa.filtered ?? [];
    audit.checks = pa.checks ?? [];
    audit.input = pa.input ?? null;
  } catch { /* fresh */ }
}

console.log(`X Rumours ${sessionDate}: ${rows.length} shown (${out.counts.reported} Reported · ${out.counts.confirmed} Confirmed · ${out.counts.denied} Denied) · ${audit.filtered.length} filtered · SEC requests ${secRequests}`);
for (const r of rows) console.log(`  ${r.status.padEnd(9)} ${r.ticker.padEnd(5)} ${r.type.padEnd(11)} ${r.firstSeen} ${r.movePct == null ? "  n/a " : `${r.movePct >= 0 ? "+" : ""}${r.movePct.toFixed(1)}%`}  ${r.line}`);
for (const f of audit.filtered) console.log(`  filtered ${String(f.ticker).padEnd(5)} [${f.stage}] ${f.why}`);
if (dryRun) process.exit(0);

writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
mkdirSync(dirname(AUDIT), { recursive: true });
writeFileSync(AUDIT, JSON.stringify(audit, null, 2) + "\n");
if (existsSync(MIRROR)) {
  try {
    copyFileSync(OUT, join(MIRROR, "x-rumours.json"));
    mkdirSync(join(MIRROR, "private"), { recursive: true });
    copyFileSync(AUDIT, join(MIRROR, "private", "x-rumours-audit.json"));
  } catch (e) {
    console.warn("mirror skip:", e instanceof Error ? e.message : e);
  }
}
