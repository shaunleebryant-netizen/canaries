import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { parseFreeSignup, previewTierEnabled, unsubscribeEmail, type ConsentRecord } from "@/lib/members/previewTier";

const FILE = path.join(process.cwd(), "data", "preview-consents.json");

/** Records an opt-out locally. Never sends mail. */
export async function POST(request: Request) {
  if (!previewTierEnabled()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = parseFreeSignup(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  let rows: ConsentRecord[] = [];
  try {
    rows = JSON.parse(await readFile(FILE, "utf8")) as ConsentRecord[];
  } catch {
    rows = [];
  }
  const next = unsubscribeEmail(rows, parsed.email, new Date().toISOString());
  await writeFile(FILE, JSON.stringify(next, null, 2));
  return NextResponse.json({ ok: true, sent: false });
}
