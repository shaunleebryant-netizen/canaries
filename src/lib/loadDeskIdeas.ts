/**
 * Desk Ideas (revived 2026-10-09, owner decision after t597u) — members dashboard only, never the
 * homepage. Third-party stock ideas from a short list of X accounts, refreshed by the agent after the
 * post-close pack (docs/ops/desk-ideas-refresh.md → scripts/desk-ideas-ingest.mjs). Not a Canary
 * signal and not a Main Scanner condition. Education only. Never invent ideas.
 */
import deskJson from "../../data/desk-ideas.json";

export type DeskAction = "add" | "buy" | "long" | "trim" | "sell";

export interface DeskIdeaItem {
  id: string;
  handle: string;
  ticker: string;
  action: DeskAction;
  idea: string;
  postedAt: string;
  url: string;
  inUniverse?: boolean;
}

type DeskFile = { asOf?: string; windowDays?: number; ideas?: unknown[] };

function isItem(r: unknown): r is DeskIdeaItem {
  if (!r || typeof r !== "object") return false;
  const x = r as DeskIdeaItem;
  return (
    typeof x.id === "string" &&
    typeof x.handle === "string" &&
    typeof x.ticker === "string" &&
    typeof x.idea === "string" &&
    typeof x.postedAt === "string" &&
    typeof x.url === "string" &&
    /^https:\/\/x\.com\//.test(x.url)
  );
}

/** Items posted within `windowDays` of the pack session (newest first) + the file's as-of. */
export function loadDeskIdeas(packSession: string): { asOf: string | null; windowDays: number; ideas: DeskIdeaItem[] } {
  const raw = deskJson as DeskFile;
  const windowDays = typeof raw.windowDays === "number" ? raw.windowDays : 7;
  const ref = /^\d{4}-\d{2}-\d{2}$/.test(packSession) ? Date.parse(`${packSession}T23:59:59Z`) : Date.now();
  const from = ref - windowDays * 86400000;
  const ideas = (Array.isArray(raw.ideas) ? raw.ideas : [])
    .filter(isItem)
    .filter((i) => {
      const t = Date.parse(i.postedAt);
      return Number.isFinite(t) && t >= from;
    })
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt));
  return { asOf: typeof raw.asOf === "string" ? raw.asOf : null, windowDays, ideas };
}
