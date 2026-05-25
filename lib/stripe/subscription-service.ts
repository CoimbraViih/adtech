/**
 * Subscription DB service — writes Stripe events to Supabase.
 * Uses @supabase/supabase-js service role client when env vars are configured.
 * Falls back to a no-op stub (same pattern as lib/supabase/service.ts).
 *
 * TODO(M1-backend): once real Supabase is wired, this module is production-ready.
 */

import type {
  SubscriptionUpsertPayload,
  SubscriptionDeletePayload,
} from "@/lib/stripe/webhooks";

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function getServiceClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/** Upsert subscription row + sync org plan */
export async function upsertSubscription(
  payload: SubscriptionUpsertPayload
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log(
      "[subscription-service] stub: upsert subscription",
      payload.organizationId,
      payload.plan
    );
    return;
  }

  const supabase = await getServiceClient();

  const { error } = await supabase.from("subscriptions").upsert(
    {
      organization_id: payload.organizationId,
      stripe_customer_id: payload.stripeCustomerId,
      stripe_subscription_id: payload.stripeSubscriptionId,
      plan: payload.plan,
      status: payload.status,
      current_period_start: payload.currentPeriodStart,
      current_period_end: payload.currentPeriodEnd,
      cancel_at_period_end: payload.cancelAtPeriodEnd,
    },
    { onConflict: "organization_id" }
  );

  if (error) {
    console.error("[subscription-service] upsert error:", error.message);
    throw error;
  }
}

/** Downgrade org to free plan when subscription is deleted */
export async function deleteSubscription(
  payload: SubscriptionDeletePayload
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log(
      "[subscription-service] stub: delete subscription",
      payload.organizationId
    );
    return;
  }

  const supabase = await getServiceClient();

  // Update organizations.plan directly (trigger also handles this, but belt-and-suspenders)
  const { error: orgError } = await supabase
    .from("organizations")
    .update({ plan: "free" })
    .eq("id", payload.organizationId);

  if (orgError) {
    console.error(
      "[subscription-service] org downgrade error:",
      orgError.message
    );
  }

  // Remove subscription row
  const { error: subError } = await supabase
    .from("subscriptions")
    .delete()
    .eq("stripe_subscription_id", payload.stripeSubscriptionId);

  if (subError) {
    console.error(
      "[subscription-service] subscription delete error:",
      subError.message
    );
    throw subError;
  }
}

/** Mark subscription as past_due when payment fails */
export async function markSubscriptionPastDue(
  stripeSubscriptionId: string
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log(
      "[subscription-service] stub: mark past_due",
      stripeSubscriptionId
    );
    return;
  }

  const supabase = await getServiceClient();

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", stripeSubscriptionId);

  if (error) {
    console.error("[subscription-service] past_due update error:", error.message);
    throw error;
  }
}

/** Log a Stripe event to billing_events for idempotency and audit */
export async function logBillingEvent(
  organizationId: string,
  stripeEventId: string,
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log(
      "[subscription-service] stub: log billing event",
      stripeEventId
    );
    return;
  }

  const supabase = await getServiceClient();

  // upsert with stripe_event_id as conflict target — safe to replay
  const { error } = await supabase.from("billing_events").upsert(
    {
      organization_id: organizationId,
      stripe_event_id: stripeEventId,
      type: eventType,
      payload,
    },
    { onConflict: "stripe_event_id" }
  );

  if (error && !error.message.includes("duplicate")) {
    console.error(
      "[subscription-service] billing event log error:",
      error.message
    );
  }
}

/** Check if a Stripe event has already been processed (idempotency) */
export async function isEventAlreadyProcessed(
  stripeEventId: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const supabase = await getServiceClient();

  const { data, error } = await supabase
    .from("billing_events")
    .select("id")
    .eq("stripe_event_id", stripeEventId)
    .single();

  if (error && error.message.includes("No rows")) return false;
  return !!data;
}
