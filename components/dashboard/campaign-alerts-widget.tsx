import Link from "next/link";
import { AlertTriangle, ArrowRight, Lightbulb } from "lucide-react";
import { PlatformIcon } from "@/components/campaigns/platform-icon";
import type { CampaignAlert } from "@/lib/dashboard/types";
import type { CampaignPlatform } from "@/types/database";

export function CampaignAlertsWidget({ alerts }: { alerts: CampaignAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)]">
      <div className="px-4 py-3 border-b border-[color:var(--adflow-border)]">
        <h2 className="text-sm font-semibold text-[color:var(--adflow-fg)]">
          Campanhas que precisam de atenção
        </h2>
      </div>
      <ul className="divide-y divide-[color:var(--adflow-border)]">
        {alerts.map((alert) => (
          <li key={alert.campaignId} className="group relative">
            <Link
              href={`/campaigns/${alert.campaignId}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[color:var(--adflow-border)]/30 transition-colors"
            >
              <AlertTriangle
                className="w-4 h-4 shrink-0"
                style={{
                  color:
                    alert.worstSeverity === "critical"
                      ? "var(--adflow-danger)"
                      : "var(--adflow-warning)",
                }}
              />
              <PlatformIcon platform={alert.platform as CampaignPlatform} size={16} />
              <span className="flex-1 text-sm text-[color:var(--adflow-fg)] truncate">
                {alert.campaignName}
              </span>
              <span className="text-xs text-[color:var(--adflow-fg-muted)] shrink-0 mr-2">
                {alert.worstTitle}
              </span>
              <span
                className="text-xs font-medium tabular-nums px-1.5 py-0.5 rounded shrink-0"
                style={{
                  background:
                    alert.worstSeverity === "critical"
                      ? "color-mix(in srgb, var(--adflow-danger) 15%, transparent)"
                      : "color-mix(in srgb, var(--adflow-warning) 15%, transparent)",
                  color:
                    alert.worstSeverity === "critical"
                      ? "var(--adflow-danger)"
                      : "var(--adflow-warning)",
                }}
              >
                {alert.openCount} {alert.openCount === 1 ? "alerta" : "alertas"}
              </span>
            </Link>

            {/* Preview panel — visible on row hover */}
            <div className="hidden group-hover:block absolute left-0 right-0 top-full z-20 px-4 pb-3 pt-0 bg-[color:var(--adflow-surface)] border-x border-b border-[color:var(--adflow-border)] rounded-b-xl shadow-lg">
              <div className="border-t border-[color:var(--adflow-border)] pt-3 space-y-2">
                <p className="text-xs text-[color:var(--adflow-fg-muted)] leading-relaxed">
                  {alert.worstDescription}
                </p>
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-[color:var(--adflow-data)]" />
                  <p className="text-xs text-[color:var(--adflow-data)] leading-relaxed">
                    {alert.suggestedAction}
                  </p>
                </div>
                <Link
                  href={`/campaigns/${alert.campaignId}`}
                  className="inline-flex items-center gap-1 text-xs text-[color:var(--adflow-accent)] hover:opacity-80 transition-opacity mt-1"
                >
                  Ver diagnósticos completos
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
