import { redirect } from 'next/navigation'
import { requireServerSession } from '@/lib/supabase/server'
import { NewTemplateClient } from './client'

export default async function NewDcoTemplatePage() {
  try {
    await requireServerSession()
  } catch {
    redirect('/login')
  }
  return <NewTemplateClient />
}
