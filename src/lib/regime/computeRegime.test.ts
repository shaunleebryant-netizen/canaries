/**
 * Node test runner: npx --yes tsx --test src/lib/regime/computeRegime.test.ts
 * or: node --import tsx --test src/lib/regime/computeRegime.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  REGIME_WEIGHTS,
  weightSum,
  stateFromR,
  voteFromScore,
  voteFromVolBand,
  computeSpec,
  computeRegime,
  applyHysteresis,
  REGIME_BOX_IDS,
  type RegimeCanaryInput,
} from "./computeRegime";

function six(
  overrides: Partial<Record<(typeof REGIME_BOX_IDS)[number], number>> = {}
): RegimeCanaryInput[] {
  return REGIME_BOX_IDS.map((id) => ({
    id,
    name: id,
    score: overrides[id] ?? 1,
    status: "VERIFIED",
  }));
}

describe("Option B flock weights (composite S — not regime box)", () => {
  it("weights sum ≈ 1.00 and 13 seats", () => {
    const s = weightSum();
    assert.ok(Math.abs(s - 1) < 1e-9, `sum=${s}`);
    assert.equal(Object.keys(REGIME_WEIGHTS).length, 13);
  });
});

describe("votes", () => {
  it("clamp score → +1 / 0 / −1", () => {
    assert.equal(voteFromScore(2), 1);
    assert.equal(voteFromScore(1), 1);
    assert.equal(voteFromScore(0), 0);
    assert.equal(voteFromScore(0.5), 0);
    assert.equal(voteFromScore(-1), -1);
    assert.equal(voteFromScore(-2), -1);
    assert.equal(voteFromScore(null), 0);
  });

  it("VIX band SAFE/CAUTION/DANGER → votes", () => {
    assert.equal(voteFromVolBand("SAFE"), 1);
    assert.equal(voteFromVolBand("CAUTION"), 0);
    assert.equal(voteFromVolBand("DANGER"), -1);
  });

  it("VIX uses mediumRatio band when present", () => {
    const rows = six({
      "qqq-sma20": 1,
      "cyclical-defensive": 1,
      "vix-vix3m": 0, // score alone would be 0
      "hyg-ief-sma20": 1,
    });
    // inject ratio via opts
    const r = computeRegime(rows, {
      asOf: "2026-09-19",
      mediumRatio: 0.85, // SAFE
    });
    assert.equal(r.votes["vix-vix3m"], 1);
    assert.equal(r.R, 4);
  });
});

describe("stateFromR / R bands", () => {
  it("R ≥ 2 → RISK_ON, R ≤ −2 → RISK_OFF, else MIXED", () => {
    assert.equal(stateFromR(4), "RISK_ON");
    assert.equal(stateFromR(2), "RISK_ON");
    assert.equal(stateFromR(1), "MIXED");
    assert.equal(stateFromR(0), "MIXED");
    assert.equal(stateFromR(-1), "MIXED");
    assert.equal(stateFromR(-2), "RISK_OFF");
    assert.equal(stateFromR(-4), "RISK_OFF");
  });

  it("all core +1 → R=4 RISK_ON", () => {
    const r = computeRegime(six(), { asOf: "2026-09-19" });
    assert.equal(r.R, 4);
    assert.equal(r.stateRaw, "RISK_ON");
    assert.equal(r.spec, "FULL");
  });
});

describe("spec FULL / HALF / OFF", () => {
  it("FULL when RISK_ON and A–D ≥ 0 and SP600 ≥ 0", () => {
    assert.equal(
      computeSpec({ regime: "RISK_ON", qqq: 1, vix: 1, ad: 0, sp600: 1 }),
      "FULL"
    );
  });

  it("HALF when RISK_ON and exactly one gate ≥ 0", () => {
    assert.equal(
      computeSpec({ regime: "RISK_ON", qqq: 1, vix: 1, ad: -1, sp600: 1 }),
      "HALF"
    );
    assert.equal(
      computeSpec({ regime: "RISK_ON", qqq: 1, vix: 1, ad: 1, sp600: -1 }),
      "HALF"
    );
  });

  it("OFF when MIXED or RISK_OFF", () => {
    assert.equal(
      computeSpec({ regime: "MIXED", qqq: 1, vix: 1, ad: 1, sp600: 1 }),
      "OFF"
    );
    assert.equal(
      computeSpec({ regime: "RISK_OFF", qqq: 1, vix: 1, ad: 1, sp600: 1 }),
      "OFF"
    );
  });

  it("QQQ −1 forces OFF even on RISK_ON", () => {
    assert.equal(
      computeSpec({ regime: "RISK_ON", qqq: -1, vix: 1, ad: 1, sp600: 1 }),
      "OFF"
    );
    const r = computeRegime(
      six({ "qqq-sma20": -1, "cyclical-defensive": 1, "vix-vix3m": 1, "hyg-ief-sma20": 1 }),
      { asOf: "2026-09-19" }
    );
    // R = -1+1+1+1 = 2 → RISK_ON raw, but QQQ−1 → OFF
    assert.equal(r.stateRaw, "RISK_ON");
    assert.equal(r.spec, "OFF");
  });

  it("VIX −1 forces OFF even on RISK_ON", () => {
    assert.equal(
      computeSpec({ regime: "RISK_ON", qqq: 1, vix: -1, ad: 1, sp600: 1 }),
      "OFF"
    );
    const r = computeRegime(
      six({
        "qqq-sma20": 1,
        "cyclical-defensive": 1,
        "vix-vix3m": -1,
        "hyg-ief-sma20": 1,
      }),
      { asOf: "2026-09-19" }
    );
    assert.equal(r.stateRaw, "RISK_ON");
    assert.equal(r.votes["vix-vix3m"], -1);
    assert.equal(r.spec, "OFF");
  });

  it("RISK_ON with both gates weak → OFF", () => {
    assert.equal(
      computeSpec({ regime: "RISK_ON", qqq: 1, vix: 1, ad: -1, sp600: -1 }),
      "OFF"
    );
  });
});

describe("hysteresis (regime pill only)", () => {
  it("one-day flip does not change stateShown", () => {
    // Core all 0 → R=0 MIXED
    const mixed = six({
      "qqq-sma20": 0,
      "cyclical-defensive": 0,
      "vix-vix3m": 0,
      "hyg-ief-sma20": 0,
    });
    assert.equal(stateFromR(0), "MIXED");

    const r = computeRegime(mixed, {
      asOf: "2026-09-18",
      history: {
        asOf: "2026-09-17",
        stateShown: "RISK_ON",
        pendingState: null,
        pendingCount: 0,
        daysInState: 5,
        sessions: [
          {
            date: "2026-09-17",
            R: 3,
            stateRaw: "RISK_ON",
            stateShown: "RISK_ON",
          },
        ],
      },
    });
    assert.equal(r.stateRaw, "MIXED");
    assert.equal(r.stateShown, "RISK_ON", "pill must not flip on one-day change");
    assert.equal(r.pendingState, "MIXED");
    assert.equal(r.pendingCount, 1);
    // Spec uses raw → OFF immediately (no hysteresis on spec)
    assert.equal(r.spec, "OFF");
  });

  it("two consecutive sessions flip stateShown", () => {
    const mixed = six({
      "qqq-sma20": 0,
      "cyclical-defensive": 0,
      "vix-vix3m": 0,
      "hyg-ief-sma20": 0,
    });
    const r = computeRegime(mixed, {
      asOf: "2026-09-19",
      history: {
        stateShown: "RISK_ON",
        pendingState: "MIXED",
        pendingCount: 1,
        daysInState: 6,
      },
    });
    assert.equal(r.stateRaw, "MIXED");
    assert.equal(r.stateShown, "MIXED");
    assert.equal(r.daysInState, 1);
  });

  it("applyHysteresis unit: pending first day keeps prior", () => {
    const h = applyHysteresis("RISK_OFF", {
      stateShown: "RISK_ON",
      pendingCount: 0,
      daysInState: 3,
    });
    assert.equal(h.stateShown, "RISK_ON");
    assert.equal(h.pendingCount, 1);
  });
});

describe("box membership", () => {
  it("exactly 6 box ids", () => {
    assert.equal(REGIME_BOX_IDS.length, 6);
    assert.equal(new Set(REGIME_BOX_IDS).size, 6);
  });
});
