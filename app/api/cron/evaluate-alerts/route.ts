import { NextResponse } from "next/server";
import { fetchActiveRules, fetchCampaignMetrics, insertNotification, markRuleTriggered } from "@/lib/automation/rules";
import { evaluateRule, buildNotificationMessage, getMetricValue } from "@/lib/automation/evaluator";
import { sendAlertEmail } from "@/lib/automation/email";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  // Require CRON_SECRET to be set — reject if missing or mismatched
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const result = await supabase
      .from("alert_rules")
      .select("workspace_id")
      .eq("status", "active");
    const workspaceRows = result.data as Array<{ workspace_id: string }> | null;
    const queryError = result.error as { message: string } | null;
    if (queryError) throw new Error(queryError.message);

    const workspaceIds: string[] = [
      ...new Set(
        (workspaceRows ?? []).map((r) => r.workspace_id)
      ),
    ];

    let triggered = 0;
    const serviceDb = createServiceClient();

    for (const workspaceId of workspaceIds) {
      const [rules, metrics] = await Promise.all([
        fetchActiveRules(workspaceId),
        fetchCampaignMetrics(workspaceId),
      ]);

      // Resolve organization_id and owner email for this workspace
      let ownerEmail: string | null = null;
      let organizationId = "";
      try {
        const { data: wsRow } = await serviceDb
          .from("workspaces")
          .select("organization_id")
          .eq("id", workspaceId)
          .single();

        if (wsRow) {
          organizationId = wsRow.organization_id as string;

          const { data: ownerRow } = await serviceDb
            .from("organization_members")
            .select("user_id")
            .eq("organization_id", organizationId)
            .eq("role", "owner")
            .limit(1)
            .single();

          if (ownerRow) {
            const { data: { user } } = await serviceDb.auth.admin.getUserById(
              ownerRow.user_id as string
            );
            ownerEmail = user?.email ?? null;
          }
        }
      } catch (resolveErr) {
        console.warn(`[cron/evaluate-alerts] failed to resolve owner for workspace ${workspaceId}:`, resolveErr);
      }

      for (const rule of rules) {
        const applicableMetrics = rule.campaign_id
          ? metrics.filter((m) => m.campaign_id === rule.campaign_id)
          : metrics;

        for (const metric of applicableMetrics) {
          if (!evaluateRule(rule, metric)) continue;

          const actualValue = getMetricValue(rule.condition, metric) ?? 0;
          const { title, body } = buildNotificationMessage(rule, metric, actualValue);

          await insertNotification({
            workspace_id: workspaceId,
            rule_id: rule.id,
            campaign_id: metric.campaign_id,
            title,
            body,
            metric_value: actualValue,
          });

          await markRuleTriggered(rule.id);
          triggered++;

          if (ownerEmail) {
            try {
              await sendAlertEmail(organizationId, {
                to: ownerEmail,
                alertTitle: title,
                alertBody: body,
                workspaceName: workspaceId,
              });
            } catch (emailErr) {
              console.warn(`[cron/evaluate-alerts] email send failed for workspace ${workspaceId}:`, emailErr);
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true, triggered });
  } catch (err) {
    console.error("[cron/evaluate-alerts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
