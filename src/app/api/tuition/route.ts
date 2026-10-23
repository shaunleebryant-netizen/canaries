import { NextResponse } from "next/server";
import { clean, guardFormPost, isBot, normalizeEmail, saveLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

const OK_MESSAGE =
  "Request saved. No charge and no email have been sent. Shaun will confirm your session by email.";

/**
 * Tuition request -> D1 `leads` (consent 0: not on the letter list) + `lead_submissions`
 * (all answers in payload). Does NOT charge or send email.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const guard = await guardFormPost(request, "tuition", 3);
  if ("error" in guard) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  if (isBot(body)) return NextResponse.json({ ok: true, message: OK_MESSAGE });

  const fullName = clean(body.fullName, 100);
  const email = normalizeEmail(body.email) ?? "";
  const mobile = clean(body.mobile, 40);
  const timezone = clean(body.timezone, 500);
  const experience = clean(body.experience, 500);
  const level = clean(body.level, 500);
  const markets = Array.isArray(body.markets) ? body.markets.slice(0, 20).map((v) => clean(v, 60)) : [];
  const accountSize = clean(body.accountSize, 500);
  const primaryGoal = clean(body.primaryGoal, 500);
  const preferredDays = Array.isArray(body.preferredDays)
    ? body.preferredDays.slice(0, 14).map((v) => clean(v, 40))
    : [];
  const timeWindows = Array.isArray(body.timeWindows) ? body.timeWindows.slice(0, 14).map((v) => clean(v, 60)) : [];
  const consent = Boolean(body.consent);

  if (!fullName || !email.includes("@") || !mobile) {
    return NextResponse.json(
      { ok: false, error: "Name, valid email, and mobile are required" },
      { status: 400 }
    );
  }
  if (
    !timezone ||
    !experience ||
    !level ||
    !accountSize ||
    !primaryGoal ||
    !markets.length ||
    !preferredDays.length ||
    !timeWindows.length ||
    !consent
  ) {
    return NextResponse.json(
      { ok: false, error: "Please complete all required fields and consent" },
      { status: 400 }
    );
  }

  const entry = {
    fullName,
    email,
    mobile,
    timezone,
    experience,
    level,
    markets,
    accountSize,
    primaryGoal,
    goalDetail: clean(body.goalDetail, 1000) || undefined,
    preferredDays,
    timeWindows,
    videoPlatform: clean(body.videoPlatform, 500) || undefined,
    isMember: clean(body.isMember, 500) || undefined,
    hearAbout: clean(body.hearAbout, 500) || undefined,
    consent,
    notes: clean(body.notes, 2000) || undefined,
    source: "tuition",
    priceNote: "$120 USD/hr — no charge until owner confirms",
    at: new Date().toISOString(),
  };

  const { email: _email, fullName: _name, ...payload } = entry;
  void _email;
  void _name;
  await saveLead(guard.db, {
    email,
    name: fullName,
    source: "tuition",
    tags: ["tuition"],
    consent: false,
    payload,
    ipH: guard.ipH,
  });

  return NextResponse.json({ ok: true, message: OK_MESSAGE });
}
