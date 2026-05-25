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

      {/* Waitlist section */}
      <section
        id="waitlist"
        className="py-20 md:py-28 px-4 sm:px-6 border-t border-[color:var(--adflow-border)]"
      >
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[color:var(--adflow-fg)] mb-3">
              Entre na lista de espera
            </h2>
            <p className="text-sm text-[color:var(--adflow-fg-muted)]">
              Acesso antecipado + 3 meses de Pro grátis para os primeiros 100.
            </p>
          </div>
          <div className="p-6 rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)]">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </>
  );
}
