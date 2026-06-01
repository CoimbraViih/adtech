import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { SocialProof } from "@/components/marketing/social-proof";
import { Pricing } from "@/components/marketing/pricing";
import { Faq } from "@/components/marketing/faq";
import { CtaBanner } from "@/components/marketing/cta-banner";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <SocialProof />
      <Pricing />
      <Faq />
      <CtaBanner />

      {/* Waitlist */}
      <section id="waitlist" className="border-b" style={{ borderColor: "#1E1E2E" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left: copy */}
            <div>
              <p
                className="text-[10px] uppercase tracking-widest mb-3"
                style={{ color: "#E8390E", fontFamily: "var(--font-manrope),sans-serif" }}
              >
                06 — Early Access
              </p>
              <h2
                className="text-2xl md:text-3xl font-bold mb-3"
                style={{ fontFamily: "var(--font-space-grotesk),sans-serif", color: "#F1F5F9" }}
              >
                Entre na lista de espera
              </h2>
              <p
                className="text-sm mb-6 leading-relaxed"
                style={{ color: "#475569", fontFamily: "var(--font-manrope),sans-serif" }}
              >
                As primeiras 100 agências ganham 3 meses de Pro grátis e acesso ao onboarding guiado.
              </p>

              {/* What you get */}
              <div className="space-y-2">
                {[
                  { metric: "3 meses", label: "Pro grátis no lançamento" },
                  { metric: "1:1", label: "onboarding com especialista" },
                  { metric: "Early", label: "acesso a novos módulos" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold w-16 shrink-0"
                      style={{
                        fontFamily: "var(--font-jetbrains),monospace",
                        color: "#E8390E",
                      }}
                    >
                      {item.metric}
                    </span>
                    <span className="text-xs" style={{ color: "#475569" }}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: form */}
            <div
              className="p-5 rounded-lg"
              style={{ background: "#13131F", border: "1px solid #1E1E2E" }}
            >
              <WaitlistForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
