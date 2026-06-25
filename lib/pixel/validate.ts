import { z } from "zod";
import type { GcmSignals } from '@/lib/consent/mode';

/**
 * Preprocessor: normalise empty string / whitespace-only to null.
 * Prevents z.string().url() from rejecting "" (which is technically invalid
 * but commonly sent by browsers for missing referrer / url fields).
 */
const urlOrNull = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? null : v),
  z.string().url().max(2048).optional().nullable()
);

const gcmSignalsSchema = z.object({
  analytics_storage: z.enum(['granted', 'denied']).optional(),
  ad_storage: z.enum(['granted', 'denied']).optional(),
  ad_user_data: z.enum(['granted', 'denied']).optional(),
  ad_personalization: z.enum(['granted', 'denied']).optional(),
}).optional();

// Compile-time check: Zod schema output must be assignable to GcmSignals
type _GcmSignalsCheck = Exclude<z.infer<typeof gcmSignalsSchema>, undefined> extends GcmSignals ? true : never;

const pixelEventSchema = z.object({
  event_type: z.enum(["page_view", "add_to_cart", "purchase", "lead", "sign_up", "custom"]),
  event_name: z.string().max(100).optional().nullable(),
  url: urlOrNull,
  referrer: urlOrNull,
  session_id: z.string().max(128).optional().nullable(),
  value: z.number().nonnegative().optional().nullable(),
  currency: z.string().length(3).optional().nullable(),
  properties: z.record(z.string(), z.unknown()).optional().nullable(),
  consent_state: z.enum(['granted', 'denied', 'unknown']).default('unknown'),
  gcm_signals: gcmSignalsSchema,
});

export type ParsedPixelEvent = z.infer<typeof pixelEventSchema>;

export function parsePixelEvent(raw: unknown) {
  return pixelEventSchema.safeParse(raw);
}
