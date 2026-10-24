import { NextResponse } from "next/server";
import { ALERT_MODES, type AlertMode, currentMember, getAlertMode, nowSec } from "@/lib/members/watchlist";

export const dynamic = "force-dynamic";
export async function GET() {
  const m = await currentMember();
  if (!m) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  return NextResponse.json({ mode: await getAlertMode(m.db, m.user.id) });
}
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  const mode = (await req.json().catch(() => ({}))).mode as AlertMode;
  if (!ALERT_MODES.includes(mode)) return NextResponse.json({ error: "bad_mode" }, { status: 400 });
  await m.db.prepare("INSERT INTO member_alert_prefs (user_id, mode, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET mode = excluded.mode, updated_at = excluded.updated_at").bind(m.user.id, mode, nowSec()).run();
  return NextResponse.json({ ok: true, mode });
}
