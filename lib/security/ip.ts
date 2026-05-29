// lib/security/ip.ts

/**
 * Masks an IP address per LGPD requirements.
 * IPv4: zeros the last octet (192.168.1.100 → 192.168.1.0)
 * IPv6: zeros everything after the first 3 groups
 * Returns null for null/unrecognised input.
 */
export function maskIp(ip: string | null): string | null {
  if (!ip) return null;

  const v4parts = ip.split(".");
  if (
    !ip.includes(":") &&
    v4parts.length === 4 &&
    v4parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
  ) {
    return `${v4parts[0]}.${v4parts[1]}.${v4parts[2]}.0`;
  }

  const v6parts = ip.split(":");
  if (v6parts.length >= 3) {
    return `${v6parts[0]}:${v6parts[1]}:${v6parts[2]}:0:0:0:0:0`;
  }

  return null;
}
