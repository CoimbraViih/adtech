// lib/security/rate-limit.ts

type Window = { count: number; resetAt: number };

// Each named limiter has its own Map, isolated between callers.
const stores = new Map<string, Map<string, Window>>();

/**
 * Returns a stateful check function for a named rate limiter.
 * Calling check(id) increments the counter for `id` and returns
 * true if the request is over the limit (should be rejected).
 *
 * Designed for in-memory use; swap for Redis when Redis lands post-MVP.
 */
export function createRateLimiter(
  name: string,
  limit: number,
  windowMs: number
): (id: string) => boolean {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }

  return function check(id: string): boolean {
    const now = Date.now();
    const entry = store.get(id);

    if (!entry || now > entry.resetAt) {
      store.set(id, { count: 1, resetAt: now + windowMs });
      return false;
    }

    if (entry.count >= limit) return true;
    entry.count += 1;
    return false;
  };
}
