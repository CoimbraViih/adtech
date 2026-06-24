/**
 * AdFlow M22 — Managed Spend Query
 *
 * Queries campaign_metrics_daily via a workspace→organization join
 * to aggregate total BRL spend for an org within a billing period.
 */

import { createServiceClient } from "@/lib/supabase/service";

export type BillingPeriod = {
  start: Date;
  end: Date;
};

/**
 * Returns the first and last day of the current calendar month.
 */
export function getCurrentBillingPeriod(): BillingPeriod {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

type MetricRow = {
  spend: string | number | null;
};

/**
 * Returns the total managed spend (BRL) for an organization
 * within the given date range (inclusive).
 *
 * Uses the service-role client (bypasses RLS) since this is called
 * from server-side billing logic without a user request context.
 *
 * Returns 0 on empty result set or Supabase error.
 */
export async function getManagedSpend(
  orgId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const supabase = createServiceClient();

  const startDate = periodStart.toISOString().split("T")[0];
  const endDate = periodEnd.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("campaign_metrics_daily")
    .select("spend, workspaces!inner(organization_id)")
    .eq("workspaces.organization_id", orgId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error || !data || data.length === 0) {
    return 0;
  }

  const total = (data as MetricRow[]).reduce((sum, row) => {
    const value = parseFloat(String(row.spend ?? "0"));
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  return total;
}
