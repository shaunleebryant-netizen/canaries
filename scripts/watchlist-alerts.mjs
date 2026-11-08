#!/usr/bin/env node
// My Stocks watchlist alert emails (owner t1055u 2026-11-04: "wire it, we need the alert emails working").
// Run AFTER the nightly pack (scans + refresh-full-pack). Reads tonight's scanner JSON in data/ and, for every
// member with per-ticker alert prefs (member_ticker_alerts, set via My Stocks → 🔔 Alerts), finds tickers whose
// chosen marks printed on the pack date. ONE digest email per member per pack date.
//
// Marks (same ids as TickerAlertsControl / myStocksData):
//   fish, smile        ← fish-alerts.json + etf-watch / etf-country / crypto-watch alerts (fishAsOf / smileAsOf)
//   sweaty, skull      ← exhaustion-alerts.json + the same box files (exhaustionAsOf / skullAsOf)
//   mfi_os             ← money-flow-alerts.json (signal mfi_os, asOf)
//   cci_fairy          ← cci-fairy.json (asOf, sessionsAgo 0)
//   any                ← any of the above
// "Printed tonight" = mark date === pack date (latest asOf across those files, or --date=YYYY-MM-DD).
//
// Account mode (member_alert_prefs.mode, default 'daily'):
//   off     → never emailed.
//   daily   → one digest after the nightly pack.
//   instant → ALSO sent right after the pack: marks are end-of-day (completed daily bar), so the pack is the
//             earliest moment they exist. Same email today; mode kept so a future intraday path can split them.
//
// Usage:
//   node scripts/watchlist-alerts.mjs                 # dry-run, LOCAL D1 (default; never calls Resend)
//   node scripts/watchlist-alerts.mjs --remote        # dry-run against production D1 (read-only)
//   node scripts/watchlist-alerts.mjs --sample        # dry-run with a fake member if D1 has no rows
//   EMAIL_SENDING=1 RESEND_API_KEY=… node scripts/watchlist-alerts.mjs --remote --send [--only=you@x.com]
// Options: --date=YYYY-MM-DD  --only=email (send/preview just that member)  --force (ignore sent ledger)
// --send is refused unless EMAIL_SENDING=1 and RESEND_API_KEY are set (same gate as src/lib/email/sender.ts).
// Sent ledger: data/private/watchlist-alerts-sent.json (gitignored) — prevents a second digest for the same date.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT } from "./lib/scan-common.mjs";

const argv = process.argv.slice(2);
const args = new Set(argv.filter((a) => !a.includes("=")));
const opt = (k) => argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const SEND = args.has("--send"), REMOTE = args.has("--remote"), FORCE = args.has("--force");
const ONLY = (opt("only") || "").toLowerCase();
const env = (k) => (process.env[k] ?? "").trim();

if (SEND) {
  if (env("EMAIL_SENDING") !== "1") { console.error("watchlist-alerts: --send refused — EMAIL_SENDING is not 1."); process.exit(2); }
  if (!env("RESEND_API_KEY")) { console.error("watchlist-alerts: --send refused — RESEND_API_KEY missing."); process.exit(2); }
  if ((env("EMAIL_PROVIDER") || "resend") !== "resend") { console.error("watchlist-alerts: --send only supports EMAIL_PROVIDER=resend."); process.exit(2); }
}
const OUT = process.env.ALERT_SAMPLE_OUT || "/workspace/ux-preview-shots/alert-email-sample.html";
const LEDGER = join(ROOT, "data/private/watchlist-alerts-sent.json");
const SITE = (env("NEXT_PUBLIC_SITE_URL") || "https://canarydashboard.com").replace(/\/$/, "");
const FROM = env("EMAIL_ALERTS_FROM") || env("EMAIL_FROM") || "Canary Dashboard <letter@canarydashboard.com>";
const REPLY_TO = env("EMAIL_REPLY_TO") || "shaun@canarydashboard.com";

const J = (p) => { try { return JSON.parse(readFileSync(join(ROOT, p), "utf8")); } catch { return null; } };
const dmy = (s) => s.split("-").reverse().join("/");

