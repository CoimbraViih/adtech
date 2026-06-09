import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  handleCheckoutCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handlePaymentFailed,
} from "@/lib/stripe/webhooks";
import { getPlanByPriceId } from "@/lib/stripe/plans";
import type { SubscriptionStatus } from "@/types/database";
import {
  upsertSubscription,
  deleteSubscription,
  markSubscriptionPastDue,
  logBillingEvent,
  isEventAlreadyProcessed,
} from "@/lib/stripe/subscription-service";

export const dynamic = "force-dynamic";

async function getStripe() {
  const { getStripeClient } = await import("@/lib/stripe/client");
  return getStripeClient();
}

const VALID_STATUSES: SubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
];

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    if (process.env.NODE_ENV === "production") {
      console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET ou STRIPE_SECRET_KEY ausente em produção");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }
    return NextResponse.json({ received: true, mock: true });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = await getStripe();
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] assinatura inválida:", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  if (await isEventAlreadyProcessed(event.id)) {
    return NextResponse.json({ received: true, skipped: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const subRaw = session.subscription;
        const subId =
          typeof subRaw === "string" ? subRaw : (subRaw?.id ?? "");

        // When subscription is expanded, extract period from first item
        const expandedSub =
          typeof subRaw === "object" && subRaw !== null
            ? (subRaw as Stripe.Subscription)
            : null;
        const firstItem = expandedSub?.items?.data[0];
        const priceId = firstItem?.price?.id ?? "";
        const periodStart = firstItem
          ? new Date(firstItem.current_period_start * 1000).toISOString()
          : new Date().toISOString();
        const periodEnd = firstItem
          ? new Date(firstItem.current_period_end * 1000).toISOString()
          : new Date().toISOString();

        const stripeCustomerId =
          typeof session.customer === "string"
            ? session.customer
            : (session.customer?.id ?? "");

        const payload = handleCheckoutCompleted({
          organizationId: session.metadata?.organization_id ?? "",
          stripeCustomerId,
          stripeSubscriptionId: subId,
          stripePriceId: priceId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
        });

        await upsertSubscription(payload);
        await logBillingEvent(
          payload.organizationId,
          event.id,
          event.type,
          event.data.object as unknown as Record<string, unknown>
        );
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const firstItem = sub.items.data[0];
        const priceId = firstItem?.price?.id ?? "";
        const rawStatus = sub.status as string;
        const status: SubscriptionStatus = VALID_STATUSES.includes(rawStatus as SubscriptionStatus)
          ? (rawStatus as SubscriptionStatus)
          : (() => {
              console.warn("[stripe/webhook] status desconhecido, tratando como past_due:", rawStatus);
              return "past_due" as SubscriptionStatus;
            })();

        // Period fields live on SubscriptionItem in this SDK version
        const periodStart = firstItem
          ? new Date(firstItem.current_period_start * 1000).toISOString()
          : new Date().toISOString();
        const periodEnd = firstItem
          ? new Date(firstItem.current_period_end * 1000).toISOString()
          : new Date().toISOString();

        const subCustomerId =
          typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? "");

        const payload = handleSubscriptionUpdated({
          organizationId: sub.metadata?.organization_id ?? "",
          stripeCustomerId: subCustomerId,
          stripeSubscriptionId: sub.id,
          plan: getPlanByPriceId(priceId),
          status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        });

        await upsertSubscription(payload);
        await logBillingEvent(
          payload.organizationId,
          event.id,
          event.type,
          event.data.object as unknown as Record<string, unknown>
        );
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const payload = handleSubscriptionDeleted({
          organizationId: sub.metadata?.organization_id ?? "",
          stripeSubscriptionId: sub.id,
        });

        await deleteSubscription(payload);
        await logBillingEvent(
          payload.organizationId,
          event.id,
          event.type,
          event.data.object as unknown as Record<string, unknown>
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // In this Stripe SDK version, subscription metadata lives under invoice.parent.subscription_details.metadata
        const subMeta = invoice.parent?.subscription_details?.metadata;
        const invoiceCustomerId =
          typeof invoice.customer === "string" ? invoice.customer : (invoice.customer?.id ?? "");

        const payload = handlePaymentFailed({
          organizationId: subMeta?.organization_id ?? "",
          stripeCustomerId: invoiceCustomerId,
          amountDue: invoice.amount_due,
        });

        const invoiceSubRaw = invoice.parent?.subscription_details?.subscription;
        const invoiceSubId =
          typeof invoiceSubRaw === "string"
            ? invoiceSubRaw
            : (invoiceSubRaw?.id ?? "");
        if (invoiceSubId) {
          await markSubscriptionPastDue(invoiceSubId);
        }
        await logBillingEvent(
          payload.organizationId,
          event.id,
          event.type,
          event.data.object as unknown as Record<string, unknown>
        );
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] erro ao processar:", event.type, err);
    // Return 200 to prevent Stripe retries on logic errors
  }

  return NextResponse.json({ received: true });
}
