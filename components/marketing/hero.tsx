"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

function HudCorner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const style: React.CSSProperties = {
    position: "absolute",
    width: 20,
    height: 20,
    ...(pos === "tl" && { top: 0, left: 0, borderTop: "1px solid #00d4ff", borderLeft: "1px solid #00d4ff" }),
    ...(pos === "tr" && { top: 0, right: 0, borderTop: "1px solid #00d4ff", borderRight: "1px solid #00d4ff" }),
    ...(pos === "bl" && { bottom: 0, left: 0, borderBottom: "1px solid #00d4ff", borderLeft: "1px solid #00d4ff" }),
    ...(pos === "br" && { bottom: 0, right: 0, borderBottom: "1px solid #00d4ff", borderRight: "1px solid #00d4ff" }),
  };
  return <span style={style} />;
}

function ScanLine() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.4) 50%, transparent 100%)",
          animation: "hud-scan 4s linear infinite",
        }}
      />
    </div>
  );
}

const STATS = [
  { value: "−34%", label: "CPA médio", color: "#10B981" },
  { value: "4.2×", label: "ROAS médio", color: "#00d4ff" },
  { value: "10h", label: "economizadas/sem", color: "#ffffff" },
  { value: "R$2.1M", label: "verba gerenciada", color: "#7b2fff" },
];

