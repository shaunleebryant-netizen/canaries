#!/usr/bin/env node
/**
 * Members test-mode end-to-end check (LOCAL ONLY — never point at production).
 *
 *   ACCOUNTS_URL  dev server started with MEMBERS_AUTH_MODE=accounts STRIPE_MOCK=1 (default http://127.0.0.1:3100)
 *   STUB_URL      dev server in default mode (optional; checks stub mode unchanged)
 *   ADMIN_EMAIL   must be in the server's ADMIN_EMAILS (default admin@example.test)
 *
 * Uses the local Stripe mock + correctly signed webhook events. No Stripe API calls.
 */
import Stripe from "stripe";

const A = process.env.ACCOUNTS_URL || "http://127.0.0.1:3100";
const S = process.env.STUB_URL || "";
const ADMIN = process.env.ADMIN_EMAIL || "admin@example.test";
// E2E_EXPECT=standard when the server runs with MEMBERS_FIRST_100_CAP=0 (founding sold out).
const EXPECT = process.env.E2E_EXPECT === "standard" ? "standard" : "founding";
const DEFAULT_PLAN = EXPECT === "standard" ? "standard_annual" : "launch_annual";
const MOCK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock_local_only_not_a_real_secret";
if (/canarydashboard\.com/.test(A + S)) throw new Error("refusing to run against production");

const stripe = new Stripe("sk_test_signature_only");
const results = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};

class Client {
  constructor(base) { this.base = base; this.cookie = ""; this.lastSetCookie = ""; }
  async req(path, { method = "GET", json, form, cookie } = {}) {
    const headers = {};
    const c = cookie ?? this.cookie;
    if (c) headers.cookie = c;
    let body;
    if (json) { headers["content-type"] = "application/json"; body = JSON.stringify(json); }
    if (form) { headers["content-type"] = "application/x-www-form-urlencoded"; body = new URLSearchParams(form).toString(); }
    const res = await fetch(this.base + path, { method, headers, body, redirect: "manual" });
    const set = res.headers.getSetCookie?.() || [];
    for (const sc of set) {
      const [kv] = sc.split(";");
      if (kv.startsWith("canary_session=")) { this.cookie = kv.endsWith("=") ? "" : kv; this.lastSetCookie = sc; }
    }
    const text = await res.text();
    let j = null; try { j = JSON.parse(text); } catch {}
    return { status: res.status, location: res.headers.get("location") || "", text, json: j };
  }
}

async function signedEvent(base, type, object, id = `evt_e2e_${Math.random().toString(36).slice(2)}`) {
  const created = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ id, object: "event", created, livemode: false, type, data: { object } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: MOCK_SECRET });
  const r = await fetch(base + "/api/stripe/webhook", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": header }, body: payload });
  return { status: r.status, json: await r.json().catch(() => null) };
}

const email = (p) => `${p}-${Date.now()}@example.test`;
const membersOpen = async (c) => (await c.req("/members")).status === 200;

async function signupVerified(client, em, password = "correct-horse-battery") {
  const r = await client.req("/api/account/signup", { method: "POST", json: { email: em, password } });
  const link = r.json?.testModeVerifyLink || "";
  if (link && link.includes("token=")) {
    const token = new URL(link).searchParams.get("token");
    await client.req("/api/account/verify", { method: "POST", json: { token } });
  }
  return r;
}


if (S) {
  const s = new Client(S);
  check("stub: /account/login is 404", (await s.req("/account/login")).status === 404);
  check("stub: /api/stripe/webhook is 404", (await s.req("/api/stripe/webhook", { method: "POST", json: {} })).status === 404);
  const r = await s.req("/members");
  check("stub: /members redirects to /members/login", r.status === 307 && r.location.includes("/members/login"));
  check("stub: canary-dev cookie opens /members", (await s.req("/members", { cookie: "canary_members=canary-dev" })).status === 200);
  check("stub: /members/login page 200", (await s.req("/members/login")).status === 200);
}

