"use client";

/**
 * Crypto tab hero charts (owner PREVIEW 2026-10-09 7:05 PM NZ; flag MEMBERS_CRYPTO_HERO_CHARTS,
 * default OFF). BTC and ETH daily candles (~6 months visible) with our marks on the bars, using the
 * same members chart data and chart component as the ticker lightbox (TradingView Lightweight
 * Charts™, attribution logo kept on the chart). Loaded in its own chunk only when the Crypto tab is
 * open and the flag is on. Education only; no return claims.
 */
import { useEffect, useState } from "react";
import { CandleChart, MARKS, useChartDoc, type MarkKind } from "@/components/TickerChartV2";

const PAIRS = [
  { ticker: "BTCUSD", label: "Bitcoin", short: "BTC" },
  { ticker: "ETHUSD", label: "Ethereum", short: "ETH" },
] as const;

const KEY: { emoji: string; text: string }[] = [
  { emoji: "🐟", text: "Fish: sold off, starting to find its feet" },
  { emoji: "🙂", text: "Washout: selling looks worn out" },
  { emoji: "💵", text: "MFI washout: money flow turning up" },
  { emoji: "📈", text: "Monthly trend turned up" },
  { emoji: "🥵", text: "Sweaty: a hard run that may be tiring" },
  { emoji: "💀", text: "Skull: topping mark after a sweaty stretch" },
];

const NAME: Record<MarkKind, string> = { fish: "Fish", smile: "Washout", mfi: "MFI washout", m20: "Monthly trend up", sweat: "Sweaty", skull: "Skull" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDay = (ymd: string) => `${Number(ymd.slice(8, 10))} ${MONTHS[Number(ymd.slice(5, 7)) - 1]} ${ymd.slice(0, 4)}`;
const ymdOf = (d0: number, off: number) => new Date((d0 + off) * 86400000).toISOString().slice(0, 10);

function HeroChart({ ticker, label, short }: { ticker: string; label: string; short: string }) {
  const { doc, error, loading } = useChartDoc(ticker);
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setIsNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  let caption = "Last signal: none in the last year";
  if (doc && doc.m.length) {
    const lastOff = Math.max(...doc.m.map(([o]) => o));
    const kinds = [...new Set(doc.m.filter(([o]) => o === lastOff).map(([, k]) => k as MarkKind))];
    caption = `Last signal: ${kinds.map((k) => `${MARKS[k]?.emoji ?? ""} ${NAME[k] ?? k}`).join(" + ")} on ${fmtDay(ymdOf(doc.d0, lastOff))}`;
  }
  return (
    <figure className="min-w-0 rounded-xl border border-white/10 bg-slate-900/60 p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">
          {label} <span className="text-slate-500">· {short}</span>
        </h3>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Daily · <span className="sm:hidden">~3 months (scroll back for more)</span><span className="hidden sm:inline">~6 months</span></span>
      </div>
      <div className="relative h-[260px] sm:h-[320px]">
        {doc ? (
          // Crypto trades 7 days a week: ~6 months = ~183 daily bars (sm+), ~3 months = ~92 (phone).
          <CandleChart doc={doc} topMargin={0.22} spanWide={183} spanNarrow={isNarrow ? 92 : 183} />
        ) : (
          <div className="grid h-full place-items-center text-xs text-slate-500">
            {loading ? "Loading chart…" : error === "nodata" ? "No chart data yet." : "Chart unavailable right now."}
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-xs text-slate-300">
        {doc ? caption : "\u00a0"}
        {doc ? <span className="text-slate-500"> · data to {fmtDay(doc.asOf)}</span> : null}
      </figcaption>
    </figure>
  );
}

export function CryptoHeroCharts() {
  return (
    <section aria-label="Bitcoin and Ethereum charts with our marks" className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {PAIRS.map((p) => (
          <HeroChart key={p.ticker} {...p} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-slate-200">
        <span>These marks come from our Canary RelRSI and MFI Washout indicators on TradingView: one bundle, US$99 one-off for both, free for members.</span>
        <a
          href="/indicators"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400"
        >
          See the indicators
        </a>
      </div>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-relaxed text-slate-400" aria-label="Mark key">
        <li className="font-semibold uppercase tracking-wider text-slate-500">Mark key</li>
        {KEY.map((k) => (
          <li key={k.emoji}>
            <span aria-hidden>{k.emoji}</span> {k.text}
          </li>
        ))}
        <li className="text-slate-500">Bullish marks sit under the bar, bearish above. Education only.</li>
      </ul>
    </section>
  );
}
