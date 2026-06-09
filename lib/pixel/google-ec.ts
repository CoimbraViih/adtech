import type { PixelEvent } from "@/types/database";
import { getCredentialField } from "@/lib/integrations/credentials";

const GA4_MP_URL = "https://www.google-analytics.com/mp/collect";

export async function sendGoogleEcEvent(
  organizationId: string,
  event: PixelEvent,
  googleTagId: string
): Promise<void> {
  const apiSecret = await getCredentialField(organizationId, "google", "ga4_api_secret", "GA4_API_SECRET");
  if (!apiSecret) {
    console.warn("[google-ec] GA4_API_SECRET not set — skipping");
    return;
  }

  const payload = {
    client_id: event.session_id ?? event.ip ?? "anonymous",
    events: [
      {
        name: mapEventName(event.event_type, event.event_name),
        params: {
          ...(event.value != null && {
            value: event.value,
            currency: event.currency ?? "BRL",
          }),
          page_location: event.url ?? undefined,
          ...(event.properties ?? {}),
        },
      },
    ],
  };

  const url = `${GA4_MP_URL}?measurement_id=${googleTagId}&api_secret=${apiSecret}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[google-ec] HTTP ${res.status}: ${body}`);
  }
}

function mapEventName(eventType: PixelEvent["event_type"], eventName: string | null): string {
  const map: Record<string, string> = {
    page_view: "page_view",
    add_to_cart: "add_to_cart",
    purchase: "purchase",
    lead: "generate_lead",
    sign_up: "sign_up",
    custom: eventName ?? "custom_event",
  };
  return map[eventType] ?? "custom_event";
}
