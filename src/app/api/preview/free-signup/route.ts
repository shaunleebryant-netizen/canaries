import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  PREVIEW_TIER_COOKIE,
  applyConsent,
  parseFreeSignup,
  previewTierEnabled,
  signPreviewTier,
  type ConsentRecord,
} from "@/lib/members/previewTier";

const FILE = path.join(process.cwd(), "data", "preview-consents.json");

async function readRows(): Promise<ConsentRecord[]> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as ConsentRecord[];
  } catch {
    return [];
  }
}

/** Preview-only free account. Does not email, charge, or write the members database. */
export async function POST(request: Request) {
  if (!previewTierEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = parseFreeSignup(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const rows = applyConsent(await readRows(), parsed.email, parsed.marketing, new Date().toISOString());
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(rows, null, 2));
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14;
  const token = await signPreviewTier({ tier: "free", email: parsed.email, exp });
  const res = NextResponse.json({ ok: true, sent: false, tier: "free" });
  res.cookies.set(PREVIEW_TIER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
