import assert from "node:assert/strict";
import { test } from "node:test";
import { FREE_UNIVERSE_MARK, freeUniversePlaceholder } from "./freeUniversePlaceholder";
import { loadTickerUniverse } from "./tickerUniverse";

test("the free universe preview contains no real universe ticker", () => {
  const real = new Set(loadTickerUniverse().flatMap((g) => g.items.map((i) => i.ticker)));
  const preview = freeUniversePlaceholder();
  assert.deepEqual(preview.map((g) => g.id), ["stocks", "sector-etfs", "countries", "crypto"]);
  for (const group of preview) {
    assert.equal(group.items.length > 0, true);
    for (const item of group.items) {
      assert.equal(item.ticker, FREE_UNIVERSE_MARK);
      assert.equal(real.has(item.ticker), false);
      assert.equal("name" in item, false);
    }
  }
});
