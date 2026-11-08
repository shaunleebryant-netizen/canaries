import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyConsent,
  parseFreeSignup,
  previewTierEnabled,
  readPreviewTier,
  signPreviewTier,
  unsubscribeEmail,
} from "./previewTier";

test("free signup marketing consent stays off unless the boolean true is sent", () => {
  assert.equal(parseFreeSignup({ email: "a@b.co" }).ok && (parseFreeSignup({ email: "a@b.co" }) as { marketing: boolean }).marketing, false);
  assert.equal((parseFreeSignup({ email: "a@b.co", marketing: "yes" }) as { marketing: boolean }).marketing, false);
  assert.equal((parseFreeSignup({ email: "a@b.co", marketing: true }) as { marketing: boolean }).marketing, true);
  assert.equal(parseFreeSignup({ email: "nope" }).ok, false);
});

test("unsubscribe clears consent and does not require a send", () => {
  const rows = applyConsent([], "a@b.co", true, "2026-11-08T00:00:00Z");
  const next = unsubscribeEmail(rows, "A@b.co", "2026-11-08T01:00:00Z");
  assert.equal(next.length, 1);
  assert.equal(next[0].marketing, false);
});

test("a signed preview cookie is ignored when the flag is off, including in production", async () => {
  const env = process.env as { CANARY_PREVIEW_TIER?: string; NODE_ENV?: string };
  const prevFlag = env.CANARY_PREVIEW_TIER;
  const prevNode = env.NODE_ENV;
  env.CANARY_PREVIEW_TIER = "1";
  env.NODE_ENV = "test";
  assert.equal(previewTierEnabled(), true);
  const token = await signPreviewTier({ tier: "paid", email: "paid@example.com", exp: Math.floor(Date.now() / 1000) + 60 });
  env.CANARY_PREVIEW_TIER = "0";
  assert.equal(await readPreviewTier(token), null);
  env.CANARY_PREVIEW_TIER = "1";
  env.NODE_ENV = "production";
  assert.equal(previewTierEnabled(), false);
  assert.equal(await readPreviewTier(token), null);
  await assert.rejects(() => signPreviewTier({ tier: "free", email: "a@b.co", exp: Math.floor(Date.now() / 1000) + 60 }));
  env.CANARY_PREVIEW_TIER = prevFlag;
  env.NODE_ENV = prevNode;
});
