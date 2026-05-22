import { createServiceClient } from "@/lib/supabase/service";
import { applyLastClick, applyLinear, applyTimeDecay } from "@/lib/analytics/attribution";
import type {
  AttributionModel,
  ChannelAttribution,
  ConversionSession,
  DailyEventCount,
  FunnelStep,
  KpiSummary,
  PixelEventType,
} from "@/types/database";

const FUNNEL_ORDER: PixelEventType[] = ["page_view", "lead", "add_to_cart", "sign_up", "purchase"];
const CONVERSION_TYPES: PixelEventType[] = ["purchase", "lead", "sign_up"];

export async function getKpiSummary(
  workspaceId: string,
  dateFrom: string,
  dateTo: string
): Promise<KpiSummary> {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db1 = supabase.from("daily_event_counts") as any;
  const { data, error } = (await db1.select("event_type,event_count,total_value").eq("workspace_id", workspaceId).gte("day", dateFrom).lte("day", dateTo)) as { data: DailyEventCount[] | null; error: unknown };

  if (error || !data) {
    return { total_events: 0, total_conversions: 0, total_revenue: 0, roas: 0, cpa: 0, avg_order_value: 0 };
  }

  const total_events = data.reduce((s, r) => s + r.event_count, 0);
  const total_conversions = data
    .filter((r) => CONVERSION_TYPES.includes(r.event_type))
    .reduce((s, r) => s + r.event_count, 0);
  const total_revenue = data
    .filter((r) => r.event_type === "purchase")
    .reduce((s, r) => s + r.total_value, 0);
  const purchase_count = data
    .filter((r) => r.event_type === "purchase")
    .reduce((s, r) => s + r.event_count, 0);

  return {
    total_events,
    total_conversions,
    total_revenue,
    roas: total_revenue > 0 ? total_revenue : 0,
    cpa: total_conversions > 0 ? total_revenue / total_conversions : 0,
    avg_order_value: purchase_count > 0 ? total_revenue / purchase_count : 0,
  };
}

export async function getFunnelSteps(
  workspaceId: string,
  dateFrom: string,
  dateTo: string
): Promise<FunnelStep[]> {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db2 = supabase.from("daily_event_counts") as any;
  const { data, error } = (await db2.select("event_type,event_count").eq("workspace_id", workspaceId).gte("day", dateFrom).lte("day", dateTo)) as { data: DailyEventCount[] | null; error: unknown };

  if (error || !data) return [];

  const totals = new Map<PixelEventType, number>();
  for (const row of data) {
    totals.set(row.event_type, (totals.get(row.event_type) ?? 0) + row.event_count);
  }

  const steps: FunnelStep[] = [];
  const labels: Record<PixelEventType, string> = {
    page_view: "Visitas",
    lead: "Leads",
    add_to_cart: "Carrinho",
    sign_up: "Cadastros",
    purchase: "Compras",
    custom: "Customizado",
  };

  let topOfFunnel = 0;
  for (const eventType of FUNNEL_ORDER) {
    const count = totals.get(eventType) ?? 0;
    if (count === 0 && steps.length === 0) continue;
    if (steps.length === 0) topOfFunnel = count;
    const drop_off_rate = topOfFunnel > 0 ? (topOfFunnel - count) / topOfFunnel : 0;
    steps.push({ event_type: eventType, label: labels[eventType], count, drop_off_rate });
  }

  return steps;
}

export async function getChannelAttribution(
  workspaceId: string,
  dateFrom: string,
  dateTo: string,
  model: AttributionModel
): Promise<ChannelAttribution[]> {
  const supabase = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db3 = supabase.from("conversion_sessions") as any;
  const { data, error } = (await db3.select("session_id,first_touch_url,last_touch_url,conversions,revenue").eq("workspace_id", workspaceId).gte("session_start", dateFrom).lte("session_end", dateTo)) as { data: ConversionSession[] | null; error: unknown };

  if (error || !data) return [];

  switch (model) {
    case "last_click": return applyLastClick(data);
    case "linear":     return applyLinear(data);
    case "time_decay": return applyTimeDecay(data);
  }
}
