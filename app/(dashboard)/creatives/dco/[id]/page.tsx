import { redirect } from 'next/navigation'
import { requireServerSession } from '@/lib/supabase/server'
import { DcoTemplateDetailClient } from './client'

export default async function DcoTemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  try {
    await requireServerSession()
  } catch {
    redirect('/login')
  }
  const { id } = await params
  return <DcoTemplateDetailClient templateId={id} />
}
