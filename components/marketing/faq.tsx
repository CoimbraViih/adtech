"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    question: "O AdFlow funciona com Meta Ads e Google Ads ao mesmo tempo?",
    answer: "Sim. Integramos a Meta Marketing API e a Google Ads API nativamente. Crie, pause e monitore campanhas nos dois canais num único painel com sincronização automática de métricas.",
  },
  {
    question: "Como funciona o pixel server-side? Preciso mudar meu site?",
    answer: "Basta adicionar uma linha de JavaScript. O adflow.js envia eventos ao nosso servidor, que repassa ao Meta CAPI e Google Enhanced Conversions — contornando bloqueadores de anúncio e melhorando a qualidade dos dados.",
  },
  {
    question: "O AI Creative Studio substitui um redator?",
    answer: "Não — ele acelera. O GPT-4o gera variações de headline, descrição e CTA a partir do seu briefing. Cada variação recebe score 0-100 com checagem de política Meta/Google. O redator faz a curadoria, não o trabalho braçal.",
  },
  {
    question: "Qual a diferença entre Pro e Agency?",
    answer: "O Pro cobre a maioria das agências: campanhas ilimitadas, analytics multi-touch e alertas. O Agency adiciona compra programática RTB, DMP proprietário, workspaces ilimitados, white-label e suporte dedicado.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer: "Sim. Sem fidelidade. Cancele pelo painel de billing a qualquer momento. Você mantém acesso até o fim do período pago.",
  },
  {
    question: "Os dados dos meus clientes ficam separados?",
    answer: "Sim. Arquitetura multi-tenant com Row Level Security: cada cliente fica num workspace isolado. Nenhum usuário acessa dados de outro workspace.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-b"
      style={{ borderColor: "rgba(255,255,255,0.05)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-5 text-left gap-4"
        aria-expanded={open}
      >
        <span
          className="text-sm font-medium"
          style={{ color: open ? "#F1F5F9" : "#94A3B8", transition: "color 0.2s" }}
        >
          {question}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 transition-transform duration-300",
            open && "rotate-180"
          )}
          style={{ color: open ? "#E8390E" : "#334155" }}
        />
      </button>
      {open && (
        <p
          className="pb-5 text-sm leading-relaxed pr-8"
          style={{ color: "#475569" }}
        >
          {answer}
        </p>
      )}
    </div>
  );
}

export function Faq() {
  return (
    <section
      id="faq"
      className="relative py-24 md:py-32 px-4 sm:px-6 overflow-hidden"
    >
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.3),transparent)" }}
      />

      <div className="relative z-10 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "#8B5CF6" }}>
            FAQ
          </p>
          <h2
            className="text-3xl md:text-5xl font-bold"
            style={{
              background: "linear-gradient(135deg,#F1F5F9 30%,#64748B 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Perguntas frequentes
          </h2>
        </div>

        <div
          className="rounded-2xl px-6 overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(16px)",
          }}
        >
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
