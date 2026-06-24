"use client";

import { useState, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const FAQS = [
  {
    q: "Como funciona o período gratuito?",
    a: "Os primeiros 3 meses são gratuitos — zero de cobrança durante o acesso antecipado. Após isso, é pay-as-you-go: 10% do seu gasto até R$2k/mês, 5% entre R$2k–R$5k, e 3% acima de R$5k. Piso mínimo: R$197/mês com gasto ativo. Sem gasto = sem cobrança.",
  },
  {
    q: "O pixel server-side substitui o pixel do navegador?",
    a: "Sim. O pixel da AdHunter roda no servidor, então iOS 17, Safari ITP e bloqueadores de anúncio não conseguem interceptá-lo. Você recupera em média 28% das conversões que estava perdendo.",
  },
  {
    q: "Quanto tempo leva para integrar Meta e Google?",
    a: "A conexão OAuth leva menos de 2 minutos por plataforma. O sync histórico (últimos 90 dias) é concluído em até 30 minutos. Não há código para instalar.",
  },
  {
    q: "Os criativos gerados por IA precisam de revisão?",
    a: "Recomendamos sempre revisar antes de publicar. A IA usa seus dados de performance para gerar variações otimizadas, mas o controle final é sempre seu.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Sem multa, sem aviso prévio de 30 dias. Cancele pelo painel e o acesso continua até o fim do período já pago.",
  },
  {
    q: "Funciona com qualquer nicho ou tipo de negócio?",
    a: "A plataforma é agnóstica de segmento. Agências, e-commerces, SaaS e negócios locais já usam. Desde que você rode campanhas pagas, a AdHunter é útil.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.set(".faq-item", { opacity: 0, x: -20 });

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 75%",
      onEnter: () => {
        gsap.to(".faq-item", {
          opacity: 1, x: 0,
          duration: 0.5, ease: "power2.out",
          stagger: 0.06,
        });
      },
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, { scope: sectionRef });

  return (
    <section
      ref={sectionRef}
      style={{
        position: "relative",
        zIndex: 2,
        padding: "80px 24px 120px",
        maxWidth: 860,
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 10, color: "#475569",
          letterSpacing: "0.25em", marginBottom: 12,
        }}>
          // PERGUNTAS FREQUENTES
        </div>
        <h2 style={{
          fontFamily: "var(--font-space-grotesk, sans-serif)",
          fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
          fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em",
        }}>
          Dúvidas antes de mirar?
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {FAQS.map((faq, i) => (
          <div
            key={i}
            className="faq-item"
            style={{
              background: open === i ? "rgba(0,212,255,0.03)" : "rgba(13,13,26,0.6)",
              border: `1px solid ${open === i ? "rgba(0,212,255,0.15)" : "rgba(255,255,255,0.04)"}`,
              borderRadius: 4,
              overflow: "hidden",
              transition: "background 0.2s, border-color 0.2s",
            }}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%",
                padding: "18px 20px",
                textAlign: "left",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 16,
              }}
            >
              <span style={{
                fontFamily: "var(--font-space-grotesk, sans-serif)",
                fontSize: 15, fontWeight: 600,
                color: open === i ? "#e2e8f0" : "#94a3b8",
                transition: "color 0.2s",
              }}>
                {faq.q}
              </span>
              <span style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: 14,
                color: open === i ? "#00d4ff" : "#334155",
                transition: "color 0.2s, transform 0.3s",
                transform: open === i ? "rotate(45deg)" : "rotate(0deg)",
                flexShrink: 0,
                display: "inline-block",
              }}>
                +
              </span>
            </button>

            <div style={{
              maxHeight: open === i ? 300 : 0,
              overflow: "hidden",
              transition: "max-height 0.35s ease",
            }}>
              <p style={{
                padding: "0 20px 18px",
                fontFamily: "var(--font-manrope, sans-serif)",
                fontSize: 14, color: "#64748b",
                lineHeight: 1.7,
                borderTop: "1px solid rgba(255,255,255,0.04)",
                paddingTop: 16,
              }}>
                {faq.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
