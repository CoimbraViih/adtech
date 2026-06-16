import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurada");
  }

  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-05-27.dahlia",
    });
  }

  return _stripe;
}

/** Returns true when Stripe is configured (key is present). */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
