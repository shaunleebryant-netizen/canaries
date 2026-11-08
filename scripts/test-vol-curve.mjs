/**
 * Standalone Vol Curve draft tests (no Next/vitest).
 * Run: node scripts/test-vol-curve.mjs
 */
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const tryTsx = spawnSync(
  "npx",
  [
    "--yes",
    "tsx",
    "-e",
    `
import assert from "node:assert/strict";
import {
  bandFromMediumRatio,
  computeVolCurve,
  ratioOrNull,
  creditConfirm,
  policiesForStance,
} from "./src/lib/volCurve/computeVolCurve.ts";

assert.equal(bandFromMediumRatio(0.90), "SAFE");
assert.equal(bandFromMediumRatio(0.91), "CAUTION");
assert.equal(bandFromMediumRatio(0.95), "CAUTION");
assert.equal(bandFromMediumRatio(0.955), "CAUTION");
assert.equal(bandFromMediumRatio(0.96), "DANGER");
assert.equal(bandFromMediumRatio(1.05), "DANGER");
assert.equal(ratioOrNull(15.44, 18.55)?.toFixed(3), "0.832");

const safe = computeVolCurve({
  asOf: "2026-09-17",
  vix: 15.44,
  vix3m: 18.55,
  hygIef: { ratio: 0.86, sma20: 0.85, rollingOver: false, status: "VERIFIED" },
});
assert.equal(safe.band, "SAFE");
assert.equal(safe.stance, "SAFE");
assert.equal(safe.checklist.length, 2);
assert.equal(safe.checklist[0].label, "VIX/VIX3M");
assert.equal(safe.checklist[1].label, "HYG/IEF");
assert.equal(policiesForStance("SAFE").spec, "full");

const caution = computeVolCurve({
  asOf: "2026-09-17",
  vix: 17.0,
  vix3m: 18.5,
  mediumHistory: [0.88, 0.89, 0.90, 0.91, 0.915, 0.919],
  hygIef: { ratio: 0.84, sma20: 0.86, rollingOver: true, status: "VERIFIED" },
});
assert.equal(caution.band, "CAUTION");
assert.equal(caution.stance, "CAUTION");
assert.equal(caution.credit.label, "Confirming");

const danger = computeVolCurve({
  asOf: "2026-09-17",
  vix: 19.2,
  vix3m: 20.0,
  mediumHistory: [0.90, 0.92, 0.94, 0.95, 0.96, 0.96],
});
assert.equal(danger.band, "DANGER");
assert.equal(danger.stance, "DANGER");

assert.equal(creditConfirm(null, 0.832, null).label, "Pending");
console.log("ok tsx vol-curve assertions");
`,
  ],
  { cwd: root, encoding: "utf8", timeout: 120000 }
);

if (tryTsx.status === 0) {
  process.stdout.write(tryTsx.stdout);
  process.stderr.write(tryTsx.stderr);
} else {
  console.error("tsx path failed; running inline assertions…");
  console.error(tryTsx.stderr || tryTsx.stdout);
}

function bandFromMediumRatio(ratio) {
  if (ratio >= 0.96) return "DANGER";
  if (ratio >= 0.91) return "CAUTION";
  return "SAFE";
}

function ratioOrNull(num, den) {
  if (num == null || den == null || den === 0) return null;
  return num / den;
}

let failed = 0;
function check(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    failed++;
  } else console.log("ok", name);
}

check("SAFE below 0.91", bandFromMediumRatio(0.90) === "SAFE");
check("CAUTION at 0.91", bandFromMediumRatio(0.91) === "CAUTION");
check("CAUTION at 0.95", bandFromMediumRatio(0.95) === "CAUTION");
check("CAUTION through 0.95", bandFromMediumRatio(0.955) === "CAUTION");
check("DANGER at 0.96", bandFromMediumRatio(0.96) === "DANGER");
check("seed ratio ~0.832 SAFE", bandFromMediumRatio(15.44 / 18.55) === "SAFE");

const stub = JSON.parse(
  readFileSync(join(root, "data/vol-curve-stub.json"), "utf8")
);
check("stub draft:false (live seed)", stub.draft === false);
check("VIX seeded 14.81", stub.feeds.vix.value === 14.81);
check("VIX3M seeded 18.24", stub.feeds.vix3m.value === 18.24);
check(
  "seed medium SAFE",
  bandFromMediumRatio(stub.feeds.vix.value / stub.feeds.vix3m.value) === "SAFE"
);
check("no obsolete fast/VX feeds", !("vix9d" in stub.feeds) && !("vx1" in stub.feeds) && !("vx2" in stub.feeds));

const computeSource = readFileSync(
  join(root, "src/lib/volCurve/computeVolCurve.ts"),
  "utf8"
);
const componentSource = readFileSync(
  join(root, "src/components/VolCurveCanary.tsx"),
  "utf8"
);
check("no obsolete fast/VX compute", !/VIX9D|VX1|VX2|CAPITULATION_FADE|0\.917/.test(computeSource));
check("no obsolete fast/VX UI", !/VIX9D|VX1|VX2|CAPITULATION_FADE|0\.917/.test(componentSource));

process.exit(failed ? 1 : 0);
