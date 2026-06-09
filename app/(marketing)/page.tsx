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
        style={{
          position: "relative",
          zIndex: 2,
          padding: "0 24px 120px",
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 80,
          alignItems: "center",
          padding: "60px",
          background: "rgba(13,13,26,0.7)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 8,
          backdropFilter: "blur(20px)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* Top neon line */}
          <div aria-hidden style={{
            position: "absolute", top: 0, left: "5%", right: "5%", height: 1,
            background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)",
          }} />

          {/* Left copy */}
          <div>
            <div style={{
              fontFamily: "var(--font-jetbrains, monospace)",
              fontSize: 10, color: "#00d4ff",
              letterSpacing: "0.25em", marginBottom: 16, opacity: 0.8,
            }}>
              // LISTA DE ESPERA
            </div>
            <h2 style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
              fontWeight: 700, color: "#ffffff",
              letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 16,
            }}>
              Acesso antecipado.<br />
              <span style={{ color: "#10B981" }}>3 meses Pro grátis.</span>
            </h2>
            <p style={{
              fontFamily: "var(--font-manrope, sans-serif)",
              fontSize: 15, color: "#64748b", lineHeight: 1.7, marginBottom: 32,
            }}>
              Para os primeiros 100. Sem cartão de crédito.<br />
              Cancele quando quiser.
            </p>

            {/* Social signal */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "rgba(16,185,129,0.05)",
              border: "1px solid rgba(16,185,129,0.15)",
              borderRadius: 4,
              width: "fit-content",
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: "#10B981",
                flexShrink: 0, animation: "hud-blink 1.5s ease-in-out infinite",
                display: "inline-block",
              }} />
              <span style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 11, color: "#10B981", letterSpacing: "0.1em",
              }}>
                247 agências na fila · 53 vagas restantes
              </span>
            </div>
          </div>

          {/* Right: form */}
          <div>
            <WaitlistForm />
          </div>
        </div>
      </section>
    </>
  );
}
