import { Suspense } from 'react';
import { getServerSession, createServerSupabaseClient } from '@/lib/supabase/server';
import { BillingPageClient } from './billing-page-client';
import type { OrgPlan } from '@/types/database';

export default async function BillingPage() {
  const session = await getServerSession();
  const plan: OrgPlan = session?.organization.plan ?? 'free';
  const workspaceId = session?.workspace.id ?? '';

  const supabase = await createServerSupabaseClient();
  const [campaignsRes, creativesRes, pixelsRes] = await Promise.all([
    supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('creatives').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
    supabase.from('pixels').select('id', { count: 'exact', head: true }).eq('workspace_id', workspaceId),
  ]);

  const usage = {
    campaigns: campaignsRes.count ?? 0,
    creatives: creativesRes.count ?? 0,
    pixels: pixelsRes.count ?? 0,
  };

  return (
    <Suspense fallback={null}>
      <BillingPageClient plan={plan} usage={usage} />
    </Suspense>
  );
}