// ---- accounts mode ----
const u = new Client(A);
let r = await u.req("/members");
check("accounts: anonymous /members -> /account/login", r.status === 307 && r.location.includes("/account/login"));
r = await u.req("/members/login");
check("accounts: /members/login -> /account/login", r.status === 307 && r.location.includes("/account/login"));
r = await u.req("/api/members/session", { method: "POST", json: { password: "canary-dev" } });
check("accounts: shared-password stub login disabled", r.status === 404);
check("accounts: canary-dev cookie does NOT open /members", (await u.req("/members", { cookie: "canary_members=canary-dev" })).status !== 200);

const e1 = email("member");
r = await u.req("/api/account/signup", { method: "POST", json: { email: e1, password: "short" } });
check("signup rejects short password", r.status === 400);
r = await u.req("/api/account/signup", { method: "POST", json: { email: e1, password: "correct-horse-battery" } });
check("signup ok + session cookie set", r.status === 200 && u.cookie.startsWith("canary_session="));
check("session cookie flags HttpOnly/Secure/SameSite=Lax", /HttpOnly/i.test(u.lastSetCookie) && /Secure/i.test(u.lastSetCookie) && /SameSite=lax/i.test(u.lastSetCookie), u.lastSetCookie.replace(/canary_session=[^;]+/, "canary_session=<redacted>"));
const verifyLink = r.json?.testModeVerifyLink || "";
check("signup returns testModeVerifyLink (EMAIL_SENDING off)", Boolean(verifyLink), verifyLink ? "present" : "missing");
r = await u.req("/api/account/signup", { method: "POST", json: { email: e1, password: "correct-horse-battery" } });
check("duplicate signup -> 409", r.status === 409);

r = await u.req("/members");
check("signed-in, unverified: /members -> /account/verify", r.status === 307 && r.location.includes("/account/verify"));
check("signed-in, unverified: /api/members -> 403", (await u.req("/api/members")).status === 403);

// Consume verify token from test-mode link
const verifyToken = verifyLink.includes("token=") ? new URL(verifyLink).searchParams.get("token") : "";
r = await u.req("/api/account/verify", { method: "POST", json: { token: verifyToken || "bad" } });
check("verify token consumes ok", r.status === 200 && r.json?.ok === true);

r = await u.req("/members");
check("signed-in, verified unpaid: /members -> /account?gate=members", r.status === 307 && r.location.includes("/account?gate=members"));
check("signed-in, verified unpaid: /api/members -> 402", (await u.req("/api/members")).status === 402);

r = await fetch(A + "/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=deadbeef" }, body: "{}" });
check("webhook rejects bad signature (400)", r.status === 400);

r = await u.req("/account");
if (EXPECT === "founding") {
  check("picker: founding $600/yr shown alone + highlighted", r.text.includes('data-testid="plan-launch_annual"') && r.text.includes("$600/yr") && !r.text.includes("plan-standard_monthly") && r.text.includes("Launch special"));
} else {
  const ia = r.text.indexOf('data-testid="plan-standard_annual"'), im = r.text.indexOf('data-testid="plan-standard_monthly"');
  check("picker: standard annual $1,069/yr first + Recommended, then monthly $99/mo", ia > 0 && im > ia && r.text.includes("$1,069/yr") && r.text.includes("$99/mo") && r.text.includes("Recommended") && !r.text.includes("plan-launch_annual"));
  r = await u.req("/api/account/checkout", { method: "POST", form: { plan: "launch_annual" } });
  check("founding sold out: launch_annual request -> standard_annual", r.location.includes("plan=standard_annual"), r.location);
  r = await u.req("/api/account/checkout", { method: "POST", form: { plan: "standard_monthly" } });
  check("monthly selectable -> standard_monthly", r.location.includes("plan=standard_monthly"), r.location);
}
r = await u.req("/api/account/checkout", { method: "POST", form: {} });
check(`checkout default -> (mock) checkout, ${DEFAULT_PLAN}`, r.status === 303 && r.location.includes(`/account/mock-checkout?plan=${DEFAULT_PLAN}`), r.location);
r = await u.req(`/account/mock-checkout?plan=${DEFAULT_PLAN}`);
check("mock checkout shows plan price", r.text.includes(EXPECT === "standard" ? "$1,069/yr" : "$600/yr") && r.text.includes("MOCK"));

