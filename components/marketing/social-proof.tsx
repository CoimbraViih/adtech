"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const TESTIMONIALS = [
  {
    metric: "−34%",
    metricLabel: "CPA em 30 dias",
    metricColor: "#10B981",
    quote: "O pixel server-side da AdHunter recuperou 28% das conversões que o iOS estava bloqueando. O ROAS do nosso cliente dobrou numa semana.",
    author: "Mariana Costa",
    role: "Head de Performance · Agência Nexus",
    neon: "#10B981",
  },
  {
    metric: "10h",
    metricLabel: "salvas por semana",
    metricColor: "#00d4ff",
    quote: "Antes eu passava metade da semana gerando relatórios manualmente. Agora o dashboard consolida Meta, Google e programático em tempo real.",
    author: "Ricardo Almeida",
    role: "Fundador · RA Digital",
    neon: "#00d4ff",
  },
  {
    metric: "+82%",
    metricLabel: "visibilidade de conversão",
    metricColor: "#7b2fff",
    quote: "A atribuição multi-touch mudou como alocamos verba. Descobrimos que 40% do budget estava indo para canais que não convertiam de verdade.",
    author: "Fernanda Lima",
    role: "CMO · Startup B2B SaaS",
    neon: "#7b2fff",
  },
];

export function SocialProof() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".sp-card");

    cards.forEach((card, i) => {
      gsap.set(card, { opacity: 0, y: 50, rotateX: 8 });

      gsap.to(card, {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
        delay: i * 0.15,
      });
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        zIndex: 2,
        padding: "120px 24px",
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      {/* Divider line */}
      <div style={{
        height: 1,
        background: "linear-gradient(90deg, transparent, #1E1E2E 20%, #1E1E2E 80%, transparent)",
        marginBottom: 80,
      }} />

      <div style={{ marginBottom: 56, textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 10, color: "#475569",
          letterSpacing: "0.25em", textTransform: "uppercase",
          marginBottom: 12,
        }}>
          // TRANSMISSÕES DO CAMPO
        </div>
        <h2 style={{
          fontFamily: "var(--font-space-grotesk, sans-serif)",
          fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
          fontWeight: 700, color: "#ffffff",
          letterSpacing: "-0.02em",
        }}>
          Agências que já miraram melhor
        </h2>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 20,
        perspective: 1000,
      }}>
        {TESTIMONIALS.map((t) => (
          <div
            key={t.author}
            className="sp-card"
            style={{
              background: "rgba(13,13,26,0.7)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              padding: "32px 28px",
              backdropFilter: "blur(20px)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top neon line */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${t.neon}60, transparent)`,
            }} />

            {/* Metric hero */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: "clamp(2rem, 3.5vw, 2.8rem)",
                fontWeight: 700,
                color: t.metricColor,
                lineHeight: 1,
                textShadow: `0 0 20px ${t.metricColor}50`,
                marginBottom: 4,
              }}>
                {t.metric}
              </div>
              <div style={{
                fontFamily: "var(--font-manrope, sans-serif)",
                fontSize: 11, color: "#475569",
                letterSpacing: "0.05em",
              }}>
                {t.metricLabel}
              </div>
            </div>

            <p style={{
              fontFamily: "var(--font-manrope, sans-serif)",
              fontSize: 14, color: "#94a3b8",
              lineHeight: 1.7, marginBottom: 24,
              fontStyle: "italic",
            }}>
              &ldquo;{t.quote}&rdquo;
            </p>

            <div>
              <div style={{
                fontFamily: "var(--font-space-grotesk, sans-serif)",
                fontSize: 13, fontWeight: 600, color: "#e2e8f0",
                marginBottom: 2,
              }}>
                {t.author}
              </div>
              <div style={{
                fontFamily: "var(--font-manrope, sans-serif)",
                fontSize: 11, color: "#475569",
              }}>
                {t.role}
              </div>
            </div>

            {/* Corner accent */}
            <div style={{
              position: "absolute", bottom: 16, right: 16,
              width: 24, height: 24, opacity: 0.15,
              borderBottom: `1px solid ${t.neon}`,
              borderRight: `1px solid ${t.neon}`,
            }} />
          </div>
        ))}
      </div>
    </section>
  );
}
