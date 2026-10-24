#!/usr/bin/env node
/**
 * X Rumours step 1 helper: merge the x connector's saved results (search_news / search_posts_all,
 * as written by write_to_file or saved verbatim) into one raw file for x-rumours-ingest.mjs.
 *
 *   node scripts/x-rumours-raw.mjs --out <raw.json> [--stories <stories.json>] [--x-reads N] <result files...>
 *   node scripts/x-rumours-raw.mjs --list <raw.json>     (compact list to help draft stories)
 *   node scripts/x-rumours-raw.mjs --plan [--since <UTC ISO>]   (prints the exact discovery x calls as JSON)
 *
 * Posts and news are copied exactly (id, author, text, created_at, url); nothing is edited.
 * <stories.json> = { stories:[...], rejected:[...] } drafted by the agent (see docs/ops/x-rumours-refresh.md).
 * Re-running with the same --out merges (dedupe by id), so verification searches can be added later.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = process.argv.slice(2);
const val = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : null;
};
if (args.includes("--plan")) {
  // Discovery plan: 3 search_news + one search_posts_all per cashtag batch of universe stocks.
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
  const rj = (f) => JSON.parse(readFileSync(join(DATA, f), "utf8"));
  const NON_STOCKS = new Set(["GLD", "SLV", "SOXX", "IGV", "CIBR", "URA", "NLR", "XAR"]);
  const fish = rj("fish-universe.json");
  const rawT = Array.isArray(fish.tickers) && fish.tickers.length ? fish.tickers : (fish.groups ?? []).flatMap((g) => g.tickers ?? []);
  const etf = new Set();
  for (const f of ["etf-watch-universe.json", "etf-country-universe.json", "crypto-watch-universe.json"]) {
    try { for (const t of rj(f).tickers ?? []) etf.add(String(typeof t === "string" ? t : t?.ticker ?? "").toUpperCase()); } catch { /* optional */ }
  }
  const uni = [...new Set(rawT.map((t) => String(t).trim().toUpperCase()))].filter((t) => t && !/USD$/.test(t) && !NON_STOCKS.has(t) && !etf.has(t)).sort();
  const since = val("--since") ?? new Date(Date.now() - 36 * 3600e3).toISOString().replace(/\.\d+Z$/, "Z");
  const KW = '(acquire OR acquisition OR takeover OR buyout OR merger OR "in talks" OR bid OR stake OR activist OR financing OR debt OR "spin off" OR spinoff OR partnership OR "supply deal" OR FDA OR "Nasdaq-100" OR "S&P 500")';
  const SRC = '(Bloomberg OR Reuters OR WSJ OR FT OR CNBC OR "The Information" OR "Business Insider" OR "Washington Post" OR announced OR "agreed to" OR "definitive agreement" OR denies OR denied)';
  const batches = [];
  let cur = [];
  for (const t of uni) {
    const q = `(${[...cur, t].map((x) => "$" + x).join(" OR ")}) ${KW} ${SRC} -is:retweet`;
    if (q.length > 1000 && cur.length) { batches.push(cur); cur = [t]; } else cur.push(t);
  }
  if (cur.length) batches.push(cur);
  const calls = [
    ...["acquisition OR takeover OR buyout OR merger talks", "activist investor stake OR spin-off OR financing deal", "FDA approval OR index inclusion OR supply agreement OR partnership"].map((query) => ({
      tool: "search_news", arguments: { query, max_age_hours: 36, max_results: 25, "news.fields": "name,summary,hook,contexts,updated_at,cluster_posts_results" },
    })),
    ...batches.map((b) => ({
      tool: "search_posts_all",
      arguments: {
        query: `(${b.map((x) => "$" + x).join(" OR ")}) ${KW} ${SRC} -is:retweet`,
        start_time: since, max_results: 25, sort_order: "relevancy",
        "post.fields": "created_at,public_metrics,author_id", expansions: "author_id", "user.fields": "username,verified,public_metrics",
      },
    })),
  ];
  console.log(JSON.stringify({ universe: uni.length, since, discoveryReads: calls.length, verificationBudget: Math.max(0, 25 - calls.length), calls }, null, 2));
  process.exit(0);
}
if (val("--list")) {
  const r = JSON.parse(readFileSync(val("--list"), "utf8"));
  for (const n of r.news ?? []) console.log(`NEWS ${n.id} ${String(n.updated_at).slice(0, 16)} | ${n.name}`);
  for (const p of (r.posts ?? []).sort((a, b) => (a.created_at < b.created_at ? -1 : 1)))
    console.log(`POST ${p.id} ${String(p.created_at).slice(0, 16)} @${p.author} (${p.followers ?? "?"}) | ${String(p.text).replace(/\s+/g, " ").slice(0, 200)}`);
  process.exit(0);
}
const out = val("--out");
if (!out) {
  console.error("usage: node scripts/x-rumours-raw.mjs --out <raw.json> [--stories <stories.json>] [--x-reads N] <files...>");
  process.exit(2);
}
const skip = new Set(["--out", "--stories", "--x-reads"].flatMap((k) => [k, val(k)]));
const files = args.filter((a) => !skip.has(a));
const raw = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : { fetchedAt: null, xReads: 0, news: [], posts: [], stories: [], rejected: [] };
const posts = new Map(raw.posts.map((p) => [p.id, p]));
const news = new Map(raw.news.map((n) => [n.id, n]));
function parse(text) {
  const i = text.indexOf("{");
  if (i < 0) return null;
  // the tool may append a trailing "X reads left" line after the JSON
  for (let j = text.lastIndexOf("}"); j > i; j = text.lastIndexOf("}", j - 1)) {
    try {
      return JSON.parse(text.slice(i, j + 1));
    } catch {
      /* try shorter */
    }
  }
  return null;
}
let added = 0;
for (const f of files) {
  const d = parse(readFileSync(f, "utf8"));
  if (!d) {
    console.warn(`skip ${f}: no JSON`);
    continue;
  }
  const users = new Map((d.includes?.users ?? []).map((u) => [u.id, u]));
  for (const x of d.data ?? []) {
    if ("text" in x) {
      const u = users.get(x.author_id) ?? {};
      if (!posts.has(x.id)) added++;
      posts.set(x.id, { id: x.id, author: u.username ?? x.author_id, followers: u.public_metrics?.followers_count ?? null, verified: u.verified ?? null, text: x.text, created_at: x.created_at, url: x.url ?? `https://x.com/${u.username ?? "i"}/status/${x.id}`, likes: x.public_metrics?.like_count ?? null });
    } else if ("name" in x && "summary" in x) {
      if (!news.has(x.id)) added++;
      news.set(x.id, { id: x.id, name: x.name, hook: x.hook ?? null, summary: x.summary, updated_at: x.updated_at, url: x.url, category: x.category ?? null });
    }
  }
}
raw.posts = [...posts.values()];
raw.news = [...news.values()];
raw.fetchedAt = new Date().toISOString();
if (val("--x-reads")) raw.xReads = Number(val("--x-reads"));
if (val("--stories")) {
  const s = JSON.parse(readFileSync(val("--stories"), "utf8"));
  raw.stories = s.stories ?? [];
  raw.rejected = s.rejected ?? [];
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(raw, null, 2) + "\n");
console.log(`${out}: ${raw.news.length} news · ${raw.posts.length} posts (+${added}) · ${raw.stories.length} stories · ${raw.rejected.length} rejected`);
