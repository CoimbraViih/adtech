import { NextRequest, NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { buildNuvemshopAuthUrl } from "@/lib/commerce/nuvemshop/client";
import { buildShopifyAuthUrl } from "@/lib/commerce/shopify/client";

type RouteCtx = { params: Promise<{ provider: string }> };

const VALID = new Set(["nuvemshop", "shopify"]);

export async function GET(
  request: NextRequest,
  { params }: RouteCtx
): Promise<NextResponse> {
  try {
    await requireServerSession();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { provider } = await params;
  if (!VALID.has(provider)) {
    return NextResponse.json({ error: "Unknown commerce provider" }, { status: 400 });
  }

  const state = crypto.randomUUID();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/commerce/${provider}/oauth/callback`;

  let authUrl: string;
  if (provider === "nuvemshop") {
    authUrl = await buildNuvemshopAuthUrl(state, redirectUri);
  } else {
    // Shopify needs the shop domain — user passes it as ?shop=
    const shop = request.nextUrl.searchParams.get("shop");
    if (!shop) {
      return NextResponse.json({ error: "Missing ?shop= parameter for Shopify" }, { status: 400 });
    }
    authUrl = buildShopifyAuthUrl(shop, state, redirectUri);
  }

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(`commerce_oauth_state_${provider}`, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  // For Shopify, store shop domain in cookie so callback can use it
  if (provider === "shopify") {
    response.cookies.set("commerce_shopify_shop", request.nextUrl.searchParams.get("shop") ?? "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }

  return response;
}
