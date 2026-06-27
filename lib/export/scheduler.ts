import { createServiceClient } from '@/lib/supabase/service'
import { getEventsByWorkspace } from '@/lib/events/query'
import type { ExportDestination } from '@/types/database'
import { runExport } from './dispatch'

export async function runScheduledExports(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  const supabase = createServiceClient()

  // Fetch all active scheduled destinations
  const { data: destinations, error: fetchError } = await supabase
    .from('export_destinations')
    .select('*')
    .not('schedule', 'is', null)
    .eq('is_active', true)
    .neq('destination_type', 'csv_download')

  if (fetchError) {
    throw new Error(`Failed to fetch export destinations: ${fetchError.message}`)
  }

  const rows = (destinations ?? []) as ExportDestination[]
  let succeeded = 0
  let failed = 0

  for (const dest of rows) {
    // Insert a new export_runs row with status 'running'
    const { data: runData, error: insertError } = await supabase
      .from('export_runs')
      .insert({
        destination_id: dest.id,
        organization_id: dest.organization_id,
        workspace_id: dest.workspace_id,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError || !runData) {
      console.error(`[scheduler] Failed to create export_run for dest ${dest.id}:`, insertError?.message)
      failed++
      continue
    }

    const runId: string = (runData as { id: string }).id

    try {
      // Compute last 24 hours date range
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000)

      const fmt = (d: Date) => d.toISOString().slice(0, 10)

      // Fetch events
      const eventsPage = await getEventsByWorkspace(
        dest.organization_id,
        dest.workspace_id,
        {
          start_date: fmt(startDate),
          end_date: fmt(endDate),
          limit: 10000,
          offset: 0,
        },
      )

      const filename = `events-${fmt(endDate)}.csv`

      // Run the export
      const { rows_exported, output_path } = await runExport(dest, eventsPage.rows, filename)

      // Mark as done
      await supabase
        .from('export_runs')
        .update({
          status: 'done',
          rows_exported,
          output_path,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId)

      succeeded++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[scheduler] Export failed for dest ${dest.id}:`, message)

      // Mark as failed — do not rethrow
      await supabase
        .from('export_runs')
        .update({
          status: 'failed',
          error: message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', runId)

      failed++
    }
  }

  return { processed: rows.length, succeeded, failed }
}
