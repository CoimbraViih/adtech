import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ClickHouse client', () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('isClickHouseConfigured returns false when env vars missing', async () => {
    vi.stubEnv('CLICKHOUSE_URL', '');
    vi.stubEnv('CLICKHOUSE_USER', '');
    vi.stubEnv('CLICKHOUSE_PASSWORD', '');
    const { isClickHouseConfigured } = await import('@/lib/events/clickhouse');
    expect(isClickHouseConfigured()).toBe(false);
  });

  it('isClickHouseConfigured returns true when all vars set', async () => {
    vi.stubEnv('CLICKHOUSE_URL', 'https://ch.example.com:8443');
    vi.stubEnv('CLICKHOUSE_USER', 'adflow');
    vi.stubEnv('CLICKHOUSE_PASSWORD', 'secret');
    const { isClickHouseConfigured } = await import('@/lib/events/clickhouse');
    expect(isClickHouseConfigured()).toBe(true);
  });

  it('chInsert skips silently when not configured', async () => {
    vi.stubEnv('CLICKHOUSE_URL', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { chInsert } = await import('@/lib/events/clickhouse');
    await chInsert('events', [{ id: '1' }]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('chInsert skips silently when rows array is empty', async () => {
    vi.stubEnv('CLICKHOUSE_URL', 'https://ch.example.com:8443');
    vi.stubEnv('CLICKHOUSE_USER', 'adflow');
    vi.stubEnv('CLICKHOUSE_PASSWORD', 'secret');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { chInsert } = await import('@/lib/events/clickhouse');
    await chInsert('events', []);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('chQuery returns [] when not configured', async () => {
    vi.stubEnv('CLICKHOUSE_URL', '');
    const { chQuery } = await import('@/lib/events/clickhouse');
    const result = await chQuery('SELECT 1');
    expect(result).toEqual([]);
  });

  it('chInsert throws on non-ok HTTP response', async () => {
    vi.stubEnv('CLICKHOUSE_URL', 'https://ch.example.com:8443');
    vi.stubEnv('CLICKHOUSE_USER', 'adflow');
    vi.stubEnv('CLICKHOUSE_PASSWORD', 'secret');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('error', { status: 500 })
    );
    const { chInsert } = await import('@/lib/events/clickhouse');
    await expect(chInsert('events', [{ id: '1' }])).rejects.toThrow('ClickHouse insert failed (500)');
  });
});
