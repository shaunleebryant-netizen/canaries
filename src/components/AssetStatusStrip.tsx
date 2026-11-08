"use client";
/**
 * Owner t985u (draft B picked): GLD / SLV / BTC / ETH status mini table in the members header.
 * Data: /api/members/chart/<KEY> (precomputed public/_chartdata JSON — daily bars `b` + marks `m`).
 * Status: close vs SMA20 & SMA50 → above both BULL, below both BEAR, else MIXED.
 * A bullish mark (fish/fairy/smile/mfi) in the last 10 sessions turns BEAR → MIXED;
 * a bearish mark (sweat/skull) in the last 10 sessions turns BULL → MIXED.
 */
import { useEffect, useState } from "react";
import { TickerLink } from "@/components/TickerChartLightbox";

const ASSETS: [string, string][] = [["GLD", "GLD"], ["SLV", "SLV"], ["BTC", "BTCUSD"], ["ETH", "ETHUSD"]];
const EMOJI: Record<string, [string, boolean]> = {
  fish: ["🐟", true], fairy: ["🧚", true], smile: ["😊", true], mfi: ["💵", true],
  sweat: ["😰", false], skull: ["💀", false],
};
type Mark = { e: string; bull: boolean; age: number };
type Row = { label: string; key: string; status: "BULL" | "BEAR" | "MIXED"; marks: Mark[]; asOf: string };
type Chart = { asOf: string; b: number[][]; m: [number, string][] };

function compute(label: string, key: string, c: Chart): Row | null {
  const b = c.b; if (!b?.length) return null;
  const cl = b.map((x) => x[4]); const last = cl[cl.length - 1];
  const sma = (n: number) => cl.slice(-n).reduce((a, x) => a + x, 0) / Math.min(n, cl.length);
  const above20 = last > sma(20), above50 = last > sma(50);
  let status: Row["status"] = above20 && above50 ? "BULL" : !above20 && !above50 ? "BEAR" : "MIXED";
  const idx = new Map(b.map((x, i) => [x[0], i]));
  const marks: Mark[] = [];
  for (let k = (c.m || []).length - 1; k >= 0 && marks.length < 2; k--) {
    const [d, name] = c.m[k]; const em = EMOJI[name]; const i = idx.get(d);
    if (!em || i === undefined) continue;
    marks.push({ e: em[0], bull: em[1], age: b.length - 1 - i });
  }
  const recent = marks.filter((m) => m.age <= 10);
  if (status === "BEAR" && recent.some((m) => m.bull)) status = "MIXED";
  if (status === "BULL" && recent.some((m) => !m.bull)) status = "MIXED";
  return { label, key, status, marks, asOf: c.asOf };
}

const PILL = { BULL: "border-green-500 text-green-500", BEAR: "border-red-500 text-red-500", MIXED: "border-canary-gold text-canary-gold" };
const fmtAsOf = (s: string) => new Date(s + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function AssetStatusStrip() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    Promise.all(ASSETS.map(([l, k]) => fetch(`/api/members/chart/${k}`).then((r) => (r.ok ? r.json() : null)).then((c) => (c ? compute(l, k, c) : null)).catch(() => null)))
      .then((r) => setRows(r.filter(Boolean) as Row[]));
  }, []);
  if (!rows?.length) return null;
  const asOf = rows.map((r) => r.asOf).sort().pop()!;
  return (
    <div className="w-full">
      <div className="mb-1 text-[10px] font-bold tracking-[0.12em] text-canary-gold">
        GOLD · SILVER · CRYPTO <span className="font-normal tracking-normal text-slate-500">· as of {fmtAsOf(asOf)}</span>
      </div>
      <div className="rounded-lg border border-[#1d2a44] bg-[#0b1428] px-2.5 mt-1.5 py-1 text-xs">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[40px_64px_1fr] items-center border-b border-[#15203a] py-[3px] last:border-0">
            <TickerLink ticker={r.key} noStar className="text-left font-bold tracking-wide text-white">
              {r.label}
            </TickerLink>
            <span className={`mr-2 rounded-full border text-center text-[10px] font-bold ${PILL[r.status]}`}>{r.status}</span>
            <span className="flex gap-2.5">
              {r.marks.map((m, i) => (
                <span key={i} className={m.bull ? "text-green-500" : "text-red-500"}>{m.e} {m.age === 0 ? "today" : `${m.age}d`}</span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
