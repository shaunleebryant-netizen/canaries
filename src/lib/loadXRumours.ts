/**
 * X Rumours (owner approved 2026-10-10; ships with the Tue 11:24 AM NZ post-close update).
 * Members dashboard only. Built by scripts/x-rumours-ingest.mjs (docs/ops/x-rumours-refresh.md):
 * named-outlet or party-sourced deal/activist/financing/... stories on universe stocks, written in
 * our own words and linking out. No post text is embedded. Rumours aren't facts. Education only.
 */
import xJson from "../../data/x-rumours.json";

export type XRumourStatus = "Reported" | "Confirmed" | "Denied";

export interface XRumourRow {
  key: string;
  ticker: string;
  type: string;
  line: string;
  source: string;
  link: string;
  firstSeenAt: string;
  firstSeen: string;
  lastUpdate: string;
  status: XRumourStatus;
  statusNote?: string | null;
  /** Dispute/denial by a party other than the row's own company (status unchanged), shown under the line. */
  note?: string | null;
  sec?: { form: string; date: string; items?: string; url: string } | null;
  refDate?: string | null;
  refClose?: number | null;
  lastDate?: string | null;
  lastClose?: number | null;
  movePct?: number | null;
}

type XFile = { asOf?: string | null; expirySessions?: number; rows?: unknown[]; counts?: { filteredTonight?: number } };

const STATUSES = new Set(["Reported", "Confirmed", "Denied"]);

function isRow(r: unknown): r is XRumourRow {
  if (!r || typeof r !== "object") return false;
  const x = r as XRumourRow;
  return (
    typeof x.ticker === "string" &&
    typeof x.line === "string" &&
    typeof x.link === "string" &&
    /^https:\/\//.test(x.link) &&
    typeof x.firstSeen === "string" &&
    STATUSES.has(x.status)
  );
}

export function loadXRumours(): { asOf: string | null; expirySessions: number; filtered: number; rows: XRumourRow[] } {
  const raw = xJson as XFile;
  const rows = (Array.isArray(raw?.rows) ? raw.rows : []).filter(isRow);
  // Newest first seen at the top.
  rows.sort((a, b) => (a.firstSeenAt < b.firstSeenAt ? 1 : a.firstSeenAt > b.firstSeenAt ? -1 : a.ticker.localeCompare(b.ticker)));
  return {
    asOf: typeof raw?.asOf === "string" ? raw.asOf : null,
    expirySessions: typeof raw?.expirySessions === "number" ? raw.expirySessions : 10,
    filtered: typeof raw?.counts?.filteredTonight === "number" ? raw.counts.filteredTonight : 0,
    rows,
  };
}
