import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireServerSession } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getManagedSpend, getCurrentBillingPeriod } from "@/lib/billing/managed-spend";
import { calculateFee } from "@/lib/billing/fee-calculator";
import { BillingPageClient } from "./billing-page-client";

type InvoiceRow = {
  id: string;
  amount_brl: number;
  spend_brl: number;
  status: string;
  stripe_hosted_url: string | null;
  paid_at: string | null;
  created_at: string;
  billing_period_id: string;
};

async function BillingData() {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const orgId = session.organization.id;
  const supabase = createServiceClient();

  // Current billing period
  const period = getCurrentBillingPeriod();

  // Period label e.g. "Junho 2026"
  const currentPeriodLabel = period.start.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  // Fetch all data in parallel
  const [spendResult, orgResult, invoicesResult, openPeriodResult] =
    await Promise.all([
      getManagedSpend(orgId, period.start, period.end),
      supabase
        .from("organizations")
        .select("billing_status")
        .eq("id", orgId)
        .single(),
      supabase
        .from("invoices")
        .select(
          "id, amount_brl, spend_brl, status, stripe_hosted_url, paid_at, created_at, billing_period_id"
        )
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("billing_periods")
        .select("id, status")
        .eq("organization_id", orgId)
        .eq("status", "open")
        .limit(1)
        .maybeSingle(),
    ]);

  const currentSpendBRL = spendResult;
  const estimatedFeeBRL = calculateFee(currentSpendBRL);
  const billingStatus =
    (orgResult.data?.billing_status as string | undefined) ?? "active";
  const invoices = (invoicesResult.data ?? []) as InvoiceRow[];
  // openPeriod is available for future use if needed
  void openPeriodResult;

  return (
    <BillingPageClient
      billingStatus={billingStatus}
      currentSpendBRL={currentSpendBRL}
      estimatedFeeBRL={estimatedFeeBRL}
      currentPeriodLabel={currentPeriodLabel}
      invoices={invoices}
    />
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingData />
    </Suspense>
  );
}
