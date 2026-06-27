import { describe, it, expect } from 'vitest'
import { productToContext, assembleVariant } from '@/lib/creatives/dco/assembler'
import type { CanonicalProduct } from '@/lib/commerce/types'
import type { CreativeTemplate } from '@/types/database'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseProduct: CanonicalProduct = {
  externalId: 'ext-001',
  title: 'Camiseta Verão',
  description: 'Camiseta estampada para o verão',
  price: 99.9,
  currency: 'BRL',
  imageUrl: 'https://cdn.example.com/camiseta.jpg',
  url: 'https://loja.example.com/camiseta-verao',
  status: 'active',
  rawData: {},
}

const baseTemplate: CreativeTemplate = {
  id: 'tmpl-uuid-1',
  organization_id: 'org-uuid',
  workspace_id: 'ws-uuid',
  name: 'Summer Sale',
  format: 'copy',
  template_body: {
    headline: '{{title}} por {{price}}',
    description: '{{description}}',
    cta: 'Comprar agora',
    url: '{{url}}',
    imageUrl: '{{imageUrl}}',
  },
  placeholders: ['title', 'price', 'description', 'url', 'imageUrl'],
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

// ─── productToContext ─────────────────────────────────────────────────────────

describe('productToContext', () => {
  it('maps title correctly', () => {
    const ctx = productToContext(baseProduct)
    expect(ctx.title).toBe('Camiseta Verão')
  })

  it('maps description correctly', () => {
    const ctx = productToContext(baseProduct)
    expect(ctx.description).toBe('Camiseta estampada para o verão')
  })

  it('maps imageUrl correctly', () => {
    const ctx = productToContext(baseProduct)
    expect(ctx.imageUrl).toBe('https://cdn.example.com/camiseta.jpg')
  })

  it('maps url correctly', () => {
    const ctx = productToContext(baseProduct)
    expect(ctx.url).toBe('https://loja.example.com/camiseta-verao')
  })

  it('formats BRL price as R$ X,XX (99.9 → R$ 99,90)', () => {
    const ctx = productToContext(baseProduct)
    // pt-BR locale outputs "R$ 99,90" (non-breaking space before digits)
    expect(ctx.price).toMatch(/R\$\s*99,90/)
  })

  it('formats BRL price with thousands separator (1234.5 → R$ 1.234,50)', () => {
    const product: CanonicalProduct = { ...baseProduct, price: 1234.5 }
    const ctx = productToContext(product)
    expect(ctx.price).toMatch(/R\$\s*1\.234,50/)
  })

  it('returns empty string for null price', () => {
    const product: CanonicalProduct = { ...baseProduct, price: null }
    const ctx = productToContext(product)
    expect(ctx.price).toBe('')
  })

  it('returns empty string for null imageUrl', () => {
    const product: CanonicalProduct = { ...baseProduct, imageUrl: null }
    const ctx = productToContext(product)
    expect(ctx.imageUrl).toBe('')
  })

  it('returns empty string for null url', () => {
    const product: CanonicalProduct = { ...baseProduct, url: null }
    const ctx = productToContext(product)
    expect(ctx.url).toBe('')
  })

  it('returns empty string for null description', () => {
    const product: CanonicalProduct = { ...baseProduct, description: null }
    const ctx = productToContext(product)
    expect(ctx.description).toBe('')
  })

  it('formats USD price using en-US locale', () => {
    const product: CanonicalProduct = { ...baseProduct, price: 10.5, currency: 'USD' }
    const ctx = productToContext(product)
    expect(ctx.price).toMatch(/\$10\.50/)
  })
})

// ─── assembleVariant ──────────────────────────────────────────────────────────

describe('assembleVariant', () => {
  it('returns correct template_id', () => {
    const variant = assembleVariant(baseTemplate, baseProduct, 'product-db-uuid')
    expect(variant.template_id).toBe('tmpl-uuid-1')
  })

  it('returns correct product_id (DB UUID, not externalId)', () => {
    const variant = assembleVariant(baseTemplate, baseProduct, 'product-db-uuid')
    expect(variant.product_id).toBe('product-db-uuid')
    expect(variant.product_id).not.toBe(baseProduct.externalId)
  })

  it('resolved_body headline has placeholders replaced from product', () => {
    const variant = assembleVariant(baseTemplate, baseProduct, 'product-db-uuid')
    // headline: "{{title}} por {{price}}" → "Camiseta Verão por R$ 99,90"
    expect(variant.resolved_body.headline).toMatch(/Camiseta Verão por R\$\s*99,90/)
  })

  it('resolved_body static fields are preserved unchanged', () => {
    const variant = assembleVariant(baseTemplate, baseProduct, 'product-db-uuid')
    expect(variant.resolved_body.cta).toBe('Comprar agora')
  })

  it('resolved_body url is replaced', () => {
    const variant = assembleVariant(baseTemplate, baseProduct, 'product-db-uuid')
    expect(variant.resolved_body.url).toBe('https://loja.example.com/camiseta-verao')
  })

  it('resolved_body imageUrl is replaced', () => {
    const variant = assembleVariant(baseTemplate, baseProduct, 'product-db-uuid')
    expect(variant.resolved_body.imageUrl).toBe('https://cdn.example.com/camiseta.jpg')
  })

  it('resolved_body description is replaced', () => {
    const variant = assembleVariant(baseTemplate, baseProduct, 'product-db-uuid')
    expect(variant.resolved_body.description).toBe('Camiseta estampada para o verão')
  })

  it('unresolved placeholders remain as-is when product field is missing from context', () => {
    const template: CreativeTemplate = {
      ...baseTemplate,
      template_body: { headline: '{{unknownField}} sale' },
      placeholders: ['unknownField'],
    }
    const variant = assembleVariant(template, baseProduct, 'product-db-uuid')
    expect(variant.resolved_body.headline).toBe('{{unknownField}} sale')
  })
})
