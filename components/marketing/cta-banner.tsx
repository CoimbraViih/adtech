"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

export function CtaBanner() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.set(sectionRef.current, { opacity: 0, y: 40 });

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 85%",
      onEnter: () => {
        gsap.to(sectionRef.current, {
          opacity: 1, y: 0,
          duration: 0.8, ease: "power3.out",
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
        maxWidth: 1280,
        margin: "0 auto 120px",
        padding: "0 24px",
      }}
    >
      <div style={{
        position: "relative",
        background: "rgba(13,13,26,0.8)",
        border: "1px solid rgba(232,57,14,0.2)",
        borderRadius: 8,
        padding: "60px 64px",
        backdropFilter: "blur(20px)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 48,
      }}>
        {/* Background glow */}
        <div aria-hidden style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 200,
          background: "radial-gradient(ellipse, rgba(232,57,14,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Top neon edge */}
        <div aria-hidden style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
          background: "linear-gradient(90deg, transparent, rgba(232,57,14,0.6), transparent)",
        }} />

        {/* Left: copy */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 9, color: "#E8390E",
            letterSpacing: "0.25em", marginBottom: 12, opacity: 0.8,
          }}>
            // MISSÃO: ATIVAR
          </div>
          <h2 style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontSize: "clamp(1.6rem, 2.8vw, 2.2rem)",
            fontWeight: 700, color: "#ffffff",
            letterSpacing: "-0.02em", lineHeight: 1.1,
            marginBottom: 12,
          }}>
            15–30% da sua verba<br />
            <span style={{ color: "#E8390E" }}>some em anúncios ruins.</span>
          </h2>
          <p style={{
            fontFamily: "var(--font-manrope, sans-serif)",
            fontSize: 15, color: "#64748b", lineHeight: 1.6,
          }}>
            Comece grátis. Sem cartão. Sem setup técnico.
          </p>
        </div>

        {/* Right: CTA */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          <Link
            href="/signup"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 36px",
              background: "#E8390E",
              color: "#ffffff",
              fontFamily: "var(--font-manrope, sans-serif)",
              fontWeight: 700, fontSize: 15,
              borderRadius: 3, textDecoration: "none",
              letterSpacing: "0.02em",
              boxShadow: "0 0 32px rgba(232,57,14,0.5), 0 0 64px rgba(232,57,14,0.2)",
              whiteSpace: "nowrap",
            }}
          >
            Garantir acesso antecipado
            <span style={{ fontSize: 18 }}>→</span>
          </Link>
          <span style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 9, color: "#334155", letterSpacing: "0.1em",
          }}>
            FREE FOREVER · UPGRADE WHEN READY
          </span>
        </div>
      </div>
    </section>
  );
}
