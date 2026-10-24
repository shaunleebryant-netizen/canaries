import { NextResponse } from "next/server";
import {
  clean,
  guardFormPost,
  isBot,
  maybeSendVerification,
  normalizeEmail,
  saveLead,
  type LeadTag,
} from "@/lib/leads";

export const dynamic = "force-dynamic";

const OK_MESSAGE =
  "Thanks, you're signed up. Before we send anything we'll email you a link to confirm.";

/**
 * Free weekly letter (+ optional founding-spots alert) and seminar interest.
 * Stores in D1 `leads` as `pending` (double opt-in). Sends nothing unless EMAIL_SENDING=1.
 * Same response whether the address is new or already on the list (no enumeration).
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const ct = request.headers.get("content-type") || "";
    body = ct.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const guard = await guardFormPost(request, "newsletter", 10);
  if ("error" in guard) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  if (isBot(body)) return NextResponse.json({ ok: true, message: OK_MESSAGE });

  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  const rawSource = clean(body.source, 40);
  const source = rawSource === "seminar" || rawSource === "singapore_seminar" ? "seminar" : "letter";
  const truthy = (v: unknown) => v === true || v === "true" || v === "on" || v === "1";
  const consent = truthy(body.consent);
  if (source === "letter" && !consent) {
    return NextResponse.json(
      { ok: false, error: "Please tick the box to confirm you'd like the letter." },
      { status: 400 },
    );
  }
  const tags: LeadTag[] = source === "seminar" ? ["seminar"] : ["letter"];
  if (truthy(body.founding_interest)) tags.push("founding_interest");

  const name = clean(body.name, 100);
  const note = clean(body.note, 1000);
  const lead = await saveLead(guard.db, {
    email,
    name,
    source,
    tags,
    consent,
    payload: note ? { note } : undefined,
    ipH: guard.ipH,
  });
  await maybeSendVerification(guard.db, request, lead, email);
  return NextResponse.json({ ok: true, message: OK_MESSAGE });
}
