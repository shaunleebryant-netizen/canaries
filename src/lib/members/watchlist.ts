import { getMembersDb, nowSec } from "./db";
import { getCurrentUser } from "./session";

export const ALERT_MODES = ["instant", "daily", "off"] as const;
export type AlertMode = (typeof ALERT_MODES)[number];
export const MAX_WATCHLIST = 50;
export const cleanTicker = (t: unknown) => {
  const s = String(t ?? "").trim().toUpperCase();
  return /^[A-Z0-9.\-^=]{1,12}$/.test(s) ? s : null;
};
export async function currentMember() {
  const cur = await getCurrentUser().catch(() => null);
  return cur ? { db: await getMembersDb(), user: cur.user } : null;
}
export async function getAlertMode(db: Awaited<ReturnType<typeof getMembersDb>>, userId: string): Promise<AlertMode | null> {
  // null = table not migrated yet (remote D1 0010 pending) → account page hides the toggle.
  try {
    const r = await db.prepare("SELECT mode FROM member_alert_prefs WHERE user_id = ?").bind(userId).first<{ mode: AlertMode }>();
    return r?.mode ?? "daily";
  } catch { return null; }
}
export { nowSec };
