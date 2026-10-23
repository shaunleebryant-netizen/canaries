import { NextResponse } from "next/server";
import { clean, guardFormPost, isBot, normalizeEmail, saveLead } from "@/lib/leads";
import { notifySupport } from "@/lib/email/supportNotify";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["login", "billing", "dashboard", "other"]);
const OK_MESSAGE = "Thanks, your message has been sent. We'll reply to the address you gave.";

/**
 * Support request -> D1 `support_requests` (one row per submission; CSV export for Drive via
 * scripts/export-support.mjs) + `leads`/`lead_submissions` (consent 0: not on the letter list),
 * then an owner notification email (SUPPORT_NOTIFY, Resend). Honeypot + same-origin +
 * 10 per 10 min per IP (same as the letter form).
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const guard = await guardFormPost(request, "support", 10);
  if ("error" in guard) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  if (isBot(body)) return NextResponse.json({ ok: true, message: OK_MESSAGE });

  const name = clean(body.name, 100);
  const email = normalizeEmail(body.email);
  const issueType = clean(body.issueType, 20).toLowerCase() || "other";
  const message = clean(body.message, 5000);

  if (!name) return NextResponse.json({ ok: false, error: "Name required" }, { status: 400 });
  if (!email) return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
  if (!ALLOWED.has(issueType)) {
    return NextResponse.json({ ok: false, error: "Invalid issue type" }, { status: 400 });
  }
  if (message.length < 3) return NextResponse.json({ ok: false, error: "Message required" }, { status: 400 });

  const createdAt = Math.floor(Date.now() / 1000);
  const row = await guard.db
    .prepare(
      "INSERT INTO support_requests (created_at, name, email, issue_type, message, ip_hash) VALUES (?, ?, ?, ?, ?, ?) RETURNING id",
    )
    .bind(createdAt, name, email, issueType, message, guard.ipH)
    .first<{ id: number }>();
  const rowId = row?.id ?? null;

  await saveLead(guard.db, {
    email,
    name,
    source: "support",
    tags: ["support"],
    consent: false,
    payload: { issueType, message },
    ipH: guard.ipH,
  });

  const notify = await notifySupport({ name, email, issueType, message, rowId });
  if (rowId !== null) {
    await guard.db
      .prepare("UPDATE support_requests SET notify_status = ?, notify_id = ?, notify_error = ? WHERE id = ?")
      .bind(notify.status, notify.id ?? null, notify.error ?? null, rowId)
      .run();
  }
  console.log(`[support] saved #${rowId} notify=${notify.status}${notify.error ? ` (${notify.error})` : ""}`);
  return NextResponse.json({ ok: true, message: OK_MESSAGE });
}
