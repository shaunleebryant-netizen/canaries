/**
 * Members auth transactional email copy (Phase 1).
 * Draft source: /workspace/exports/members-auth/emails/
 * From / Reply-To: shaun@canarydashboard.com (owner 2026-10-02).
 * All sends go through getEmailSender() so EMAIL_SENDING stays the gate (off by default).
 */
import {
  AUTH_EMAIL_FROM,
  AUTH_EMAIL_REPLY_TO,
  type EmailMessage,
  type SendResult,
  getEmailSender,
} from "@/lib/email/sender";
import { RESET_TTL_SECONDS, VERIFY_TTL_SECONDS } from "./config";

function authEnvelope(partial: Omit<EmailMessage, "from" | "replyTo">): EmailMessage {
  return {
    ...partial,
    from: AUTH_EMAIL_FROM,
    replyTo: AUTH_EMAIL_REPLY_TO,
  };
}

export async function sendAuthEmail(partial: Omit<EmailMessage, "from" | "replyTo">): Promise<SendResult> {
  return getEmailSender().send(authEnvelope(partial));
}

export function verifyEmailMessage(to: string, verifyUrl: string): EmailMessage {
  const ttlHours = Math.max(1, Math.round(VERIFY_TTL_SECONDS / 3600));
  return authEnvelope({
    to,
    subject: "Confirm your Canary Dashboard email",
    text:
      `Hi,\n\n` +
      `Thanks for signing up for Canary Dashboard.\n\n` +
      `Please confirm this email address by opening the link below:\n\n` +
      `${verifyUrl}\n\n` +
      `This link expires in ${ttlHours} hours. If you didn’t create an account, you can ignore this message.\n\n` +
      `Questions? Reply to this email — it goes to shaun@canarydashboard.com.\n\n` +
      `Canary Dashboard · education only, not investment advice.`,
  });
}

export function welcomeEmailMessage(to: string, accountUrl: string, membersUrl: string): EmailMessage {
  return authEnvelope({
    to,
    subject: "Welcome to Canary Dashboard",
    text:
      `Hi,\n\n` +
      `Your email is confirmed — welcome to Canary Dashboard.\n\n` +
      `Next step: open your account to choose a plan and finish checkout. Membership unlocks the members area once billing is active.\n\n` +
      `Account: ${accountUrl}\n\n` +
      `If you already completed checkout, you’re all set — go to Members when you’re ready:\n\n` +
      `Members: ${membersUrl}\n\n` +
      `Questions? Reply to this email — it goes to shaun@canarydashboard.com.\n\n` +
      `Canary Dashboard · education only, not investment advice.`,
  });
}

export function passwordResetEmailMessage(to: string, resetUrl: string): EmailMessage {
  const ttlHours = Math.max(1, Math.round(RESET_TTL_SECONDS / 3600));
  return authEnvelope({
    to,
    subject: "Reset your Canary Dashboard password",
    text:
      `Hi,\n\n` +
      `We received a request to reset the password for your Canary Dashboard account.\n\n` +
      `Open this link to choose a new password:\n\n` +
      `${resetUrl}\n\n` +
      `This link expires in ${ttlHours} hour(s) and can only be used once. If you didn’t ask for a reset, you can ignore this email — your password stays the same.\n\n` +
      `Questions? Reply to this email — it goes to shaun@canarydashboard.com.\n\n` +
      `Canary Dashboard · education only, not investment advice.`,
  });
}

export function passwordChangedEmailMessage(to: string, loginUrl: string): EmailMessage {
  return authEnvelope({
    to,
    subject: "Your Canary Dashboard password was changed",
    text:
      `Hi,\n\n` +
      `This is a confirmation that the password for your Canary Dashboard account was just changed.\n\n` +
      `All existing sign-in sessions were signed out. If you made this change, no further action is needed — sign in again with your new password:\n\n` +
      `${loginUrl}\n\n` +
      `If you did not change your password, reply to this email straight away (shaun@canarydashboard.com) so we can help secure the account.\n\n` +
      `Canary Dashboard · education only, not investment advice.`,
  });
}
