import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/events/clickhouse', () => ({
  chQueryWithParams: vi.fn(),
}));

import { getConversionsByCampaign, getFunnelByDay } from '@/lib/events/query';
import { chQueryWithParams } from '@/lib/events/clickhouse';

describe('getConversionsByCampaign', () => {
  it('delegates to chQueryWithParams and returns typed rows', async () => {
    const mockRows = [{ campaign_id: 'c-1', event_day: '2026-06-01', conversions: 10, revenue: 500 }];
    vi.mocked(chQueryWithParams).mockResolvedValueOnce(mockRows);
    const result = await getConversionsByCampaign('org-1', 'ws-1', '2026-06-01', '2026-06-30');
    expect(result).toEqual(mockRows);
    expect(chQueryWithParams).toHaveBeenCalledWith(
      expect.stringContaining('mv_conversions_campaign_day'),
      { org_id: 'org-1', ws_id: 'ws-1', start: '2026-06-01', end: '2026-06-30' }
    );
  });

  it('returns [] when chQueryWithParams returns empty', async () => {
    vi.mocked(chQueryWithParams).mockResolvedValueOnce([]);
    const result = await getConversionsByCampaign('org-1', 'ws-1', '2026-06-01', '2026-06-30');
    expect(result).toEqual([]);
  });
});

describe('getFunnelByDay', () => {
  it('delegates to chQueryWithParams and returns typed rows', async () => {
    const mockRows = [{ event_type: 'pageview', event_day: '2026-06-01', event_count: 100 }];
    vi.mocked(chQueryWithParams).mockResolvedValueOnce(mockRows);
    const result = await getFunnelByDay('org-1', 'ws-1', '2026-06-01', '2026-06-30');
    expect(result).toEqual(mockRows);
    expect(chQueryWithParams).toHaveBeenCalledWith(
      expect.stringContaining('mv_funnel_steps'),
      { org_id: 'org-1', ws_id: 'ws-1', start: '2026-06-01', end: '2026-06-30' }
    );
  });

  it('returns [] when chQueryWithParams returns empty', async () => {
    vi.mocked(chQueryWithParams).mockResolvedValueOnce([]);
    const result = await getFunnelByDay('org-1', 'ws-1', '2026-06-01', '2026-06-30');
    expect(result).toEqual([]);
  });
});
