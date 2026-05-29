"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "O AdHunter funciona com Meta Ads e Google Ads ao mesmo tempo?",
    answer: "Sim. Integração nativa com Meta Marketing API e Google Ads API v18. Você cria, pausa e monitora campanhas nos dois canais num único painel com sincronização automática.",
  },
  {
    question: "Como funciona o pixel server-side? Preciso mudar meu site?",
    answer: "Adicione uma linha de JavaScript. O adflow.js envia eventos ao nosso servidor, que repassa para Meta CAPI e Google Enhanced Conversions — contornando bloqueadores de anúncio sem expor dados PII no navegador.",
  },
  {
    question: "O AI Creative Studio substitui meu redator?",
    answer: "Não — acelera. O GPT-4o gera variações de headline, descrição e CTA a partir do seu briefing. Cada variação recebe score 0–100 com checagem automática de política. Seu redator faz curadoria, não trabalho braçal.",
  },
  {
    question: "Qual a diferença entre Pro e Agency?",
    answer: "Pro cobre a maioria das agências: campanhas ilimitadas, analytics multi-touch, alertas automáticos. Agency adiciona compra programática RTB, DMP proprietário, workspaces ilimitados e suporte dedicado.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer: "Sim. Sem fidelidade. Cancele pelo painel de billing a qualquer momento. Você mantém acesso até o fim do período pago.",
  },
  {
    question: "Como fica a segurança dos dados dos meus clientes?",
    answer: "Arquitetura multi-tenant com Row Level Security (RLS) no banco. Cada cliente fica num workspace isolado — nenhum usuário acessa dados de outro workspace. LGPD: IPs mascarados nos logs, opt-out disponível no DMP.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: "1px solid #1E1E2E" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
        aria-expanded={open}
      >
        <span
          className="text-sm font-medium"
          style={{
            color: open ? "#F1F5F9" : "#94A3B8",
            fontFamily: "var(--font-manrope),sans-serif",
          }}
        >
          {question}
        </span>
        <ChevronDown
          className="w-4 h-4 shrink-0"
          style={{
            color: open ? "#E8390E" : "#334155",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {open && (
        <p
          className="pb-4 text-sm leading-relaxed pr-8"
          style={{ color: "#475569", fontFamily: "var(--font-manrope),sans-serif" }}
        >
          {answer}
        </p>
      )}
    </div>
  );
}

export function Faq() {
  return (
    <section id="faq" className="border-b" style={{ borderColor: "#1E1E2E" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        {/* Header */}
        <div className="flex items-baseline justify-between mb-8 pb-4" style={{ borderBottom: "1px solid #1E1E2E" }}>
          <div>
            <p
              className="text-[10px] uppercase tracking-widest mb-1"
              style={{ color: "#E8390E", fontFamily: "var(--font-manrope),sans-serif" }}
            >
              05 — FAQ
            </p>
            <h2
              className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: "var(--font-space-grotesk),sans-serif", color: "#F1F5F9" }}
            >
              Perguntas frequentes
            </h2>
          </div>
        </div>

        <div className="max-w-2xl">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
