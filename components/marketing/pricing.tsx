"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const TIERS = [
  { range: "Gasto até R$2.000/mês", rate: "10%", neon: "#E8390E" },
  { range: "R$2.001 – R$5.000/mês", rate: "5%", neon: "#F59E0B" },
  { range: "Acima de R$5.000/mês", rate: "3%", neon: "#10B981" },
];

const INFO_CARDS = [
  {
    title: "Sem setup",
    desc: "Conecte Meta e Google em minutos. Zero taxa de setup ou onboarding.",
  },
  {
    title: "Tudo incluso",
    desc: "IA de criativos, pixel server-side, atribuição multi-touch e automações — sem adicional.",
  },
  {
    title: "Cancelamento livre",
    desc: "Sem contrato mínimo. Cancele quando quiser.",
  },
];

export function Pricing() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

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
      {/* Divider */}
      <div style={{
        height: 1,
        background: "linear-gradient(90deg, transparent, #1E1E2E 20%, #1E1E2E 80%, transparent)",
        marginBottom: 80,
      }} />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <div style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 10, color: "#E8390E",
          letterSpacing: "0.25em", marginBottom: 12, opacity: 0.8,
        }}>
          // MODELO DE COBRANÇA
        </div>
        <h2 style={{
          fontFamily: "var(--font-space-grotesk, sans-serif)",
          fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
          fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em",
          marginBottom: 12,
        }}>
          Só paga quem gera resultado.
        </h2>
        <p style={{
          fontFamily: "var(--font-manrope, sans-serif)",
          fontSize: 15, color: "#64748b",
        }}>
          Pós-pago. Taxa sobre gasto gerenciado. Sem mensalidade.
        </p>
      </div>

      {/* Main fee block */}
      <div style={{
        maxWidth: 680,
        margin: "0 auto 64px",
        background: "rgba(13,13,26,0.8)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderTop: "2px solid #E8390E",
        borderRadius: 8,
        padding: "40px 40px 32px",
        backdropFilter: "blur(16px)",
        boxShadow: "0 0 40px rgba(232,57,14,0.08)",
      }}>
        {/* Block label */}
        <div style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 10, color: "#E8390E",
          letterSpacing: "0.2em", marginBottom: 24, opacity: 0.8,
        }}>
          // TAXA SOBRE GASTO GERENCIADO
        </div>

        {/* Tier table */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 32 }}>
          {TIERS.map((tier, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 0",
                borderBottom: i < TIERS.length - 1
                  ? "1px solid rgba(255,255,255,0.05)"
                  : "none",
              }}
            >
              <span style={{
                fontFamily: "var(--font-manrope, sans-serif)",
                fontSize: 14, color: "#94a3b8",
              }}>
                {tier.range}
              </span>
              <span style={{
                fontFamily: "var(--font-space-grotesk, sans-serif)",
                fontSize: "clamp(1.1rem, 2vw, 1.4rem)",
                fontWeight: 700,
                color: tier.neon,
                textShadow: `0 0 12px ${tier.neon}60`,
                letterSpacing: "-0.01em",
              }}>
                {tier.rate}
              </span>
            </div>
          ))}
        </div>

        {/* Floor highlight */}
        <div style={{
          background: "rgba(232,57,14,0.06)",
          border: "1px solid rgba(232,57,14,0.2)",
          borderRadius: 4,
          padding: "14px 18px",
          marginBottom: 14,
        }}>
          <span style={{
            fontFamily: "var(--font-manrope, sans-serif)",
            fontSize: 14, color: "#ffffff", fontWeight: 600,
          }}>
            Piso R$197/mês
          </span>
          <span style={{
            fontFamily: "var(--font-manrope, sans-serif)",
            fontSize: 13, color: "#94a3b8",
          }}>
            {" "}— cobrado apenas quando há gasto ativo
          </span>
        </div>

        <p style={{
          fontFamily: "var(--font-manrope, sans-serif)",
          fontSize: 13, color: "#64748b",
        }}>
          Sem gasto no mês = R$0. Simples assim.
        </p>
      </div>

      {/* Info cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 20,
        alignItems: "start",
        marginBottom: 56,
      }}>
        {INFO_CARDS.map((card, i) => (
          <div
            key={i}
            className="price-card"
            onMouseEnter={() => setHoveredCard(i)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              background: "rgba(13,13,26,0.8)",
              border: `1px solid ${hoveredCard === i ? "rgba(232,57,14,0.2)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 8,
              padding: "28px 24px",
              backdropFilter: "blur(16px)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
              transform: hoveredCard === i ? "translateY(-6px)" : "translateY(0)",
              boxShadow: hoveredCard === i
                ? "0 20px 60px rgba(232,57,14,0.1)"
                : "none",
            }}
          >
            <div style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: 15, fontWeight: 700, color: "#ffffff",
              marginBottom: 10,
            }}>
              {card.title}
            </div>
            <p style={{
              fontFamily: "var(--font-manrope, sans-serif)",
              fontSize: 13, color: "#64748b", lineHeight: 1.65,
              margin: 0,
            }}>
              {card.desc}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center" }}>
        <Link
          href="/signup"
          style={{
            display: "inline-block",
            padding: "12px 36px",
            borderRadius: 3,
            fontFamily: "var(--font-manrope, sans-serif)",
            fontWeight: 700, fontSize: 14,
            textDecoration: "none",
            background: "#E8390E",
            color: "#ffffff",
            boxShadow: "0 0 24px rgba(232,57,14,0.35)",
            letterSpacing: "0.02em",
          }}
        >
          Começar grátis
        </Link>
      </div>
    </section>
  );
}
