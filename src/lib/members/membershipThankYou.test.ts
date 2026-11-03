/**
 * Node test runner:
 *   npx --yes tsx --test src/lib/members/membershipThankYou.test.ts
 */
import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { AUTH_EMAIL_FROM, AUTH_EMAIL_REPLY_TO } from "../email/sender";
import { membershipThankYouMessage, welcomeEmailMessage } from "./authEmail";
import { processStripeEvent } from "./webhook";

const MEMBERS = "https://canarydashboard.com/members";

function assertScriptsGrantedToCheckoutEmail(text: string, email: string) {
  const escaped = email.replace(/[.]/g, "\\.");
  assert.match(
    text,
    new RegExp(`free invite-only CanarySignals scripts are being granted to the email you used at checkout \\(${escaped}\\)`),
  );
  assert.match(text, /Invite-only scripts/);
  assert.match(text, /Favourites/);
  assert.match(text, /If that email is not the login you use on TradingView/);
  assert.match(text, /username or email you use there/);
  assert.match(text, /re-grant access within a few hours/);
  assert.doesNotMatch(text, /nothing has been added|still manual|already granted|automatically/i);
}

describe("membership thank-you copy", () => {
  it("founding annual mirrors the manual welcome and does not reuse the verify-path welcome", () => {
    const msg = membershipThankYouMessage("buyer@example.com", "launch_annual", MEMBERS);
    assert.equal(msg.from, AUTH_EMAIL_FROM);
    assert.equal(msg.replyTo, AUTH_EMAIL_REPLY_TO);
    assert.equal(msg.to, "buyer@example.com");
    assert.equal(msg.subject, "You're in: Canary Dashboard founding member");
    assert.match(msg.text, /Thanks for signing up as a Canary Dashboard founding member/);
    assert.match(msg.text, /founding rate is locked for life while you keep renewing/);
    assert.match(msg.text, new RegExp(MEMBERS.replace(/[.]/g, "\\.")));
    assertScriptsGrantedToCheckoutEmail(msg.text, "buyer@example.com");
    assert.match(msg.text, /Shaun\nCanary Dashboard/);
    assert.match(msg.text, /education only, not investment advice/);
    assert.doesNotMatch(msg.text, /choose a plan|finish checkout/i);
    assert.doesNotMatch(msg.text, /\b(tip|performance|profit|guaranteed|returns)\b/i);
    assert.doesNotMatch(msg.text, /\bsignals?\b/i);

    const welcome = welcomeEmailMessage("buyer@example.com", "https://canarydashboard.com/account", MEMBERS);
    assert.match(welcome.text, /choose a plan and finish checkout/);
    assert.notEqual(welcome.subject, msg.subject);
  });

  it("founding monthly keeps the founding thanks without the annual life-lock line", () => {
    const msg = membershipThankYouMessage("buyer@example.com", "launch_monthly", MEMBERS);
    assert.match(msg.subject, /founding member/);
    assert.match(msg.text, /founding member/);
    assert.match(msg.text, /founding rate stays in place while you keep renewing/);
    assert.doesNotMatch(msg.text, /locked for life/);
  });

  it("standard annual and monthly thank the buyer for the purchase", () => {
    const annual = membershipThankYouMessage("buyer@example.com", "standard_annual", MEMBERS);
    const monthly = membershipThankYouMessage("buyer@example.com", "standard_monthly", MEMBERS);
    assert.equal(annual.subject, "You're in: Canary Dashboard membership");
    assert.match(annual.text, /Thanks for purchasing Canary Dashboard membership, billed annually/);
    assert.match(monthly.text, /Thanks for purchasing Canary Dashboard membership, billed monthly/);
    assert.doesNotMatch(annual.text, /founding|locked for life/);
    assert.doesNotMatch(monthly.text, /founding|locked for life/);
    for (const msg of [annual, monthly]) {
      assert.match(msg.text, new RegExp(MEMBERS.replace(/[.]/g, "\\.")));
      assertScriptsGrantedToCheckoutEmail(msg.text, "buyer@example.com");
      assert.match(msg.text, /education only, not investment advice/);
    }
  });
});

