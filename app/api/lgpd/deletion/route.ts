// app/api/lgpd/deletion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

const deletionRequestSchema = z.object({
  scope: z.enum(['all', 'pixel_events', 'analytics']).default('all'),
  session_ids: z.array(z.string().max(128)).max(1000).optional(),
});

async function getOrgIdForUser(userId: string, supabaseService: ReturnType<typeof createServiceClient>): Promise<string | null> {
  const { data } = await supabaseService
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .in('role', ['owner', 'admin'])
    .limit(1)
    .maybeSingle();
  return data?.organization_id ?? null;
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const supabaseService = createServiceClient();
  const orgId = await getOrgIdForUser(user.id, supabaseService);
  if (!orgId) {
    return NextResponse.json({ error: 'Forbidden. Must be org owner or admin.' }, { status: 403 });
  }

  const { data: requests, error } = await supabaseService
    .from('data_deletion_requests')
    .select('id, scope, session_ids, status, rows_deleted, completed_at, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[lgpd/deletion] GET error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch deletion requests.' }, { status: 500 });
  }

  return NextResponse.json({ requests: requests ?? [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = deletionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const supabaseService = createServiceClient();
  const orgId = await getOrgIdForUser(user.id, supabaseService);
  if (!orgId) {
    return NextResponse.json({ error: 'Forbidden. Must be org owner or admin.' }, { status: 403 });
  }

  // 1. Criar registro do pedido
  const { data: request, error: insertError } = await supabaseService
    .from('data_deletion_requests')
    .insert({
      organization_id: orgId,
      requested_by: user.id,
      scope: parsed.data.scope,
      session_ids: parsed.data.session_ids ?? null,
      status: 'processing',
    })
    .select('id')
    .single();

  if (insertError || !request) {
    console.error('[lgpd/deletion] insert error:', insertError?.message);
    return NextResponse.json({ error: 'Failed to create deletion request.' }, { status: 500 });
  }

  // 2. Executar apagamento de PII de pixel_events
  let rowsDeleted = 0;

  if (parsed.data.scope === 'all' || parsed.data.scope === 'pixel_events') {
    // Buscar workspace_ids desta org primeiro (subquery não funciona inline no Supabase JS)
    const { data: workspaces } = await supabaseService
      .from('workspaces')
      .select('id')
      .eq('organization_id', orgId);

    const workspaceIds = (workspaces ?? []).map((w: { id: string }) => w.id);

    if (workspaceIds.length > 0) {
      // Buscar pixel_ids desses workspaces
      const { data: pixels } = await supabaseService
        .from('pixels')
        .select('id')
        .in('workspace_id', workspaceIds);

      const pixelIds = (pixels ?? []).map((p: { id: string }) => p.id);

      if (pixelIds.length > 0) {
        // Contar primeiro, depois deletar
        const countQuery = supabaseService
          .from('pixel_events')
          .select('id', { count: 'exact', head: true })
          .in('pixel_id', pixelIds);

        const deleteQuery = supabaseService
          .from('pixel_events')
          .delete()
          .in('pixel_id', pixelIds);

        if (parsed.data.session_ids && parsed.data.session_ids.length > 0) {
          const { count, error: countError } = await countQuery.in('session_id', parsed.data.session_ids);
          if (!countError) rowsDeleted += count ?? 0;

          const { error: deleteError } = await deleteQuery.in('session_id', parsed.data.session_ids);
          if (deleteError) {
            console.error('[lgpd/deletion] pixel_events delete error:', deleteError.message);
            await supabaseService
              .from('data_deletion_requests')
              .update({ status: 'failed', error_message: 'Failed to delete pixel events.' })
              .eq('id', request.id);
            return NextResponse.json({ error: 'Failed to delete pixel events.' }, { status: 500 });
          }
        } else {
          const { count, error: countError } = await countQuery;
          if (!countError) rowsDeleted += count ?? 0;

          const { error: deleteError } = await deleteQuery;
          if (deleteError) {
            console.error('[lgpd/deletion] pixel_events delete error:', deleteError.message);
            await supabaseService
              .from('data_deletion_requests')
              .update({ status: 'failed', error_message: 'Failed to delete pixel events.' })
              .eq('id', request.id);
            return NextResponse.json({ error: 'Failed to delete pixel events.' }, { status: 500 });
          }
        }
      }
    }
  }

  // 3. Anonimizar events_outbox (não deletar — preservar contagens para analytics)
  if (parsed.data.scope === 'all' || parsed.data.scope === 'analytics') {
    const rpcParams: { p_organization_id: string; p_session_ids?: string[] } = {
      p_organization_id: orgId,
    };
    if (parsed.data.session_ids && parsed.data.session_ids.length > 0) {
      rpcParams.p_session_ids = parsed.data.session_ids;
    }
    const { error: rpcError } = await supabaseService.rpc('strip_pii_from_outbox', rpcParams);
    if (rpcError) {
      console.error('[lgpd/deletion] RPC error:', rpcError.message);
      await supabaseService
        .from('data_deletion_requests')
        .update({ status: 'failed', error_message: 'PII anonymization failed.' })
        .eq('id', request.id);
      return NextResponse.json({ error: 'Failed to anonymize analytics data.' }, { status: 500 });
    }
  }

  // 4. Atualizar request como completed
  await supabaseService
    .from('data_deletion_requests')
    .update({ status: 'completed', rows_deleted: rowsDeleted, completed_at: new Date().toISOString() })
    .eq('id', request.id);

  return NextResponse.json({ id: request.id, status: 'completed', rows_deleted: rowsDeleted });
}
