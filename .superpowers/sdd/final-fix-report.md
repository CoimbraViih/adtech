# M22 Final Fix Report

## STATUS: DONE

**Commit:** c5da619  
**Tests:** 18/18 passed (fee-calculator.test.ts) | tsc --noEmit: 0 errors

---

## What Was Fixed

### CRITICAL Fixes

**CRITICAL #1 — `invoice.paid`: billing_period_id nullable inconsistency**
- File: `app/api/stripe/webhook/route.ts`
- Removed `string | null` cast on `billing_period_id`; now typed as `string`
- Removed `if (billingPeriodId)` null guard — always updates billing_periods directly
- Added explicit `console.log` early-return when `internalInvoice` is not found (before billingPeriodId is ever used)

**CRITICAL #2 — Cron: Missing `collection_method: "send_invoice"`**
- File: `app/api/cron/close-billing-period/route.ts`
- Added `collection_method: "send_invoice" as const` and `days_until_due: 7` to `stripe.invoices.create()` call
- Prevents Stripe from immediately charging customer cards instead of sending an invoice

**CRITICAL #3 — `invoice.paid` webhook never calls `logBillingEvent`**
- On inspection, `logBillingEvent` was ALREADY present at step 5 of the `invoice.paid` case (lines 221–227 in the original). The review finding was already satisfied. No new call was needed — confirmed and left in place.

---

### IMPORTANT Fixes

**IMPORTANT #1 — `isOrgBillingBlocked()` never called**
- File: `app/api/campaigns/route.ts`
- Added import of `isOrgBillingBlocked` from `@/lib/auth/roles`
- Added billing gate check at the top of `POST /api/campaigns` handler, after permission check, before rate limiter:
  ```ts
  const billingBlocked = await isOrgBillingBlocked(session.organization.id);
  if (billingBlocked) return NextResponse.json({ error: "Conta com pagamento pendente" }, { status: 402 });
  ```
- Campaign creation is the clearest billable write action; other mutating endpoints (creatives, etc.) are a gap to address in a follow-up pass.

**IMPORTANT #2 — `calculateFee` floating-point imprecision**
- File: `lib/billing/fee-calculator.ts`
- Changed return to `Math.round(Math.max(FLOOR_BRL, fee) * 100) / 100`
- All 18 existing tests still pass — no assertions needed rounding adjustments (all test values are already exact integers or exact representations)

**IMPORTANT #3 — Cron skips `past_due` orgs**
- File: `app/api/cron/close-billing-period/route.ts`
- Changed `.eq("billing_status", "active")` to `.in("billing_status", ["active", "past_due"])`
- `past_due` orgs now receive monthly invoices, preventing unbilled spend accumulation

**IMPORTANT #4 — Dead `openPeriodResult` query in billing page**
- File: `app/(dashboard)/settings/billing/page.tsx`
- Removed the `billing_periods` query from `Promise.all` entirely
- Removed `void openPeriodResult` dead discard
- Reduced Promise.all from 4 queries to 3 on every billing page load

---

### MINOR Fixes

**MINOR #1 — `UsageMeter` dead alias**
- File: `components/billing/usage-meter.tsx`
- Removed `export { SpendMeter as UsageMeter }` and associated comment — zero callers confirmed

**MINOR #2 — `invoices.status` missing `'payment_failed'`**
- Created new migration: `supabase/migrations/030_invoice_status_payment_failed.sql`
  - Drops old `invoices_status_check` constraint
  - Re-adds with `payment_failed` included in the allowed values
- Updated `invoice.payment_failed` webhook case in `app/api/stripe/webhook/route.ts`:
  - When `internalInvoice` exists, now also runs `UPDATE invoices SET status = 'payment_failed'` alongside the org `billing_status = 'past_due'` update

---

## Items That Could Not Be Fully Wired

- **`isOrgBillingBlocked` coverage:** Only wired at `POST /api/campaigns`. Other mutating endpoints (creatives, landing pages, ad sets, etc.) do not yet check billing status. These should be addressed in a follow-up hardening pass. The gap is documented but out of scope for this review fix.

---

## Test Results

```
npx vitest run tests/unit/billing/fee-calculator.test.ts
  Test Files  1 passed (1)
  Tests       18 passed (18)
  Duration    1.37s

npx tsc --noEmit
  (no output — zero errors)
```

## Commit Hash

`c5da619`
