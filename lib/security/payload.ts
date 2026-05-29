// lib/security/payload.ts

/**
 * Returns true when the Content-Length header exceeds the byte limit.
 * If the header is absent, passes through (body parsing will catch malformed data).
 */
export function payloadExceedsLimit(
  contentLength: string | null,
  limitBytes: number
): boolean {
  if (!contentLength) return false;
  const bytes = parseInt(contentLength, 10);
  return !isNaN(bytes) && bytes > limitBytes;
}
