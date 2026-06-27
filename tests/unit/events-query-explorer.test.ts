import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock must be before imports that use it
vi.mock('@/lib/events/clickhouse', () => ({
  chQueryWithParams: vi.fn(),
  isClickHouseConfigured: vi.fn(),
}));

import { getEventsByWorkspace } from '@/lib/events/query';
import { chQueryWithParams, isClickHouseConfigured } from '@/lib/events/clickhouse';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getEventsByWorkspace', () => {
  it('returns empty page when ClickHouse not configured', async () => {
    vi.mocked(isClickHouseConfigured).mockReturnValue(false);

    const result = await getEventsByWorkspace('org-1', 'ws-1', {
      start_date: '2026-06-01',
      end_date: '2026-06-30',
      limit: 50,
      offset: 0,
    });

    expect(result).toEqual({ rows: [], total: 0, has_more: false });
    expect(chQueryWithParams).not.toHaveBeenCalled();
  });

  it('calls chQueryWithParams with correct params', async () => {
    vi.mocked(isClickHouseConfigured).mockReturnValue(true);
    const mockRows = [
      {
        id: 'evt-1',
        event_type: 'pageview',
        url: 'https://example.com',
        referrer: null,
        campaign_id: 'camp-1',
        value: null,
        currency: null,
        consent_state: 'granted',
        event_time: '2026-06-01T10:00:00Z',
      },
    ];
    // First call: data rows; second call: count
    vi.mocked(chQueryWithParams)
      .mockResolvedValueOnce(mockRows)
      .mockResolvedValueOnce([{ total: 1 }]);

    const result = await getEventsByWorkspace('org-1', 'ws-1', {
      start_date: '2026-06-01',
      end_date: '2026-06-30',
      limit: 50,
      offset: 0,
    });

    expect(result.rows).toEqual(mockRows);
    expect(result.total).toBe(1);
    // Verify chQueryWithParams was called with org/ws params
    expect(chQueryWithParams).toHaveBeenCalledWith(
      expect.stringContaining('adflow.events'),
      expect.objectContaining({ org_id: 'org-1', ws_id: 'ws-1' })
    );
  });

  it('caps limit at 500', async () => {
    vi.mocked(isClickHouseConfigured).mockReturnValue(true);
    vi.mocked(chQueryWithParams)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);

    await getEventsByWorkspace('org-1', 'ws-1', {
      start_date: '2026-06-01',
      end_date: '2026-06-30',
      limit: 9999,
      offset: 0,
    });

    // The SQL passed to first call must contain limit 500, not 9999
    const firstCallSql = vi.mocked(chQueryWithParams).mock.calls[0][0] as string;
    expect(firstCallSql).toContain('500');
    expect(firstCallSql).not.toContain('9999');
  });

  it('computes has_more correctly', async () => {
    vi.mocked(isClickHouseConfigured).mockReturnValue(true);
    const rows = Array.from({ length: 10 }, (_, i) => ({
      id: `evt-${i}`,
      event_type: 'click',
      url: null,
      referrer: null,
      campaign_id: null,
      value: null,
      currency: null,
      consent_state: 'granted',
      event_time: '2026-06-01T10:00:00Z',
    }));
    vi.mocked(chQueryWithParams)
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce([{ total: 25 }]);

    const result = await getEventsByWorkspace('org-1', 'ws-1', {
      start_date: '2026-06-01',
      end_date: '2026-06-30',
      limit: 10,
      offset: 0,
    });

    // offset(0) + rows.length(10) = 10 < total(25) → has_more = true
    expect(result.has_more).toBe(true);
    expect(result.total).toBe(25);
  });
});