// ---------- marks printed on the pack date ----------
const MARKS = {
  fish: { icon: "🐟", label: "Fish" }, smile: { icon: "🙂", label: "Smile" }, mfi_os: { icon: "💵", label: "MFI washout" },
  cci_fairy: { icon: "🧚", label: "Fairy (Bottom Zone)" }, sweaty: { icon: "🥵", label: "Sweaty" }, skull: { icon: "💀", label: "Skull" },
};
const fishF = J("data/fish-alerts.json"), exhF = J("data/exhaustion-alerts.json"), mfiF = J("data/money-flow-alerts.json"), fairyF = J("data/cci-fairy.json");
const boxFiles = ["etf-watch-alerts.json", "etf-country-alerts.json", "crypto-watch-alerts.json"].map((f) => J(`data/${f}`)).filter(Boolean);
const PACK = opt("date") || [fishF, exhF, mfiF, fairyF].map((f) => f?.asOf).filter(Boolean).sort().at(-1);
if (!PACK) { console.error("watchlist-alerts: no scanner asOf found in data/ — run the nightly pack first."); process.exit(1); }

const printed = new Map(); // ticker -> Map(markId -> note)
const add = (t, id, note) => { if (!t) return; t = String(t).toUpperCase(); if (!printed.has(t)) printed.set(t, new Map()); if (!printed.get(t).has(id)) printed.get(t).set(id, note || ""); };
const KIND = { fishAsOf: "fish", smileAsOf: "smile", exhaustionAsOf: "sweaty", skullAsOf: "skull" };
for (const f of [fishF, exhF, ...boxFiles]) for (const r of f?.signals ?? []) for (const [k, id] of Object.entries(KIND)) if (r[k] === PACK) add(r.ticker, id, "");
for (const r of mfiF?.signals ?? []) if (r.signal === "mfi_os" && r.asOf === PACK) add(r.ticker, "mfi_os", r.mfi != null ? `MFI ${Number(r.mfi).toFixed(1)}` : "");
for (const r of fairyF?.signals ?? []) if (r.asOf === PACK && (r.sessionsAgo ?? 0) === 0) add(r.ticker, "cci_fairy", r.rsiNow != null ? `RSI ${r.rsiNow}` : "");

// ---------- members ----------
function d1(sql) {
  const config = REMOTE ? "wrangler.jsonc" : "wrangler.members-local.jsonc";
  const wr = join(ROOT, "node_modules/wrangler/bin/wrangler.js");
  const wargs = [wr, "d1", "execute", "canary-members", REMOTE ? "--remote" : "--local", "-c", config, "--json", "--command", sql];
  // Wrangler needs Node >= 22; fall back to npx node@22 on older box Node.
  const major = Number(process.versions.node.split(".")[0]);
  const [cmd, cargs] = major >= 22 ? [process.execPath, wargs] : ["npx", ["-y", "node@22", ...wargs]];
  const raw = execFileSync(cmd, cargs, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 32 << 20 });
  return JSON.parse(raw)[0]?.results ?? [];
}
let members = [], source = REMOTE ? "remote D1" : "local D1";
try {
  const rows = d1("SELECT u.id, u.email, COALESCE(p.mode,'daily') AS mode, a.ticker, a.conds FROM member_ticker_alerts a JOIN users u ON u.id = a.user_id LEFT JOIN member_alert_prefs p ON p.user_id = u.id");
  const m = new Map();
  for (const r of rows) { if (!m.has(r.id)) m.set(r.id, { email: r.email, mode: r.mode, prefs: [] }); m.get(r.id).prefs.push({ t: String(r.ticker).toUpperCase(), conds: String(r.conds).split(",").map((s) => s.trim()).filter(Boolean) }); }
  members = [...m.values()];
} catch (e) { console.error(`watchlist-alerts: could not read ${source} (${String(e.message || e).split("\n")[0]})`); if (SEND) process.exit(1); }
if (!members.length && args.has("--sample") && !SEND) {
  const t = [...printed.keys()].slice(0, 3);
  members = [{ email: "example.member@example.test", mode: "daily", prefs: [...t.map((x) => ({ t: x, conds: ["any"] })), { t: "AAPL", conds: ["skull"] }] }];
  source = "SAMPLE (fake member)";
}
if (ONLY) members = members.filter((m) => m.email.toLowerCase() === ONLY);

