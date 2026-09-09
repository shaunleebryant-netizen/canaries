import { NextResponse } from "next/server";
import { appendFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Tuition lead stub — stores locally / logs. Does NOT charge or send email.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim();
  const mobile = String(body.mobile || "").trim();
  const timezone = String(body.timezone || "").trim();
  const experience = String(body.experience || "").trim();
  const level = String(body.level || "").trim();
  const markets = Array.isArray(body.markets) ? body.markets.map(String) : [];
  const accountSize = String(body.accountSize || "").trim();
  const primaryGoal = String(body.primaryGoal || "").trim();
  const preferredDays = Array.isArray(body.preferredDays)
    ? body.preferredDays.map(String)
    : [];
  const timeWindows = Array.isArray(body.timeWindows) ? body.timeWindows.map(String) : [];
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
    goalDetail: String(body.goalDetail || "").trim() || undefined,
    preferredDays,
    timeWindows,
    videoPlatform: String(body.videoPlatform || "").trim() || undefined,
    isMember: String(body.isMember || "").trim() || undefined,
    hearAbout: String(body.hearAbout || "").trim() || undefined,
    consent,
    notes: String(body.notes || "").trim() || undefined,
    source: "tuition",
    priceNote: "S$115/hr — no charge until owner confirms",
    at: new Date().toISOString(),
    stub: "no charge · no email sent",
  };

  console.log("[tuition-stub]", entry);

  const dir = path.join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(
    path.join(dir, "tuition-leads.json"),
    JSON.stringify(entry) + "\n",
    "utf8"
  );

  return NextResponse.json({
    ok: true,
    message:
      "Request saved locally (stub). No charge and no email were sent — Shaun will confirm seats.",
  });
}
