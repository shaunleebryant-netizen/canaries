/**
 * Isolated preview of membership fulfillment. Not Stripe, not D1, not a production backup.
 * A return URL never grants access. Only a verified paid outcome does.
 * Backup stays pending until a separate sync; access does not wait for it.
 */
import type { PlanId } from "./plans";

export type PreviewOutcome = "pending" | "paid" | "failed" | "cancelled";

export type PreviewCheckout = {
  id: string;
  email: string;
  plan: Extract<PlanId, "launch_annual" | "launch_monthly">;
  amount: number;
  priceEnv: string;
  status: PreviewOutcome;
  returnTab: string;
  createdAt: string;
};

export type PreviewLedgerEvent = {
  id: string;
  checkoutId: string;
  outcome: PreviewOutcome;
};

export type BackupItem = {
  id: string;
  checkoutId: string;
  email: string;
  status: "pending" | "synced";
  attempts: number;
};

export type PreviewEntitlement = {
  email: string;
  tier: "free" | "paid";
  plan?: PreviewCheckout["plan"];
  checkoutId?: string;
};

export type PreviewLedger = {
  checkouts: PreviewCheckout[];
  events: PreviewLedgerEvent[];
  entitlements: PreviewEntitlement[];
  backup: BackupItem[];
};

export function emptyLedger(): PreviewLedger {
  return { checkouts: [], events: [], entitlements: [], backup: [] };
}

const TABS = new Set(["stocks", "crypto", "insiders", "ideas", "mystocks", "backtest", "canaries"]);

export function safeReturnTab(raw: string | undefined): string {
  return raw && TABS.has(raw) ? raw : "stocks";
}

export function startPreviewCheckout(
  ledger: PreviewLedger,
  input: { id: string; email: string; plan: PreviewCheckout["plan"]; amount: number; priceEnv: string; returnTab: string; now: string },
): PreviewLedger {
  const checkout: PreviewCheckout = {
    id: input.id,
    email: input.email.trim().toLowerCase(),
    plan: input.plan,
    amount: input.amount,
    priceEnv: input.priceEnv,
    status: "pending",
    returnTab: safeReturnTab(input.returnTab),
    createdAt: input.now,
  };
  return { ...ledger, checkouts: [...ledger.checkouts, checkout] };
}

export type ApplyResult = {
  ok: boolean;
  duplicate: boolean;
  error?: "bad-signature" | "unknown-checkout";
  tier: "free" | "paid";
  backupStatus: "none" | "pending" | "synced";
};

/** Signature must already have been checked. A failed check does not change the ledger. */
export function applyFulfillmentEvent(
  ledger: PreviewLedger,
  event: PreviewLedgerEvent,
  signatureOk: boolean,
): { ledger: PreviewLedger; result: ApplyResult } {
  if (!signatureOk) {
    return { ledger, result: { ok: false, duplicate: false, error: "bad-signature", tier: "free", backupStatus: "none" } };
  }
  if (ledger.events.some((e) => e.id === event.id)) {
    const checkout = ledger.checkouts.find((c) => c.id === event.checkoutId);
    const tier = tierFor(ledger, checkout?.email ?? "");
    const backup = ledger.backup.find((b) => b.checkoutId === event.checkoutId);
    return {
      ledger,
      result: { ok: true, duplicate: true, tier, backupStatus: backup?.status ?? "none" },
    };
  }
  const checkout = ledger.checkouts.find((c) => c.id === event.checkoutId);
  if (!checkout) {
    return { ledger, result: { ok: false, duplicate: false, error: "unknown-checkout", tier: "free", backupStatus: "none" } };
  }
  const events = [...ledger.events, event];
  const checkouts = ledger.checkouts.map((c) => (c.id === checkout.id ? { ...c, status: event.outcome } : c));
  let entitlements = ledger.entitlements;
  let backup = ledger.backup;
  if (event.outcome === "paid") {
    const already = entitlements.find((e) => e.email === checkout.email && e.tier === "paid");
    entitlements = [
      ...entitlements.filter((e) => e.email !== checkout.email),
      { email: checkout.email, tier: "paid", plan: checkout.plan, checkoutId: checkout.id },
    ];
    if (!already && !backup.some((b) => b.checkoutId === checkout.id)) {
      backup = [...backup, { id: `bak_${checkout.id}`, checkoutId: checkout.id, email: checkout.email, status: "pending", attempts: 0 }];
    }
  }
  const next = { checkouts, events, entitlements, backup };
  const item = next.backup.find((b) => b.checkoutId === checkout.id);
  return {
    ledger: next,
    result: { ok: true, duplicate: false, tier: tierFor(next, checkout.email), backupStatus: item?.status ?? "none" },
  };
}

export function markBackupSynced(ledger: PreviewLedger, checkoutId: string): PreviewLedger {
  return {
    ...ledger,
    backup: ledger.backup.map((b) => (b.checkoutId === checkoutId ? { ...b, status: "synced", attempts: b.attempts + 1 } : b)),
  };
}

export function tierFor(ledger: PreviewLedger, email: string): "free" | "paid" {
  const row = ledger.entitlements.find((e) => e.email === email.trim().toLowerCase());
  return row?.tier === "paid" ? "paid" : "free";
}

/** A success URL does not grant access. The ledger does. */
export function accessFromReturn(ledger: PreviewLedger, email: string, queryCheckout: string | undefined): "free" | "paid" {
  void queryCheckout;
  return tierFor(ledger, email);
}
