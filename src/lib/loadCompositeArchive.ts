/**
 * Composite history available in this checkout.
 * Built only from data/state.json notes plus the current pack composite when
 * it agrees with those notes. The 2026-11-06 live pack was not in the supplied
 * source, so this is not a complete daily archive.
 */
import stateJson from "../../data/state.json";
import {
  archiveFromNotes,
  archiveFromPoints,
  colourWord,
  type CompositeArchive,
  type CompositePoint,
} from "./compositeArchive";

type StateFile = {
  notes?: string[];
  sessionDate?: string;
  composite?: { S?: number; light?: string };
};

let cached: CompositeArchive | null = null;

export function loadCompositeArchive(): CompositeArchive {
  if (cached) return cached;
  const state = stateJson as StateFile;
  const fromNotes = archiveFromNotes(
    state.notes ?? [],
    "data/state.json notes (snapshot pack log, not the 2026-11-06 live pack)",
  );
  const day = typeof state.sessionDate === "string" ? state.sessionDate.slice(0, 10) : "";
  const light = colourWord(String(state.composite?.light ?? ""));
  const S = state.composite?.S;
  if (!day || !light || typeof S !== "number") {
    cached = fromNotes;
    return cached;
  }
  const current: CompositePoint = { date: day, S, light };
  const merged = archiveFromPoints(
    [...fromNotes.points, current],
    fromNotes.source,
  );
  merged.conflicts = [...new Set([...fromNotes.conflicts, ...merged.conflicts])].sort();
  cached = merged;
  return cached;
}
