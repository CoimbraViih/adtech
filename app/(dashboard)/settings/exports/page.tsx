import { redirect } from 'next/navigation'
import { requireServerSession } from '@/lib/supabase/server'
import ExportsSettingsClient from './exports-settings-client'

export default async function ExportsPage() {
  try {
    await requireServerSession()
  } catch {
    redirect('/login')
  }
  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Exportações de Dados</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Configure destinos para exportar eventos automaticamente para seu data warehouse.
        </p>
      </div>
      <ExportsSettingsClient />
    </main>
  )
}
