import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade — AdHunter",
  description: "Como o AdHunter coleta, usa e protege seus dados pessoais conforme a LGPD.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 text-white">
      <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
      <p className="text-[--color-muted] text-sm mb-10">
        Última atualização: 16 de junho de 2026
      </p>

      <section className="space-y-8 text-[--color-muted] leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">1. Quem somos</h2>
          <p>
            AdHunter é uma plataforma de gestão de anúncios e criativos desenvolvida e
            operada por AdHunter Tecnologia Ltda. (&ldquo;AdHunter&rdquo;, &ldquo;nós&rdquo;, &ldquo;nosso&rdquo;), com sede no
            Brasil. Este documento descreve como coletamos, usamos, armazenamos e
            protegemos suas informações pessoais, em conformidade com a Lei Geral de
            Proteção de Dados (LGPD — Lei nº 13.709/2018).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">2. Dados que coletamos</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-white">Cadastro:</strong> nome, e-mail, nome da empresa.</li>
            <li><strong className="text-white">Uso da plataforma:</strong> campanhas criadas, criativos gerados, eventos de pixel (anonimizados).</li>
            <li><strong className="text-white">Pagamento:</strong> processado diretamente pelo Stripe — não armazenamos dados de cartão.</li>
            <li><strong className="text-white">Logs técnicos:</strong> endereço IP (truncado para os primeiros 3 octetos), tipo de navegador, páginas visitadas.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">3. Como usamos seus dados</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Prestar e melhorar os serviços do AdHunter.</li>
            <li>Enviar alertas operacionais e comunicações de conta.</li>
            <li>Cumprir obrigações legais e prevenir fraudes.</li>
            <li>Gerar métricas de uso anonimizadas para desenvolvimento do produto.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">4. Base legal (LGPD)</h2>
          <p>
            Processamos dados com base no contrato (art. 7º, V), no legítimo interesse
            para segurança e prevenção de fraudes (art. 7º, IX), e no cumprimento de
            obrigações legais (art. 7º, II).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">5. Compartilhamento</h2>
          <p>
            Não vendemos dados. Compartilhamos apenas com provedores de infraestrutura
            (Supabase, Vercel, Stripe) sujeitos a acordos de processamento de dados
            compatíveis com a LGPD.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">6. Seus direitos</h2>
          <p>
            Você pode solicitar acesso, correção, exclusão, portabilidade ou oposição ao
            tratamento dos seus dados pessoais enviando e-mail para{" "}
            <a href="mailto:privacidade@adhunter.io" className="text-[--color-accent] underline">
              privacidade@adhunter.io
            </a>
            . Responderemos em até 15 dias.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">7. Retenção</h2>
          <p>
            Mantemos dados de conta enquanto a conta estiver ativa. Após encerramento,
            excluímos ou anonimizamos os dados em até 90 dias, salvo obrigação legal de
            retenção maior.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">8. Cookies</h2>
          <p>
            Usamos apenas cookies essenciais para autenticação (Supabase session) e
            segurança (CSRF state). Não usamos cookies de rastreamento de terceiros.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mb-2">9. Contato</h2>
          <p>
            Dúvidas:{" "}
            <a href="mailto:privacidade@adhunter.io" className="text-[--color-accent] underline">
              privacidade@adhunter.io
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