r = await u.req("/api/account/mock/pay", { method: "POST", json: { plan: DEFAULT_PLAN, card: "4000 0000 0000 0002" } });
check("declined test card -> 402, no access", r.status === 402 && !(await membersOpen(u)));

r = await u.req("/api/account/mock/pay", { method: "POST", json: { plan: DEFAULT_PLAN, card: "4242 4242 4242 4242" } });
const webhookOk = r.json?.results?.every((x) => x.status === 200);
check("4242 payment -> signed checkout.session.completed + subscription.created accepted", r.status === 200 && webhookOk, JSON.stringify(r.json?.results?.map((x) => [x.type, x.status])));
check("paid: /members unlocked (200)", await membersOpen(u));
check("paid: /api/members 200", (await u.req("/api/members")).status === 200);
r = await u.req("/account");
check("account page shows Active + auto-renew On", r.text.includes("Active") && /auto-renew[^>]*>On</.test(r.text));

r = await u.req("/api/account/portal", { method: "POST" });
check("portal -> 303 to (mock) customer portal", r.status === 303 && r.location.includes("/account/mock-portal"));

r = await u.req("/api/account/mock/event", { method: "POST", json: { action: "cancel_auto_renew" } });
check("turn off auto-renew (subscription.updated cancel_at_period_end=true) accepted", r.json?.results?.[0]?.status === 200);
check("auto-renew off: access continues until period end", await membersOpen(u));
r = await u.req("/account");
check("account page shows auto-renew Off + 'Access ends'", /auto-renew[^>]*>Off</.test(r.text) && r.text.includes("Access ends"));

r = await u.req("/api/account/mock/event", { method: "POST", json: { action: "period_end" } });
check("period end (subscription.deleted) accepted", r.json?.results?.[0]?.status === 200);
check("after period end: /members locked", !(await membersOpen(u)));

// Period end by clock: auto-renew off, current_period_end passes (deleted event not yet received) -> no access.
const u3 = new Client(A);
await signupVerified(u3, email("clock"));
await u3.req("/api/account/mock/pay", { method: "POST", json: { plan: DEFAULT_PLAN, card: "4242424242424242" } });
await u3.req("/api/account/mock/event", { method: "POST", json: { action: "cancel_auto_renew" } });
check("clock test: access while auto-renew off and term unpaid-through", await membersOpen(u3));
r = await u3.req("/api/account/mock/event", { method: "POST", json: { action: "clock_past_period_end" } });
check("clock test: once current_period_end passes, /members locked (even before subscription.deleted)", r.status === 200 && !(await membersOpen(u3)));

// Failed renewal payment
const u2 = new Client(A);
const e2 = email("failpay");
await signupVerified(u2, e2);
await u2.req("/api/account/mock/pay", { method: "POST", json: { plan: DEFAULT_PLAN, card: "4242424242424242" } });
check("failpay user: access after payment", await membersOpen(u2));
r = await u2.req("/api/account/mock/event", { method: "POST", json: { action: "renewal_failed" } });
check("invoice.payment_failed + subscription past_due accepted", r.json?.results?.every((x) => x.status === 200));
check("failed renewal: 7-day grace keeps /members open (past_due)", await membersOpen(u2));
r = await u2.req("/account");
check("account page shows past_due + grace end + last failed payment", r.text.includes("past_due") && r.text.includes("Payment grace ends") && r.text.includes("Last failed payment"));
r = await u2.req("/api/account/mock/event", { method: "POST", json: { action: "clock_past_grace" } });
check("after grace (8 days, simulated): /members locked", r.status === 200 && !(await membersOpen(u2)));

