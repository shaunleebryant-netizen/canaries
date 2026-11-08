import assert from "node:assert/strict";
import { test } from "node:test";
import { safeNext } from "./http";

test("a sign-in with no return path lands on the dashboard", () => {
  assert.equal(safeNext(undefined), "/members");
  assert.equal(safeNext(""), "/members");
  assert.equal(safeNext("   "), "/members");
});

test("an explicit same-site return path is kept, including account and checkout", () => {
  assert.equal(safeNext("/account"), "/account");
  assert.equal(safeNext("/account?checkout=success"), "/account?checkout=success");
  assert.equal(safeNext("/account?next=/members"), "/account?next=/members");
  assert.equal(safeNext("/members?tab=etf"), "/members?tab=etf");
});

test("an off-site return path is rejected", () => {
  assert.equal(safeNext("//evil.example"), "/members");
  assert.equal(safeNext("https://evil.example/account"), "/members");
  assert.equal(safeNext("http://evil.example"), "/members");
});
