/**
 * D1 access for members. Binding name: MEMBERS_DB.
 * Local test: provided by wrangler.members-local.jsonc (miniflare, .wrangler/state).
 * Ship day: add the binding to wrangler.jsonc after creating the remote database.
 */
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Minimal D1 typings (avoid adding @cloudflare/workers-types as a dependency).
export interface D1Result<T> {
  results: T[];
  success: boolean;
  meta?: { changes?: number };
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<unknown>>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(stmts: D1PreparedStatement[]): Promise<D1Result<unknown>[]>;
}

export async function getMembersDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as unknown as Record<string, unknown>).MEMBERS_DB as D1Database | undefined;
  if (!db) throw new Error("MEMBERS_DB D1 binding missing (accounts mode needs it)");
  return db;
}

export const nowSec = () => Math.floor(Date.now() / 1000);

export type UserRow = {
  id: string;
  email: string;
  password_hash: string | null; // null = Google-only (after 0005 migration)
  stripe_customer_id: string | null;
  is_admin: number;
  email_verified_at: number | null;
  auth_provider: string; // password | google | both
  google_sub: string | null;
  created_at: number;
  updated_at: number;
};

export type SubscriptionRow = {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  plan: string;
  price_id: string | null;
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: number;
  canceled_at: number | null;
  ended_at: number | null;
  last_payment_failed_at: number | null;
  past_due_since: number | null;
  created_at: number;
  updated_at: number;
};

export async function getUserByEmail(db: D1Database, email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").bind(email.trim().toLowerCase()).first<UserRow>();
}
export async function getUserById(db: D1Database, id: string) {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}
export async function getUserByCustomer(db: D1Database, customerId: string) {
  return db.prepare("SELECT * FROM users WHERE stripe_customer_id = ?").bind(customerId).first<UserRow>();
}

export async function logMemberEvent(db: D1Database, userId: string | null, type: string, detail?: string) {
  await db
    .prepare("INSERT INTO member_events (user_id, type, at, detail) VALUES (?, ?, ?, ?)")
    .bind(userId, type, nowSec(), detail ?? null)
    .run();
}

/** Latest subscription for a user (the one that decides access). */
export async function getLatestSubscription(db: D1Database, userId: string) {
  return db
    .prepare(
      "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY (status IN ('active','trialing','past_due')) DESC, COALESCE(current_period_end,0) DESC, updated_at DESC LIMIT 1",
    )
    .bind(userId)
    .first<SubscriptionRow>();
}

/**
 * First-100 lifetime-lock counter. Owner default (2026-09-25): only CURRENTLY active founding
 * subscriptions count (active/trialing/past_due-in-dunning); lapsed members lose their spot.
 */
export async function countLaunchMembers(db: D1Database): Promise<number> {
  const r = await db
    .prepare(
      "SELECT COUNT(DISTINCT user_id) AS n FROM subscriptions WHERE plan IN ('launch_annual','launch_monthly') AND status IN ('active','trialing','past_due')",
    )
    .first<{ n: number }>();
  return Number(r?.n ?? 0);
}
