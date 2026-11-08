import assert from "node:assert/strict";
import { test } from "node:test";
import { quoteStripChartTicker, quoteStripInteractive } from "./quoteStripChart";
import { toTradingViewSymbol } from "./tradingViewSymbol";

test("live quotes open the chart-pack key, or the TradingView symbol when there is no pack", () => {
  assert.equal(quoteStripChartTicker("spx", "SPX"), "SPX");
  assert.equal(quoteStripChartTicker("qqq"), "QQQ");
  assert.equal(quoteStripChartTicker("vix"), "VIX");
  assert.equal(quoteStripChartTicker("wti"), "WTI");
  assert.equal(quoteStripChartTicker("xau", "XAUUSD"), "XAUUSD");
  assert.equal(quoteStripChartTicker("btc", "BTCUSD"), "BTCUSD");
  assert.equal(quoteStripChartTicker("unknown", "GLD"), "GLD");

  assert.equal(toTradingViewSymbol("SPX"), "TVC:SPX");
  assert.equal(toTradingViewSymbol("QQQ"), "NASDAQ:QQQ");
  assert.equal(toTradingViewSymbol("VIX"), "CBOE:VIX");
  assert.equal(toTradingViewSymbol("WTI"), "NYMEX:CL1!");
  assert.equal(toTradingViewSymbol("CL=F"), "NYMEX:CL1!");
  assert.equal(toTradingViewSymbol("XAUUSD"), "TVC:GOLD");
  assert.equal(toTradingViewSymbol("BTCUSD"), "BITSTAMP:BTCUSD");
});

test("quote strip clicks follow the existing paid and free rules", () => {
  for (const id of ["spx", "qqq", "wti", "xau", "btc"]) {
    assert.equal(quoteStripInteractive(id, id.toUpperCase(), "paid"), true);
  }
  assert.equal(quoteStripInteractive("vix", "VIX", "paid"), false);
  assert.equal(quoteStripInteractive("vix", "VIX", "free-etf"), false);
  assert.equal(quoteStripInteractive("spx", "SPX", "free-etf"), true);
  assert.equal(quoteStripInteractive("qqq", "QQQ", "free-etf"), true);
  assert.equal(quoteStripInteractive("xau", "XAUUSD", "free-etf"), false);
  assert.equal(quoteStripInteractive("wti", "WTI", "free-etf"), false);
  assert.equal(quoteStripInteractive("btc", "BTCUSD", "free-etf"), false);
});
