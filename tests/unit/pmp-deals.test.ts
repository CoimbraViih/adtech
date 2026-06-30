import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const PmpDealCreateSchema = z.object({
  deal_id: z.string().min(1),
  deal_name: z.string().min(1),
  deal_type: z.enum(['private', 'preferred', 'guaranteed']),
  floor_price: z.number().min(0),
  publisher_name: z.string().optional().nullable(),
  wseat: z.array(z.string()).optional().nullable(),
  start_date: z.string().datetime().optional().nullable(),
  end_date: z.string().datetime().optional().nullable(),
});

describe('PmpDealCreateSchema — Zod validation', () => {
  it('valid deal passes validation', () => {
    const result = PmpDealCreateSchema.safeParse({
      deal_id: 'deal-001',
      deal_name: 'Premium Deal',
      deal_type: 'private',
      floor_price: 5.0,
    });
    expect(result.success).toBe(true);
  });

  it('missing deal_id fails', () => {
    const result = PmpDealCreateSchema.safeParse({
      deal_name: 'Premium Deal',
      deal_type: 'private',
      floor_price: 5.0,
    });
    expect(result.success).toBe(false);
  });

  it('missing deal_name fails', () => {
    const result = PmpDealCreateSchema.safeParse({
      deal_id: 'deal-001',
      deal_type: 'private',
      floor_price: 5.0,
    });
    expect(result.success).toBe(false);
  });

  it('invalid deal_type fails enum validation', () => {
    const result = PmpDealCreateSchema.safeParse({
      deal_id: 'deal-001',
      deal_name: 'Premium Deal',
      deal_type: 'open', // not in enum
      floor_price: 5.0,
    });
    expect(result.success).toBe(false);
  });

  it('negative floor_price fails', () => {
    const result = PmpDealCreateSchema.safeParse({
      deal_id: 'deal-001',
      deal_name: 'Premium Deal',
      deal_type: 'guaranteed',
      floor_price: -1,
    });
    expect(result.success).toBe(false);
  });

  it('wseat array with strings accepted', () => {
    const result = PmpDealCreateSchema.safeParse({
      deal_id: 'deal-001',
      deal_name: 'Premium Deal',
      deal_type: 'preferred',
      floor_price: 3.5,
      wseat: ['buyer-1', 'buyer-2'],
    });
    expect(result.success).toBe(true);
  });

  it('nullable fields (publisher_name, wseat) accept null', () => {
    const result = PmpDealCreateSchema.safeParse({
      deal_id: 'deal-001',
      deal_name: 'Premium Deal',
      deal_type: 'private',
      floor_price: 2.0,
      publisher_name: null,
      wseat: null,
    });
    expect(result.success).toBe(true);
  });
});
