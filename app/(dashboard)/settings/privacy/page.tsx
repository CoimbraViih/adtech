import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import PrivacyPageClient from './privacy-page-client';

export default async function PrivacyPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();

  const { data: membership } = await service
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (!membership) redirect('/dashboard');

  // Two separate queries: workspaces first, then pixels
  const { data: workspaces } = await service
    .from('workspaces')
    .select('id')
    .eq('organization_id', membership.organization_id);

  const workspaceIds = (workspaces ?? []).map((w: { id: string }) => w.id);

  const { data: pixels } = workspaceIds.length > 0
    ? await service
        .from('pixels')
        .select('id, name, cmp_site_key, data_retention_days')
        .in('workspace_id', workspaceIds)
        .order('name')
    : { data: [] };

  const { data: deletionRequests } = await service
    .from('data_deletion_requests')
    .select('id, scope, status, rows_deleted, completed_at, created_at')
    .eq('organization_id', membership.organization_id)
    .order('created_at', { ascending: false })
    .limit(20);

  const isAdmin = ['owner', 'admin'].includes(membership.role);

  return (
    <PrivacyPageClient
      pixels={pixels ?? []}
      deletionRequests={deletionRequests ?? []}
      isAdmin={isAdmin}
    />
  );
}
