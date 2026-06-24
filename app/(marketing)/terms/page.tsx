import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — AdHunter",
  description: "Termos e condições de uso da plataforma AdHunter.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-white">
      <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
      <p className="text-[--color-muted] text-sm mb-10">
        Última atualização: 16 de junho de 2026
      </p>

      <section className="space-y-8 text-[--color-muted] leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Aceitação</h2>
          <p>
            Ao criar uma conta ou usar o AdHunter, você concorda com estes Termos.
            Se representar uma empresa, confirma ter autoridade para vincular a empresa.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. Descrição do serviço</h2>
          <p>
            O AdHunter é uma plataforma SaaS para gestão de campanhas de anúncios,
            geração de criativos com IA, rastreamento server-side e análise de atribuição.
            A cobrança é pós-paga, baseada em taxa marginal sobre o gasto gerenciado nas plataformas de anúncios conectadas.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. Conta e segurança</h2>
          <p>
            Você é responsável por manter a confidencialidade das credenciais da sua conta.
            Notifique-nos imediatamente sobre qualquer uso não autorizado em{" "}
            <a href="mailto:seguranca@adhunter.io" className="text-[--color-accent] underline">
              seguranca@adhunter.io
            </a>.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. Uso aceitável</h2>
          <p>É proibido usar o AdHunter para:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Veicular publicidade enganosa, ilegal ou que viole políticas das plataformas de anúncios.</li>
            <li>Fazer engenharia reversa ou tentar obter acesso não autorizado à infraestrutura.</li>
            <li>Revender acesso sem autorização prévia por escrito.</li>
            <li>Processar dados de menores sem o consentimento exigido por lei.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Pagamento e renovação</h2>
          <p>
            Planos pagos são cobrados mensalmente via Stripe com renovação automática.
            Cancelamentos têm efeito no final do período pago. Não há reembolso proporcional,
            exceto quando exigido por lei brasileira de defesa do consumidor (CDC).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Propriedade intelectual</h2>
          <p>
            O AdHunter e seus componentes são de propriedade da AdHunter Tecnologia Ltda.
            Os criativos e dados gerados pelos usuários pertencem aos respectivos usuários.
            Concedemos licença limitada, não exclusiva e não transferível para uso da plataforma.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Limitação de responsabilidade</h2>
          <p>
            O AdHunter não se responsabiliza por resultados de campanhas, decisões de
            bidding das plataformas externas (Meta, Google etc.) ou perdas indiretas.
            Nossa responsabilidade total é limitada ao valor pago nos últimos 3 meses.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">8. Disponibilidade (SLA)</h2>
          <p>
            Nos esforçamos para manter disponibilidade de 99,5% mensal, excluindo
            janelas de manutenção programadas e eventos de força maior.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">9. Lei aplicável</h2>
          <p>
            Estes Termos são regidos pelas leis do Brasil. Fica eleito o foro da
            Comarca de São Paulo/SP para dirimir quaisquer disputas.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">10. Contato</h2>
          <p>
            <a href="mailto:legal@adhunter.io" className="text-[--color-accent] underline">
              legal@adhunter.io
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