export function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const preloaderRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const tl = gsap.timeline({ onComplete: () => setLoaded(true) });

    gsap.set(preloaderRef.current, { opacity: 1 });

    tl.to(".preloader-bar", {
      width: "100%",
      duration: 1.4,
      ease: "power2.inOut",
    })
      .to(".preloader-pct", {
        textContent: "100",
        duration: 1.4,
        snap: { textContent: 1 },
        ease: "power2.inOut",
      }, "<")
      .to(preloaderRef.current, { opacity: 0, duration: 0.5, ease: "power2.in" })
      .set(preloaderRef.current, { display: "none" });
  }, []);

  useGSAP(() => {
    if (!loaded) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    gsap.set([headlineRef.current, subRef.current, ctaRef.current, statsRef.current, mockupRef.current, hudRef.current], {
      opacity: 0,
      y: 40,
      filter: "blur(8px)",
    });

    tl.to(hudRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6 })
      .to(headlineRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8 }, "-=0.2")
      .to(subRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6 }, "-=0.4")
      .to(ctaRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6 }, "-=0.3")
      .to(statsRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.6 }, "-=0.3")
      .to(mockupRef.current, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.8 }, "-=0.4");

    gsap.to(mockupRef.current, {
      y: -80,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 1.5,
      },
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, { scope: containerRef, dependencies: [loaded] });

  return (
    <>
      {/* Preloader */}
      <div
        ref={preloaderRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "#000000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: "var(--font-space-grotesk, monospace)",
            fontSize: "clamp(1.2rem, 3vw, 2rem)",
            fontWeight: 700,
            letterSpacing: "0.3em",
            color: "#ffffff",
            textTransform: "uppercase",
            marginBottom: 8,
          }}>
            <span style={{ color: "#E8390E" }}>AD</span>HUNTER
          </div>
          <div style={{
            fontFamily: "var(--font-jetbrains, monospace)",
            fontSize: 11,
            color: "#334155",
            letterSpacing: "0.2em",
          }}>
            INITIALIZING SYSTEM
          </div>
        </div>

        <div style={{ width: 200, position: "relative" }}>
          <div style={{ height: 1, background: "#1E1E2E", width: "100%" }} />
          <div
            className="preloader-bar"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: 1,
              width: 0,
              background: "linear-gradient(90deg, #E8390E, #00d4ff)",
              boxShadow: "0 0 8px #00d4ff",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            className="preloader-pct"
            style={{ fontFamily: "var(--font-jetbrains, monospace)", fontSize: 11, color: "#00d4ff" }}
          >0</span>
          <span style={{ fontFamily: "var(--font-jetbrains, monospace)", fontSize: 11, color: "#334155" }}>%</span>
        </div>
      </div>

      {/* Hero */}
      <section
        ref={containerRef}
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          paddingTop: 80,
        }}
      >
        {/* HUD frame overlay */}
        <div
          ref={hudRef}
          aria-hidden
          style={{ position: "absolute", inset: "60px 20px 20px", pointerEvents: "none", zIndex: 2 }}
        >
          <HudCorner pos="tl" />
          <HudCorner pos="tr" />
          <HudCorner pos="bl" />
          <HudCorner pos="br" />
          <ScanLine />
          <div style={{
            position: "absolute", top: 12, left: 12,
            fontFamily: "var(--font-jetbrains, monospace)", fontSize: 9,
            color: "#00d4ff", letterSpacing: "0.15em", opacity: 0.7,
          }}>
            SYS.ADHUNTER.v2.0 // TARGETING_ACTIVE
          </div>
          <div style={{
            position: "absolute", top: 12, right: 12,
            fontFamily: "var(--font-jetbrains, monospace)", fontSize: 9,
            color: "#E8390E", letterSpacing: "0.15em", opacity: 0.7,
          }}>
            LAT: -23.5 // LON: -46.6 // BR
          </div>
        </div>

        <div style={{
          position: "relative",
          zIndex: 3,
          width: "100%",
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px 120px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 64,
          alignItems: "center",
        }}>
          {/* Left copy */}
          <div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              border: "1px solid rgba(0,212,255,0.3)",
              borderRadius: 2,
              marginBottom: 24,
              background: "rgba(0,212,255,0.05)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "#10B981",
                animation: "hud-blink 1.2s ease-in-out infinite", display: "inline-block",
              }} />
              <span style={{
                fontFamily: "var(--font-jetbrains, monospace)", fontSize: 10,
                color: "#00d4ff", letterSpacing: "0.2em",
              }}>
                ACESSO ANTECIPADO ABERTO
              </span>
            </div>

            <h1
              ref={headlineRef}
              style={{
                fontFamily: "var(--font-space-grotesk, sans-serif)",
                fontSize: "clamp(2.4rem, 5vw, 4rem)",
                fontWeight: 700,
                lineHeight: 1.05,
                color: "#ffffff",
                marginBottom: 24,
                letterSpacing: "-0.02em",
              }}
            >
              Mire melhor.{" "}
              <span style={{
                background: "linear-gradient(135deg, #E8390E 0%, #ff6b35 50%, #E8390E 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
                Gaste menos.
              </span>
            </h1>

            <p
              ref={subRef}
              style={{
                fontFamily: "var(--font-manrope, sans-serif)",
                fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)",
                color: "#94a3b8",
                lineHeight: 1.7,
                marginBottom: 36,
                maxWidth: 460,
              }}
            >
              IA que gera criativos, otimiza campanhas em tempo real e fecha o loop entre
              verba gasta e receita gerada — tudo numa plataforma só.
            </p>

            <div ref={ctaRef} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/signup" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 28px",
                background: "#E8390E",
                color: "#ffffff",
                fontFamily: "var(--font-manrope, sans-serif)",
                fontWeight: 700, fontSize: 14, borderRadius: 3,
                textDecoration: "none", letterSpacing: "0.02em",
                boxShadow: "0 0 24px rgba(232,57,14,0.4), 0 0 48px rgba(232,57,14,0.15)",
              }}>
                Começar agora <span style={{ fontSize: 16 }}>→</span>
              </Link>
              <Link href="#features" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 28px",
                background: "transparent",
                color: "#94a3b8",
                fontFamily: "var(--font-manrope, sans-serif)",
                fontWeight: 600, fontSize: 14, borderRadius: 3,
                textDecoration: "none",
                border: "1px solid rgba(148,163,184,0.2)",
              }}>
                Ver demo
              </Link>
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div
            ref={mockupRef}
            style={{
              position: "relative",
              background: "rgba(13,13,26,0.85)",
              border: "1px solid rgba(0,212,255,0.15)",
              borderRadius: 8,
              padding: 20,
              backdropFilter: "blur(20px)",
              boxShadow: "0 0 60px rgba(0,212,255,0.08), 0 40px 80px rgba(0,0,0,0.6)",
            }}
          >
            <div aria-hidden style={{
              position: "absolute", top: -1, left: "20%", right: "20%", height: 1,
              background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.6), transparent)",
            }} />

            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #1E1E2E" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
              <span style={{ marginLeft: 8, fontFamily: "var(--font-jetbrains, monospace)", fontSize: 9, color: "#334155" }}>
                adhunter.io/dashboard
              </span>
            </div>

            <div style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderLeft: "3px solid #EF4444",
              borderRadius: 4, padding: "8px 12px", marginBottom: 12,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: "var(--font-jetbrains, monospace)", fontSize: 10, color: "#EF4444" }}>
                ⚠ ANOMALIA — CPA +68% acima do baseline
              </span>
              <span style={{ fontFamily: "var(--font-jetbrains, monospace)", fontSize: 9, color: "#334155" }}>agora</span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr>
                  {["CAMPANHA", "SPEND", "ROAS", "CPA", "STATUS"].map((h) => (
                    <th key={h} style={{
                      padding: "4px 8px",
                      fontFamily: "var(--font-jetbrains, monospace)",
                      color: "#334155", fontWeight: 500, letterSpacing: "0.1em",
                      textAlign: "left", borderBottom: "1px solid #1E1E2E",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Black Friday — Meta", spend: "R$4.2k", roas: "4.8×", cpa: "R$31", status: "active", sc: "#10B981" },
                  { name: "Google Search — Brand", spend: "R$1.8k", roas: "6.1×", cpa: "R$18", status: "active", sc: "#10B981" },
                  { name: "Remarketing — Meta", spend: "R$2.1k", roas: "1.9×", cpa: "R$87", status: "paused", sc: "#F59E0B" },
                  { name: "Display — GDN", spend: "R$890", roas: "0.8×", cpa: "R$210", status: "alert", sc: "#EF4444" },
                ].map((row) => (
                  <tr key={row.name} style={{ borderBottom: "1px solid rgba(30,30,46,0.5)" }}>
                    <td style={{ padding: "6px 8px", fontFamily: "var(--font-jetbrains, monospace)", color: "#cbd5e1", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</td>
                    <td style={{ padding: "6px 8px", fontFamily: "var(--font-jetbrains, monospace)", color: "#94a3b8" }}>{row.spend}</td>
                    <td style={{ padding: "6px 8px", fontFamily: "var(--font-jetbrains, monospace)", color: "#10B981" }}>{row.roas}</td>
                    <td style={{ padding: "6px 8px", fontFamily: "var(--font-jetbrains, monospace)", color: "#94a3b8" }}>{row.cpa}</td>
                    <td style={{ padding: "6px 8px" }}>
                      <span style={{
                        fontFamily: "var(--font-jetbrains, monospace)", fontSize: 9,
                        color: row.sc, background: `${row.sc}15`,
                        padding: "2px 6px", borderRadius: 2, border: `1px solid ${row.sc}30`,
                      }}>{row.status.toUpperCase()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats strip */}
        <div ref={statsRef} style={{
          position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 3,
          display: "flex", justifyContent: "center",
          borderTop: "1px solid rgba(30,30,46,0.8)",
          background: "rgba(0,0,5,0.6)",
          backdropFilter: "blur(12px)",
        }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              flex: 1, maxWidth: 200,
              padding: "16px 24px", textAlign: "center",
              borderRight: i < STATS.length - 1 ? "1px solid #1E1E2E" : "none",
            }}>
              <div style={{
                fontFamily: "var(--font-jetbrains, monospace)",
                fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)",
                fontWeight: 700, color: s.color, lineHeight: 1,
                marginBottom: 4, textShadow: `0 0 12px ${s.color}60`,
              }}>{s.value}</div>
              <div style={{
                fontFamily: "var(--font-manrope, sans-serif)",
                fontSize: 10, color: "#475569", letterSpacing: "0.05em",
              }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
