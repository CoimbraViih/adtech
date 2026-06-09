"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function CrosshairLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.5" stroke="#E8390E" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="1" x2="12" y2="6" stroke="#E8390E" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="23" stroke="#E8390E" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="12" x2="6" y2="12" stroke="#E8390E" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="12" x2="23" y2="12" stroke="#E8390E" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="#E8390E" />
    </svg>
  );
}

export function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 100,
        background: scrolled ? "rgba(0,0,5,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(30,30,46,0.8)" : "1px solid transparent",
        transition: "background 0.3s, backdrop-filter 0.3s, border-color 0.3s",
      }}
    >
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <CrosshairLogo />
          <span style={{
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: "0.05em",
            color: "#ffffff",
          }}>
            <span style={{ color: "#E8390E" }}>AD</span>HUNTER
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[
            { label: "Produto", href: "#features" },
            { label: "Preços", href: "#pricing" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="mkt-nav-link"
              style={{
                fontFamily: "var(--font-manrope, sans-serif)",
                fontSize: 13, fontWeight: 500,
                padding: "6px 12px",
                borderRadius: 3,
                textDecoration: "none",
                letterSpacing: "0.01em",
                transition: "color 0.2s",
              }}
            >
              {item.label}
            </a>
          ))}

          <div style={{ width: 1, height: 16, background: "#1E1E2E", margin: "0 4px" }} />

          <Link
            href="/login"
            style={{
              fontFamily: "var(--font-manrope, sans-serif)",
              fontSize: 13, fontWeight: 600,
              padding: "6px 16px",
              borderRadius: 3,
              textDecoration: "none",
              color: "#94a3b8",
              border: "1px solid rgba(255,255,255,0.08)",
              letterSpacing: "0.01em",
              transition: "border-color 0.2s, color 0.2s",
            }}
          >
            Entrar
          </Link>

          <Link
            href="/signup"
            style={{
              fontFamily: "var(--font-manrope, sans-serif)",
              fontSize: 13, fontWeight: 700,
              padding: "6px 18px",
              borderRadius: 3,
              textDecoration: "none",
              color: "#ffffff",
              background: "#E8390E",
              letterSpacing: "0.02em",
              boxShadow: "0 0 16px rgba(232,57,14,0.3)",
            }}
          >
            Começar grátis
          </Link>
        </nav>
      </div>

      {/* Bottom scan line on scroll */}
      {scrolled && (
        <div aria-hidden style={{
          position: "absolute",
          bottom: -1, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)",
        }} />
      )}
    </header>
  );
}
