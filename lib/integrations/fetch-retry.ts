/**
 * fetchWithRetry — resilient fetch wrapper with exponential backoff.
 *
 * Retry policy:
 *   - Retriable HTTP statuses: 429, 502, 503, 504
 *   - Non-retriable: any 4xx except 429, and any error < 500 except 429
 *   - Respects `Retry-After` header (seconds) on 429 responses
 *   - Exponential backoff: baseDelayMs × multiplier^attempt with ±jitterFactor
 *   - Throws the last error after all attempts are exhausted
 */

export type RetryOptions = {
  /** Maximum number of attempts, including the first. Default: 3 */
  maxAttempts?: number;
  /** Base delay in milliseconds. Default: 500 */
  baseDelayMs?: number;
  /** Backoff multiplier applied per attempt. Default: 2 */
  multiplier?: number;
  /** Jitter range as a fraction (e.g. 0.2 = ±20%). Default: 0.2 */
  jitterFactor?: number;
};

const RETRIABLE_STATUSES = new Set([429, 502, 503, 504]);

function isRetriable(status: number): boolean {
  return RETRIABLE_STATUSES.has(status);
}

function computeDelay(
  attempt: number,
  baseDelayMs: number,
  multiplier: number,
  jitterFactor: number,
  retryAfterMs: number | null
): number {
  if (retryAfterMs !== null) {
    // Apply jitter on top of the server-dictated delay, clamped to ≥ 0
    const jitter = retryAfterMs * jitterFactor * (Math.random() * 2 - 1);
    return Math.max(0, retryAfterMs + jitter);
  }

  const base = baseDelayMs * Math.pow(multiplier, attempt);
  const jitter = base * jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, base + jitter);
}

function parseRetryAfter(res: Response): number | null {
  const header = res.headers.get("Retry-After");
  if (!header) return null;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return seconds * 1000; // convert to ms
}

/**
 * Drop-in replacement for `fetch` that retries transient HTTP failures.
 *
 * @param url    - Request URL (string)
 * @param init   - Standard `RequestInit` options
 * @param retryOpts - Optional retry configuration
 * @returns Resolved `Response` on success
 * @throws `Error` with descriptive message (including final HTTP status) after
 *         all attempts are exhausted
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retryOpts?: RetryOptions
): Promise<Response> {
  const maxAttempts = retryOpts?.maxAttempts ?? 3;
  const baseDelayMs = retryOpts?.baseDelayMs ?? 500;
  const multiplier = retryOpts?.multiplier ?? 2;
  const jitterFactor = retryOpts?.jitterFactor ?? 0.2;

  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, init);

    if (res.ok) {
      return res;
    }

    // Non-retriable: bail immediately
    if (!isRetriable(res.status)) {
      return res; // let the caller inspect the error response
    }

    lastResponse = res;

    // Last attempt — no point sleeping, just fall through and throw
    if (attempt === maxAttempts - 1) {
      break;
    }

    const retryAfterMs = parseRetryAfter(res);
    const delay = computeDelay(attempt, baseDelayMs, multiplier, jitterFactor, retryAfterMs);

    await new Promise<void>((resolve) => setTimeout(resolve, delay));
  }

  const status = lastResponse?.status ?? 0;
  throw new Error(
    `fetchWithRetry: all ${maxAttempts} attempts failed — last HTTP status ${status} for ${url}`
  );
}