// ---------- email ----------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function hits(m) {
  const out = [];
  for (const { t, conds } of m.prefs) {
    const p = printed.get(t); if (!p) continue;
    const want = conds.includes("any") ? Object.keys(MARKS) : conds.filter((c) => MARKS[c]);
    const got = want.filter((c) => p.has(c)).map((c) => ({ id: c, note: p.get(c) }));
    if (got.length) out.push({ t, got });
  }
  return out;
}
function render(m, items) {
  const icons = (it) => it.got.map((g) => MARKS[g.id].icon).join("");
  const subject = `${items.map((it) => `${it.t} ${icons(it)}`).slice(0, 4).join(" · ")}${items.length > 4 ? ` +${items.length - 4}` : ""} — Canary alert ${dmy(PACK)}`;
  const text = [`Canary Dashboard · My Stocks alerts · ${dmy(PACK)} close`, "",
    ...items.map((it) => `${it.t}: ${it.got.map((g) => `${MARKS[g.id].icon} ${MARKS[g.id].label}${g.note ? ` (${g.note})` : ""}`).join(", ")}`), "",
    `Open My Stocks: ${SITE}/members#stocks`, "",
    "Education only — not advice or a recommendation. Past signals do not predict future results.",
    `You get this because alerts are set to ${m.mode}. Change marks on My Stocks (🔔) or turn alerts off at ${SITE}/account.`].join("\n");
  const rows = items.map((it) => `<tr><td style="padding:8px 10px;font-weight:700;color:#fff;vertical-align:top">${esc(it.t)}</td><td style="padding:8px 10px;color:#cbd5e1">${it.got.map((g) => `<div>${MARKS[g.id].icon} ${esc(MARKS[g.id].label)}${g.note ? ` <span style="color:#64748b">· ${esc(g.note)}</span>` : ""}</div>`).join("")}</td></tr>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#0b1220;font-family:system-ui,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px">
<p style="color:#facc15;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0">Canary Dashboard · My Stocks alerts</p>
<h1 style="color:#fff;font-size:20px;margin:6px 0 14px">New marks on your stocks · ${dmy(PACK)} close</h1>
<table style="width:100%;border-collapse:collapse;background:#111a2e;border-radius:10px;font-size:14px">${rows}</table>
<p style="margin:16px 0"><a href="${SITE}/members#stocks" style="background:#facc15;color:#111;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">Open My Stocks</a></p>
<p style="color:#64748b;font-size:11px;line-height:1.5">Education only — not advice or a recommendation. Past signals do not predict future results.<br>You get this because alerts are set to <b>${esc(m.mode)}</b>. Change marks on My Stocks (🔔) or turn alerts off at <a href="${SITE}/account" style="color:#94a3b8">${SITE.replace(/^https?:\/\//, "")}/account</a>.</p>
</div></body></html>`;
  return { subject, text, html };
}
async function resend(to, msg) {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: msg.subject, text: msg.text, html: msg.html,
        headers: { "List-Unsubscribe": `<${SITE}/account>` } }),
    });
    return res.ok ? { sent: true } : { sent: false, reason: `resend HTTP ${res.status}` };
  } catch { return { sent: false, reason: "resend network error" }; }
}

// ---------- run ----------
const ledger = (existsSync(LEDGER) && JSON.parse(readFileSync(LEDGER, "utf8"))) || {};
let wrote = false, n = 0, sent = 0, failed = 0, skipped = 0;
for (const m of members) {
  if (m.mode === "off") continue;
  const items = hits(m); if (!items.length) continue;
  n++;
  const key = `${PACK}|${m.email.toLowerCase()}`;
  const msg = render(m, items);
  if (!wrote) { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, msg.html); wrote = true; }
  const masked = m.email.replace(/^(.).*(@.*)$/, "$1***$2");
  if (!SEND) { console.log(`[dry-run] ${masked} (${m.mode}): "${msg.subject}" — NOT sent`); continue; }
  if (ledger[key] && !FORCE) { skipped++; console.log(`[skip] ${masked}: already sent for ${PACK}`); continue; }
  const r = await resend(m.email, msg);
  if (r.sent) { sent++; ledger[key] = new Date().toISOString(); mkdirSync(dirname(LEDGER), { recursive: true }); writeFileSync(LEDGER, JSON.stringify(ledger, null, 2)); console.log(`[sent] ${masked}: "${msg.subject}"`); }
  else { failed++; console.error(`[fail] ${masked}: ${r.reason}`); }
}
console.log(`watchlist-alerts: pack=${PACK}, source=${source}, members=${members.length}, printed-tickers=${printed.size}, digests=${n}` +
  (SEND ? `, sent=${sent}, skipped=${skipped}, failed=${failed}` : `, sample=${wrote ? OUT : "none"} — dry-run, Resend not called.`));
if (failed) process.exit(1);
