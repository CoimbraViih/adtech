import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AdFlowEvent } from '@/lib/events/schema';

const mockInsert = vi.fn();
const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { enqueueEvent } from '@/lib/events/ingest';

const sampleEvent: AdFlowEvent = {
  event_id: 'e-1', organization_id: 'org-1', workspace_id: 'ws-1',
  pixel_id: 'px-1', event_type: 'pageview', event_name: null,
  session_id: null, url: 'https://example.com', referrer: null,
  ip: '1.2.3.x', user_agent: 'UA', value: null, currency: null,
  properties: {}, consent_state: 'unknown',
  event_time: '2026-06-23T00:00:00.000Z',
};

describe('enqueueEvent', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns { queued: true } on success', async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    const result = await enqueueEvent(sampleEvent);
    expect(result).toEqual({ queued: true });
  });

  it('inserts into events_outbox with correct fields', async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    await enqueueEvent(sampleEvent);
    expect(mockFrom).toHaveBeenCalledWith('events_outbox');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: 'org-1', workspace_id: 'ws-1', pixel_id: 'px-1' })
    );
  });

  it('returns { queued: false } and does not throw on supabase error', async () => {
    mockInsert.mockResolvedValueOnce({ error: { code: 'PGRST', message: 'DB error' } });
    const result = await enqueueEvent(sampleEvent);
    expect(result).toEqual({ queued: false });
  });
});
