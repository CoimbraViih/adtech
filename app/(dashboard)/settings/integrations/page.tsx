import { IntegrationsGrid } from "@/components/settings/integrations-grid";
import { requireServerSession } from "@/lib/supabase/server";
import { listCredentialStatuses } from "@/lib/integrations/credentials";
import { PROVIDERS, PROVIDER_CATEGORIES } from "@/lib/integrations/providers";
import { redirect } from "next/navigation";
import type { IntegrationStatus } from "@/types/database";

export default async function IntegrationsPage() {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }

  const configured = await listCredentialStatuses(session.organization.id);
  const configuredMap = new Map<string, IntegrationStatus>(
    configured.map((s) => [s.provider, s])
  );

  const categories = PROVIDER_CATEGORIES.map((cat) => ({
    key: cat.key,
    label: cat.label,
    providers: Object.values(PROVIDERS)
      .filter((p) => p.category === cat.key)
      .map((p) => {
        const status = configuredMap.get(p.key);
        return {
          key: p.key,
          label: p.label,
          description: p.description,
          docsUrl: p.docsUrl,
          fields: p.fields.map((f) => ({
            key: f.key,
            label: f.label,
            placeholder: f.placeholder,
            helpText: f.helpText ?? null,
            secret: f.secret,
          })),
          configured: !!status,
          last_tested_at: status?.last_tested_at ?? null,
        };
      }),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[color:var(--adflow-fg)]">Integrações</h1>
        <p className="text-sm text-[color:var(--adflow-fg-muted)] mt-1">
          Configure as chaves de API das plataformas que a AdFlow vai gerenciar.
          As credenciais são criptografadas e armazenadas com segurança.
        </p>
      </div>
      <IntegrationsGrid initialCategories={categories} />
    </div>
  );
}
