import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AlertRule, AlertNotification, CampaignMetricSnapshot } from "@/types/database";

export async function fetchActiveRules(workspaceId: string): Promise<AlertRule[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (error) throw new Error((error as { message: string }).message);
  return (data as AlertRule[]) ?? [];
}

export async function fetchCampaignMetrics(
  workspaceId: string
): Promise<CampaignMetricSnapshot[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, workspace_id, name, roas, cpa, spend, ctr, conversions")
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if (error) throw new Error((error as { message: string }).message);
  return ((data as unknown[]) ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      campaign_id: r.id as string,
      workspace_id: r.workspace_id as string,
      campaign_name: r.name as string,
      roas: r.roas as number | null,
      cpa: r.cpa as number | null,
      spend: r.spend as number,
      ctr: r.ctr as number | null,
      conversions: r.conversions as number,
    };
  });
}

export async function insertNotification(
  notification: Omit<AlertNotification, "id" | "created_at" | "read" | "emailed">
): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("alert_notifications").insert({
    ...notification,
    read: false,
    emailed: false,
  });
  if (error) throw new Error((error as { message: string }).message);
}

export async function markRuleTriggered(ruleId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("alert_rules")
    .update({ last_triggered_at: new Date().toISOString() })
    .eq("id", ruleId);
  if (error) throw new Error((error as { message: string }).message);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("alert_notifications")
    .update({ read: true })
    .eq("id", notificationId);
  if (error) throw new Error((error as { message: string }).message);
}

export async function fetchUnreadNotifications(
  workspaceId: string
): Promise<AlertNotification[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("alert_notifications")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error((error as { message: string }).message);
  return (data as AlertNotification[]) ?? [];
}

export async function fetchAllRules(workspaceId: string): Promise<AlertRule[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw new Error((error as { message: string }).message);
  return (data as AlertRule[]) ?? [];
}
