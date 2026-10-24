# Proposed public pricing copy (FOR OWNER REVIEW — not applied)

Pricing (owner update 2026-09-25, all USD). Annual is the default plan, shown first:
- Founding, first 100: **$600/yr**, billed annually, rate locked for life while you renew (works out to $50/mo).
- After the first 100: **Standard annual $1,069/yr** (recommended), or **Standard monthly $99/mo**.

None of this is live yet. The nightly routine deploys the working tree, so these pages are left
unchanged until you approve. Once approved, apply the edits below and deploy. The flagged `/account`
flow already uses this pricing.

The main visible change: "After 100" now leads with $1,069/yr, with $99/mo as the secondary option.
Founding stays at $50/mo equivalent, now stated as $600/yr.

---

## 1. Homepage `src/app/page.tsx`

**Hero footnote (line ~121)**
```diff
- Ongoing Launch Promo · First 100 lock $50/mth forever (paid annual)
+ Launch promo · First 100 lock $600/yr for life (just $50/mo, billed annually)
```

**Pricing section heading (line ~341)** unchanged:
"First 100 members lock lifetime price with no future increases."

**First-100 card (lines ~346–353)**
```diff
  First 100
- $50/mo
- Annual billing · rate locked for life while you renew
+ $600/yr
+ Billed annually (US$50/mo) · rate locked for life while you renew
```
CTA "Claim launch rate" unchanged.

**After-100 card (lines ~373–384)**
```diff
  After 100
- $99/mo
- Standard rate · discount codes later
+ $1,069/yr
+ Standard annual · best value (about $89/mo)
+ or $99/mo billed monthly
  Still includes the full membership stack.
```

**FAQ answer (line ~62)**
```diff
- The first 100 members pay $50/mo on annual billing, locked for life while they renew. After the first 100, the standard rate is $99/mo.
+ The first 100 members pay $600/yr (US$50/mo, billed annually), locked for life while they renew. After the first 100, standard membership is $1,069/yr, or $99/mo on monthly billing. Annual plans are non-refundable; turning off auto-renew keeps your access until the end of the paid year.
```

**Final CTA (line ~458)**
```diff
- You are still within the launch price of $50/month (lifetime). Get started today
+ You are still within the launch price of $600/yr ($50/mo, locked for life). Get started today
```

## 2. Signup `src/app/signup/page.tsx` (lines ~50–70)

```diff
  First 100 · launch special
- $50/mo
- Billed yearly · rate locked while you renew
+ $600/yr
+ Billed annually (US$50/mo) · rate locked for life while you renew

  After 100
- $99/mo
+ $1,069/yr  · or $99/mo monthly
```
On ship day the "Continue to Stripe" stub button points to `/account/signup`, and its helper text changes (separate checklist step).

## 3. `src/components/MembersPricingNote.tsx` (lines ~18–23)

```diff
- First 100: $50/mo annual, locked while renewing. After 100: $99/mo. Design mode — checkout stubbed; no live charge.
+ First 100: $600/yr (US$50/mo, billed annually), locked for life while renewing. After 100: $1,069/yr or $99/mo monthly. Design mode — checkout stubbed; no live charge.
```

## 4. Also mentions price: `src/app/tuition/page.tsx` (line ~172)

```diff
- explore members for the weekly light (US$50/mo in production).
+ explore members for the weekly light (from US$600/yr for founding members).
```

## Questions for the owner
- Show "$600/yr" first, or keep "$50/mo" first with "billed $600 annually" underneath? The proposal leads with $600/yr to match "annual is the priority".
- Show "about $89/mo" next to $1,069/yr?
- Keep "discount codes later" on the After-100 card? The proposal drops it.
