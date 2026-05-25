import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/lib/auth/session";
import { canAccessBilling } from "@/lib/auth/roles";

async function getStripe() {
  const { getStripeClient } = await import("@/lib/stripe/client");
  return getStripeClient();
}

export async function POST() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const session = await getSessionFromCookies(cookieHeader);

  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  if (!canAccessBilling(session)) {
    return NextResponse.json(
      { error: "Apenas o proprietário pode gerenciar a assinatura" },
      { status: 403 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Fallback: no Stripe key (development)
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      url: `${appUrl}/settings/billing?mock_portal=open`,
      mock: true,
    });
  }

  const stripeCustomerId = session.organization.stripe_customer_id;
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "Organização sem assinatura ativa" },
      { status: 400 }
    );
  }

  try {
    const stripe = await getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[stripe/portal] erro:", err);
    return NextResponse.json({ error: "Erro ao abrir portal" }, { status: 500 });
  }
}
