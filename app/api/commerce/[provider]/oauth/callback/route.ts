import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { exchangeNuvemshopCode } from "@/lib/commerce/nuvemshop/client";
import { exchangeShopifyCode } from "@/lib/commerce/shopify/client";
import { upsertCredentials } from "@/lib/integrations/credentials";
import { createServiceClient } from "@/lib/supabase/service";

type RouteCtx = { params: Promise<{ provider: string }> };

async function ensureCatalogRecord(
  orgId: string,
  workspaceId: string,
  provider: string,
  externalStoreId: string,
  storeName?: string
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("product_catalogs")
    .upsert(
      {
        organization_id: orgId,
        workspace_id: workspaceId,
        provider,
        external_store_id: externalStoreId,
        store_name: storeName ?? externalStoreId,
      },
      { onConflict: "organization_id,provider" }
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to upsert product_catalogs: ${error?.message ?? "no data"}`);
  }
  return (data as { id: string }).id;
}

export async function GET(
  request: NextRequest,
  { params }: RouteCtx
): Promise<NextResponse> {
  const { provider } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const errorUrl = `${appUrl}/settings/integrations/commerce?error=auth_failed`;

  let session;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.redirect(errorUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(`commerce_oauth_state_${provider}`)?.value;

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(errorUrl);
  }

  try {
    if (provider === "nuvemshop") {
      const redirectUri = `${appUrl}/api/commerce/nuvemshop/oauth/callback`;
      const { accessToken, userId } = await exchangeNuvemshopCode(code, redirectUri);

      await upsertCredentials(session.organization.id, "nuvemshop", {
        access_token: accessToken,
        user_id: userId,
        client_secret: process.env.NUVEMSHOP_CLIENT_SECRET ?? "",
        oauth_connected: "true",
      });

      await ensureCatalogRecord(
        session.organization.id,
        session.workspace.id,
        "nuvemshop",
        userId
      );
    } else if (provider === "shopify") {
      const shop = request.cookies.get("commerce_shopify_shop")?.value;
      if (!shop) return NextResponse.redirect(errorUrl);

      const { accessToken } = await exchangeShopifyCode(shop, code);

      await upsertCredentials(session.organization.id, "shopify", {
        access_token: accessToken,
        shop_domain: shop,
        oauth_connected: "true",
      });

      await ensureCatalogRecord(
        session.organization.id,
        session.workspace.id,
        "shopify",
        shop,
        shop
      );
    } else {
      return NextResponse.redirect(errorUrl);
    }
  } catch (err) {
    console.error(`[commerce/oauth/callback] ${provider} failed:`, err);
    return NextResponse.redirect(errorUrl);
  }

  const successUrl = `${appUrl}/settings/integrations/commerce?connected=${provider}`;
  const response = NextResponse.redirect(successUrl);
  response.cookies.delete(`commerce_oauth_state_${provider}`);
  if (provider === "shopify") response.cookies.delete("commerce_shopify_shop");
  return response;
}
