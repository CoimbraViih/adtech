import { z } from "zod";
import { selectBid, buildBidResponse } from "@/lib/rtb/bidder";
import { createServiceClient } from "@/lib/supabase/service";
import { matchUserToSegments } from "@/lib/rtb/dmp";
import { maskIp } from "@/lib/security/ip";
import { createRateLimiter } from "@/lib/security/rate-limit";
import type { RtbCampaign } from "@/types/database";

const BidRequestSchema = z.object({
  id: z.string().min(1),
  imp: z
    .array(
      z.object({
        id: z.string(),
        bidfloor: z.number().optional(),
        bidfloorcur: z.string().optional(),
      })
    )
    .min(1),
  at: z.union([z.literal(1), z.literal(2)]),
  user: z.object({ id: z.string() }).optional(),
  site: z.object({ domain: z.string(), page: z.string() }).optional(),
  device: z
    .object({ ua: z.string(), ip: z.string(), language: z.string() })
    .optional(),
  tmax: z.number().optional(),
});

const RTB_PAYLOAD_LIMIT = 50 * 1024; // 50 KB per OpenRTB spec recommendation

// 500 bid requests/min per IP (generous for SSP partners)
const rtbIpLimiter = createRateLimiter("rtb-ip", 500, 60_000);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request): Promise<Response> {
  const sspToken = process.env.RTB_SSP_TOKEN;

  if (!sspToken) {
    return new Response(JSON.stringify({ error: "SSP token not configured." }), {
      status: 503,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${sspToken}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Payload size cap (50 KB — read raw body text)
  let bodyText: string;
  try {
    bodyText = await (request as Request).text();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (bodyText.length > RTB_PAYLOAD_LIMIT) {
    return new Response(JSON.stringify({ error: "Payload too large." }), {
      status: 413,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // IP rate limit
  const rawIp =
    (request.headers as Headers).get("x-forwarded-for")?.split(",")[0].trim() ??
    (request.headers as Headers).get("x-real-ip") ??
    "unknown";

  if (rtbIpLimiter(rawIp)) {
    return new Response(JSON.stringify({ error: "Too many requests." }), {
      status: 429,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const startTime = Date.now();

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const parsed = BidRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid bid request." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  try {
    const bidRequest = parsed.data;

    await matchUserToSegments(bidRequest.user?.id ?? "", "");

    const serviceClient = createServiceClient();
    const { data: activeCampaigns } = await serviceClient
      .from("rtb_campaigns")
      .select("*")
      .eq("status", "active");

    const campaigns = (activeCampaigns ?? []) as RtbCampaign[];

    const bid = selectBid(campaigns, bidRequest, {
      todaySpend: new Map(),
      impressionCounts: new Map(),
    });

    const response = buildBidResponse(bidRequest.id, bidRequest.imp[0].id, bid);
    const elapsed = Date.now() - startTime;

    // Log anonymised IP only (LGPD)
    const anonIp = maskIp(rawIp === "unknown" ? null : rawIp);
    console.info("[rtb/bid] ip:", anonIp, "elapsed:", elapsed, "ms");

    if (!response.seatbid || response.seatbid.length === 0) {
      return new Response(null, {
        status: 204,
        headers: { ...CORS_HEADERS, "X-Response-Time": `${elapsed}ms` },
      });
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "X-Response-Time": `${elapsed}ms`,
      },
    });
  } catch (err) {
    console.error("[rtb/bid] unexpected error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente mais tarde." }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}
