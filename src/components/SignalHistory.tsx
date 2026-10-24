"use client";

/**
 * Members Signal History — 5th "History" tab on /members (owner approved 2026-10-07; MEMBERS_HISTORY_TAB).
 * Past 🐟 / 🙂 / 💵 marks by date, so members can find names that have dropped out of the boxes.
 * Filters: mark type, universe, date range, search. 12 rows, then Show more. No "in a box" column (owner t567u).
 * Education only: % since is a plain price change, never a trade result or a returns claim.
 */
import { useMemo, useState } from "react";
import { TickerLink } from "@/components/TickerChartLightbox";
import {
  expandSignalHistory,
  type HistoryGroup,
  type HistoryKind,
  type SignalHistoryPayload,
  type SignalHistoryRow,
} from "@/lib/signalHistoryShared";

const PAGE = 12;

const KINDS: { id: HistoryKind; emoji: string; label: string; title: string }[] = [
  { id: "fish", emoji: "🐟", label: "Fish", title: "Fish: a sold-off name starting to find its feet" },
  { id: "smile", emoji: "🙂", label: "Washout", title: "Washout: selling looks worn out" },
  { id: "mfi", emoji: "💵", label: "MFI", title: "MFI washout: selling washed out, money flow turning up" },
];
const KIND_BY_ID = Object.fromEntries(KINDS.map((k) => [k.id, k])) as Record<HistoryKind, (typeof KINDS)[number]>;

const GROUPS: { id: HistoryGroup | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "stock", label: "Stocks" },
  { id: "sector", label: "Sector ETFs" },
  { id: "country", label: "Countries" },
  { id: "crypto", label: "Crypto" },
];

