/**
 * Owner-only notification for each support-page submission (owner-approved 2026-09-28).
 * Gated by SUPPORT_NOTIFY === "1" (Worker var), independent of EMAIL_SENDING (subscriber
 * email, stays OFF). Sends via Resend with the Worker secret RESEND_API_KEY:
 *   from SUPPORT_FROM (default "Canary Dashboard Support <support@canarydashboard.com>")
 *   to   SUPPORT_TO   (default shaun@canarydashboard.com)
 *   reply-to = the submitter's email, so the owner can just hit Reply.
 * Never throws; the submission is already saved in D1 before this runs.
 */
const env = (k: string) => (process.env[k] ?? "").trim();

export type SupportNotifyResult = { status: "off" | "sent" | "failed"; id?: string; error?: string };

export async function notifySupport(input: {
  name: string;
  email: string;
  issueType: string;
  message: string;
  rowId: number | null;
}): Promise<SupportNotifyResult> {
  if (env("SUPPORT_NOTIFY") !== "1") return { status: "off" };
  const key = env("RESEND_API_KEY");
  if (!key) return { status: "failed", error: "RESEND_API_KEY missing" };
  const from = env("SUPPORT_FROM") || "Canary Dashboard Support <support@canarydashboard.com>";
  const to = env("SUPPORT_TO") || "shaun@canarydashboard.com";
  const text = [
    `New support request${input.rowId ? ` #${input.rowId}` : ""} from canarydashboard.com/support`,
    "",
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Issue: ${input.issueType}`,
    "",
    input.message,
    "",
    "Reply to this email to answer them directly.",
  ].join("\n");
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: input.email,
        subject: `Support (${input.issueType}): ${input.name}`.slice(0, 150),
        text,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (res.ok && data.id) return { status: "sent", id: data.id };
    return { status: "failed", error: `resend HTTP ${res.status}${data.message ? `: ${String(data.message).slice(0, 200)}` : ""}` };
  } catch {
    return { status: "failed", error: "resend network error" };
  }
}
