/**
 * Unit tests for lib/integrations/fetch-retry.ts
 *
 * Uses vi.useFakeTimers() so no real time elapses during backoff delays.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "@/lib/integrations/fetch-retry";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a minimal Response-compatible object that satisfies the parts of the
 * Web Fetch API our code actually touches: `ok`, `status`, and `headers`.
 */
function makeResponse(
  status: number,
  headers: Record<string, string> = {}
): Response {
  const headersObj = new Headers(headers);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: headersObj,
    // The remaining Response fields are not exercised by fetchWithRetry.
  } as unknown as Response;
}

// ── setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ── tests ────────────────────────────────────────────────────────────────────

describe("fetchWithRetry", () => {
  it("resolves immediately on first-attempt 200 without retrying", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(makeResponse(200));

    const resPromise = fetchWithRetry("https://example.com/api", {});
    // Advance all timers just in case (there should be none)
    await vi.runAllTimersAsync();
    const res = await resPromise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and returns the successful response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeResponse(429))
      .mockResolvedValueOnce(makeResponse(200));

    const resPromise = fetchWithRetry(
      "https://example.com/api",
      {},
      { maxAttempts: 3, baseDelayMs: 100, jitterFactor: 0 }
    );

    await vi.runAllTimersAsync();
    const res = await resPromise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 503 and returns the successful response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeResponse(503))
      .mockResolvedValueOnce(makeResponse(200));

    const resPromise = fetchWithRetry(
      "https://example.com/api",
      {},
      { maxAttempts: 3, baseDelayMs: 100, jitterFactor: 0 }
    );

    await vi.runAllTimersAsync();
    const res = await resPromise;

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("respects Retry-After header on 429 response", async () => {
    const mockFetch = vi.mocked(fetch);
    // First call returns 429 with Retry-After: 1 (second)
    mockFetch
      .mockResolvedValueOnce(makeResponse(429, { "Retry-After": "1" }))
      .mockResolvedValueOnce(makeResponse(200));

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const resPromise = fetchWithRetry(
      "https://example.com/api",
      {},
      { maxAttempts: 3, baseDelayMs: 100, jitterFactor: 0 }
    );

    await vi.runAllTimersAsync();
    await resPromise;

    // Retry-After: 1 → 1000 ms delay (jitterFactor: 0 so no jitter added)
    const delays = setTimeoutSpy.mock.calls.map((args) => args[1] as number);
    // The delay used must be close to 1000 ms (within the ±20% jitter window
    // even when jitterFactor is 0 there is no deviation; exact value = 1000).
    expect(delays.some((d) => d >= 900 && d <= 1100)).toBe(true);
  });

  it("does not retry on 401 and returns the 401 response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(makeResponse(401));

    const resPromise = fetchWithRetry("https://example.com/api", {});
    await vi.runAllTimersAsync();
    const res = await resPromise;

    expect(res.status).toBe(401);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 404 and returns the 404 response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(makeResponse(404));

    const resPromise = fetchWithRetry("https://example.com/api", {});
    await vi.runAllTimersAsync();
    const res = await resPromise;

    expect(res.status).toBe(404);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting all attempts, error message includes final status", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(makeResponse(503))
      .mockResolvedValueOnce(makeResponse(503))
      .mockResolvedValueOnce(makeResponse(503));

    // Attach the rejection handler BEFORE advancing timers so the promise
    // rejection is never unhandled from Vitest's perspective.
    const resPromise = fetchWithRetry(
      "https://example.com/api",
      {},
      { maxAttempts: 3, baseDelayMs: 50, jitterFactor: 0 }
    );
    const assertion = expect(resPromise).rejects.toThrow(/503/);

    await vi.runAllTimersAsync();
    await assertion;
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("error message after exhaustion includes the URL", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(makeResponse(502));

    const targetUrl = "https://example.com/target";
    const resPromise = fetchWithRetry(
      targetUrl,
      {},
      { maxAttempts: 2, baseDelayMs: 10, jitterFactor: 0 }
    );
    const assertion = expect(resPromise).rejects.toThrow(targetUrl);

    await vi.runAllTimersAsync();
    await assertion;
  });

  it("jitter never produces a negative delay", async () => {
    // Run many iterations with maximum jitter to ensure delay is always >= 0.
    // We patch setTimeout and collect actual delay values.
    const mockFetch = vi.mocked(fetch);
    // Always 429 so we trigger many delay calculations.
    mockFetch.mockResolvedValue(makeResponse(429));

    const delays: number[] = [];
    vi.spyOn(globalThis, "setTimeout").mockImplementation(
      (fn: TimerHandler, delay?: number) => {
        delays.push(delay ?? 0);
        if (typeof fn === "function") fn();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }
    );

    const resPromise = fetchWithRetry(
      "https://example.com/api",
      {},
      { maxAttempts: 3, baseDelayMs: 500, jitterFactor: 0.9 }
    );
    // Attach handler before advancing timers to prevent unhandled rejection.
    const settled = resPromise.catch(() => undefined);

    await vi.runAllTimersAsync();
    await settled;

    for (const d of delays) {
      expect(d).toBeGreaterThanOrEqual(0);
    }
  });
});
