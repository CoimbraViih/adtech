import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "AdHunter — Mire melhor. Gaste menos.",
  description:
    "15–30% da verba some em anúncios ruins. A AdHunter encontra cada centavo perdido e redireciona ao que converte. Loop fechado de otimização com IA.",
  openGraph: {
    title: "AdHunter — Mire melhor. Gaste menos.",
    description:
      "Plataforma AdTech de performance para gestores de tráfego e agências brasileiras.",
    url: "https://adhunter.io",
    siteName: "AdHunter",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AdHunter — Mire melhor. Gaste menos.",
    description: "Loop fechado de otimização: IA cria, pixel mede, analytics aprende, IA melhora.",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{
        fontFamily: "var(--font-manrope), var(--font-inter), sans-serif",
        background: "#0D0D1A",
      }}
    >
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