type Row = Record<string, unknown>;

function createDb(init?: { users?: Row[]; orders?: Row[] }) {
  const users: Row[] = [...(init?.users ?? [])];
  const orders: Row[] = [...(init?.orders ?? [])];
  const stripeEvents: Row[] = [];
  const memberEvents: Row[] = [];
  const subs: Row[] = [];
  const tasks: Row[] = [];

  function prepare(sql: string) {
    const norm = sql.replace(/\s+/g, " ").trim();
    let args: unknown[] = [];
    const api = {
      bind(...a: unknown[]) {
        args = a;
        return api;
      },
      async first() {
        if (norm.startsWith("SELECT id FROM stripe_events")) {
          return stripeEvents.find((e) => e.id === args[0]) ?? null;
        }
        if (norm.startsWith("SELECT * FROM users WHERE id")) {
          return users.find((u) => u.id === args[0]) ?? null;
        }
        if (norm.startsWith("SELECT * FROM users WHERE stripe_customer_id")) {
          return users.find((u) => u.stripe_customer_id === args[0]) ?? null;
        }
        if (norm.startsWith("SELECT id FROM member_events")) {
          return memberEvents.find((e) => e.type === args[0] && e.detail === args[1]) ?? null;
        }
        if (norm.startsWith("SELECT * FROM indicator_orders")) {
          return orders.find((o) => o.id === args[0]) ?? null;
        }
        if (norm.startsWith("SELECT id FROM indicator_grant_tasks")) {
          return tasks.find((t) => t.order_id === args[0]) ?? null;
        }
        throw new Error(`unhandled first: ${norm}`);
      },
      async run() {
        if (norm.startsWith("UPDATE users SET stripe_customer_id = COALESCE")) {
          const u = users.find((row) => row.id === args[2]);
          if (u && !u.stripe_customer_id) u.stripe_customer_id = args[0];
          return { success: true, results: [], meta: { changes: 1 } };
        }
        if (norm.startsWith("UPDATE users SET stripe_customer_id = ?")) {
          const u = users.find((row) => row.id === args[2]);
          if (u) u.stripe_customer_id = args[0];
          return { success: true, results: [], meta: { changes: 1 } };
        }
        if (norm.startsWith("INSERT INTO subscriptions")) {
          subs.push({ id: args[0], user_id: args[1], plan: args[3], status: args[5] });
          return { success: true, results: [], meta: { changes: 1 } };
        }
        if (norm.startsWith("INSERT INTO member_events")) {
          memberEvents.push({ user_id: args[0], type: args[1], at: args[2], detail: args[3] });
          return { success: true, results: [], meta: { changes: 1 } };
        }
        if (norm.startsWith("INSERT OR IGNORE INTO stripe_events")) {
          if (!stripeEvents.some((e) => e.id === args[0])) {
            stripeEvents.push({ id: args[0], type: args[1], summary: args[9] });
          }
          return { success: true, results: [], meta: { changes: 1 } };
        }
        if (norm.startsWith("UPDATE indicator_orders")) {
          const o = orders.find((row) => row.id === args[3]);
          if (o && (o.status === "pending_payment" || o.status === "cancelled")) o.status = "paid";
          return { success: true, results: [], meta: { changes: 1 } };
        }
        if (norm.startsWith("INSERT OR IGNORE INTO indicator_grant_tasks")) {
          if (!tasks.some((t) => t.order_id === args[1])) {
            tasks.push({ id: args[0], order_id: args[1], email: args[5], email_status: null });
          }
          return { success: true, results: [], meta: { changes: 1 } };
        }
        if (norm.startsWith("UPDATE indicator_grant_tasks SET email_status")) {
          const t = tasks.find((row) => row.id === args[1]);
          if (t) t.email_status = args[0];
          return { success: true, results: [], meta: { changes: 1 } };
        }
        throw new Error(`unhandled run: ${norm}`);
      },
      async all() {
        return { success: true, results: [] };
      },
    };
    return api;
  }

  return {
    prepare,
    async batch() {
      return [];
    },
    dump: { users, orders, stripeEvents, memberEvents, subs, tasks },
  };
}

