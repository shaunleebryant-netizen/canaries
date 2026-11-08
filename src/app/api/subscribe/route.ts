import { NextResponse } from "next/server";
import { accountsEnabled } from "@/lib/members/config";
import { getMembersDb } from "@/lib/members/db";
import { getEntitlement } from "@/lib/members/entitlement";
import { getCurrentUser } from "@/lib/members/session";
import {
  guardFormPost,
  isBot,
  maybeSendVerification,
  normalizeEmail,
  saveLead,
  type LeadTag,
} from "@/lib/leads";

export const dynamic = "force-dynamic";

/** Topic keys accepted from the Subscribe lightbox -> D1 lead tags. */
const TOPICS = {
  weekly_setups: "weekly_setups", // also implies the free weekly letter
  events: "events",
  product_updates: "product_updates",
  member_alerts: "member_alerts", // members only
  course_openings: "course_openings",
} as const satisfies Record<string, LeadTag>;
type Topic = keyof typeof TOPICS;

const OK_MESSAGE =
  "Saved. If this address is new we'll email a confirm link before sending anything.";

async function viewer(): Promise<{ email: string | null; member: boolean }> {
  if (!accountsEnabled()) return { email: null, member: false };
  try {
    const cur = await getCurrentUser();
    if (!cur) return { email: null, member: false };
    const ent = await getEntitlement(await getMembersDb(), cur.user);
    return { email: cur.user.email, member: ent.access };
  } catch {
    return { email: null, member: false };
  }
}

/** Lightbox bootstrap: is the visitor signed in / a member? (no list lookups - avoids enumeration) */
export async function GET() {
  const v = await viewer();
  return NextResponse.json({ signedIn: Boolean(v.email), email: v.email, member: v.member });
}

/**
 * Email-list preference capture. Reuses D1 `leads` (double opt-in, pending until confirmed).
 * TODO(Subscribers Manager): map these tags to real lists/segments when the sender is wired;
 * nothing is mailed per-topic yet. Sends only the confirm email, and only if EMAIL_SENDING=1.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }
  const guard = await guardFormPost(request, "subscribe", 10);
  if ("error" in guard) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  if (isBot(body)) return NextResponse.json({ ok: true, message: OK_MESSAGE });

  const v = await viewer();
  const email = v.email ? normalizeEmail(v.email) : normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  const raw = Array.isArray(body.topics) ? body.topics : [];
  let topics = [...new Set(raw.filter((t): t is Topic => typeof t === "string" && t in TOPICS))];
  if (!v.member) topics = topics.filter((t) => t !== "member_alerts"); // server-side gate
  if (topics.length === 0) {
    return NextResponse.json({ ok: false, error: "Pick at least one option." }, { status: 400 });
  }
  const letter = topics.includes("weekly_setups");
  const tags: LeadTag[] = topics.map((t) => TOPICS[t]);
  if (letter) tags.push("letter");

  const lead = await saveLead(guard.db, {
    email,
    source: "letter",
    tags,
    consent: letter, // `consent` column = letter consent; other topics recorded as tags
    payload: { form: "subscribe_lightbox", topics },
    ipH: guard.ipH,
  });
  await maybeSendVerification(guard.db, request, lead, email);
  return NextResponse.json({ ok: true, message: OK_MESSAGE });
}