type Preset = "2w" | "1m" | "3m" | "all" | "custom";
const PRESETS: { id: Exclude<Preset, "custom">; label: string; days: number | null }[] = [
  { id: "2w", label: "2W", days: 14 },
  { id: "1m", label: "1M", days: 31 },
  { id: "3m", label: "3M", days: 92 },
  { id: "all", label: "6M", days: null },
];

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function fmtDate(ymd: string, withDow = true): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  const s = `${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
  return withDow ? `${DOW[d.getUTCDay()]} ${s}` : s;
}

function fmtPrice(p: number | null): string {
  if (p == null || !Number.isFinite(p)) return "—";
  const dp = p >= 1000 ? 0 : p >= 1 ? 2 : 4;
  return p.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function pctSince(r: SignalHistoryRow): number | null {
  if (r.priceNow == null || !r.priceAtSignal) return null;
  return ((r.priceNow - r.priceAtSignal) / r.priceAtSignal) * 100;
}

function fmtPct(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

/** Owner t570u: green when up, red when down, neutral grey when it rounds to 0.0%. */
function pctTone(v: number | null): string {
  if (v == null || !Number.isFinite(v) || Math.abs(v) < 0.05) return "text-slate-400";
  return v > 0 ? "text-emerald-300" : "text-red-300";
}

function Marks({ kinds }: { kinds: HistoryKind[] }) {
  return (
    <span className="inline-flex gap-0.5 text-base leading-none">
      {kinds.map((k) => (
        <span key={k} title={KIND_BY_ID[k].title} aria-label={KIND_BY_ID[k].label}>
          {KIND_BY_ID[k].emoji}
        </span>
      ))}
    </span>
  );
}

function LeftUniverse() {
  return (
    <span
      className="ml-1.5 shrink-0 rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-500"
      title="No longer in the scanner universe. History kept."
    >
      Left universe
    </span>
  );
}

const chip = (on: boolean) =>
  `rounded-md px-2.5 py-1 text-xs font-medium transition ${
    on ? "bg-sky-500/20 text-sky-100 shadow-sm" : "text-slate-400 hover:text-slate-200"
  }`;

export function SignalHistory({ data }: { data: SignalHistoryPayload }) {
  const allRows = useMemo(() => expandSignalHistory(data), [data]);
  const asOf = data.asOf ?? allRows[0]?.date ?? "";
  const minDate = data.windowStart ?? allRows[allRows.length - 1]?.date ?? "";
  const [kinds, setKinds] = useState<HistoryKind[]>(["fish", "smile", "mfi"]);
  const [group, setGroup] = useState<HistoryGroup | "all">("all");
  const [preset, setPreset] = useState<Preset>("all");
  const [from, setFrom] = useState(minDate);
  const [to, setTo] = useState(asOf);
  const [q, setQ] = useState("");
  const [showPct, setShowPct] = useState(true);
  const [limit, setLimit] = useState(PAGE);

  const reset = () => setLimit(PAGE);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return allRows.filter((r) => {
      if (!r.kinds.some((k) => kinds.includes(k))) return false;
      if (group !== "all" && r.group !== group) return false;
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (needle && !r.ticker.toLowerCase().includes(needle) && !(r.name ?? "").toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [allRows, kinds, group, from, to, q]);

  const shown = filtered.slice(0, limit);
  const uniqueTickers = useMemo(() => new Set(filtered.map((r) => r.ticker)).size, [filtered]);

  const toggleKind = (k: HistoryKind) => {
    setKinds((cur) => (cur.includes(k) ? (cur.length > 1 ? cur.filter((x) => x !== k) : cur) : [...cur, k]));
    reset();
  };
  const pickPreset = (p: (typeof PRESETS)[number]) => {
    setPreset(p.id);
    setFrom(p.days == null ? minDate : addDays(asOf, -p.days));
    setTo(asOf);
    reset();
  };

  return (
    <section
      id="signal-history"
      aria-label="Backtest"
      className="rounded-xl border border-canary-gold/25 bg-slate-900/60 p-3 shadow-sm ring-1 ring-canary-gold/10 sm:p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          {/* Owner t572u: tab + heading renamed "Backtest" (heading sits above the card on /members). */}
          <p className="text-xs text-slate-400">
            Past 🐟 🙂 💵 marks by date, including names no longer shown in the scanner boxes.
          </p>
        </div>
        <p className="text-[10px] uppercase tracking-wide text-slate-500">
          {minDate ? `${fmtDate(minDate, false)} – ${fmtDate(asOf, false)}` : null} · {data.sessions} sessions · daily
        </p>
      </div>

      {/* Filters */}
      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-white/10 bg-slate-950/50 p-2 text-xs lg:flex-row lg:flex-wrap lg:items-center lg:gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Mark type" className="inline-flex rounded-lg border border-white/10 bg-slate-950/70 p-0.5">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                aria-pressed={kinds.includes(k.id)}
                onClick={() => toggleKind(k.id)}
                className={chip(kinds.includes(k.id))}
                title={k.title}
              >
                <span aria-hidden>{k.emoji}</span> {k.label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Date range" className="inline-flex rounded-lg border border-white/10 bg-slate-950/70 p-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset === p.id}
                onClick={() => pickPreset(p)}
                className={chip(preset === p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Universe" className="inline-flex flex-wrap rounded-lg border border-white/10 bg-slate-950/70 p-0.5">
            {GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={group === g.id}
                onClick={() => {
                  setGroup(g.id);
                  reset();
                }}
                className={chip(group === g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <label className="flex items-center gap-1 text-slate-500">
            From
            <input
              type="date"
              value={from}
              min={minDate}
              max={to || asOf}
              onChange={(e) => {
                setFrom(e.target.value || minDate);
                setPreset("custom");
                reset();
              }}
              className="rounded-md border border-white/10 bg-slate-950/70 px-1.5 py-1 text-slate-200 [color-scheme:dark]"
            />
          </label>
          <label className="flex items-center gap-1 text-slate-500">
            To
            <input
              type="date"
              value={to}
              min={from || minDate}
              max={asOf}
              onChange={(e) => {
                setTo(e.target.value || asOf);
                setPreset("custom");
                reset();
              }}
              className="rounded-md border border-white/10 bg-slate-950/70 px-1.5 py-1 text-slate-200 [color-scheme:dark]"
            />
          </label>
        </div>
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2">
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              reset();
            }}
            placeholder="Search ticker or company"
            aria-label="Search ticker or company"
            className="w-full min-w-0 rounded-md border border-white/10 bg-slate-950/70 px-2.5 py-1.5 text-slate-100 placeholder:text-slate-600 focus:border-sky-400/50 focus:outline-none sm:w-auto sm:flex-1 sm:max-w-xs"
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-slate-400">
            <input
              type="checkbox"
              checked={showPct}
              onChange={(e) => setShowPct(e.target.checked)}
              className="accent-sky-400"
            />
            Show % since
          </label>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        {filtered.length.toLocaleString()} marks · {uniqueTickers} tickers · newest first
      </p>

      {filtered.length === 0 ? (
        <p className="mt-3 rounded-lg border border-white/5 bg-slate-950/40 px-3 py-6 text-center text-xs text-slate-400">
          No marks match these filters.
        </p>
      ) : (
        <>
          {/* Desktop / tablet: table */}
          <div className="mt-2 hidden overflow-x-auto md:block">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="border-b border-white/10 px-2 py-1.5 font-medium">Date</th>
                  <th className="border-b border-white/10 px-2 py-1.5 font-medium">Ticker</th>
                  <th className="border-b border-white/10 px-2 py-1.5 font-medium">Company</th>
                  <th className="border-b border-white/10 px-2 py-1.5 font-medium">Mark</th>
                  <th className="border-b border-white/10 px-2 py-1.5 text-right font-medium">Price at mark</th>
                  <th className="border-b border-white/10 px-2 py-1.5 text-right font-medium">Price now</th>
                  {showPct ? (
                    <th className="border-b border-white/10 px-2 py-1.5 text-right font-medium">% since</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {shown.map((r, i) => {
                  const firstOfDay = i === 0 || shown[i - 1].date !== r.date;
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.03]">
                      <td
                        className={`whitespace-nowrap px-2 py-1.5 tabular-nums ${
                          firstOfDay ? "border-t border-white/10 text-slate-300" : "text-transparent"
                        }`}
                      >
                        {fmtDate(r.date)}
                      </td>
                      <td className={`px-2 py-1.5 ${firstOfDay ? "border-t border-white/10" : ""}`}>
                        <TickerLink ticker={r.ticker} className="text-left font-semibold tracking-wide text-white" />
                      </td>
                      <td className={`max-w-[18rem] px-2 py-1.5 text-slate-400 ${firstOfDay ? "border-t border-white/10" : ""}`} title={r.name ?? ""}>
                        <span className="flex items-center">
                          <span className="truncate">{r.name ?? "—"}</span>
                          {r.removed ? <LeftUniverse /> : null}
                        </span>
                      </td>
                      <td className={`px-2 py-1.5 ${firstOfDay ? "border-t border-white/10" : ""}`}>
                        <Marks kinds={r.kinds} />
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums text-slate-300 ${firstOfDay ? "border-t border-white/10" : ""}`}>
                        {fmtPrice(r.priceAtSignal)}
                      </td>
                      <td className={`px-2 py-1.5 text-right tabular-nums text-slate-300 ${firstOfDay ? "border-t border-white/10" : ""}`}>
                        {fmtPrice(r.priceNow)}
                      </td>
                      {showPct ? (
                        <td className={`px-2 py-1.5 text-right tabular-nums ${pctTone(pctSince(r))} ${firstOfDay ? "border-t border-white/10" : ""}`}>
                          {fmtPct(pctSince(r))}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked rows */}
          <ul className="mt-2 space-y-1 md:hidden">
            {shown.map((r, i) => {
              const firstOfDay = i === 0 || shown[i - 1].date !== r.date;
              return (
                <li key={r.id}>
                  {firstOfDay ? (
                    <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {fmtDate(r.date)}
                    </p>
                  ) : null}
                  <div className="rounded-md border border-white/5 bg-slate-950/40 px-2.5 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Marks kinds={r.kinds} />
                      <TickerLink ticker={r.ticker} className="shrink-0 text-left font-semibold tracking-wide text-white" />
                      <span className="min-w-0 flex-1 truncate text-slate-400">{r.name ?? ""}</span>
                      {r.removed ? <LeftUniverse /> : null}
                    </div>
                    <div className="mt-1 tabular-nums text-slate-400">
                      {fmtPrice(r.priceAtSignal)} <span className="text-slate-600">→</span> {fmtPrice(r.priceNow)}
                      {showPct ? <span className={`ml-1.5 ${pctTone(pctSince(r))}`}>{fmtPct(pctSince(r))}</span> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              Showing {shown.length} of {filtered.length.toLocaleString()}
            </p>
            {shown.length < filtered.length ? (
              <button
                type="button"
                onClick={() => setLimit((n) => n + PAGE)}
                className="rounded-lg border border-canary-gold/40 px-3 py-1.5 text-xs font-medium text-canary-gold hover:bg-canary-gold/10"
              >
                Show more
              </button>
            ) : null}
          </div>
        </>
      )}

      <p className="mt-3 border-t border-white/5 pt-2 text-[10px] leading-relaxed text-slate-500">
        This backtest is a simple look-back at past marks, not a tested trading strategy or a
        record of results. Price at mark = close on the mark day. Price now = last completed close
        {data.asOf ? ` (${fmtDate(data.asOf, false)})` : ""}.
        {showPct
          ? " % since is the plain price change between those two closes. It is not a trade result, ignores everything in between, and past marks do not predict future moves."
          : ""}{" "}
        Education only, not advice.
      </p>
    </section>
  );
}