// Idempotency: same event id twice
const fixedId = `evt_e2e_dup_${Date.now()}`;
const d1 = await signedEvent(A, "invoice.payment_failed", { id: "in_x", object: "invoice", customer: "cus_none", subscription: "sub_none", amount_due: 1, currency: "usd" }, fixedId);
const d2 = await signedEvent(A, "invoice.payment_failed", { id: "in_x", object: "invoice", customer: "cus_none", subscription: "sub_none", amount_due: 1, currency: "usd" }, fixedId);
check("webhook idempotent on event id", d1.status === 200 && d2.json?.duplicate === true);

// Live-mode event ignored before ship day
{
  const payload = JSON.stringify({ id: `evt_live_${Date.now()}`, object: "event", created: Math.floor(Date.now() / 1000), livemode: true, type: "customer.subscription.deleted", data: { object: { id: "sub_x", customer: "cus_x", status: "canceled" } } });
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: MOCK_SECRET });
  const lr = await fetch(A + "/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": header }, body: payload });
  const lj = await lr.json();
  check("livemode events ignored while live Stripe not allowed", lr.status === 200 && Boolean(lj.ignored));
}

// Logout + revocation
const oldCookie = u.cookie;
r = await u.req("/api/account/logout", { method: "POST" });
check("logout -> 303 /account/login and cookie cleared", r.status === 303 && u.cookie === "");
r = await u.req("/account", { cookie: oldCookie });
check("revoked session cookie no longer works", r.status === 307 && r.location.includes("/account/login"));

// Login
r = await u.req("/api/account/login", { method: "POST", json: { email: e1, password: "wrong-password-123" } });
check("login wrong password -> 401", r.status === 401);
r = await u.req("/api/account/login", { method: "POST", json: { email: e1, password: "correct-horse-battery", next: "/members" } });
check("login ok", r.status === 200 && u.cookie.startsWith("canary_session="));

// Password reset (email stubbed)
r = await u.req("/api/account/reset/request", { method: "POST", json: { email: e1 } });
const link = r.json?.testModeResetLink;
check("reset request returns test-mode link (no email sent)", Boolean(link));
r = await u.req("/api/account/reset/request", { method: "POST", json: { email: "nobody@example.test" } });
check("reset request for unknown email is generic (no link)", r.status === 200 && !r.json?.testModeResetLink);
const token = link ? new URL(link).searchParams.get("token") : "";
r = await u.req("/api/account/reset/confirm", { method: "POST", json: { token, password: "new-password-4567" } });
check("reset confirm ok", r.status === 200);
r = await u.req("/api/account/reset/confirm", { method: "POST", json: { token, password: "another-password-89" } });
check("reset token single-use", r.status === 400);
r = await u.req("/api/account/login", { method: "POST", json: { email: e1, password: "correct-horse-battery" } });
check("old password rejected after reset", r.status === 401);
r = await u.req("/api/account/login", { method: "POST", json: { email: e1, password: "new-password-4567" } });
check("new password works", r.status === 200);

// Admin CSV
r = await u.req("/api/admin/export?table=signups");
check("non-admin CSV export -> 403", r.status === 403);
const adm = new Client(A);
r = await adm.req("/api/account/login", { method: "POST", json: { email: ADMIN, password: "admin-password-local" } });
if (r.status !== 200) await adm.req("/api/account/signup", { method: "POST", json: { email: ADMIN, password: "admin-password-local" } });
for (const t of ["signups", "payments", "events", "subscriptions", "member_events"]) {
  r = await adm.req(`/api/admin/export?table=${t}`);
  check(`admin CSV ${t}`, r.status === 200 && r.text.split("\n").length > 1, `${r.text.split("\n").filter(Boolean).length - 1} rows`);
}

r = await adm.req("/api/admin/export?table=payments");
check("ledger records plan amount (USD minor units)", r.text.includes(EXPECT === "standard" ? ",106900,usd," : ",60000,usd,"));

const failed = results.filter((x) => !x.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
