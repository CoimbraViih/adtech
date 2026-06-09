"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const PLANS = [
  {
    name: "Free",
    price: "R$0",
    period: "/mês",
    desc: "Para testar e validar",
    neon: "#334155",
    cta: "Criar conta",
    ctaHref: "/signup",
    highlight: false,
    features: [
      { text: "1 workspace", ok: true },
      { text: "Meta Ads (só leitura)", ok: true },
      { text: "Pixel básico", ok: true },
      { text: "500 eventos/mês", ok: true },
      { text: "Atribuição multi-touch", ok: false },
      { text: "IA de criativos", ok: false },
      { text: "Programático", ok: false },
    ],
  },
  {
    name: "Pro",
    price: "R$997",
    period: "/mês",
    desc: "Para agências em crescimento",
    neon: "#E8390E",
    cta: "Começar agora",
    ctaHref: "/signup?plan=pro",
    highlight: true,
    tag: "MAIS POPULAR",
    features: [
      { text: "3 workspaces", ok: true },
      { text: "Meta + Google Ads", ok: true },
      { text: "Pixel server-side", ok: true },
      { text: "Eventos ilimitados", ok: true },
      { text: "Atribuição multi-touch", ok: true },
      { text: "IA de criativos (50/mês)", ok: true },
      { text: "Programático", ok: false },
    ],
  },
  {
    name: "Agency",
    price: "R$2.997",
    period: "/mês",
    desc: "Para operações de alto volume",
    neon: "#7b2fff",
    cta: "Falar com vendas",
    ctaHref: "/signup?plan=agency",
    highlight: false,
    features: [
      { text: "Workspaces ilimitados", ok: true },
      { text: "Meta + Google + Programático", ok: true },
      { text: "Pixel server-side avançado", ok: true },
      { text: "Eventos ilimitados", ok: true },
      { text: "Atribuição multi-touch", ok: true },
      { text: "IA de criativos ilimitada", ok: true },
      { text: "DSP/SSP proprietário", ok: true },
    ],
  },
];

export function Pricing() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);

  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".price-card");

    gsap.set(cards, { opacity: 0, y: 60, scale: 0.95 });

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 70%",
      onEnter: () => {
        gsap.to(cards, {
          opacity: 1, y: 0, scale: 1,
          duration: 0.7, ease: "power3.out",
          stagger: 0.12,
        });
      },
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, { scope: sectionRef });

  return (
    <section
      id="pricing"
      ref={sectionRef}
      style={{
        position: "relative",
        zIndex: 2,
        padding: "120px 24px",
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      <div style={{
        height: 1,
        background: "linear-gradient(90deg, transparent, #1E1E2E 20%, #1E1E2E 80%, transparent)",
        marginBottom: 80,
      }} />

      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <div style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 10, color: "#E8390E",
          letterSpacing: "0.25em", marginBottom: 12, opacity: 0.8,
        }}>
          // PLANOS DE ACESSO
        </div>
        <h2 style={{
          fontFamily: "var(--font-space-grotesk, sans-serif)",
          fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
          fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em",
          marginBottom: 12,
        }}>
          Preço justo. Performance real.
        </h2>
        <p style={{
          fontFamily: "var(--font-manrope, sans-serif)",
          fontSize: 15, color: "#64748b",
        }}>
          Sem taxa de setup. Cancele quando quiser.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 20,
        alignItems: "start",
      }}>
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className="price-card"
            onMouseEnter={() => setHoveredPlan(plan.name)}
            onMouseLeave={() => setHoveredPlan(null)}
            style={{
              background: plan.highlight
                ? "rgba(232,57,14,0.05)"
                : "rgba(13,13,26,0.8)",
              border: `1px solid ${plan.highlight ? "rgba(232,57,14,0.3)" : "rgba(255,255,255,0.06)"}`,
              borderTop: `2px solid ${plan.neon}`,
              borderRadius: 8,
              padding: "32px 28px",
              position: "relative",
              backdropFilter: "blur(16px)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              transform: hoveredPlan === plan.name ? "translateY(-6px)" : "translateY(0)",
              boxShadow: hoveredPlan === plan.name
                ? `0 20px 60px ${plan.neon}20`
                : plan.highlight
                  ? `0 0 40px rgba(232,57,14,0.12)`
                  : "none",
            }}
          >
            {plan.tag && (
              <div style={{
                position: "absolute", top: -12, left: "50%",
                transform: "translateX(-50%)",
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 9, color: "#E8390E",
                background: "#0D0D1A",
                border: "1px solid rgba(232,57,14,0.3)",
                padding: "2px 10px", borderRadius: 2,
                letterSpacing: "0.2em", whiteSpace: "nowrap",
              }}>
                {plan.tag}
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 10, color: plan.neon,
                letterSpacing: "0.15em", marginBottom: 8, opacity: 0.8,
              }}>
                {plan.name.toUpperCase()}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 6 }}>
                <span style={{
                  fontFamily: "var(--font-space-grotesk, sans-serif)",
                  fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
                  fontWeight: 700, color: "#ffffff",
                }}>
                  {plan.price}
                </span>
                <span style={{
                  fontFamily: "var(--font-manrope, sans-serif)",
                  fontSize: 13, color: "#475569",
                }}>
                  {plan.period}
                </span>
              </div>
              <div style={{
                fontFamily: "var(--font-manrope, sans-serif)",
                fontSize: 13, color: "#64748b",
              }}>
                {plan.desc}
              </div>
            </div>

            <Link
              href={plan.ctaHref}
              style={{
                display: "block",
                textAlign: "center",
                padding: "10px 20px",
                borderRadius: 3,
                fontFamily: "var(--font-manrope, sans-serif)",
                fontWeight: 700, fontSize: 13,
                textDecoration: "none",
                marginBottom: 28,
                background: plan.highlight ? "#E8390E" : "transparent",
                color: plan.highlight ? "#ffffff" : "#94a3b8",
                border: plan.highlight ? "none" : `1px solid rgba(255,255,255,0.1)`,
                boxShadow: plan.highlight ? "0 0 20px rgba(232,57,14,0.3)" : "none",
                letterSpacing: "0.02em",
              }}
            >
              {plan.cta}
            </Link>

            <div style={{
              height: 1,
              background: "rgba(255,255,255,0.05)",
              marginBottom: 20,
            }} />

            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {plan.features.map((f) => (
                <li key={f.text} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <span style={{
                    fontFamily: "var(--font-jetbrains, monospace)",
                    fontSize: 11,
                    color: f.ok ? "#10B981" : "#1E1E2E",
                    flexShrink: 0,
                    textShadow: f.ok ? "0 0 8px #10B98160" : "none",
                  }}>
                    {f.ok ? "✓" : "—"}
                  </span>
                  <span style={{
                    fontFamily: "var(--font-manrope, sans-serif)",
                    fontSize: 13,
                    color: f.ok ? "#94a3b8" : "#2d3748",
                  }}>
                    {f.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
