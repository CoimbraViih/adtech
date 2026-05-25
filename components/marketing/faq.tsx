"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    question: "O AdFlow funciona com Meta Ads e Google Ads ao mesmo tempo?",
    answer:
      "Sim. O AdFlow integra com a Meta Marketing API e a Google Ads API nativamente. Você cria, pausa e monitora campanhas nos dois canais num único painel, com sincronização automática de métricas.",
  },
  {
    question: "Como funciona o pixel server-side? Preciso mudar meu site?",
    answer:
      "Basta adicionar uma linha de JavaScript no seu site. O adflow.js envia eventos para nosso servidor, que repassa ao Meta CAPI e Google Enhanced Conversions. Isso contorna bloqueadores de anúncio e melhora a qualidade dos dados de conversão.",
  },
  {
    question: "O AI Creative Studio substitui um redator?",
    answer:
      "Não — ele acelera. O GPT-4o gera variações de headline, descrição e CTA a partir do seu briefing. Cada variação recebe um score de qualidade 0-100 com checagem automática de política Meta/Google. O redator faz a curadoria, não o trabalho braçal.",
  },
  {
    question: "Qual a diferença entre os planos Pro e Agency?",
    answer:
      "O Pro cobre a maioria das agências de performance: campanhas ilimitadas, analytics multi-touch e alertas automáticos. O Agency adiciona compra programática RTB com DMP proprietário, workspaces ilimitados, white-label (em breve) e suporte dedicado.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim. Não há fidelidade. Cancele pelo painel de billing a qualquer momento. Você mantém acesso até o fim do período pago.",
  },
  {
    question: "Os dados dos meus clientes ficam separados?",
    answer:
      "Sim. A arquitetura multi-tenant isola os dados por workspace. Cada cliente da sua agência fica num workspace independente com Row Level Security no banco — nenhum usuário acessa dados de outro workspace.",
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[color:var(--adflow-border)] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-[color:var(--adflow-fg)]">{question}</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-[color:var(--adflow-fg-muted)] shrink-0 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-[color:var(--adflow-fg-muted)] leading-relaxed pr-8">
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
      className="py-20 md:py-28 px-4 sm:px-6 border-t border-[color:var(--adflow-border)]"
    >
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-4xl font-bold text-[color:var(--adflow-fg)] mb-3">
            Perguntas frequentes
          </h2>
        </div>
        <div className="rounded-lg border border-[color:var(--adflow-border)] bg-[color:var(--adflow-surface)] px-5">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
