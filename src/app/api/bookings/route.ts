import { NextResponse } from "next/server";
import { clean, guardFormPost, isBot, normalizeEmail } from "@/lib/leads";
import { nowSec } from "@/lib/members/db";

export const dynamic = "force-dynamic";

const OK_MESSAGE =
  "Thanks — your booking request is saved. Shaun will reply by email to confirm a time. No payment is taken now.";

const TOPICS = ["Canaries", "Indicators", "Other"] as const;

/**
 * Booking request (owner approved 2026-10-09, t595u) -> D1 `bookings`
 * (migrations/members/0007_bookings.sql). One row per submission. Does NOT charge and does NOT
 * send email (EMAIL_SENDING stays off); the daily Drive sync exports the table.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const guard = await guardFormPost(request, "bookings", 5);
  if ("error" in guard) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  if (isBot(body)) return NextResponse.json({ ok: true, message: OK_MESSAGE });

  const type = body.type === "speaking" ? "speaking" : body.type === "class" ? "class" : "";
  const name = clean(body.name, 100);
  const email = normalizeEmail(body.email) ?? "";
  const timezone = clean(body.timezone, 80);
  const preferredTimes = clean(body.preferredTimes, 500);
  const message = clean(body.message, 2000);
  const topicRaw = clean(body.topic, 40);
  const topic = (TOPICS as readonly string[]).includes(topicRaw) ? topicRaw : "";
  const organisation = clean(body.organisation, 150);
  const eventName = clean(body.eventName, 150);
  const eventDate = clean(body.eventDate, 40);
  const eventLocation = clean(body.eventLocation, 120);
  const audienceSize = clean(body.audienceSize, 40);
  const origin = body.origin === "members" ? "members" : "bookings";

  if (!type) {
    return NextResponse.json({ ok: false, error: "Please choose a booking type" }, { status: 400 });
  }
  if (!name || !email) {
    return NextResponse.json({ ok: false, error: "Name and a valid email are required" }, { status: 400 });
  }
  if (!preferredTimes) {
    return NextResponse.json({ ok: false, error: "Please add your preferred dates or times" }, { status: 400 });
  }
  if (type === "class" && !topic) {
    return NextResponse.json({ ok: false, error: "Please choose a topic" }, { status: 400 });
  }
  if (type === "speaking" && (!organisation || !eventName || !eventLocation)) {
    return NextResponse.json(
      { ok: false, error: "Please add your organisation, event name and city (or Online)" },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const now = nowSec();
  const speaking = type === "speaking";
  await guard.db
    .prepare(
      "INSERT INTO bookings (id, booking_type, name, email, timezone, preferred_times, message, topic, " +
        "organisation, event_name, event_date, event_location, audience_size, origin, status, ip_hash, created_at, updated_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)",
    )
    .bind(
      id,
      type,
      name,
      email,
      timezone || null,
      preferredTimes,
      message || null,
      speaking ? null : topic,
      speaking ? organisation : null,
      speaking ? eventName : null,
      speaking ? eventDate || null : null,
      speaking ? eventLocation : null,
      speaking ? audienceSize || null : null,
      origin,
      guard.ipH,
      now,
      now,
    )
    .run();
  console.log(`[bookings] saved type=${type} origin=${origin} id=${id.slice(0, 8)}`);

  return NextResponse.json({ ok: true, message: OK_MESSAGE, ref: id.slice(0, 8) });
}
