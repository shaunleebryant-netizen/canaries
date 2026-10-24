/**
 * Pluggable email sender for the letter list (double opt-in + later nurture)
 * and members auth mail (verify / welcome / reset) behind the same EMAIL_SENDING gate.
 *
 * EMAIL_SENDING (Worker var / env)   default OFF
 *   unset / "0"  -> nothing is sent; leads are stored as `pending` only.
 *   "1"          -> send via EMAIL_PROVIDER.
 * EMAIL_PROVIDER   default "resend" (owner's choice, 2026-09-26)
 *   "resend"     -> Resend HTTPS API via fetch (works on Workers). Needs the Worker secret
 *                   RESEND_API_KEY. Letter From: EMAIL_FROM, default "Canary Dashboard
 *                   <letter@canarydashboard.com>". Auth mail overrides From via message.from
 *                   (owner 2026-10-02: shaun@canarydashboard.com). Reply-To: EMAIL_REPLY_TO,
 *                   default shaun@canarydashboard.com (auth uses the same).
 *   "console"    -> LOCAL TESTING ONLY: prints the message (incl. links) to the server log.
 *                   Refused when NODE_ENV=production.
 * EMAIL_TOKEN_SECRET (>= 32 chars) is required whenever sending is on: it derives the stable
 * unsubscribe token (see src/lib/leads.ts).
 */
export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  headers?: Record<string, string>;
  /** Optional per-message From (auth mail uses shaun@; letter keeps default). */
  from?: string;
  /** Optional per-message Reply-To. */
  replyTo?: string;
};

export type SendResult = { sent: boolean; reason?: string };

export interface EmailSender {
  readonly name: string;
  send(msg: EmailMessage): Promise<SendResult>;
}

const env = (k: string) => (process.env[k] ?? "").trim();

export function emailSendingEnabled(): boolean {
  return env("EMAIL_SENDING") === "1";
}

class DisabledSender implements EmailSender {
  readonly name = "disabled";
  async send(): Promise<SendResult> {
    return { sent: false, reason: "EMAIL_SENDING is off" };
  }
}

class ConsoleSender implements EmailSender {
  readonly name = "console";
  async send(msg: EmailMessage): Promise<SendResult> {
    // Local dev only (guarded in getEmailSender). Prints the body so links can be tested.
    console.log(`[email:console] from="${msg.from || "(default)"}" subject="${msg.subject}"\n${msg.text}`);
    return { sent: true };
  }
}

export const DEFAULT_FROM = "Canary Dashboard <letter@canarydashboard.com>";
export const DEFAULT_REPLY_TO = "shaun@canarydashboard.com";

/** Owner 2026-10-02: members auth transactional From / Reply-To. */
export const AUTH_EMAIL_FROM = "Canary Dashboard <shaun@canarydashboard.com>";
export const AUTH_EMAIL_REPLY_TO = "shaun@canarydashboard.com";

class ResendSender implements EmailSender {
  readonly name = "resend";
  constructor(
    private apiKey: string,
    private from: string,
    private replyTo: string,
  ) {}
  async send(msg: EmailMessage): Promise<SendResult> {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: msg.from || this.from,
          to: [msg.to],
          reply_to: msg.replyTo || this.replyTo,
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
          headers: msg.headers,
        }),
      });
      // Never log the response body (it can echo the recipient).
      return res.ok ? { sent: true } : { sent: false, reason: `resend HTTP ${res.status}` };
    } catch {
      return { sent: false, reason: "resend network error" };
    }
  }
}

export function getEmailSender(): EmailSender {
  if (!emailSendingEnabled()) return new DisabledSender();
  const provider = env("EMAIL_PROVIDER") || "resend";
  if (provider === "console") {
    if (process.env.NODE_ENV === "production") return new DisabledSender();
    return new ConsoleSender();
  }
  if (provider === "resend" && env("RESEND_API_KEY")) {
    return new ResendSender(
      env("RESEND_API_KEY"),
      env("EMAIL_FROM") || DEFAULT_FROM,
      env("EMAIL_REPLY_TO") || DEFAULT_REPLY_TO,
    );
  }
  return new DisabledSender();
}
