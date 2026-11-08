import { NextResponse } from "next/server";
import { cleanTicker, currentMember, nowSec } from "@/lib/members/watchlist";

// DRAFT (owner t959u 2026-11-02): per-ticker alert prefs for My Stocks. Needs migration 0011.
// 503 "not_migrated" when the table is missing → client falls back to this-device storage.
export const dynamic = "force-dynamic";
const ALLOWED = new Set(["fish", "cci_fairy", "mfi_os", "smile", "sweaty", "skull", "any"]);
const noAuth = () => NextResponse.json({ error: "not_signed_in" }, { status: 401 });
const notMigrated = () => NextResponse.json({ error: "not_migrated" }, { status: 503 });

export async function GET() {
  const m = await currentMember();
  if (!m) return noAuth();
  try {
    const r = await m.db.prepare("SELECT ticker, conds FROM member_ticker_alerts WHERE user_id = ?").bind(m.user.id).all<{ ticker: string; conds: string }>();
    const prefs: Record<string, string[]> = {};
    for (const x of r.results ?? []) prefs[x.ticker.toUpperCase()] = x.conds.split(",").filter((c) => ALLOWED.has(c));
    return NextResponse.json({ prefs });
  } catch { return notMigrated(); }
}
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m) return noAuth();
  const body = await req.json().catch(() => ({}));
  const t = cleanTicker(body.ticker);
  if (!t) return NextResponse.json({ error: "bad_ticker" }, { status: 400 });
  const conds = Array.isArray(body.conds) ? [...new Set(body.conds.map(String).filter((c: string) => ALLOWED.has(c)))] : [];
  try {
    if (!conds.length) await m.db.prepare("DELETE FROM member_ticker_alerts WHERE user_id = ? AND ticker = ?").bind(m.user.id, t).run();
    else await m.db.prepare("INSERT INTO member_ticker_alerts (user_id, ticker, conds, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, ticker) DO UPDATE SET conds = excluded.conds, updated_at = excluded.updated_at").bind(m.user.id, t, conds.includes("any") ? "any" : conds.join(","), nowSec()).run();
    return NextResponse.json({ ok: true, ticker: t, conds });
  } catch { return notMigrated(); }
}
