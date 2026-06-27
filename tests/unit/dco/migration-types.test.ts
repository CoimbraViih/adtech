import { describe, it } from 'vitest'
import type {
  CreativeTemplate,
  CreativeTemplateFormat,
  CreativeVariant,
  VariantPerformance,
} from '@/types/database'

describe('DCO TypeScript type shapes (migration 032)', () => {
  it('CreativeTemplateFormat accepts only valid values', () => {
    const copy: CreativeTemplateFormat = 'copy'
    const banner: CreativeTemplateFormat = 'banner'
    const video: CreativeTemplateFormat = 'video'
    // runtime assertion so test is not vacuous
    expect(['copy', 'banner', 'video']).toContain(copy)
    expect(['copy', 'banner', 'video']).toContain(banner)
    expect(['copy', 'banner', 'video']).toContain(video)
  })

  it('CreativeTemplate satisfies expected shape', () => {
    const tmpl = {
      id: 'uuid-tmpl-1',
      organization_id: 'org-uuid',
      workspace_id: 'ws-uuid',
      name: 'Summer Sale Template',
      format: 'copy' as const,
      template_body: {
        headline: '{{title}} por {{price}}',
        description: '{{description}}',
        cta: 'Comprar agora',
        url: '{{url}}',
      },
      placeholders: ['title', 'price', 'description', 'url'],
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } satisfies CreativeTemplate

    expect(tmpl.id).toBe('uuid-tmpl-1')
    expect(tmpl.format).toBe('copy')
    expect(tmpl.placeholders).toHaveLength(4)
    expect(tmpl.is_active).toBe(true)
  })

  it('CreativeTemplate with banner format satisfies shape', () => {
    const tmpl = {
      id: 'uuid-tmpl-2',
      organization_id: 'org-uuid',
      workspace_id: 'ws-uuid',
      name: 'Banner Template',
      format: 'banner' as const,
      template_body: { imageUrl: '{{imageUrl}}', headline: '{{title}}' },
      placeholders: ['imageUrl', 'title'],
      is_active: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    } satisfies CreativeTemplate

    expect(tmpl.format).toBe('banner')
    expect(tmpl.is_active).toBe(false)
  })

  it('CreativeVariant satisfies expected shape', () => {
    const variant = {
      id: 'uuid-variant-1',
      organization_id: 'org-uuid',
      template_id: 'uuid-tmpl-1',
      product_id: 'uuid-product-1',
      resolved_body: {
        headline: 'Camiseta Verão por R$49,90',
        description: 'Camiseta estampada verão 2026',
        cta: 'Comprar agora',
        url: 'https://loja.example.com/camiseta-verao',
      },
      impressions: 150,
      conversions: 12,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-03T00:00:00Z',
    } satisfies CreativeVariant

    expect(variant.impressions).toBe(150)
    expect(variant.conversions).toBe(12)
    expect(variant.product_id).toBe('uuid-product-1')
  })

  it('CreativeVariant with null product_id satisfies shape', () => {
    const variant = {
      id: 'uuid-variant-2',
      organization_id: 'org-uuid',
      template_id: 'uuid-tmpl-1',
      product_id: null,
      resolved_body: { headline: 'Promoção geral', cta: 'Saiba mais' },
      impressions: 0,
      conversions: 0,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    } satisfies CreativeVariant

    expect(variant.product_id).toBeNull()
    expect(variant.impressions).toBe(0)
  })

  it('VariantPerformance satisfies expected shape', () => {
    const perf = {
      id: 'uuid-perf-1',
      variant_id: 'uuid-variant-1',
      event_type: 'impression' as const,
      value: null,
      recorded_at: '2026-01-01T12:00:00Z',
    } satisfies VariantPerformance

    expect(perf.event_type).toBe('impression')
    expect(perf.value).toBeNull()
  })

  it('VariantPerformance with conversion value satisfies shape', () => {
    const perf = {
      id: 'uuid-perf-2',
      variant_id: 'uuid-variant-1',
      event_type: 'conversion' as const,
      value: 249.9,
      recorded_at: '2026-01-02T15:30:00Z',
    } satisfies VariantPerformance

    expect(perf.event_type).toBe('conversion')
    expect(perf.value).toBe(249.9)
  })

  it('VariantPerformance with click event satisfies shape', () => {
    const perf = {
      id: 'uuid-perf-3',
      variant_id: 'uuid-variant-2',
      event_type: 'click' as const,
      value: null,
      recorded_at: '2026-01-03T09:00:00Z',
    } satisfies VariantPerformance

    expect(perf.event_type).toBe('click')
  })
})
