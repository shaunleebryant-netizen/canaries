import { NextResponse } from "next/server";
import { MAX_WATCHLIST, cleanTicker, currentMember, nowSec } from "@/lib/members/watchlist";

export const dynamic = "force-dynamic";
const noAuth = () => NextResponse.json({ error: "not_signed_in" }, { status: 401 });

export async function GET() {
  const m = await currentMember();
  if (!m) return noAuth();
  const r = await m.db.prepare("SELECT ticker, created_at FROM member_watchlist WHERE user_id = ? ORDER BY created_at DESC").bind(m.user.id).all<{ ticker: string; created_at: number }>();
  return NextResponse.json({ tickers: (r.results ?? []).map((x) => x.ticker) });
}
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m) return noAuth();
  const t = cleanTicker((await req.json().catch(() => ({}))).ticker);
  if (!t) return NextResponse.json({ error: "bad_ticker" }, { status: 400 });
  const n = await m.db.prepare("SELECT COUNT(*) AS n FROM member_watchlist WHERE user_id = ?").bind(m.user.id).first<{ n: number }>();
  if ((n?.n ?? 0) >= MAX_WATCHLIST) return NextResponse.json({ error: "watchlist_full" }, { status: 400 });
  await m.db.prepare("INSERT OR IGNORE INTO member_watchlist (user_id, ticker, created_at) VALUES (?, ?, ?)").bind(m.user.id, t, nowSec()).run();
  return NextResponse.json({ ok: true, ticker: t });
}
export async function DELETE(req: Request) {
  const m = await currentMember();
  if (!m) return noAuth();
  const t = cleanTicker(new URL(req.url).searchParams.get("ticker"));
  if (!t) return NextResponse.json({ error: "bad_ticker" }, { status: 400 });
  await m.db.prepare("DELETE FROM member_watchlist WHERE user_id = ? AND ticker = ?").bind(m.user.id, t).run();
  return NextResponse.json({ ok: true });
}
