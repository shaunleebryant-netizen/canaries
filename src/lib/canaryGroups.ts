/**
 * Display groups for the 13 macro canaries on the Canaries tab.
 * Order and membership only. Scores, weights, and row values stay on each card.
 */
export const CANARY_GROUPS = [
  {
    id: "breadth",
    title: "Market breadth",
    subtitle: "Is the wider market participating?",
    ids: ["nyse-ad", "pct-above-200dma", "sp600", "rsp"],
  },
  {
    id: "leadership",
    title: "Market leadership",
    subtitle: "What is driving the market?",
    ids: ["cyclical-defensive", "sp-top-50", "qqq-sma20", "es1-jp30"],
  },
  {
    id: "stress",
    title: "Risk & financial stress",
    subtitle: "Are conditions supportive or strained?",
    ids: ["xlf-kre", "vix-vix3m", "vix-vvix", "hyg-ief-sma20", "finra-margin"],
  },
] as const;

export type CanaryGroupId = (typeof CANARY_GROUPS)[number]["id"];

export function canaryGroupIds(): string[] {
  return CANARY_GROUPS.flatMap((group) => [...group.ids]);
}

export function groupCanaryRows<T extends { id: string }>(rows: readonly T[]): {
  sections: { id: CanaryGroupId; title: string; subtitle: string; rows: T[] }[];
  rest: T[];
} {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const used = new Set<string>();
  const sections = CANARY_GROUPS.map((group) => {
    const grouped: T[] = [];
    for (const id of group.ids) {
      const row = byId.get(id);
      if (!row || used.has(id)) continue;
      used.add(id);
      grouped.push(row);
    }
    return { id: group.id, title: group.title, subtitle: group.subtitle, rows: grouped };
  });
  return { sections, rest: rows.filter((row) => !used.has(row.id)) };
}
