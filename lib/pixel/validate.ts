import { z } from "zod";

/**
 * Preprocessor: normalise empty string / whitespace-only to null.
 * Prevents z.string().url() from rejecting "" (which is technically invalid
 * but commonly sent by browsers for missing referrer / url fields).
 */
const urlOrNull = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().url().max(2048).optional().nullable()
);

const pixelEventSchema = z.object({
  event_type: z.enum(["page_view", "add_to_cart", "purchase", "lead", "sign_up", "custom"]),
  event_name: z.string().max(100).optional().nullable(),
  url: urlOrNull,
  referrer: urlOrNull,
  session_id: z.string().max(128).optional().nullable(),
  value: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  properties: z.record(z.string(), z.unknown()).optional().nullable(),
});

export type ParsedPixelEvent = z.infer<typeof pixelEventSchema>;

export function parsePixelEvent(raw: unknown) {
  return pixelEventSchema.safeParse(raw);
}
