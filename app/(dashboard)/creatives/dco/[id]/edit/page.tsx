import { redirect } from 'next/navigation'
import { requireServerSession, createServerSupabaseClient } from '@/lib/supabase/server'
import { EditTemplateClient } from './client'
import type { CreativeTemplate } from '@/types/database'

export default async function EditDcoTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  let session
  try {
    session = await requireServerSession()
  } catch {
    redirect('/login')
  }
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('creative_templates')
    .select('*')
    .eq('id', id)
    .eq('organization_id', session.organization.id)
    .maybeSingle()

  if (!data) redirect('/creatives/dco')

  return <EditTemplateClient template={data as CreativeTemplate} />
}
