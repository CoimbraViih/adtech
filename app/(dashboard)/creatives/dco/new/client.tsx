'use client'

import { useRouter } from 'next/navigation'
import { TemplateEditor } from '@/components/creatives/dco/template-editor'
import type { CreativeTemplate } from '@/types/database'

export function NewTemplateClient() {
  const router = useRouter()
  return (
    <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 className="text-lg font-semibold mb-6" style={{ color: 'var(--color-muted)' }}>
        New DCO Template
      </h1>
      <TemplateEditor
        onSave={(_t: CreativeTemplate) => router.push('/creatives/dco')}
        onCancel={() => router.push('/creatives/dco')}
      />
    </div>
  )
}
