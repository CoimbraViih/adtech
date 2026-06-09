import type { PixelEvent } from "@/types/database";
import { getCredentialField } from "@/lib/integrations/credentials";

const META_CAPI_URL = "https://graph.facebook.com/v25.0";

export async function sendMetaCapiEvent(
  organizationId: string,
  event: PixelEvent,
  metaPixelId: string
): Promise<void> {
  const accessToken = await getCredentialField(organizationId, "meta", "access_token", "META_ACCESS_TOKEN");
  if (!accessToken) {
    console.warn("[meta-capi] META_ACCESS_TOKEN not set — skipping");
    return;
  }

  const payload = {
    data: [
      {
        event_name: mapEventName(event.event_type, event.event_name),
        event_time: Math.floor(new Date(event.received_at).getTime() / 1000),
        action_source: "website",
        event_source_url: event.url ?? undefined,
        user_data: {
          client_ip_address: event.ip ?? undefined,
          client_user_agent: event.user_agent ?? undefined,
        },
        custom_data:
          event.value != null
            ? { value: event.value, currency: event.currency ?? "BRL" }
            : undefined,
      },
    ],
  };

  const res = await fetch(`${META_CAPI_URL}/${metaPixelId}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[meta-capi] HTTP ${res.status}: ${body}`);
  }
}

function mapEventName(eventType: PixelEvent["event_type"], eventName: string | null): string {
  const map: Record<string, string> = {
    page_view: "PageView",
    add_to_cart: "AddToCart",
    purchase: "Purchase",
    lead: "Lead",
    sign_up: "CompleteRegistration",
    custom: eventName ?? "CustomEvent",
  };
  return map[eventType] ?? "CustomEvent";
}
