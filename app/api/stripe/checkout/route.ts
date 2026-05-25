import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/lib/auth/session";
import { canAccessBilling } from "@/lib/auth/roles";
import { PLANS } from "@/lib/stripe/plans";

async function getStripe() {
  const { getStripeClient } = await import("@/lib/stripe/client");
  return getStripeClient();
}

const bodySchema = z.object({
  plan: z.enum(["pro", "agency"]),
});

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }

  const { plan } = parsed.data;
  const priceId = PLANS[plan].stripePriceId;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Fallback: no Stripe key configured (development)
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      url: `${appUrl}/settings/billing?mock_checkout=success&plan=${plan}`,
      mock: true,
    });
  }

  if (!priceId) {
    return NextResponse.json({ error: "Plano não configurado" }, { status: 500 });
  }

  try {
    const stripe = await getStripe();
    const organizationId = session.organization.id;

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings/billing?checkout=success`,
      cancel_url: `${appUrl}/settings/billing?checkout=canceled`,
      metadata: { organization_id: organizationId },
      subscription_data: {
        metadata: { organization_id: organizationId },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[stripe/checkout] erro:", err);
    return NextResponse.json({ error: "Erro ao criar checkout" }, { status: 500 });
  }
}
