/**
 * Members Commentary bullets — loaded from data/commentary.json.
 * Regenerated on full-pack refresh; never invents Decide S.
 */

import commentaryJson from "../../data/commentary.json";

export interface CommentaryPayload {
  asOf: string | null;
  generatedAt: string | null;
  headline: string;
  paragraphs: string[];
  whatToDo: string[];
  note?: string;
}

type CommentaryFile = Partial<CommentaryPayload> & {
  sessionDate?: string | null;
};

const FALLBACK: CommentaryPayload = {
  asOf: null,
  generatedAt: null,
  headline: "Commentary pending — refresh full pack",
  paragraphs: [
    "No commentary.json yet. Run full-pack (or scripts/refresh-commentary.mjs) after Decide/liquidity are current.",
  ],
  whatToDo: ["Await pack refresh — education only."],
  note: "fallback",
};

export function loadCommentary(): CommentaryPayload {
  const raw = commentaryJson as CommentaryFile;
  const headline =
    typeof raw.headline === "string" && raw.headline.trim()
      ? raw.headline.trim()
      : FALLBACK.headline;
  const paragraphs = Array.isArray(raw.paragraphs)
    ? raw.paragraphs.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : [];
  const whatToDo = Array.isArray(raw.whatToDo)
    ? raw.whatToDo.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    : [];
  return {
    asOf:
      typeof raw.asOf === "string"
        ? raw.asOf
        : typeof raw.sessionDate === "string"
          ? raw.sessionDate
          : null,
    generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : null,
    headline,
    paragraphs: paragraphs.length ? paragraphs : FALLBACK.paragraphs,
    whatToDo: whatToDo.length ? whatToDo : FALLBACK.whatToDo,
    note: typeof raw.note === "string" ? raw.note : undefined,
  };
}
