/**
 * Dated Canary composite readings.
 * S and the light are taken from pack logs that already record both.
 * A date with two different recorded values is unknown — we do not pick one.
 * A date with no record is unknown. Today's light is never copied onto older dates.
 *
 * Bands match src/lib/composite.ts trafficLightFor (green S >= 0.6, amber S >= -0.3, else red).
 * The pack's own light word is what we store. Amber is the product's yellow band.
 */

export type CompositeColour = "green" | "amber" | "red";

export interface CompositePoint {
  date: string;
  S: number;
  light: CompositeColour;
}

export interface CompositeArchive {
  /** Ascending by date. Conflicting dates are omitted. */
  points: CompositePoint[];
  /** Dates whose pack log disagrees with itself. */
  conflicts: string[];
  source: string;
}

const NOTE_RE =
  /^(\d{4}-\d{2}-\d{2}) scripted Decide\b.*?S=(-?\d+(?:\.\d+)?) (RED|AMBER|GREEN)\b/;

export function colourWord(raw: string): CompositeColour | null {
  const k = raw.trim().toLowerCase();
  if (k === "green") return "green";
  if (k === "amber" || k === "yellow") return "amber";
  if (k === "red") return "red";
  return null;
}

/** Parse `state.json` notes. First-class input for tests. Does not invent missing sessions. */
export function archiveFromNotes(notes: readonly string[], source = "pack log notes"): CompositeArchive {
  const buckets = new Map<string, CompositePoint[]>();
  for (const line of notes) {
    const m = NOTE_RE.exec(line);
    if (!m) continue;
    const light = colourWord(m[3]);
    const S = Number(m[2]);
    if (!light || !Number.isFinite(S)) continue;
    const row: CompositePoint = { date: m[1], S, light };
    const list = buckets.get(row.date) ?? [];
    list.push(row);
    buckets.set(row.date, list);
  }
  return finishArchive(buckets, source);
}

export function archiveFromPoints(
  points: readonly CompositePoint[],
  source: string,
): CompositeArchive {
  const buckets = new Map<string, CompositePoint[]>();
  for (const p of points) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !Number.isFinite(p.S)) continue;
    const list = buckets.get(p.date) ?? [];
    list.push(p);
    buckets.set(p.date, list);
  }
  return finishArchive(buckets, source);
}

function finishArchive(buckets: Map<string, CompositePoint[]>, source: string): CompositeArchive {
  const points: CompositePoint[] = [];
  const conflicts: string[] = [];
  for (const [date, rows] of buckets) {
    const same = rows.every((r) => r.S === rows[0].S && r.light === rows[0].light);
    if (!same) conflicts.push(date);
    else points.push(rows[0]);
  }
  points.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  conflicts.sort();
  return { points, conflicts, source };
}

export function colourOn(archive: CompositeArchive, ymd: string): CompositeColour | "unknown" {
  const day = ymd.slice(0, 10);
  if (archive.conflicts.includes(day)) return "unknown";
  const hit = archive.points.find((p) => p.date === day);
  return hit ? hit.light : "unknown";
}

export function archiveSpan(archive: CompositeArchive): { from: string | null; to: string | null } {
  if (!archive.points.length) return { from: null, to: null };
  return { from: archive.points[0].date, to: archive.points[archive.points.length - 1].date };
}
