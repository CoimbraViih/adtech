/**
 * AdFlow M22 — Monthly Billing Period Close Cron
 *
 * Runs on day 1 of each month at 08:00 UTC (after metrics sync).
 * For each active org: queries managed spend for the previous month,
 * calculates the fee, creates a Stripe invoice, records it in `invoices`,
 * and closes the `billing_periods` row.
 *
 * Auth: CRON_SECRET via Authorization: Bearer header (same as other crons).
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getStripeClient } from "@/lib/stripe/client";
import { getManagedSpend } from "@/lib/billing/managed-spend";
import { calculateFee } from "@/lib/billing/fee-calculator";

// ── Inline row types (strict mode — no any) ──────────────────────────────────

type OrgRow = {
  id: string;
  stripe_customer_id: string | null;
  billing_status: string;
};

type BillingPeriodRow = {
  id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  status: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the first and last day of the PREVIOUS calendar month. */
function getPreviousMonthRange(): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
  const periodEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
  return { periodStart, periodEnd };
}

/** Formats a Date as a YYYY-MM-DD string (for Supabase DATE columns). */
function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Produces a human-readable pt-BR month/year label, e.g. "Maio/2025". */
function ptBRMonthYear(d: Date): string {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");

  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { periodStart, periodEnd } = getPreviousMonthRange();
  const periodStartStr = toDateString(periodStart);
  const periodEndStr = toDateString(periodEnd);
  const monthLabel = ptBRMonthYear(periodStart);

  // Capitalise first letter for the invoice description
  const monthLabelCapitalized =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  let processed = 0;
  let invoiced = 0;
  let skipped = 0;
  const errors: string[] = [];

  // 1. Fetch all active organisations
  const { data: orgs, error: orgsError } = await supabase
    .from("organizations")
    .select("id, stripe_customer_id, billing_status")
    .in("billing_status", ["active", "past_due"]);

  if (orgsError) {
    console.error("[cron/close-billing-period] failed to fetch orgs:", orgsError);
    return NextResponse.json({ error: "Failed to fetch organizations" }, { status: 500 });
  }

  const orgRows = (orgs ?? []) as OrgRow[];

  for (const org of orgRows) {
    processed++;

    try {
      // 2. Ensure an open billing_period exists for last month
      let billingPeriodId: string;

      const { data: existingPeriods, error: periodFetchError } = await supabase
        .from("billing_periods")
        .select("id, organization_id, period_start, period_end, status")
        .eq("organization_id", org.id)
        .eq("period_start", periodStartStr)
        .eq("status", "open")
        .limit(1);

      if (periodFetchError) {
        throw new Error(`billing_periods fetch error: ${periodFetchError.message}`);
      }

      const existingPeriod = (existingPeriods ?? []) as BillingPeriodRow[];

      if (existingPeriod.length > 0) {
        billingPeriodId = existingPeriod[0].id;
      } else {
        // Create the open period for last month
        const { data: newPeriod, error: insertPeriodError } = await supabase
          .from("billing_periods")
          .insert({
            organization_id: org.id,
            period_start: periodStartStr,
            period_end: periodEndStr,
            status: "open",
          })
          .select("id")
          .single();

        if (insertPeriodError || !newPeriod) {
          throw new Error(`billing_periods insert error: ${insertPeriodError?.message ?? "no row returned"}`);
        }

        billingPeriodId = (newPeriod as { id: string }).id;
      }

      // 3. Calculate managed spend and fee
      const spend = await getManagedSpend(org.id, periodStart, periodEnd);
      const fee = calculateFee(spend);

      // 4. Zero-spend month — close period without an invoice
      if (fee === 0) {
        const { error: closeError } = await supabase
          .from("billing_periods")
          .update({ status: "closed" })
          .eq("id", billingPeriodId);

        if (closeError) {
          throw new Error(`billing_periods close (no-fee) error: ${closeError.message}`);
        }

        skipped++;
        continue;
      }

      // 5. Guard: org must have a Stripe customer ID to be invoiced
      if (!org.stripe_customer_id) {
        console.warn(
          `[cron/close-billing-period] org ${org.id} has no stripe_customer_id — skipping invoice`
        );
        skipped++;
        continue;
      }

      // 6. Create Stripe invoice
      const stripe = getStripeClient();

      const stripeInvoice = await stripe.invoices.create({
        customer: org.stripe_customer_id,
        auto_advance: true,
        collection_method: "send_invoice" as const,
        days_until_due: 7,
        description: `Taxa AdFlow — ${monthLabelCapitalized}`,
        currency: "brl",
      });

      // 7. Add the line item (amount in centavos = fee * 100, rounded)
      await stripe.invoiceItems.create({
        customer: org.stripe_customer_id,
        invoice: stripeInvoice.id,
        amount: Math.round(fee * 100),
        currency: "brl",
        description: `Taxa de gestão AdFlow — ${monthLabelCapitalized} (gasto gerenciado: R$ ${spend.toFixed(2)})`,
      });

      // 8. Finalize the invoice to generate the hosted payment link
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(stripeInvoice.id);

      // 9. Record in local invoices table
      const { error: invoiceInsertError } = await supabase
        .from("invoices")
        .insert({
          organization_id: org.id,
          billing_period_id: billingPeriodId,
          stripe_invoice_id: finalizedInvoice.id,
          amount_brl: fee,
          spend_brl: spend,
          status: "open",
          stripe_hosted_url: finalizedInvoice.hosted_invoice_url ?? null,
        });

      if (invoiceInsertError) {
        throw new Error(`invoices insert error: ${invoiceInsertError.message}`);
      }

      // 10. Close the billing period
      const { error: closePeriodError } = await supabase
        .from("billing_periods")
        .update({ status: "closed" })
        .eq("id", billingPeriodId);

      if (closePeriodError) {
        throw new Error(`billing_periods close error: ${closePeriodError.message}`);
      }

      invoiced++;
    } catch (orgErr) {
      const message =
        orgErr instanceof Error ? orgErr.message : String(orgErr);
      console.error(
        `[cron/close-billing-period] error processing org ${org.id}:`,
        message
      );
      errors.push(`org=${org.id}: ${message}`);
    }
  }

  console.log(
    `[cron/close-billing-period] done — processed=${processed} invoiced=${invoiced} skipped=${skipped} errors=${errors.length}`
  );

  return NextResponse.json({ processed, invoiced, skipped, errors });
}
