import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { ParticleUniverse } from "@/components/marketing/particle-universe";

export const metadata: Metadata = {
  title: "AdHunter — Mire melhor. Gaste menos.",
  description:
    "IA que gera criativos, otimiza campanhas em tempo real e fecha o loop entre verba gasta e receita gerada.",
  openGraph: {
    title: "AdHunter — Mire melhor. Gaste menos.",
    description:
      "Pixel server-side, atribuição multi-touch e IA de criativos numa plataforma só.",
    url: "https://adhunter.io",
    siteName: "AdHunter",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AdHunter — Mire melhor. Gaste menos.",
    description:
      "Pixel server-side, atribuição multi-touch e IA de criativos numa plataforma só.",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#000000",
        fontFamily: "var(--font-manrope), var(--font-inter), sans-serif",
      }}
    >
      <ParticleUniverse />
      <MarketingHeader />
      <main style={{ position: "relative", zIndex: 2 }}>{children}</main>
      <MarketingFooter />
    </div>
  );
}
