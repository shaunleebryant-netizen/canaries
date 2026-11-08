import assert from "node:assert/strict";
import test from "node:test";
import { hasMemberAccess } from "./access";
import type { D1Database, SubscriptionRow, UserRow } from "./db";
import { getEntitlement } from "./entitlement";
import { isEmailVerified } from "./verify";

const NOW = Math.floor(Date.now() / 1000);

function user(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "user-1",
    email: "member@example.com",
    password_hash: "hash",
    stripe_customer_id: "cus_1",
    is_admin: 0,
    email_verified_at: NOW - 10,
    auth_provider: "password",
    google_sub: null,
    created_at: NOW - 100,
    updated_at: NOW - 100,
    ...overrides,
  };
}

function sub(overrides: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    id: "sub_1",
    user_id: "user-1",
    stripe_customer_id: "cus_1",
    plan: "founding_annual",
    price_id: "price_1T8qaz3SIbYHF8DtU7LqL8u8",
    status: "active",
    current_period_end: NOW + 86400,
    cancel_at_period_end: 0,
    canceled_at: null,
    ended_at: null,
    last_payment_failed_at: null,
    past_due_since: null,
    created_at: NOW - 100,
    updated_at: NOW - 100,
    ...overrides,
  };
}

function fakeDb(subscription: SubscriptionRow | null, comp = false): D1Database {
  return {
    prepare(sql: string) {
      return {
        bind() {
          return {
            async first() {
              if (sql.includes("FROM subscriptions")) return subscription;
              if (sql.includes("FROM comp_access")) return comp ? { email: "member@example.com" } : null;
              return null;
            },
          };
        },
      };
    },
  } as D1Database;
}

test("paid, admin, comp, grace, cancel, and unverified access", async () => {
  const previousAdmins = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAILS = "admin@example.com";
  try {
    const paid = await getEntitlement(fakeDb(sub({})), user());
    assert.equal(paid.access, true);
    assert.equal(paid.kind, "subscription");
    assert.equal(hasMemberAccess(paid.sub, NOW), true);

    const trialing = await getEntitlement(fakeDb(sub({ status: "trialing" })), user());
    assert.equal(trialing.access, true);

    const renewingOff = await getEntitlement(fakeDb(sub({ cancel_at_period_end: 1 })), user());
    assert.equal(renewingOff.access, true);
    assert.equal(hasMemberAccess(renewingOff.sub, NOW), true);

    const deleted = await getEntitlement(fakeDb(sub({ status: "canceled", current_period_end: NOW + 86400 })), user());
    assert.equal(deleted.access, false);
    assert.equal(hasMemberAccess(deleted.sub, NOW), false);

    const grace = await getEntitlement(
      fakeDb(sub({ status: "past_due", current_period_end: NOW - 1, past_due_since: NOW - 6 * 86400 })),
      user(),
    );
    assert.equal(grace.access, true);

    const graceEnded = await getEntitlement(
      fakeDb(sub({ status: "past_due", current_period_end: NOW - 1, past_due_since: NOW - 8 * 86400 })),
      user(),
    );
    assert.equal(graceEnded.access, false);

    const admin = await getEntitlement(fakeDb(null), user({ email: "admin@example.com" }));
    assert.equal(admin.access, true);
    assert.equal(admin.kind, "admin");

    const adminUnverified = await getEntitlement(fakeDb(null), user({ email: "admin@example.com", email_verified_at: null }));
    assert.equal(adminUnverified.access, false);
    assert.equal(isEmailVerified(user({ email_verified_at: null })), false);

    const comp = await getEntitlement(fakeDb(null, true), user());
    assert.equal(comp.access, true);
    assert.equal(comp.kind, "comp");

    const free = await getEntitlement(fakeDb(null), user());
    assert.equal(free.access, false);
    assert.equal(free.kind, "none");

    const unverifiedPaid = user({ email_verified_at: null });
    const unverified = await getEntitlement(fakeDb(sub({})), unverifiedPaid);
    assert.equal(isEmailVerified(unverifiedPaid), false);
    assert.equal(unverified.kind, "subscription");
    assert.equal(hasMemberAccess(null, NOW), false);
  } finally {
    if (previousAdmins === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = previousAdmins;
  }
});
