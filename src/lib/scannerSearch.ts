/**
 * Membership search for the stocks already listed in the current scanners.
 * It does not read history and it does not look up a symbol that is not supplied here.
 */
export type ScannerRow = { ticker: string; name?: string | null };
export type ScannerGroupInput = { id: string; label: string; rows: readonly ScannerRow[] };

export type ScannerHit = {
  ticker: string;
  name: string | null;
  groups: { id: string; label: string }[];
};

export type ScannerSearchResult = {
  query: string;
  hits: ScannerHit[];
  groupCounts: { id: string; label: string; count: number }[];
  /** Curated names that match the query but are not in a current scanner. */
  curatedOnly: { ticker: string; name: string | null }[];
  outsideCuratedList: boolean;
};

function norm(value: string): string {
  return value.trim().toLowerCase();
}

function matches(ticker: string, name: string | null | undefined, needle: string): boolean {
  if (!needle) return false;
  if (ticker.toLowerCase().includes(needle)) return true;
  return Boolean(name && name.toLowerCase().includes(needle));
}

export function searchScannerMembership(
  groups: readonly ScannerGroupInput[],
  universe: readonly ScannerRow[],
  rawQuery: string,
): ScannerSearchResult {
  const query = rawQuery.trim();
  const needle = norm(query);
  const empty = { query, hits: [], groupCounts: [], curatedOnly: [], outsideCuratedList: false };
  if (!needle) return empty;

  const names = new Map<string, string | null>();
  for (const row of universe) {
    const ticker = row.ticker.trim().toUpperCase();
    if (!ticker || names.has(ticker)) continue;
    names.set(ticker, row.name?.trim() || null);
  }

  const byTicker = new Map<string, ScannerHit>();
  const groupCounts: ScannerSearchResult["groupCounts"] = [];
  for (const group of groups) {
    const seen = new Set<string>();
    let count = 0;
    for (const row of group.rows) {
      const ticker = row.ticker.trim().toUpperCase();
      if (!ticker || seen.has(ticker)) continue;
      const name = row.name?.trim() || names.get(ticker) || null;
      if (!matches(ticker, name, needle)) continue;
      seen.add(ticker);
      count += 1;
      const hit = byTicker.get(ticker) ?? { ticker, name, groups: [] };
      if (!hit.name && name) hit.name = name;
      hit.groups.push({ id: group.id, label: group.label });
      byTicker.set(ticker, hit);
    }
    if (count) groupCounts.push({ id: group.id, label: group.label, count });
  }

  const hits = [...byTicker.values()].sort((a, b) => a.ticker.localeCompare(b.ticker));
  if (hits.length) return { query, hits, groupCounts, curatedOnly: [], outsideCuratedList: false };

  const curatedOnly: ScannerSearchResult["curatedOnly"] = [];
  const seen = new Set<string>();
  for (const [ticker, name] of names) {
    if (seen.has(ticker) || !matches(ticker, name, needle)) continue;
    seen.add(ticker);
    curatedOnly.push({ ticker, name });
  }
  curatedOnly.sort((a, b) => a.ticker.localeCompare(b.ticker));
  return {
    query,
    hits,
    groupCounts,
    curatedOnly: curatedOnly.slice(0, 8),
    outsideCuratedList: curatedOnly.length === 0,
  };
}
