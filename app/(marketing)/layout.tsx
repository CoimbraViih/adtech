import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

export const metadata: Metadata = {
  title: "AdFlow — Plataforma de Publicidade com IA para Agências",
  description:
    "Unifique campanhas Meta e Google, gere criativos com IA, rastreie conversões server-side e otimize com analytics multi-touch em uma única plataforma.",
  openGraph: {
    title: "AdFlow — Plataforma de Publicidade com IA",
    description:
      "Unifique campanhas, geração de criativos com IA e analytics multi-touch numa plataforma só.",
    url: "https://adflow.app",
    siteName: "AdFlow",
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AdFlow — Plataforma de Publicidade com IA",
    description:
      "Unifique campanhas, geração de criativos com IA e analytics multi-touch numa plataforma só.",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[color:var(--adflow-base)]">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
