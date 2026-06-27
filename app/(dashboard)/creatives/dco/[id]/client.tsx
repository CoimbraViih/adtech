'use client'

import Link from 'next/link'
import { VariantTable } from '@/components/creatives/dco/variant-table'
import { RotationPreview } from '@/components/creatives/dco/rotation-preview'

export function DcoTemplateDetailClient({ templateId }: { templateId: string }) {
  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/creatives/dco" style={{ color: 'var(--color-data)', fontSize: '0.875rem' }}>
          ← Back to templates
        </Link>
        <Link
          href={`/creatives/dco/${templateId}/edit`}
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-base)',
            padding: '0.375rem 0.875rem',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            marginLeft: 'auto',
          }}
        >
          Edit Template
        </Link>
      </div>
      <div className="space-y-6">
        <VariantTable templateId={templateId} />
        <RotationPreview templateId={templateId} />
      </div>
    </div>
  )
}
