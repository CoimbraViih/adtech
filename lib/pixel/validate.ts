import { z } from "zod";

const pixelEventSchema = z.object({
  event_type: z.enum(["page_view", "add_to_cart", "purchase", "lead", "sign_up", "custom"]),
  event_name: z.string().max(100).optional().nullable(),
  url: z.string().url().max(2048).optional().nullable(),
  referrer: z.string().url().max(2048).optional().nullable(),
  session_id: z.string().max(128).optional().nullable(),
  value: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  properties: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type ParsedPixelEvent = z.infer<typeof pixelEventSchema>;

export function parsePixelEvent(raw: unknown) {
  return pixelEventSchema.safeParse(raw);
}
