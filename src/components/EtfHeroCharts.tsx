"use client";

/**
 * ETF tab 1Y charts (owner t746u/t748u PREVIEW 2026-10-25): one daily candle chart per SPDR sector ETF,
 * below the ETF tab boxes, same pattern as the Crypto tab BTC/ETH hero charts (same chart data +
 * component as the ticker lightbox). ~1 year visible (252 trading days); ~6 months on phones (scroll back).
 */
import { HeroChart } from "@/components/CryptoHeroCharts";
import screener from "../../data/sector-screener.json";

const SECTORS = [
  ["XLK", "Technology"], ["XLY", "Cons. Discretionary"], ["XLC", "Communication"],
  ["XLF", "Financials"], ["XLI", "Industrials"], ["XLE", "Energy"], ["XLB", "Materials"],
  ["XLU", "Utilities"], ["XLP", "Cons. Staples"], ["XLV", "Health Care"], ["XLRE", "Real Estate"],
] as const;

// Owner t750u: same order as the Monthly rank heatmap (this month's rank, 1 = best); unranked last.
const RANK = new Map((screener as { rows: { symbol: string; ranks: (number | null)[] }[] }).rows.map((r) => [r.symbol, r.ranks.at(-1) ?? 99]));
const ORDERED = [...SECTORS].sort((a, b) => (RANK.get(a[0]) ?? 99) - (RANK.get(b[0]) ?? 99));

export function EtfHeroCharts() {
  return (
    <section aria-label="Sector ETF charts, past year, with our marks" className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-canary-gold">Past year · sector ETFs <span className="text-[10px] font-normal normal-case tracking-normal text-slate-500">· sorted by this month&apos;s rank</span></h3>
      <div className="grid gap-3 md:grid-cols-2">
        {ORDERED.map(([t, name]) => (
          <HeroChart key={t} ticker={t} label={name} short={t} spanWide={252} spanNarrow={126}
            rangeWide="~1 year" rangeNarrow="~6 months (scroll back for 1 year)" />
        ))}
      </div>
      <p className="text-[11px] text-slate-500">Daily candles with our marks (same key as the Stocks tab). Education only.</p>
    </section>
  );
}
