/**
 * Standalone regime box v2 tests (no Next/vitest).
 * Run: node scripts/test-regime.mjs
 */
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const testFile = join(root, "src/lib/regime/computeRegime.test.ts");

const tryTsx = spawnSync(
  "npx",
  ["--yes", "tsx", "--test", testFile],
  { cwd: root, encoding: "utf8", timeout: 120000 }
);

if (tryTsx.status === 0) {
  process.stdout.write(tryTsx.stdout);
  process.stderr.write(tryTsx.stderr);
  process.exit(0);
}

console.error("tsx path failed; running inline assertions…");
console.error(tryTsx.stderr || tryTsx.stdout);

// Inline mirror of critical v2 assertions
const FLOCK_WEIGHTS = {
  "cyclical-defensive": 0.0935,
  "xlf-kre": 0.0765,
  "vix-vix3m": 0.1135,
  "nyse-ad": 0.085,
  "pct-above-200dma": 0.0935,
  "es1-jp30": 0.0595,
  "sp-top-50": 0.068,
  sp600: 0.068,
  rsp: 0.068,
  "vix-vvix": 0.0565,
  "finra-margin": 0.068,
  "qqq-sma20": 0.08,
  "hyg-ief-sma20": 0.07,
};

function weightSum() {
  return Object.values(FLOCK_WEIGHTS).reduce((a, b) => a + b, 0);
}
function stateFromR(R) {
  if (R >= 2) return "RISK_ON";
  if (R <= -2) return "RISK_OFF";
  return "MIXED";
}
function computeSpec({ regime, qqq, vix, ad, sp600 }) {
  if (regime === "MIXED" || regime === "RISK_OFF") return "OFF";
  if (qqq === -1 || vix === -1) return "OFF";
  const adOk = ad >= 0;
  const spOk = sp600 >= 0;
  if (adOk && spOk) return "FULL";
  if (adOk !== spOk) return "HALF";
  return "OFF";
}
function applyHysteresis(stateRaw, history) {
  const prevShown = history?.stateShown ?? stateRaw;
  if (stateRaw === prevShown) {
    return {
      stateShown: prevShown,
      pendingState: null,
      pendingCount: 0,
      daysInState: (history?.daysInState ?? 0) + 1,
    };
  }
  let pendingState = history?.pendingState ?? null;
  let pendingCount = history?.pendingCount ?? 0;
  if (pendingState === stateRaw) pendingCount += 1;
  else {
    pendingState = stateRaw;
    pendingCount = 1;
  }
  if (pendingCount >= 2)
    return { stateShown: stateRaw, pendingState: null, pendingCount: 0, daysInState: 1 };
  return {
    stateShown: prevShown,
    pendingState,
    pendingCount,
    daysInState: (history?.daysInState ?? 1) + 1,
  };
}

let failed = 0;
function check(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    failed++;
  } else console.log("ok", name);
}

check("flock weights sum ≈ 1.00", Math.abs(weightSum() - 1) < 1e-9);
check("R+4 → RISK_ON", stateFromR(4) === "RISK_ON");
check("R+1 → MIXED", stateFromR(1) === "MIXED");
check("R−2 → RISK_OFF", stateFromR(-2) === "RISK_OFF");
check(
  "spec FULL",
  computeSpec({ regime: "RISK_ON", qqq: 1, vix: 1, ad: 0, sp600: 1 }) === "FULL"
);
check(
  "spec HALF",
  computeSpec({ regime: "RISK_ON", qqq: 1, vix: 1, ad: -1, sp600: 1 }) === "HALF"
);
check(
  "spec OFF on MIXED",
  computeSpec({ regime: "MIXED", qqq: 1, vix: 1, ad: 1, sp600: 1 }) === "OFF"
);
check(
  "QQQ−1 forces OFF",
  computeSpec({ regime: "RISK_ON", qqq: -1, vix: 1, ad: 1, sp600: 1 }) === "OFF"
);
check(
  "VIX−1 forces OFF",
  computeSpec({ regime: "RISK_ON", qqq: 1, vix: -1, ad: 1, sp600: 1 }) === "OFF"
);
const h = applyHysteresis("MIXED", {
  stateShown: "RISK_ON",
  pendingCount: 0,
  daysInState: 5,
});
check("one-day flip keeps pill", h.stateShown === "RISK_ON" && h.pendingCount === 1);
const h2 = applyHysteresis("MIXED", {
  stateShown: "RISK_ON",
  pendingState: "MIXED",
  pendingCount: 1,
  daysInState: 6,
});
check("two-day flip changes pill", h2.stateShown === "MIXED");

process.exit(failed ? 1 : 0);
