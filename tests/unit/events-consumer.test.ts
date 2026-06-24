import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/events/clickhouse', () => ({
  isClickHouseConfigured: vi.fn(),
  chInsert: vi.fn(),
}));

const mockIn = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnValue({ in: mockIn });
const mockLimit = vi.fn();
const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit });
const mockLt = vi.fn().mockReturnValue({ order: mockOrder });
const mockIs = vi.fn().mockReturnValue({ lt: mockLt });
const mockSelect = vi.fn().mockReturnValue({ is: mockIs });
const mockFrom = vi.fn().mockReturnValue({ select: mockSelect, update: mockUpdate, in: mockIn });

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { drainOutbox } from '@/lib/events/consumer';
import { isClickHouseConfigured, chInsert } from '@/lib/events/clickhouse';

describe('drainOutbox', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns skipped:1 when ClickHouse is not configured', async () => {
    vi.mocked(isClickHouseConfigured).mockReturnValue(false);
    const result = await drainOutbox();
    expect(result).toEqual({ processed: 0, failed: 0, skipped: 1 });
  });

  it('returns skipped:0 when outbox is empty', async () => {
    vi.mocked(isClickHouseConfigured).mockReturnValue(true);
    mockLimit.mockResolvedValueOnce({ data: [], error: null });
    const result = await drainOutbox();
    expect(result).toEqual({ processed: 0, failed: 0, skipped: 0 });
  });

  it('processes rows and returns processed count on success', async () => {
    vi.mocked(isClickHouseConfigured).mockReturnValue(true);
    const rows = [
      { id: 'id-1', payload: { event_id: 'e-1' }, attempts: 0 },
      { id: 'id-2', payload: { event_id: 'e-2' }, attempts: 1 },
    ];
    mockLimit.mockResolvedValueOnce({ data: rows, error: null });
    vi.mocked(chInsert).mockResolvedValueOnce(undefined);
    mockIn.mockResolvedValue({ error: null });
    const result = await drainOutbox();
    expect(result).toEqual({ processed: 2, failed: 0, skipped: 0 });
    expect(chInsert).toHaveBeenCalledWith('events', [{ event_id: 'e-1' }, { event_id: 'e-2' }]);
  });

  it('returns failed:N when ClickHouse insert throws', async () => {
    vi.mocked(isClickHouseConfigured).mockReturnValue(true);
    const rows = [{ id: 'id-1', payload: { event_id: 'e-1' }, attempts: 0 }];
    mockLimit.mockResolvedValueOnce({ data: rows, error: null });
    vi.mocked(chInsert).mockRejectedValueOnce(new Error('CH down'));
    mockIn.mockResolvedValue({ error: null });
    const result = await drainOutbox();
    expect(result).toEqual({ processed: 0, failed: 1, skipped: 0 });
  });
});
