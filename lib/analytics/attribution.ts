import type { ChannelAttribution, ConversionSession } from "@/types/database";

function extractChannel(url: string | null): string {
  if (!url) return "direct";
  try {
    const parsed = new URL(url);
    const utm = parsed.searchParams.get("utm_source");
    if (utm) return utm.toLowerCase();
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.includes("google")) return "google";
    if (host.includes("facebook") || host.includes("fb.com")) return "facebook";
    if (host.includes("instagram")) return "instagram";
    return "organic";
  } catch {
    return "direct";
  }
}

function rollupChannels(
  entries: { channel: string; revenue: number; conversions: number }[]
): ChannelAttribution[] {
  const map = new Map<string, { revenue: number; conversions: number }>();
  for (const e of entries) {
    const cur = map.get(e.channel) ?? { revenue: 0, conversions: 0 };
    map.set(e.channel, {
      revenue: cur.revenue + e.revenue,
      conversions: cur.conversions + e.conversions,
    });
  }
  const rows = Array.from(map.entries()).map(([channel, v]) => ({
    channel,
    revenue: v.revenue,
    conversions: v.conversions,
    attribution_share: 0,
  }));
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  for (const row of rows) {
    row.attribution_share = totalRevenue > 0 ? row.revenue / totalRevenue : 0;
  }
  return rows.sort((a, b) => b.revenue - a.revenue);
}

export function applyLastClick(sessions: ConversionSession[]): ChannelAttribution[] {
  const entries = sessions.map((s) => ({
    channel: extractChannel(s.last_touch_url),
    revenue: s.revenue,
    conversions: s.conversions,
  }));
  return rollupChannels(entries);
}

export function applyLinear(sessions: ConversionSession[]): ChannelAttribution[] {
  const entries: { channel: string; revenue: number; conversions: number }[] = [];
  for (const s of sessions) {
    const firstCh = extractChannel(s.first_touch_url);
    const lastCh = extractChannel(s.last_touch_url);
    if (firstCh === lastCh) {
      entries.push({ channel: firstCh, revenue: s.revenue, conversions: s.conversions });
    } else {
      const half = s.revenue / 2;
      const halfConv = s.conversions / 2;
      entries.push({ channel: firstCh, revenue: half, conversions: halfConv });
      entries.push({ channel: lastCh, revenue: half, conversions: halfConv });
    }
  }
  return rollupChannels(entries);
}

export function applyTimeDecay(sessions: ConversionSession[]): ChannelAttribution[] {
  const LAST_WEIGHT = 0.7;
  const FIRST_WEIGHT = 0.3;
  const entries: { channel: string; revenue: number; conversions: number }[] = [];
  for (const s of sessions) {
    const firstCh = extractChannel(s.first_touch_url);
    const lastCh = extractChannel(s.last_touch_url);
    if (firstCh === lastCh) {
      entries.push({ channel: firstCh, revenue: s.revenue, conversions: s.conversions });
    } else {
      entries.push({ channel: firstCh, revenue: s.revenue * FIRST_WEIGHT, conversions: s.conversions * FIRST_WEIGHT });
      entries.push({ channel: lastCh, revenue: s.revenue * LAST_WEIGHT, conversions: s.conversions * LAST_WEIGHT });
    }
  }
  return rollupChannels(entries);
}
