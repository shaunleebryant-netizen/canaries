import { NextResponse } from "next/server";
import { appendFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Newsletter form stub — stores locally / logs. Does NOT send email.
 */
export async function POST(request: Request) {
  let email = "";
  const contentType = request.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      email = String(body.email || "").trim();
    } else {
      const form = await request.formData();
      email = String(form.get("email") || "").trim();
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Valid email required" }, { status: 400 });
  }

  const entry = {
    email,
    at: new Date().toISOString(),
    note: "stub — no email sent",
  };
  console.log("[newsletter-stub]", entry);

  const dir = path.join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "newsletter-signups.json");
  appendFileSync(file, JSON.stringify(entry) + "\n", "utf8");

  return NextResponse.json({
    ok: true,
    message: "Saved locally (stub). No email was sent.",
  });
}
