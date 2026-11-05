/**
 * Node test runner:
 *   npx --yes tsx --test src/lib/tickerLightboxStats.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { loadUniverseLightbox } from "./loadUniverseLightbox";
import { formatAnalystTarget, formatEpsGrowth, lightboxFigures, lightboxFundFromRow } from "./tickerLightboxStats";

describe("EPS marks match the setups table", () => {
  it("formats a positive fraction as a whole percent with a plus", () => {
    const stat = formatEpsGrowth(0.323, null, "yoy");
    assert.equal(stat.text, "+32%");
    assert.equal(stat.tone, "up");
  });

  it("uses a minus sign for a decline", () => {
    const stat = formatEpsGrowth(-0.124, null, "yoy");
    assert.equal(stat.text, "−12%");
    assert.equal(stat.tone, "down");
  });

  it("uses n/m, n/a, and an em dash for the empty reasons", () => {
    assert.equal(formatEpsGrowth(null, "nm", "yoy").text, "n/m");
    assert.equal(formatEpsGrowth(null, "na", "qoq").text, "n/a");
    assert.equal(formatEpsGrowth(null, "missing", "qoq").text, "—");
    assert.equal(formatEpsGrowth(null, "stale", "yoy").text, "—");
    assert.equal(formatEpsGrowth(null, undefined, "yoy").text, "—");
  });
});

describe("average analyst target", () => {
  it("hides the price when fewer than 6 analysts have published a target", () => {
    assert.equal(formatAnalystTarget(40, 5).text, "fewer than 6 analysts");
    assert.equal(formatAnalystTarget(40, 0).text, "fewer than 6 analysts");
    assert.equal(formatAnalystTarget(40, 1).text, "fewer than 6 analysts");
  });

  it("shows the average once 6 or more opinions are in the pack", () => {
    assert.equal(formatAnalystTarget(333.28052, 6).text, "333.28");
    assert.equal(formatAnalystTarget(1200.4, 38).text, "1200");
  });

  it("uses a dash when the opinion count is unknown", () => {
    assert.equal(formatAnalystTarget(333, null).text, "—");
    assert.equal(formatAnalystTarget(null, null).text, "—");
  });

  it("uses a dash when there are enough opinions but no price", () => {
    assert.equal(formatAnalystTarget(null, 8).text, "—");
  });
});

describe("universe lightbox pack", () => {
  const fund = JSON.parse(readFileSync("data/fundamentals.json", "utf8")) as {
    tickers: Record<string, { g: number | null; gw: string | null }>;
  };
  const growth = JSON.parse(readFileSync("data/growth-score.json", "utf8")) as {
    tickers: Record<string, { gs: number | null }>;
    ranked?: string[];
  };

  it("uses the same Canary Score and YoY EPS as the pack for a universe stock", () => {
    const pack = loadUniverseLightbox();
    assert.ok(pack.companies.includes("AAPL"));
    assert.equal(pack.fundamentals.AAPL.g, fund.tickers.AAPL.g);
    assert.equal(pack.growth.AAPL.gs, growth.tickers.AAPL.gs);
    assert.equal(lightboxFigures(pack.fundamentals.AAPL).yoy.text, "+32%");
    assert.equal(pack.growthScored, (growth.ranked ?? []).filter((t) => growth.tickers[t]?.gs != null).length);
  });

  it("reads QoQ and the average target from the universe table fields", () => {
    const figs = lightboxFigures({
      g: 0.323,
      gw: null,
      eq: 0.082,
      eqw: null,
      tm: 333.28,
      ao: 38,
    });
    assert.equal(figs.yoy.text, "+32%");
    assert.equal(figs.qoq.text, "+8%");
    assert.equal(figs.analyst.text, "333.28");
  });

  it("prefers eg over g for YoY, matching the universe table", () => {
    const figs = lightboxFigures({ g: 0.323, gw: null, eg: 0.11, egw: null });
    assert.equal(figs.yoy.text, "+11%");
  });

  it("hides the target when ao is 5 or fewer and uses n/m for a null QoQ", () => {
    const figs = lightboxFigures({ g: null, gw: "missing", eq: null, eqw: "nm", tm: 40, ao: 5 });
    assert.equal(figs.qoq.text, "n/m");
    assert.equal(figs.analyst.text, "fewer than 6 analysts");
  });

  it("leaves QoQ and the target empty only when those fields are absent", () => {
    const row = loadUniverseLightbox().fundamentals.AAPL;
    assert.equal(row.eq, undefined);
    assert.equal(row.ao, undefined);
    const figs = lightboxFigures(row);
    assert.equal(figs.qoq.text, "—");
    assert.equal(figs.analyst.text, "—");
  });

  it("omits metals, crypto and names outside the fish universe", () => {
    const pack = loadUniverseLightbox();
    for (const t of ["GLD", "SLV", "BTCUSD", "ETHUSD", "XLK", "QQQ"]) {
      assert.equal(pack.companies.includes(t), false, t);
    }
  });

  it("copies eg, eq, tm, and ao through the loader mapping", () => {
    const snap = lightboxFundFromRow({
      g: 0.2,
      gw: null,
      eg: 0.2,
      eq: -0.046,
      eqw: null,
      tm: 1200.4,
      ao: 8,
      n: "note",
      fe: "2026-06-27",
    });
    assert.equal(snap.eq, -0.046);
    assert.equal(snap.ao, 8);
    assert.equal(lightboxFigures(snap).qoq.text, "−5%");
    assert.equal(lightboxFigures(snap).analyst.text, "1200");
    assert.match(lightboxFigures(snap).yoy.title, /27\/06\/2026/);
  });
});
