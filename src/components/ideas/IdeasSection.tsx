"use client";
import { useState } from "react";
import { StarButton, useWatchlist } from "./useWatchlist";

export type Idea = {
  t: string; close: number; sectorName: string; sectorRank: number; sectorOf: number; gs: number | null; rg: number | null;
  emojis: string[]; rsi: number; atr: number; offHigh: number; splitCheck: string; spark: number[];
  setup: { side: string; count: number } | null; pessimism: unknown; side: "long" | "short"; play: string; pattern: string;
  entryZone: [number, number]; wrongIf: number; target: number; targetBasis?: string; entryRef?: number; rr: number; why: string; score: number;
};
export type Filtered = { t: string; side: "long" | "short"; play: string; rr: number | null; sectorName: string; sectorRank: number | null; why: string };
export type IdeasData = { filtered?: Filtered[]; asOf: string; light: string; regime: string; order: string; banner: string | null; longs: Idea[]; shorts: Idea[]; note: string; counts: Record<string, number> };

export const dmy = (ymd: string) => { const [y, m, d] = ymd.split("-"); return `${d}/${m}/${y}`; };
export const fmtRg = (rg: number | null) => rg == null ? "—" : rg > 3 ? "300%+ (small base)" : `${rg >= 0 ? "+" : ""}${Math.round(rg * 100)}%`;
const p = (n: number) => n >= 100 ? n.toFixed(0) : n.toFixed(2);
const PLAY_COLOR: Record<string, string> = {
  Bounce: "bg-sky-500/15 text-sky-200", Pullback: "bg-emerald-500/15 text-emerald-200", Breakout: "bg-emerald-500/25 text-emerald-100", "Early leader": "bg-teal-500/15 text-teal-200",
  Breakdown: "bg-red-500/25 text-red-100", "Failed bounce": "bg-red-500/15 text-red-200", "Rolling over": "bg-orange-500/15 text-orange-200", "Fading sector": "bg-rose-500/15 text-rose-200",
};

function Spark({ i }: { i: Idea }) {
  const v = [...i.spark, i.wrongIf, i.target, ...i.entryZone]; const lo = Math.min(...v), hi = Math.max(...v);
  const W = 320, H = 90, y = (x: number) => H - 6 - ((x - lo) / (hi - lo || 1)) * (H - 18), dx = W / (i.spark.length - 1);
  const line = (val: number, c: string, lbl: string) => (
    <g><line x1={0} x2={W} y1={y(val)} y2={y(val)} stroke={c} strokeDasharray="4 3" strokeWidth={1} /><text x={W - 2} y={y(val) - 2} fill={c} fontSize={9} textAnchor="end">{lbl} {p(val)}</text></g>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-24 w-full" role="img" aria-label={`${i.t} last ${i.spark.length} sessions`}>
      <rect x={0} width={W} y={y(i.entryZone[1])} height={Math.max(2, y(i.entryZone[0]) - y(i.entryZone[1]))} fill="#facc15" opacity={0.12} />
      {line(i.target, "#34d399", "target")}{line(i.wrongIf, "#f87171", "wrong if")}
      <polyline fill="none" stroke="#e2e8f0" strokeWidth={1.5} points={i.spark.map((c, k) => `${k * dx},${y(c)}`).join(" ")} />
    </svg>
  );
}

