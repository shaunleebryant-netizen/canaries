/**
 * Members-only Signal History (owner approved 2026-10-07; live History tab). Reads data/signal-history.json
 * (scripts/update-signal-history.mjs, run by the post-close pack) (no "in a box" join — owner t567u).
 * Bullish marks only: 🐟 fish · 🙂 smile (washout) · 💵 MFI washout. Never invent rows.
 * PRIVATE: members pages only. Do not import from a public route.
 */
import historyJson from "../../data/signal-history.json";
import type { HistoryGroup, HistoryKind, SignalHistoryPayload } from "@/lib/signalHistoryShared";

export type { HistoryGroup, HistoryKind, SignalHistoryPayload, SignalHistoryRow } from "@/lib/signalHistoryShared";

type RawRow = { d: string; t: string; k: string; g: string; p: number };
type RawTicker = { name?: string | null; g?: string; last?: number; lastAsOf?: string; removed?: boolean };
type RawFile = {
  asOf?: string;
  windowStart?: string;
  sessions?: number;
  rows?: RawRow[];
  tickers?: Record<string, RawTicker>;
};

const KIND_LETTER: Record<HistoryKind, string> = { fish: "f", smile: "s", mfi: "m" };
const GROUPS: HistoryGroup[] = ["stock", "sector", "country", "crypto"];

export function loadSignalHistory(countryNames: Record<string, string> = {}): SignalHistoryPayload {
  const raw = historyJson as unknown as RawFile;
  const meta = raw.tickers ?? {};
  const byKey = new Map<string, [string, string, string, number]>();
  const groupOf = new Map<string, HistoryGroup>();
  let markCount = 0;
  for (const r of raw.rows ?? []) {
    if (!r || typeof r.d !== "string" || typeof r.t !== "string") continue;
    const k = r.k as HistoryKind;
    if (!KIND_LETTER[k] || !Number.isFinite(r.p)) continue;
    markCount++;
    if (!groupOf.has(r.t)) groupOf.set(r.t, (GROUPS.includes(r.g as HistoryGroup) ? r.g : "stock") as HistoryGroup);
    const key = `${r.d}|${r.t}`;
    const row = byKey.get(key);
    if (!row) byKey.set(key, [r.d, r.t, KIND_LETTER[k], r.p]);
    else if (!row[2].includes(KIND_LETTER[k])) row[2] += KIND_LETTER[k];
  }
  const rows = [...byKey.values()];
  rows.forEach((r) => (r[2] = [...r[2]].sort((a, b) => "fsm".indexOf(a) - "fsm".indexOf(b)).join("")));
  rows.sort((a, b) => (a[0] !== b[0] ? (a[0] < b[0] ? 1 : -1) : a[1].localeCompare(b[1])));
  const tickers: SignalHistoryPayload["tickers"] = {};
  for (const [t, g] of groupOf) {
    const m = meta[t] ?? {};
    const name = g === "country" ? countryNames[t] ?? m.name ?? null : m.name ?? null;
    tickers[t] = [
      name,
      g,
      Number.isFinite(m.last) ? (m.last as number) : null,
      m.lastAsOf ?? null,
      m.removed ? 1 : 0,
    ];
  }
  return {
    asOf: raw.asOf ?? null,
    windowStart: raw.windowStart ?? null,
    sessions: raw.sessions ?? 0,
    markCount,
    rows,
    tickers,
  };
}

