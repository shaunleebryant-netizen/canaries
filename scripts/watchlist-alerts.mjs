#!/usr/bin/env node
// Nightly watchlist digest — run AFTER the nightly pack (build-ideas + log-ideas).
// For each member with alert mode != off: starred tickers that (a) entered Ideas tonight, (b) newly hit a Setup
// (added == asOf), or (c) crossed the wrong-if level of a previously logged idea. ONE digest email per member.
//
// PREVIEW: dry-run only. Default and the only mode allowed here:
//   node scripts/watchlist-alerts.mjs --dry-run [--sample]
// Reads LOCAL D1 (wrangler --local) if present, otherwise --sample uses a clearly fake example member.
// Writes the first digest's HTML to /workspace/ux-preview-shots/alert-email-sample.html. Never calls Resend.
// Ship day (owner approval): a --send mode would POST to Resend per member; intentionally NOT implemented here.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, yahooChart } from "./lib/scan-common.mjs";

const args = new Set(process.argv.slice(2));
if (args.has("--send")) { console.error("watchlist-alerts: --send is disabled in this preview (dry-run only)."); process.exit(2); }
const OUT = process.env.ALERT_SAMPLE_OUT || "/workspace/ux-preview-shots/alert-email-sample.html";
const J = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const ideas = J("data/ideas.json"), sh = J("data/setups-history.json");
const dmy = (s) => s.split("-").reverse().join("/");

function localMembers() {
  try {
    const sql = "SELECT u.id, u.email, COALESCE(p.mode,'daily') AS mode, w.ticker FROM member_watchlist w JOIN users u ON u.id = w.user_id LEFT JOIN member_alert_prefs p ON p.user_id = u.id";
    const raw = execFileSync("npx", ["wrangler", "d1", "execute", "canary-members", "--local", "-c", "wrangler.members-local.jsonc", "--json", "--command", sql], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const rows = JSON.parse(raw)[0]?.results ?? [];
    const m = new Map(); for (const r of rows) { if (!m.has(r.id)) m.set(r.id, { email: r.email, mode: r.mode, tickers: [] }); m.get(r.id).tickers.push(r.ticker); }
    return [...m.values()];
  } catch { return []; }
}
let members = localMembers(), source = "local D1";
if (!members.length && args.has("--sample")) { members = [{ email: "example.member@example.test", mode: "daily", tickers: ["MU", "ACLS", "NET", "COIN", "AAPL"] }]; source = "SAMPLE (fake member)"; }

const ideaBy = new Map([...ideas.longs, ...ideas.shorts].map((i) => [i.t, i]));
const prevLogs = (existsSync(join(ROOT, "data/ideas-log")) ? readdirSync(join(ROOT, "data/ideas-log")).sort() : []).filter((f) => f < `${ideas.asOf}.json`).map((f) => J(`data/ideas-log/${f}`));
const lastClose = new Map();
async function close(t) {
  if (!lastClose.has(t)) { const r = (await yahooChart(t, { interval: "1d", range: "5d" })).data?.chart?.result?.[0]; lastClose.set(t, r?.indicators?.quote?.[0]?.close?.filter((x) => x != null).at(-1) ?? null); }
  return lastClose.get(t);
}
async function eventsFor(t) {
  const ev = [], i = ideaBy.get(t);
  if (i) ev.push({ kind: "idea", text: `${i.side === "long" ? "Long" : "Short"} idea · ${i.play} · entry ${i.entryZone.join("–")} · wrong if ${i.wrongIf} · target ${i.target} · R:R ${i.rr}` });
  for (const side of ["bullish", "bearish"]) { const s = sh[side]?.[t]; if (s?.added === ideas.asOf) ev.push({ kind: "setup", text: `New ${side} Setup (${s.count} conditions: ${s.conditions.join(", ")})` }); }
  for (const log of prevLogs) for (const p of log.ideas.filter((x) => x.t === t)) {
    const c = await close(t); if (c == null) continue;
    if (p.side === "long" ? c < p.wrongIf : c > p.wrongIf) ev.push({ kind: "wrong", text: `Crossed wrong-if ${p.wrongIf} from the ${dmy(log.date)} ${p.play} idea (close ${c.toFixed(2)})` });
  }
  return ev;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function html(m, items) {
  const rows = items.map(({ t, ev }) => `<tr><td style="padding:8px 10px;font-weight:700;color:#fff;vertical-align:top">${esc(t)}</td><td style="padding:8px 10px;color:#cbd5e1">${ev.length ? ev.map((e) => `<div>${e.kind === "wrong" ? "⚠️" : e.kind === "setup" ? "🟢" : "💡"} ${esc(e.text)}</div>`).join("") : '<span style="color:#64748b">No change tonight</span>'}</td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#0b1220;font-family:system-ui,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="color:#facc15;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0">Canary Dashboard · Watchlist digest</p>
<h1 style="color:#fff;font-size:20px;margin:6px 0 4px">Your starred names · ${dmy(ideas.asOf)} close</h1>
<p style="color:#94a3b8;font-size:13px;margin:0 0 14px">Market light: <b style="color:${ideas.light === "red" ? "#f87171" : ideas.light === "green" ? "#34d399" : "#fbbf24"}">${esc(ideas.light.toUpperCase())}</b> · ${esc(ideas.regime)}${ideas.banner ? `<br>${esc(ideas.banner)}` : ""}</p>
<table style="width:100%;border-collapse:collapse;background:#111a2e;border-radius:10px;font-size:13px">${rows}</table>
<p style="margin:16px 0"><a href="https://canarydashboard.com/members#ideas" style="background:#facc15;color:#111;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Open Ideas</a></p>
<p style="color:#64748b;font-size:11px;line-height:1.5">Education only — rough chart levels for study, not advice or a recommendation. Past signals do not predict future results.<br>You get this because alerts are set to <b>${esc(m.mode)}</b>. Change or turn off at canarydashboard.com/account.</p>
</div></body></html>`;
}
let wrote = false, n = 0;
for (const m of members.filter((x) => x.mode !== "off")) {
  const items = []; for (const t of m.tickers) items.push({ t, ev: await eventsFor(t) });
  if (!items.some((x) => x.ev.length)) continue;
  n++;
  if (!wrote) { writeFileSync(OUT, html(m, items)); wrote = true; }
  console.log(`[dry-run] would send 1 digest (${items.filter((x) => x.ev.length).length} names with news) — NOT sent`);
}
console.log(`watchlist-alerts: source=${source}, members=${members.length}, digests=${n}, sample=${wrote ? OUT : "none"} — dry-run, Resend not called.`);
