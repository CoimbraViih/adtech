import { NextResponse } from "next/server";
import { requireServerSession } from "@/lib/supabase/server";
import { listCredentialStatuses, getOAuthConnectedProviders, type OAuthConnectedInfo } from "@/lib/integrations/credentials";
import { PROVIDERS, PROVIDER_CATEGORIES } from "@/lib/integrations/providers";
import type { IntegrationStatus } from "@/types/database";

// GET /api/settings/integrations
// Returns integration statuses + provider metadata. Never returns credential values.
export async function GET() {
  let session: Awaited<ReturnType<typeof requireServerSession>>;
  try {
    session = await requireServerSession();
  } catch {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const [configured, oauthProviders] = await Promise.all([
    listCredentialStatuses(session.organization.id),
    getOAuthConnectedProviders(session.organization.id),
  ]);

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
        const oauthInfo: OAuthConnectedInfo | undefined = oauthProviders.get(p.key);
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
          oauthConnected: oauthInfo !== undefined,
          oauthAccountId: oauthInfo?.accountId ?? null,
          oauthExpiresAt: oauthInfo?.expiresAt ?? null,
        };
      }),
  }));

  return NextResponse.json({ categories });
}
