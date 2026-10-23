#!/usr/bin/env node
/**
 * Resend sending domain for the letter (owner-approved 2026-09-26). Idempotent.
 *
 *   node scripts/setup-resend-domain.mjs            # create/get domain, print DNS records, trigger verify
 *   node scripts/setup-resend-domain.mjs --status   # just print status + records
 *
 * Needs RESEND_API_KEY in the environment (never printed). Domain: canarydashboard.com
 * (From: letter@canarydashboard.com). Resend's records sit on `resend._domainkey` (DKIM) and
 * `send` (bounce MX + SPF), so the root Google Workspace MX/SPF are not touched.
 * Writes the record list to exports/resend-dns-records.json (no secrets in it) so the DNS step
 * can add exactly those records to the Cloudflare zone.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const DOMAIN = process.env.RESEND_DOMAIN || "canarydashboard.com";
const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error("RESEND_API_KEY is not set in this environment");
  process.exit(2);
}
const api = async (method, path, body) => {
  const r = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} -> HTTP ${r.status} ${j?.message ?? ""}`);
  return j;
};

const list = await api("GET", "/domains");
let dom = (list.data || []).find((d) => d.name === DOMAIN);
if (!dom && !process.argv.includes("--status")) {
  dom = await api("POST", "/domains", { name: DOMAIN });
  console.log(`created domain ${DOMAIN} (${dom.id})`);
}
if (!dom) {
  console.log(`domain ${DOMAIN} not in Resend`);
  process.exit(1);
}
const full = await api("GET", `/domains/${dom.id}`);
if (!process.argv.includes("--status")) {
  await api("POST", `/domains/${dom.id}/verify`);
  console.log("verification triggered");
}
const records = (full.records || []).map((r) => ({
  record: r.record, type: r.type, name: r.name, value: r.value, priority: r.priority, ttl: r.ttl, status: r.status,
}));
mkdirSync("exports", { recursive: true });
writeFileSync("exports/resend-dns-records.json", JSON.stringify({ domain: DOMAIN, id: dom.id, region: full.region, status: full.status, records }, null, 2));
console.log(`domain ${DOMAIN} id=${dom.id} region=${full.region} status=${full.status}`);
for (const r of records) console.log(`  ${r.type.padEnd(4)} ${r.name.padEnd(20)} ${r.status}  ${String(r.value).slice(0, 60)}${r.priority != null ? ` (prio ${r.priority})` : ""}`);
