#!/usr/bin/env node
/**
 * Desk Ideas ingest (owner approved 2026-10-09). Members dashboard only.
 *
 * X reads only work through the agent's x connector, so this script does NOT fetch. The agent
 * saves the candidate posts it read (docs/ops/desk-ideas-refresh.md) as a JSON array and runs:
 *
 *   node scripts/desk-ideas-ingest.mjs --in <candidates.json> [--as-of <ISO>] [--dry-run]
 *
 * Input: [{ id, author (username), text, created_at, url, referenced_tweets? }] (the x tool's own
 * post objects are accepted as-is when `author` is added, or `username`/`author_username` is set).
 *
 * Filter (education only; we never repeat return or performance claims):
 *   - author must be in data/desk-ideas-accounts.json
 *   - drop replies, retweets and posts starting with "@" / "RT @"
 *   - drop news / analyst posts (price targets, upgrades, initiations, "reportedly", "JUST IN" …)
 *   - keep only clear first-person actions: add / buy / new position / trim / sell, tied to a
 *     $TICKER right after the action (or the post's only $TICKER)
 *   - dedupe: one item per account + ticker (latest post wins), and by post id
 *   - skip intentions ("can add", "will buy"), crypto tickers and foreign listings ($EQR.AX)
 * The idea text is written by us from the action ("Added more PLTR"), never copied from the post.
 * Output: data/desk-ideas.json { asOf, windowDays, accounts, ideas:[...] }. Items from the previous
 * file are kept for `keepDays` so a quiet day does not empty the box.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data");
const OUT = join(DATA, "desk-ideas.json");
const CFG = JSON.parse(readFileSync(join(DATA, "desk-ideas-accounts.json"), "utf8"));

const args = process.argv.slice(2);
const arg = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : null;
};
const inPath = arg("--in");
const dryRun = args.includes("--dry-run");
if (!inPath || !existsSync(inPath)) {
  console.error("usage: node scripts/desk-ideas-ingest.mjs --in <candidates.json> [--as-of <ISO>] [--dry-run]");
  process.exit(2);
}
const asOf = arg("--as-of") || new Date().toISOString();
const asOfMs = Date.parse(asOf);
const accounts = new Map(CFG.accounts.map((a) => [a.toLowerCase(), a]));

/* ---------- universe (for the chart lightbox link) ---------- */
function universe() {
  const set = new Set();
  for (const f of ["fish-universe.json", "etf-watch-universe.json", "etf-country-universe.json", "crypto-watch-universe.json"]) {
    try {
      const u = JSON.parse(readFileSync(join(DATA, f), "utf8"));
      const raw = Array.isArray(u.tickers) && u.tickers.length ? u.tickers : (u.groups ?? []).flatMap((g) => g.tickers ?? []);
      raw.forEach((t) => set.add(String(typeof t === "string" ? t : t?.ticker ?? "").toUpperCase()));
    } catch {
      /* optional */
    }
  }
  if (set.has("GOOG")) set.add("GOOGL");
  return set;
}
const UNIVERSE = universe();
// Stocks / ETFs only: crypto tickers and foreign listings ($EQR.AX) are skipped.
const CRYPTO = (() => {
  const set = new Set(["BTC", "ETH", "SOL", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT", "LTC", "BNB", "HYPE", "SUI", "TON", "SHIB", "PEPE", "ZEC"]);
  try {
    const u = JSON.parse(readFileSync(join(DATA, "crypto-watch-universe.json"), "utf8"));
    const raw = Array.isArray(u.tickers) && u.tickers.length ? u.tickers : (u.groups ?? []).flatMap((g) => g.tickers ?? []);
    raw.forEach((t) => set.add(String(typeof t === "string" ? t : t?.ticker ?? "").toUpperCase().replace(/-?USD$/, "")));
  } catch {
    /* optional */
  }
  return set;
})();
const notStock = (t) => CRYPTO.has(t) || /\.[A-Z]{2}$/.test(t);

/* ---------- rules ---------- */
const NEWS_RE =
  /\b((?<!\b(?:our|my) )price target|PTs?|price objective|target (?:of|to)|\$\d[\d,.]*\s*(?:price )?target|upgrade[sd]?|downgrade[sd]?|initiated (?:at|with|coverage)|initiates|initiating coverage|outperform|underperform|overweight|reiterat\w*|reportedly|per (?:Bloomberg|Reuters|CNBC|WSJ)|announced|added to the (?:Nasdaq|S&P)|earnings call)\b/i;
// [action, regex]; the cashtag must follow within ~40 characters.
// Sentence start (optionally "I", "I've", "Just", "Today I") — so "$AAOI is adding $BE" or
// "$SPCX just bought …" (company news, ticker as subject) never counts.
const LEAD = String.raw`(?:^|[.!?:\n]\s*|(?:->|[-•*])\s*)(?:(?:I|I've|I have|I just|Just|Today I|Also|Finally)\s+)?`;
const QTY = String.raw`(?:(?:some|a little|a bit|a few|a small|more|shares of|a few shares of|back|to my|to)\s+)*`;
const ACTIONS = [
  ["add", /\b(?:I(?:'ve| have)?(?: been)? (?:adding|added)(?: (?:quite a bit |a bit |some )?more)?|(?:to )?add(?:ed|ing)? (?:some |a bit )?more|bought (?:some )?more|buying (?:some )?more|I(?:'m| am) buying|I bought(?! (?:some )?more))\b/i],
  ["buy", /\b(?:(?:I(?:'ve| have)? |just |finally )?(?:started|starting|opened|opening|initiated|initiating|took|taking) (?:a |an )?(?:(?:small|tiny|new|starter|full|half|initial|first)\s+)*position(?: in)?|new (?:small )?position(?: in|:)?\s*(?=\$[A-Z])|(?:took|taking|started) a starter|starter (?:position )?in)\b/i],
  // "$HTFL add today." — ticker, then add/added/adding and a stop word (never "$X added 3%" / "$X is adding").
  ["tadd", /(?:^|[.!?:\n]\s*)\$([A-Z]{1,6})\s+(?:add|adding|added)(?:\s+(?:today|here|more))?(?=[\s.,!]|$)/im],
  ["add", /\b(?:I(?:'ve| have)? (?:doubled|increased|added to) my position|(?:doubled|increased) (?:my|the) position)\b/i],
  ["trim", /\b(?:clos(?:e|ed|ing) \d+% of (?:the|my) position|I(?:'ve| have)? trimmed|I(?:'m| am) trimming|trimmed (?:some|my|a bit of)|took (?:some )?profits? (?:in|on))\b/i],
  ["sell", /\b(?:clos(?:e|ed|ing) (?:the|my) (?:entire |whole )?position|I(?:'ve| have)? (?:sold|exited|closed)|sold (?:all|my|out of)|exited (?:my|all))\b/i],
  // "Bought $MSFT $382.54", "Added $NVDA", "Trimmed $TSLA", "Sold $X" — verb right before the cashtag.
  ["verb", new RegExp(LEAD + String.raw`(bought|buying|added|adding|trimmed|trimming|sold|selling)\s+` + QTY + String.raw`(?=\$[A-Z])`, "im")],
  // "long $SNDK for a relief bounce", "Still long $X" — "long" must sit right before the cashtag
  // (so "long-term", "long overdue" never count).
  ["long", new RegExp(LEAD + String.raw`(?:(?:still|now|went|going|got|I'm|I am|we are|we're)\s+)?long\s+(?=\$[A-Z])`, "im")],
];
const MODAL_BEFORE = /\b(?:can|could|would|should|will|might|may|want to|going to|plan to|considering)\s+(?:just\s+|probably\s+)?$/i;
const VERB_ACTION = { bought: "buy", buying: "buy", added: "add", adding: "add", trimmed: "trim", trimming: "trim", sold: "sell", selling: "sell" };
const LABEL = { add: "Added to", buy: "Bought / new position in", long: "Long", trim: "Trimmed", sell: "Sold" };
const CASHTAG = /\$([A-Z]{1,6}(?:\.[A-Z]{1,2})?)(?![A-Za-z.])/g;

function authorOf(p) {
  return String(p.author ?? p.username ?? p.author_username ?? "").replace(/^@/, "");
}
function isReplyOrRetweet(p) {
  const refs = Array.isArray(p.referenced_tweets) ? p.referenced_tweets : [];
  if (refs.some((r) => r?.type === "replied_to" || r?.type === "retweeted")) return true;
  if (p.in_reply_to_user_id) return true;
  const t = String(p.text ?? "").trimStart();
  return t.startsWith("@") || t.startsWith("RT @");
}
function classify(text) {
  for (const [kind, re] of ACTIONS) {
    const m = re.exec(text);
    if (!m) continue;
    // "when I can just add more …", "will add", "might buy" — intentions, not actions.
    if (MODAL_BEFORE.test(text.slice(Math.max(0, m.index - 24), m.index + (m[0].match(/^\s*/)?.[0].length ?? 0)))) continue;
    const after = text.slice(m.index, m.index + m[0].length + 40);
    const near = [...after.matchAll(CASHTAG)].map((x) => x[1]);
    const all = [...new Set([...text.matchAll(CASHTAG)].map((x) => x[1]))];
    const ticker = near[0] ?? (kind === "verb" || kind === "long" ? null : all.length === 1 ? all[0] : null);
    if (!ticker) continue;
    if (kind === "tadd") return { action: "add", ticker: m[1] };
    if (kind === "verb") return { action: VERB_ACTION[m[1].toLowerCase()] ?? "buy", ticker };
    if (kind === "long") return { action: "long", ticker };
    const isNew = kind === "add" && /I bought|I(?:'m| am) buying/i.test(m[0]) && !/\bmore\b/i.test(m[0]);
    if (kind === "buy") return { action: "buy", ticker, idea: `Started a position in ${ticker}` };
    return { action: isNew ? "buy" : kind, ticker };
  }
  return null;
}

/* ---------- run ---------- */
const raw = JSON.parse(readFileSync(inPath, "utf8"));
const posts = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
const reasons = {};
const bump = (k) => (reasons[k] = (reasons[k] ?? 0) + 1);
const fresh = [];
const seenIds = new Set();
for (const p of posts) {
  const id = String(p.id ?? "");
  if (!id || seenIds.has(id)) {
    bump("duplicate id");
    continue;
  }
  seenIds.add(id);
  const handle = accounts.get(authorOf(p).toLowerCase());
  if (!handle) {
    bump("account not on list");
    continue;
  }
  if (isReplyOrRetweet(p)) {
    bump("reply / retweet");
    continue;
  }
  const text = String(p.text ?? "").replace(/&amp;/g, "&").replace(/&gt;/g, ">").replace(/&lt;/g, "<");
  if (NEWS_RE.test(text) || /\b(?:BREAKING|JUST IN)\b/.test(text)) {
    bump("news / analyst");
    continue;
  }
  const c = classify(text);
  if (!c) {
    bump("no clear first-person action + ticker");
    continue;
  }
  if (notStock(c.ticker)) {
    bump("crypto / foreign listing");
    continue;
  }
  const postedAt = new Date(p.created_at).toISOString();
  fresh.push({
    id: `${handle.toLowerCase()}-${c.ticker.toLowerCase()}-${id}`,
    postId: id,
    handle,
    ticker: c.ticker,
    action: c.action,
    idea: c.idea ?? (c.action === "buy" ? `Bought ${c.ticker}` : `${LABEL[c.action]} ${c.ticker}`),
    postedAt,
    url: p.url && /^https:\/\/x\.com\//.test(p.url) ? p.url.replace("/i/status/", `/${handle}/status/`) : `https://x.com/${handle}/status/${id}`,
    inUniverse: UNIVERSE.has(c.ticker),
  });
  bump("kept");
}

// merge with previous items (kept keepDays), dedupe by account+ticker+action (latest wins)
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
const keepFrom = asOfMs - (CFG.keepDays ?? 14) * 86400000;
const merged = new Map();
for (const it of [...(prev?.ideas ?? []), ...fresh]) {
  if (!accounts.has(String(it.handle).toLowerCase())) continue;
  if (Date.parse(it.postedAt) < keepFrom) continue;
  const k = `${it.handle.toLowerCase()}|${it.ticker}`; // latest move per account + ticker
  const cur = merged.get(k);
  if (!cur || Date.parse(it.postedAt) > Date.parse(cur.postedAt)) merged.set(k, { ...it, inUniverse: UNIVERSE.has(it.ticker) });
}
const ideas = [...merged.values()].sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));

const doc = {
  asOf,
  windowDays: CFG.windowDays ?? 7,
  source: "X posts from the accounts in data/desk-ideas-accounts.json (read by the agent x connector)",
  note: "Members only. Third-party ideas, not Canary signals. Education only.",
  accounts: CFG.accounts,
  lastRun: { candidates: posts.length, kept: fresh.length, reasons },
  ideas,
};
if (!dryRun) writeFileSync(OUT, JSON.stringify(doc, null, 2) + "\n");
console.log(`desk-ideas: ${posts.length} candidates → ${fresh.length} kept · ${ideas.length} in file${dryRun ? " (dry run)" : ""}`);
for (const [k, v] of Object.entries(reasons)) console.log(`  ${k}: ${v}`);
for (const it of ideas) console.log(`  ${it.postedAt.slice(0, 10)}  @${it.handle}  ${it.idea}${it.inUniverse ? "" : "  (not in universe)"}`);
