import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-[color:var(--adflow-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="7.5" stroke="#E8390E" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="1" x2="12" y2="6" stroke="#E8390E" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="12" y1="18" x2="12" y2="23" stroke="#E8390E" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="1" y1="12" x2="6" y2="12" stroke="#E8390E" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="18" y1="12" x2="23" y2="12" stroke="#E8390E" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="12" r="2" fill="#E8390E" />
            </svg>
            <span style={{ fontFamily: "var(--font-space-grotesk, sans-serif)", fontSize: 15, fontWeight: 700, letterSpacing: "0.04em" }}>
              <span style={{ color: "#E8390E" }}>AD</span>HUNTER
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
