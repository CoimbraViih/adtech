"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    num: "01",
    title: "IA Generativa de Criativos",
    desc: "Copy, banners e vídeos gerados automaticamente com base nos dados de performance anteriores. Cada criativo aprende com o último.",
    neon: "#00d4ff",
    icon: "✦",
  },
  {
    num: "02",
    title: "Pixel Server-Side",
    desc: "Rastreamento à prova de bloqueadores e iOS 17. Captura 100% das conversões via servidor — sem depender do navegador do usuário.",
    neon: "#7b2fff",
    icon: "◈",
  },
  {
    num: "03",
    title: "Atribuição Multi-Touch",
    desc: "Saiba exatamente qual canal gerou receita. Modelos lineares, last-click, e data-driven. Compare side-by-side numa janela só.",
    neon: "#10B981",
    icon: "⬡",
  },
  {
    num: "04",
    title: "Gestão de Campanhas",
    desc: "Meta + Google + Programático num dashboard único. Pausas automáticas por anomalia, regras de otimização e alertas em tempo real.",
    neon: "#E8390E",
    icon: "◎",
  },
  {
    num: "05",
    title: "Landing Pages sem código",
    desc: "Construtor visual com variantes A/B nativo. Publique em minutos, conecte ao pixel e veja conversões subirem no mesmo dia.",
    neon: "#ff2d78",
    icon: "⬢",
  },
  {
    num: "06",
    title: "Automação & Alertas",
    desc: "Regras de bid automático, sequências de remarketing e notificações instantâneas quando CPA sai do baseline definido.",
    neon: "#F59E0B",
    icon: "◉",
  },
];

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const cards = gsap.utils.toArray<HTMLElement>(".feat-card");

    cards.forEach((card, i) => {
      gsap.set(card, { opacity: 0, y: 60, filter: "blur(6px)" });

      gsap.to(card, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.7,
        ease: "power3.out",
        scrollTrigger: {
          trigger: card,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        delay: (i % 3) * 0.12,
      });
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, { scope: sectionRef });

  return (
    <section
      id="features"
      ref={sectionRef}
      style={{
        position: "relative",
        zIndex: 2,
        padding: "120px 24px",
        maxWidth: 1280,
        margin: "0 auto",
      }}
    >
      {/* Section header */}
      <div style={{ marginBottom: 64, maxWidth: 600 }}>
        <div style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 10, color: "#00d4ff",
          letterSpacing: "0.25em", textTransform: "uppercase",
          marginBottom: 16, opacity: 0.8,
        }}>
          // MÓDULOS DO SISTEMA
        </div>
        <h2 style={{
          fontFamily: "var(--font-space-grotesk, sans-serif)",
          fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
          fontWeight: 700, color: "#ffffff",
          lineHeight: 1.1, letterSpacing: "-0.02em",
          marginBottom: 16,
        }}>
          Tudo que você precisa.<br />
          <span style={{ color: "#475569" }}>Nada que você não usa.</span>
        </h2>
        <p style={{
          fontFamily: "var(--font-manrope, sans-serif)",
          fontSize: 15, color: "#64748b", lineHeight: 1.7,
        }}>
          Cada módulo resolve um problema real de agências — integrado por design,
          não por gambiarra.
        </p>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 1,
        background: "#1E1E2E",
        border: "1px solid #1E1E2E",
        borderRadius: 8,
        overflow: "hidden",
      }}>
        {FEATURES.map((f) => (
          <div
            key={f.num}
            className="feat-card"
            style={{
              background: "#0D0D1A",
              padding: "32px 28px",
              position: "relative",
              overflow: "hidden",
              cursor: "default",
              transition: "background 0.3s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(13,13,26,0.6)";
              const glow = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(".feat-glow");
              if (glow) glow.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "#0D0D1A";
              const glow = (e.currentTarget as HTMLElement).querySelector<HTMLElement>(".feat-glow");
              if (glow) glow.style.opacity = "0";
            }}
          >
            {/* Neon glow on hover */}
            <div
              className="feat-glow"
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, height: 1,
                background: `linear-gradient(90deg, transparent, ${f.neon}80, transparent)`,
                opacity: 0,
                transition: "opacity 0.3s",
              }}
            />

            {/* Number + Icon row */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 20,
            }}>
              <span style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 11, color: f.neon,
                letterSpacing: "0.15em", opacity: 0.7,
              }}>
                {f.num}
              </span>
              <span style={{
                fontSize: 22, color: f.neon,
                textShadow: `0 0 12px ${f.neon}`,
                opacity: 0.8,
              }}>
                {f.icon}
              </span>
            </div>

            <h3 style={{
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              fontSize: 16, fontWeight: 600,
              color: "#e2e8f0", lineHeight: 1.3,
              marginBottom: 10, letterSpacing: "-0.01em",
            }}>
              {f.title}
            </h3>

            <p style={{
              fontFamily: "var(--font-manrope, sans-serif)",
              fontSize: 13, color: "#64748b",
              lineHeight: 1.65,
            }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
