import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/events/clickhouse', () => ({
  chQuery: vi.fn(),
}));

import { getConversionsByCampaign, getFunnelByDay } from '@/lib/events/query';
import { chQuery } from '@/lib/events/clickhouse';

describe('getConversionsByCampaign', () => {
  it('delegates to chQuery and returns typed rows', async () => {
    const mockRows = [{ campaign_id: 'c-1', event_day: '2026-06-01', conversions: 10, revenue: 500 }];
    vi.mocked(chQuery).mockResolvedValueOnce(mockRows);
    const result = await getConversionsByCampaign('org-1', 'ws-1', '2026-06-01', '2026-06-30');
    expect(result).toEqual(mockRows);
    expect(chQuery).toHaveBeenCalledWith(expect.stringContaining('organization_id'));
  });

  it('returns [] when chQuery returns empty', async () => {
    vi.mocked(chQuery).mockResolvedValueOnce([]);
    const result = await getConversionsByCampaign('org-1', 'ws-1', '2026-06-01', '2026-06-30');
    expect(result).toEqual([]);
  });
});

describe('getFunnelByDay', () => {
  it('delegates to chQuery and returns typed rows', async () => {
    const mockRows = [{ event_type: 'pageview', event_day: '2026-06-01', event_count: 100 }];
    vi.mocked(chQuery).mockResolvedValueOnce(mockRows);
    const result = await getFunnelByDay('org-1', 'ws-1', '2026-06-01', '2026-06-30');
    expect(result).toEqual(mockRows);
    expect(chQuery).toHaveBeenCalledWith(expect.stringContaining('mv_funnel_steps'));
  });

  it('returns [] when chQuery returns empty', async () => {
    vi.mocked(chQuery).mockResolvedValueOnce([]);
    const result = await getFunnelByDay('org-1', 'ws-1', '2026-06-01', '2026-06-30');
    expect(result).toEqual([]);
  });
});
