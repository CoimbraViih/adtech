import { redirect } from 'next/navigation'
import { requireServerSession } from '@/lib/supabase/server'
import EventExplorerClient from './event-explorer-client'

export default async function EventsPage() {
  try {
    await requireServerSession()
  } catch {
    redirect('/login')
  }

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Explorador de Eventos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
          Visualize e exporte eventos capturados pelo pixel AdFlow nos últimos 90 dias.
        </p>
      </div>
      <EventExplorerClient />
    </main>
  )
}
