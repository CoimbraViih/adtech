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
      <section
        id="waitlist"
        className="relative py-24 md:py-32 px-4 sm:px-6 overflow-hidden"
      >
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(232,57,14,0.3),transparent)" }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: 400,
            height: 400,
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            background: "radial-gradient(circle,rgba(232,57,14,0.06) 0%,transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        <div className="relative z-10 max-w-md mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#E8390E" }}>
              Early Access
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{
                background: "linear-gradient(135deg,#F1F5F9 30%,#64748B 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Entre na lista
            </h2>
            <p className="text-sm" style={{ color: "#475569" }}>
              Primeiros 100: acesso antecipado + 3 meses de Pro grátis.
            </p>
          </div>

          <div
            className="relative rounded-2xl p-7 overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(232,57,14,0.15)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 0 50px rgba(232,57,14,0.06), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            <div
              className="absolute top-0 inset-x-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(232,57,14,0.4),transparent)" }}
            />
            <WaitlistForm />
          </div>
        </div>
      </section>
    </>
  );
}
