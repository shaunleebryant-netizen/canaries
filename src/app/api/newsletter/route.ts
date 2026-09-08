import { NextResponse } from "next/server";
import { appendFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Lead capture stub (weekly letter + seminar) — stores locally / logs. Does NOT send email.
 */
export async function POST(request: Request) {
  let email = "";
  let name = "";
  let source = "weekly_letter";
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      email = String(body.email || "").trim();
      name = String(body.name || "").trim();
      source = String(body.source || "weekly_letter").trim() || "weekly_letter";
    } else {
      const form = await request.formData();
      email = String(form.get("email") || "").trim();
      name = String(form.get("name") || "").trim();
      source = String(form.get("source") || "weekly_letter").trim() || "weekly_letter";
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
  }

  const entry = {
    email,
    name: name || undefined,
    source,
    at: new Date().toISOString(),
    note: "stub — no email sent",
  };
  console.log("[newsletter-stub]", entry);

  const dir = path.join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = path.join(
    dir,
    source === "singapore_seminar" ? "seminar-signups.json" : "newsletter-signups.json"
  );
  appendFileSync(file, JSON.stringify(entry) + "\n", "utf8");

  return NextResponse.json({
    ok: true,
    message: "Saved locally (stub). No email was sent.",
  });
}
