import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { enqueueEvent } from "@/lib/events/ingest";
import { getCredentialField } from "@/lib/integrations/credentials";
import {
  verifyNuvemshopHmac,
  parseNuvemshopOrder,
} from "@/lib/commerce/nuvemshop/webhooks";
import {
  verifyShopifyHmac,
  parseShopifyOrder,
} from "@/lib/commerce/shopify/webhooks";
import {
  verifyVtexHook,
  parseVtexOrder,
} from "@/lib/commerce/vtex/webhooks";
import type { CanonicalOrder } from "@/lib/commerce/types";

type RouteCtx = { params: Promise<{ provider: string }> };

const VALID_PROVIDERS = new Set(["nuvemshop", "vtex", "shopify"]);

export async function POST(
  request: NextRequest,
  { params }: RouteCtx
): Promise<NextResponse> {
  const { provider } = await params;

  if (!VALID_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const rawBody = await request.text();
  if (!rawBody) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  // Tenant is identified via ?org_id=<uuid> — no session on server-to-server calls
  const orgId = request.nextUrl.searchParams.get("org_id");
  if (!orgId) {
    return NextResponse.json({ error: "Missing org_id" }, { status: 400 });
  }

  // Verify signature per provider
  let verified = false;

  if (provider === "nuvemshop") {
    const sig = request.headers.get("x-linkedstore-hmac-sha256") ?? "";
    const secret =
      (await getCredentialField(orgId, "nuvemshop", "client_secret")) ?? "";
    verified = verifyNuvemshopHmac(rawBody, sig, secret);
  } else if (provider === "shopify") {
    const sig = request.headers.get("x-shopify-hmac-sha256") ?? "";
    const secret = process.env.SHOPIFY_CLIENT_SECRET ?? "";
    if (!secret) {
      return NextResponse.json({ error: "Shopify not configured" }, { status: 503 });
    }
    verified = verifyShopifyHmac(rawBody, sig, secret);
  } else if (provider === "vtex") {
    const headerToken = request.headers.get("x-vtex-api-apptoken") ?? "";
    const appToken =
      (await getCredentialField(
        orgId,
        "vtex",
        "app_token",
        "VTEX_API_TOKEN"
      )) ?? "";
    verified = verifyVtexHook(rawBody, appToken, headerToken);
  }

  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse JSON body
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Parse into canonical order
  let order: CanonicalOrder;
  try {
    if (provider === "nuvemshop") {
      order = parseNuvemshopOrder(raw);
    } else if (provider === "shopify") {
      order = parseShopifyOrder(raw);
    } else {
      order = parseVtexOrder(raw);
    }
  } catch (err) {
    console.error(`[commerce/webhook] parse failed for ${provider}:`, err);
    return NextResponse.json({ error: "Parse failed" }, { status: 422 });
  }

  const supabase = createServiceClient();

  // Fetch product_catalog record for orgId + provider → workspace_id
  const { data: catalog } = (await supabase
    .from("product_catalogs")
    .select("id, workspace_id")
    .eq("organization_id", orgId)
    .eq("provider", provider)
    .maybeSingle()) as {
    data: { id: string; workspace_id: string } | null;
  };

  if (!catalog) {
    console.warn(
      `[commerce/webhook] no catalog for org=${orgId} provider=${provider}`
    );
    return NextResponse.json(
      { error: "Catalog not configured" },
      { status: 404 }
    );
  }

  // Fetch the default pixel for the workspace
  const { data: pixel } = (await supabase
    .from("pixels")
    .select("id")
    .eq("workspace_id", catalog.workspace_id)
    .limit(1)
    .maybeSingle()) as { data: { id: string } | null };

  // Upsert commerce_order record (idempotent on catalog_id + external_order_id)
  const eventId = crypto.randomUUID();
  const { error: upsertError } = await supabase.from("commerce_orders").upsert(
    {
      organization_id: orgId,
      catalog_id: catalog.id,
      external_order_id: order.externalOrderId,
      status: "created",
      total_value: order.totalValue,
      currency: order.currency,
      line_items: order.lineItems,
      customer_email: order.customerEmail ?? null,
      placed_at: order.placedAt,
      event_id: eventId,
      raw_data: order.rawData ?? {},
    },
    { onConflict: "catalog_id,external_order_id" }
  );
  if (upsertError) {
    console.error("[commerce/webhook] order upsert failed:", upsertError);
    return NextResponse.json({ error: "DB write failed" }, { status: 500 });
  }

  // Inject purchase event into the AdFlow event pipeline when pixel is configured
  if (pixel) {
    await enqueueEvent({
      event_id: eventId,
      organization_id: orgId,
      workspace_id: catalog.workspace_id,
      pixel_id: pixel.id,
      event_type: "purchase",
      event_name: "Purchase",
      session_id: null,
      url: null,
      referrer: null,
      ip: null,
      user_agent: request.headers.get("user-agent"),
      value: order.totalValue,
      currency: order.currency,
      properties: {
        external_order_id: order.externalOrderId,
        provider,
        line_items: order.lineItems,
      },
      consent_state: "granted",
      event_time: order.placedAt,
    });
  }

  return NextResponse.json({ received: true });
}
