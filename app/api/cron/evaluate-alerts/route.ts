import { NextResponse } from "next/server";
import { fetchActiveRules, fetchCampaignMetrics, insertNotification, markRuleTriggered } from "@/lib/automation/rules";
import { evaluateRule, buildNotificationMessage, getMetricValue } from "@/lib/automation/evaluator";
import { sendAlertEmail } from "@/lib/automation/email";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

    for (const workspaceId of workspaceIds) {
      const [rules, metrics] = await Promise.all([
        fetchActiveRules(workspaceId),
        fetchCampaignMetrics(workspaceId),
      ]);

      const ownerEmail: string | null = null;

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
            // TODO(M8-backend): resolve organizationId from workspaceId.
            // Passing "" for now so Resend key falls back to env var.
            await sendAlertEmail("", {
              to: ownerEmail,
              alertTitle: title,
              alertBody: body,
              workspaceName: workspaceId,
            });
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
