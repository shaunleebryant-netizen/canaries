"use client";

import { useMemo, useState } from "react";
import { expandSignalHistory, type SignalHistoryPayload } from "@/lib/signalHistoryShared";

const KINDS: Record<string, string> = { fish: "🐟", smile: "🙂", mfi: "💵", fairy: "🧚" };

/**
 * Recent-mark search for the Stocks tab. Stocks in the saved history only.
 * The TradingView sentence claims a grant only when the server says this account has one.
 */
export function StockMarkSearch({
  data,
  granted,
}: {
  data: SignalHistoryPayload;
  granted: boolean;
}) {
  const [q, setQ] = useState("");
  const [lookback, setLookback] = useState<30 | 90 | 180>(90);
  const rows = useMemo(() => expandSignalHistory(data).filter((r) => r.group === "stock"), [data]);
  const asOf = data.asOf ?? "";
  const cutoff = useMemo(() => {
    if (!asOf) return "";
    const d = new Date(`${asOf}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - lookback);
    return d.toISOString().slice(0, 10);
  }, [asOf, lookback]);
  const needle = q.trim().toLowerCase();
  const hits = needle
    ? rows.filter((r) => r.date >= cutoff && (r.ticker.toLowerCase().includes(needle) || (r.name ?? "").toLowerCase().includes(needle))).slice(0, 12)
    : [];

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <label className="block text-[11px] font-medium text-slate-400" htmlFor="stock-mark-search">
        Search recent marks
      </label>
      <input
        id="stock-mark-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ticker or company"
        className="mt-1 w-full rounded-md border border-white/10 bg-slate-950 px-2.5 py-1.5 text-sm text-white placeholder:text-slate-600 focus:border-sky-400/50 focus:outline-none"
      />
      <p className="mt-2 text-[11px] leading-snug text-slate-400">
        Can’t find your stock? Open it on TradingView.
        {granted ? " Load the invite-only Canary scripts we’ve granted you." : ""}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <span>Lookback</span>
        {([30, 90, 180] as const).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={lookback === n}
            onClick={() => setLookback(n)}
            className={`rounded-md px-2 py-0.5 ${lookback === n ? "bg-sky-500/20 text-sky-100" : "text-slate-400"}`}
          >
            {n} days
          </button>
        ))}
        <span className="text-slate-500">Curated stock list only. Marks outside it are not searched.</span>
      </div>
      {needle ? (
        hits.length ? (
          <ul className="mt-2 space-y-1 text-xs">
            {hits.map((r) => (
              <li key={r.id} className="flex gap-2 text-slate-300">
                <span className="tabular-nums text-slate-500">{r.date}</span>
                <span>{r.kinds.map((k) => KINDS[k] ?? k).join("")}</span>
                <span className="font-semibold text-white">{r.ticker}</span>
                <span className="truncate text-slate-400">{r.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[11px] text-slate-500">No mark in this lookback on the curated stock list.</p>
        )
      ) : null}
    </div>
  );
}
