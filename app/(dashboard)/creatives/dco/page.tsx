import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Layers } from 'lucide-react'
import { requireServerSession, createServerSupabaseClient } from '@/lib/supabase/server'
import type { CreativeTemplate } from '@/types/database'

export default async function DcoPage() {
  let session
  try {
    session = await requireServerSession()
  } catch {
    redirect('/login')
  }

  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('creative_templates')
    .select('*')
    .eq('organization_id', session.organization.id)
    .eq('workspace_id', session.workspace.id)
    .order('created_at', { ascending: false })

  const templates = (data ?? []) as CreativeTemplate[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: 'var(--adflow-fg)' }}
          >
            Dynamic Creative Optimization
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--adflow-fg-muted)' }}>
            Epsilon-greedy bandit — rotação automática por taxa de conversão
          </p>
        </div>
        <Link
          href="/creatives/dco/new"
          className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-lg transition-colors"
          style={{
            background: 'var(--adflow-accent)',
            color: 'var(--color-base)',
          }}
        >
          <Plus className="w-4 h-4" />
          New Template
        </Link>
      </div>

      {/* Template table */}
      <div
        className="rounded-xl border"
        style={{
          borderColor: 'var(--adflow-border)',
          background: 'var(--adflow-surface)',
        }}
      >
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Layers className="w-8 h-8" style={{ color: 'var(--adflow-fg-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--adflow-fg-muted)' }}>
              No DCO templates yet.{' '}
              <Link
                href="/creatives/dco/new"
                className="hover:underline"
                style={{ color: 'var(--adflow-accent)' }}
              >
                Create your first template.
              </Link>
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr
                className="border-b text-xs uppercase tracking-wider"
                style={{
                  borderColor: 'var(--adflow-border)',
                  color: 'var(--adflow-fg-muted)',
                }}
              >
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Format</th>
                <th className="text-left px-4 py-3 font-medium">Active</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t, idx) => (
                <tr
                  key={t.id}
                  className="border-b last:border-0"
                  style={{
                    borderColor: 'var(--adflow-border)',
                    color: 'var(--adflow-fg)',
                    background: idx % 2 === 1 ? 'color-mix(in srgb, var(--color-surface) 98%, white)' : undefined,
                  }}
                >
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 capitalize">{t.format}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        background: t.is_active
                          ? 'color-mix(in srgb, var(--color-success) 12%, transparent)'
                          : 'color-mix(in srgb, var(--color-danger) 12%, transparent)',
                        color: t.is_active
                          ? 'var(--adflow-success)'
                          : 'var(--adflow-danger)',
                      }}
                    >
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/creatives/dco/${t.id}/edit`}
                        className="text-xs hover:underline"
                        style={{ color: 'var(--adflow-data)' }}
                      >
                        Edit
                      </Link>
                      <span style={{ color: 'var(--adflow-border)' }}>|</span>
                      <Link
                        href={`/creatives/dco/${t.id}`}
                        className="text-xs hover:underline"
                        style={{ color: 'var(--adflow-fg-muted)' }}
                      >
                        View Variants
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer note */}
      <p className="text-xs" style={{ color: 'var(--adflow-fg-muted)' }}>
        {templates.length} template{templates.length !== 1 ? 's' : ''} total
        {' · '}
        Powered by epsilon-greedy bandit optimization
      </p>
    </div>
  )
}