function Card({ i, rank, wl, open, onToggle }: { i: Idea; rank: number; wl: ReturnType<typeof useWatchlist>; open: boolean; onToggle: () => void }) {
  return (
    <li data-idea={i.t} className="rounded-md bg-white/[0.025] hover:bg-white/[0.05]">
      <div className="flex items-center pr-1"><button type="button" onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left text-xs">
        <span className="w-3 text-[10px] tabular-nums text-slate-600">{rank}</span>
        <span className="w-11 font-semibold tracking-wide text-slate-100">{i.t}</span>
        <span className={`whitespace-nowrap rounded px-1 text-[10px] leading-4 ${PLAY_COLOR[i.play] ?? ""}`}>{i.play}</span>
        <span className="hidden text-[10px] sm:inline">{i.emojis.join("")}</span>
        <span className="ml-auto tabular-nums text-[11px] text-slate-400">{i.rr.toFixed(1)}R</span>
      </button><StarButton t={i.t} wl={wl} /></div>
      {open ? (
        <div className="border-t border-white/10 px-3 pb-3 pt-2 text-xs text-slate-300">
          <p className="text-slate-200">{i.why}</p>
          <p className="mt-1 text-slate-400">Pattern: {i.pattern}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-4">
            <div><dt className="text-slate-500">Entry zone</dt><dd>{p(i.entryZone[0])}–{p(i.entryZone[1])}</dd></div>
            <div><dt className="text-slate-500">Wrong if {i.side === "long" ? "below" : "above"}</dt><dd className="text-red-300">{p(i.wrongIf)}</dd></div>
            <div><dt className="text-slate-500">Target ({i.targetBasis ?? "—"})</dt><dd className="text-emerald-300">{p(i.target)}</dd></div>
            <div><dt className="text-slate-500">R:R from {i.entryRef != null ? p(i.entryRef) : "zone"}</dt><dd>{i.rr.toFixed(2)}</dd></div>
            <div><dt className="text-slate-500">Close 23/10</dt><dd>{p(i.close)}</dd></div>
            <div><dt className="text-slate-500">Canary Score</dt><dd>{i.gs ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Rev growth</dt><dd>{fmtRg(i.rg)}</dd></div>
            <div><dt className="text-slate-500">Sector</dt><dd>{i.sectorName} #{i.sectorRank}/{i.sectorOf}</dd></div>
            <div><dt className="text-slate-500">Signals (5d)</dt><dd>{i.emojis.join(" ") || "—"}</dd></div>
            <div><dt className="text-slate-500">Setup</dt><dd>{i.setup ? `${i.setup.side} · ${i.setup.count} cond.` : "—"}</dd></div>
            <div><dt className="text-slate-500">RSI / ATR</dt><dd>{i.rsi} / {p(i.atr)}</dd></div>
            <div><dt className="text-slate-500">Off 52w high (adj.)</dt><dd>{Math.round(i.offHigh * 100)}%{i.splitCheck !== "ok" ? " ⚠ split" : ""}</dd></div>
          </dl>
          <Spark i={i} />
          <p className="mt-1 text-[10px] text-slate-500">Last {i.spark.length} closes · shaded = entry zone. Rough chart levels for study, not advice.</p>
        </div>
      ) : null}
    </li>
  );
}

function List({ title, items, wl, tone, openId, setOpen }: { title: string; items: Idea[]; wl: ReturnType<typeof useWatchlist>; tone: string; openId: string | null; setOpen: (s: string | null) => void }) {
  return (
    <div>
      <h3 className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tone}`}>{title}</h3>
      {items.length ? <ol className="space-y-0.5">{items.map((i, k) => { const id = `${i.side}-${i.t}`; return <Card key={id} i={i} rank={k + 1} wl={wl} open={openId === id} onToggle={() => setOpen(openId === id ? null : id)} />; })}</ol>
        : <p className="text-xs text-slate-400">Nothing passes the rules today.</p>}
    </div>
  );
}

export function IdeasSection({ data }: { data: IdeasData; setupTickers?: string[] }) {
  const wl = useWatchlist();
  const [openId, setOpen] = useState<string | null>(null);
  const shortsFirst = data.order === "shorts-first";
  // Owner t756u: top 3 each only.
  data = { ...data, longs: data.longs.slice(0, 3), shorts: data.shorts.slice(0, 3) };
  const L = <List key="l" title="Longs" items={data.longs} wl={wl} tone="text-emerald-300" openId={openId} setOpen={setOpen} />;
  const S = <List key="s" title="Shorts" items={data.shorts} wl={wl} tone="text-red-300" openId={openId} setOpen={setOpen} />;
    return (
    <section id="ideas" aria-labelledby="ideas-h" className="mb-4 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
      <div className="mb-1.5 flex items-baseline gap-2">
        <h2 id="ideas-h" className="text-xs font-bold uppercase tracking-[0.2em] text-canary-gold">Ideas</h2>
        <span className="text-[11px] text-slate-400">Based on current macro regime today · {dmy(data.asOf).slice(0, 5)} close</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{shortsFirst ? [S, L] : [L, S]}</div>
      <p className="mt-2 text-[11px] text-slate-500">Past marks with the next 5, 10 and 20 day % change — a look-back, not a trade record. See the <a href="/members?tab=backtest" className="text-canary-gold/80 underline decoration-canary-gold/30 underline-offset-2 hover:text-canary-gold">Backtest tab</a>.</p>
    </section>
  );
}
