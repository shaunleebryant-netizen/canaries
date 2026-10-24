/**
 * Spot-check Vanna & Charm NY calendar rules.
 * Run: node scripts/test-vanna-charm.mjs
 *
 * Mirrors src/lib/vannaCharm.ts (keep in sync).
 */

const WEEKDAY = { Wed: 3, Thu: 4 };

function nthWeekdayOfMonth(year, month, weekday, n) {
  const first = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const firstDow = first.getUTCDay();
  return 1 + ((weekday - firstDow + 7) % 7) + (n - 1) * 7;
}

function classifyYmd(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  const start = nthWeekdayOfMonth(y, m, WEEKDAY.Thu, 1);
  const end = nthWeekdayOfMonth(y, m, WEEKDAY.Wed, 3);
  const status = d >= start && d <= end ? "SUPPORTIVE" : "ON_HOLIDAY";
  return { ymd, status, start, end };
}

const cases = [
  ["2026-09-02", "ON_HOLIDAY"], // before 1st Thu (Sep 3)
  ["2026-09-03", "SUPPORTIVE"], // 1st Thu
  ["2026-09-16", "SUPPORTIVE"], // 3rd Wed
  ["2026-09-17", "ON_HOLIDAY"], // 3rd Thu
  ["2026-09-30", "ON_HOLIDAY"],
  ["2026-10-01", "SUPPORTIVE"], // 1st Thu Oct
  ["2026-10-07", "SUPPORTIVE"], // still before 3rd Wed Oct 21
  ["2026-10-21", "SUPPORTIVE"], // 3rd Wed
  ["2026-10-22", "ON_HOLIDAY"], // 3rd Thu
];

let failed = 0;
for (const [ymd, expect] of cases) {
  const got = classifyYmd(ymd);
  const ok = got.status === expect;
  console.log(
    `${ok ? "OK" : "FAIL"} ${ymd} → ${got.status} (expect ${expect}; window ${got.start}–${got.end})`
  );
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll vanna/charm spot checks passed.");
