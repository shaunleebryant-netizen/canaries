/**
 * PRIVATE owner data: the X Rumours audit (items the ingest filtered out tonight and the per-story
 * checks). Import ONLY from server code under src/app/owner/**. Lives in data/private/ (gitignored).
 * Written by scripts/x-rumours-ingest.mjs; a missing file gets a placeholder from
 * scripts/ensure-private-data.mjs before build.
 */
import auditJson from "../../../data/private/x-rumours-audit.json";

export type XRumoursFiltered = { ticker: string; line?: string; why: string; stage: string; link?: string | null };
export type XRumoursCheck = {
  ticker: string;
  type?: string;
  line?: string;
  key?: string;
  passed: string[];
  failed: string[];
  status?: string;
  sec?: { checked?: boolean; match?: { form: string; date: string; url: string } | null; candidates?: number; reason?: string } | null;
};
export type XRumoursAudit = {
  asOf: string | null;
  generatedAt: string | null;
  placeholder?: boolean;
  filtered: XRumoursFiltered[];
  checks: XRumoursCheck[];
};

export function loadOwnerXRumoursAudit(): XRumoursAudit {
  const a = auditJson as Partial<XRumoursAudit> & { placeholder?: boolean };
  return {
    asOf: typeof a.asOf === "string" ? a.asOf : null,
    generatedAt: typeof a.generatedAt === "string" ? a.generatedAt : null,
    placeholder: a.placeholder === true,
    filtered: Array.isArray(a.filtered) ? (a.filtered as XRumoursFiltered[]) : [],
    checks: Array.isArray(a.checks) ? (a.checks as XRumoursCheck[]) : [],
  };
}