function user() {
  return { id: "user_1", email: "buyer@example.com", stripe_customer_id: "cus_1" };
}

function checkoutEvent(partial: {
  id?: string;
  sessionId?: string;
  plan?: string;
  payment_status?: string;
  mode?: string;
  kind?: string;
  orderId?: string;
}) {
  return {
    id: partial.id ?? "evt_checkout_1",
    type: "checkout.session.completed",
    livemode: false,
    created: 1_700_000_000,
    data: {
      object: {
        id: partial.sessionId ?? "cs_test_1",
        object: "checkout.session",
        mode: partial.mode ?? "subscription",
        client_reference_id: "user_1",
        customer: "cus_1",
        subscription: "sub_1",
        amount_total: 60000,
        currency: "usd",
        payment_status: partial.payment_status ?? "paid",
        metadata: {
          user_id: "user_1",
          plan: partial.plan ?? "launch_annual",
          ...(partial.kind ? { kind: partial.kind, order_id: partial.orderId ?? "order_1" } : {}),
        },
      },
    },
  };
}

function setEnv(key: string, value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env[key];
  else env[key] = value;
}

describe("membership checkout.session.completed sends one thank-you", () => {
  let logs: string[] = [];
  let originalLog: typeof console.log;
  const envKeys = ["EMAIL_SENDING", "EMAIL_PROVIDER", "NODE_ENV", "MEMBERS_SITE_ORIGIN"] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    logs = [];
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map((a) => String(a)).join(" "));
    };
    for (const key of envKeys) saved[key] = process.env[key];
    setEnv("EMAIL_SENDING", "1");
    setEnv("EMAIL_PROVIDER", "console");
    setEnv("NODE_ENV", "test");
    setEnv("MEMBERS_SITE_ORIGIN", undefined);
  });

  afterEach(() => {
    console.log = originalLog;
    for (const key of envKeys) setEnv(key, saved[key]);
  });

  function thankYous() {
    return logs.filter((line) => line.includes("[email:console]"));
  }

  it("sends founding copy once on a paid checkout and ignores a retry and a second event id", async () => {
    const db = createDb({ users: [user()] });
    const event = checkoutEvent({ plan: "launch_annual" });
    const first = await processStripeEvent(db as never, event as never);
    assert.equal(first.duplicate, false);
    assert.match(first.summary, /thank-you sent/);
    assert.equal(thankYous().length, 1);
    assert.match(thankYous()[0], /founding member/);
    assert.match(thankYous()[0], /locked for life while you keep renewing/);
    assert.match(thankYous()[0], /https:\/\/canarydashboard\.com\/members/);
    assert.match(thankYous()[0], /being granted to the email you used at checkout \(buyer@example\.com\)/);
    assert.match(thankYous()[0], /Invite-only scripts/);
    assert.equal(db.dump.memberEvents.length, 1);
    assert.equal(db.dump.memberEvents[0].detail, "cs_test_1");

    const retry = await processStripeEvent(db as never, event as never);
    assert.equal(retry.duplicate, true);
    assert.equal(thankYous().length, 1);

    const secondId = await processStripeEvent(
      db as never,
      checkoutEvent({ id: "evt_checkout_2", sessionId: "cs_test_1", plan: "launch_annual" }) as never,
    );
    assert.match(secondId.summary, /thank-you already recorded/);
    assert.equal(thankYous().length, 1);
  });

  it("sends standard monthly copy and still activates the subscription", async () => {
    const db = createDb({ users: [user()] });
    const result = await processStripeEvent(db as never, checkoutEvent({ plan: "standard_monthly", id: "evt_std" }) as never, async () => ({
      id: "sub_1",
      customer: "cus_1",
      status: "active",
      metadata: { user_id: "user_1", plan: "standard_monthly" },
      items: { data: [{ price: { id: "price_standard_monthly" }, current_period_end: 1_800_000_000 }] },
    }));
    assert.match(result.summary, /thank-you sent/);
    assert.equal(thankYous().length, 1);
    assert.match(thankYous()[0], /billed monthly/);
    assert.doesNotMatch(thankYous()[0], /founding/);
    assert.equal(db.dump.subs.length, 1);
    assert.equal(db.dump.subs[0].status, "active");
    assert.equal(db.dump.subs[0].user_id, "user_1");
  });

  it("sends when payment is still unpaid but the subscription on this event is already active", async () => {
    const db = createDb({ users: [user()] });
    const result = await processStripeEvent(
      db as never,
      checkoutEvent({ payment_status: "unpaid", plan: "standard_annual", id: "evt_async" }) as never,
      async () => ({
        id: "sub_1",
        customer: "cus_1",
        status: "active",
        metadata: { plan: "standard_annual", user_id: "user_1" },
        items: { data: [{ price: { id: "price_x" } }] },
      }),
    );
    assert.match(result.summary, /thank-you sent/);
    assert.match(thankYous()[0], /billed annually/);
  });

  it("does not email an unpaid checkout whose subscription is not active", async () => {
    const db = createDb({ users: [user()] });
    const result = await processStripeEvent(
      db as never,
      checkoutEvent({ payment_status: "unpaid", id: "evt_unpaid" }) as never,
      async () => ({
        id: "sub_1",
        customer: "cus_1",
        status: "incomplete",
        metadata: { plan: "launch_annual", user_id: "user_1" },
        items: { data: [{ price: { id: "price_x" } }] },
      }),
    );
    assert.equal(thankYous().length, 0);
    assert.doesNotMatch(result.summary, /thank-you/);
    assert.equal(db.dump.memberEvents.length, 0);
    assert.equal(db.dump.subs[0].status, "incomplete");
  });

  it("does not email on customer.subscription.created", async () => {
    const db = createDb({ users: [user()] });
    const result = await processStripeEvent(db as never, {
      id: "evt_sub",
      type: "customer.subscription.created",
      livemode: false,
      created: 1_700_000_000,
      data: {
        object: {
          id: "sub_1",
          customer: "cus_1",
          status: "active",
          metadata: { user_id: "user_1", plan: "launch_annual" },
          items: { data: [{ price: { id: "price_mock_launch_annual" } }] },
        },
      },
    } as never);
    assert.match(result.summary, /subscription created/);
    assert.equal(thankYous().length, 0);
    assert.equal(db.dump.memberEvents.length, 0);
  });

  it("skips the send when EMAIL_SENDING is off and does not claim the session", async () => {
    process.env.EMAIL_SENDING = "0";
    const db = createDb({ users: [user()] });
    const result = await processStripeEvent(db as never, checkoutEvent({ id: "evt_off" }) as never);
    assert.match(result.summary, /thank-you skipped \(EMAIL_SENDING off\)/);
    assert.equal(thankYous().length, 0);
    assert.equal(db.dump.memberEvents.length, 0);
  });

  it("leaves the indicator you're-in email on its own path", async () => {
    const db = createDb({
      users: [user()],
      orders: [
        {
          id: "order_1",
          script_id: "fish-sweaty",
          script_name: "Fish Sweaty",
          tv_username: "canaryfan",
          email: "buyer@example.com",
          status: "pending_payment",
          price_cents: 9900,
        },
      ],
    });
    const result = await processStripeEvent(
      db as never,
      checkoutEvent({
        id: "evt_ind",
        kind: "indicator",
        orderId: "order_1",
        mode: "payment",
        payment_status: "paid",
      }) as never,
    );
    assert.match(result.summary, /indicator paid/);
    assert.equal(thankYous().length, 1);
    assert.match(thankYous()[0], /You're in: your Canary indicators/);
    assert.match(thankYous()[0], /I'm adding your TradingView account \(canaryfan\)/);
    assert.doesNotMatch(thankYous()[0], /founding member|members dashboard/i);
    assert.equal(db.dump.memberEvents.length, 0);
    assert.equal(db.dump.tasks.length, 1);
    assert.equal(db.dump.tasks[0].email_status, "sent");
    assert.equal(db.dump.orders[0].status, "paid");
  });
});
