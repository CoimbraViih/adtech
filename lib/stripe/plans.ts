import type { OrgPlan } from "@/types/database";

export type PlanConfig = {
  name: string;
  priceMonthly: number;
  stripePriceId: string;
  campaigns: number;
  creatives: number;
  pixels: number;
  features: {
    aiCreatives: boolean;
    automation: boolean;
    programmatic: boolean;
    whiteLabel: boolean;
    prioritySupport: boolean;
  };
};

export const PLANS: Record<OrgPlan, PlanConfig> = {
  free: {
    name: "Free",
    priceMonthly: 0,
    stripePriceId: "",
    campaigns: 3,
    creatives: 10,
    pixels: 1,
    features: {
      aiCreatives: false,
      automation: false,
      programmatic: false,
      whiteLabel: false,
      prioritySupport: false,
    },
  },
  pro: {
    name: "Pro",
    priceMonthly: 50000,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? "price_pro_test",
    campaigns: 25,
    creatives: 100,
    pixels: 5,
    features: {
      aiCreatives: true,
      automation: true,
      programmatic: false,
      whiteLabel: false,
      prioritySupport: false,
    },
  },
  agency: {
    name: "Agency",
    priceMonthly: 300000,
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID ?? "price_agency_test",
    campaigns: -1,
    creatives: -1,
    pixels: -1,
    features: {
      aiCreatives: true,
      automation: true,
      programmatic: true,
      whiteLabel: true,
      prioritySupport: true,
    },
  },
};

export function campaignLimit(plan: OrgPlan): number {
  return PLANS[plan].campaigns;
}

export function creativeLimit(plan: OrgPlan): number {
  return PLANS[plan].creatives;
}

export function pixelLimit(plan: OrgPlan): number {
  return PLANS[plan].pixels;
}

/** Returns true when current usage is AT or ABOVE the plan limit. -1 means unlimited. */
export function isOverLimit(current: number, limit: number): boolean {
  if (limit === -1) return false;
  return current >= limit;
}

export function canAccessAiCreatives(plan: OrgPlan): boolean {
  return PLANS[plan].features.aiCreatives;
}

export function canAccessAutomation(plan: OrgPlan): boolean {
  return PLANS[plan].features.automation;
}

export function canAccessProgrammatic(plan: OrgPlan): boolean {
  return PLANS[plan].features.programmatic;
}

export function canAccessWhiteLabel(plan: OrgPlan): boolean {
  return PLANS[plan].features.whiteLabel;
}

export function getPlanByPriceId(priceId: string): OrgPlan {
  if (!priceId) return "free";
  if (priceId === PLANS.pro.stripePriceId) return "pro";
  if (priceId === PLANS.agency.stripePriceId) return "agency";
  return "free";
}

export function formatPlanPrice(plan: OrgPlan): string {
  const { priceMonthly } = PLANS[plan];
  if (priceMonthly === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(priceMonthly / 100);
}

export function formatLimit(limit: number): string {
  return limit === -1 ? "Ilimitado" : String(limit);
}
