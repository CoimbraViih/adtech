import { z } from "zod";
import { MOCK_RTB_CAMPAIGNS } from "@/lib/rtb/mock-data";
import { selectBid, buildBidResponse } from "@/lib/rtb/bidder";
import { matchUserToSegments } from "@/lib/rtb/dmp";

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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// OPTIONS — CORS preflight
export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// POST /api/rtb/bid — OpenRTB 2.6 bid endpoint
export async function POST(request: Request): Promise<Response> {
  // Bearer token auth (if RTB_SSP_TOKEN is configured)
  const sspToken = process.env.RTB_SSP_TOKEN;
  if (sspToken) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || authHeader !== `Bearer ${sspToken}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  const startTime = Date.now();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const parsed = BidRequestSchema.safeParse(body);
  if (!parsed.success) {
    console.error("[rtb/bid] validation error:", parsed.error.issues);
    return new Response(
      JSON.stringify({ error: "Invalid bid request." }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const bidRequest = parsed.data;

    // Match user to DMP segments (side-effect: audience enrichment)
    await matchUserToSegments(bidRequest.user?.id ?? "", "demo");

    // TODO(M8-backend): replace mock data with real DB query + log bid to bid_requests_log
    const campaigns = MOCK_RTB_CAMPAIGNS.filter((c) => c.status === "active");

    const bid = selectBid(campaigns, bidRequest, {
      todaySpend: new Map(),
      impressionCounts: new Map(),
    });

    const response = buildBidResponse(
      bidRequest.id,
      bidRequest.imp[0].id,
      bid
    );

    const elapsed = Date.now() - startTime;

    // No eligible bid — return HTTP 204 (no content)
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
    console.error("[rtb/bid] unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente mais tarde." }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}
