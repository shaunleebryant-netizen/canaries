/**
 * My Stocks (owner t583u 2026-10-08, approved t583s2392; flag MEMBERS_MY_STOCKS, default ON): per-ticker current
 * conditions for the whole scanner universe, in the same ids/icons as Bullish / Bearish Setups,
 * plus box marks for Sector ETFs / Countries / Crypto (which Main Scanner does not count).
 * Server-only; built from data already loaded for the members page (no fetches).
 */
import signalHistoryJson from "../../data/signal-history.json";
import type { SetupCondition } from "@/lib/setupsCore.mjs";
import type { UniverseGroup } from "@/lib/tickerUniverse";

export type MyStockCond = Pick<SetupCondition, "id" | "since" | "dots" | "weeks" | "source">;
export type MyStockRow = {
  bull: MyStockCond[];
  bear: MyStockCond[];
  /** In Bullish / Bearish Setups right now (count = conditions). */
  setup: { side: "bull" | "bear"; count: number } | null;
  /** Latest dated mark (prints only, not weekly states). */
  last: string | null;
};
export type MyStocksUniverseItem = { t: string; n?: string; g: string };

const PRINT_IDS = new Set(["fish", "smile", "mfi_os", "sweaty", "skull", "monthly_20ma", "ibd"]);
const BOX_KIND: Record<string, { id: string; side: "bull" | "bear" }> = {
  fish: { id: "fish", side: "bull" },
  smile: { id: "smile", side: "bull" },
  exhaustion: { id: "sweaty", side: "bear" },
  skull: { id: "skull", side: "bear" },
};
const BULL_ORDER = ["fish", "smile", "mfi_os", "weekly_bull", "monthly_20ma", "ibd"];
const BEAR_ORDER = ["mfi_ob", "sweaty", "skull", "weekly_bear"];

export function tickerNames(): Record<string, string> {
  const t = (signalHistoryJson as { tickers?: Record<string, { name?: string | null }> }).tickers ?? {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(t)) if (v?.name) out[k] = v.name;
  return out;
}

export function buildMyStocksData(input: {
  universe: UniverseGroup[];
  names: Record<string, string>;
  conditionsByTicker: Record<string, { bull: SetupCondition[]; bear: SetupCondition[] }>;
  bullish: { ticker: string; count: number }[];
  bearish: { ticker: string; count: number }[];
  /** Sector ETF / Country / Crypto box rows (raw JSON rows with smileAsOf, fishAsOf, …). */
  boxRows: { source: string; rows: unknown[] }[];
}): { rows: Record<string, MyStockRow>; universe: MyStocksUniverseItem[] } {
  const universe: MyStocksUniverseItem[] = [];
  const seen = new Set<string>();
  for (const g of input.universe) {
    for (const it of g.items) {
      if (seen.has(it.ticker)) continue;
      seen.add(it.ticker);
      const n = it.name || input.names[it.ticker];
      universe.push(n ? { t: it.ticker, n, g: g.label } : { t: it.ticker, g: g.label });
    }
  }
  const setup = new Map<string, MyStockRow["setup"]>();
  for (const r of input.bullish) setup.set(r.ticker, { side: "bull", count: r.count });
  for (const r of input.bearish) setup.set(r.ticker, { side: "bear", count: r.count });

  const slim = (c: SetupCondition): MyStockCond => {
    const o: MyStockCond = { id: c.id, since: c.since ?? null };
    if (c.dots != null) o.dots = c.dots;
    if (c.weeks != null) o.weeks = c.weeks;
    if (c.source) o.source = c.source;
    return o;
  };
  const rows: Record<string, MyStockRow> = {};
  const get = (t: string) => (rows[t] ??= { bull: [], bear: [], setup: setup.get(t) ?? null, last: null });
  for (const [t, c] of Object.entries(input.conditionsByTicker)) {
    if (!seen.has(t)) continue;
    const r = get(t);
    r.bull = c.bull.map(slim);
    r.bear = c.bear.map(slim);
  }
  // Box marks the Main Scanner does not count (ETF / Country / Crypto boxes).
  for (const { source, rows: list } of input.boxRows) {
    for (const raw of list) {
      const row = raw as Record<string, unknown>;
      const t = typeof row.ticker === "string" ? row.ticker : "";
      if (!seen.has(t)) continue;
      for (const [kind, m] of Object.entries(BOX_KIND)) {
        const d = row[`${kind}AsOf`];
        if (typeof d !== "string") continue;
        const r = get(t);
        const side = r[m.side];
        if (!side.some((c) => c.id === m.id)) side.push({ id: m.id, since: d, source });
      }
    }
  }
  for (const r of Object.values(rows)) {
    r.bull.sort((a, b) => BULL_ORDER.indexOf(a.id) - BULL_ORDER.indexOf(b.id));
    r.bear.sort((a, b) => BEAR_ORDER.indexOf(a.id) - BEAR_ORDER.indexOf(b.id));
    const dates = [...r.bull, ...r.bear].filter((c) => PRINT_IDS.has(c.id) && c.since).map((c) => c.since as string);
    r.last = dates.length ? dates.sort().at(-1)! : null;
  }
  return { rows, universe };
}
