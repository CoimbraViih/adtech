import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[color:var(--adflow-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-[color:var(--adflow-accent)]" />
            <span className="text-sm font-semibold text-[color:var(--adflow-fg)]">
              AdFlow
            </span>
          </div>
          <p className="text-[11px] text-[color:var(--adflow-fg-muted)]">
            Configure sua conta para começar a gerenciar campanhas.
          </p>
        </div>

        <div className="rounded-xl border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] p-6">
          <OnboardingWizard />
        </div>
      </div>
    </div>
  );
}
