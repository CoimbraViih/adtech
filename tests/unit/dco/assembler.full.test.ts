/**
 * assembler.full.test.ts — Extended assembler tests for Task 5
 * These complement the base tests in assembler.test.ts
 */
import { describe, it, expect } from 'vitest'
import { productToContext, assembleVariant } from '@/lib/creatives/dco/assembler'
import type { CanonicalProduct } from '@/lib/commerce/types'
import type { CreativeTemplate } from '@/types/database'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const baseProduct: CanonicalProduct = {
  externalId: 'ext-001',
  title: 'Produto Base',
  description: 'Descrição do produto',
  price: 99.9,
  currency: 'BRL',
  imageUrl: 'https://cdn.example.com/img.jpg',
  url: 'https://loja.example.com/produto',
  status: 'active',
  rawData: {},
}

const baseTemplate: CreativeTemplate = {
  id: 'tmpl-uuid-1',
  organization_id: 'org-uuid',
  workspace_id: 'ws-uuid',
  name: 'Test Template',
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

// ─── productToContext — edge cases ────────────────────────────────────────────

describe('productToContext (full suite)', () => {
  it('null price + BRL: returns empty string', () => {
    const product: CanonicalProduct = { ...baseProduct, price: null, currency: 'BRL' }
    const ctx = productToContext(product)
    expect(ctx.price).toBe('')
  })

  it('USD currency: formats with "$" symbol', () => {
    const product: CanonicalProduct = { ...baseProduct, price: 29.99, currency: 'USD' }
    const ctx = productToContext(product)
    // en-US locale: $29.99
    expect(ctx.price).toMatch(/\$29\.99/)
  })

  it('non-BRL/USD currency (EUR): uses Intl with that currency code', () => {
    const product: CanonicalProduct = { ...baseProduct, price: 50.0, currency: 'EUR' }
    const ctx = productToContext(product)
    // The result should contain "50" and some EUR indicator (€ or EUR)
    expect(ctx.price).toMatch(/50/)
    // Intl should produce a non-empty string
    expect(ctx.price.length).toBeGreaterThan(0)
    // Should NOT be empty (price is not null)
    expect(ctx.price).not.toBe('')
  })

  it('extremely large price (1_000_000): formats correctly with thousands separators', () => {
    const product: CanonicalProduct = { ...baseProduct, price: 1_000_000.0, currency: 'BRL' }
    const ctx = productToContext(product)
    // pt-BR locale: R$ 1.000.000,00
    expect(ctx.price).toMatch(/R\$/)
    // Should contain thousands separator (dot in pt-BR)
    expect(ctx.price).toMatch(/1\.000\.000/)
  })
})

// ─── assembleVariant — resolved_body completeness ─────────────────────────────

describe('assembleVariant (full suite)', () => {
  it('resolved_body has all 5 expected keys even when template_body has all fields', () => {
    const variant = assembleVariant(baseTemplate, baseProduct, 'product-db-uuid')
    const keys = Object.keys(variant.resolved_body)
    // Template has exactly: headline, description, cta, url, imageUrl
    expect(keys).toContain('headline')
    expect(keys).toContain('description')
    expect(keys).toContain('cta')
    expect(keys).toContain('url')
    expect(keys).toContain('imageUrl')
  })

  it('resolved_body only contains keys from template_body (no extra keys added)', () => {
    const variant = assembleVariant(baseTemplate, baseProduct, 'product-db-uuid')
    const keys = Object.keys(variant.resolved_body)
    // Should only have the 5 keys from baseTemplate.template_body
    expect(keys).toHaveLength(5)
  })

  it('resolved_body: template with extra keys preserves all extra keys', () => {
    const templateWithExtra: CreativeTemplate = {
      ...baseTemplate,
      template_body: {
        headline: '{{title}}',
        description: '{{description}}',
        cta: 'Buy',
        url: '{{url}}',
        imageUrl: '{{imageUrl}}',
        customField: 'static value',
        anotherField: '{{title}} extra',
      },
      placeholders: ['title', 'description', 'url', 'imageUrl'],
    }
    const variant = assembleVariant(templateWithExtra, baseProduct, 'product-db-uuid')
    expect(variant.resolved_body.customField).toBe('static value')
    expect(variant.resolved_body.anotherField).toBe('Produto Base extra')
  })

  it('resolved_body: template with missing keys — only present keys are in output', () => {
    const templateWithMissing: CreativeTemplate = {
      ...baseTemplate,
      template_body: {
        headline: '{{title}}',
      },
      placeholders: ['title'],
    }
    const variant = assembleVariant(templateWithMissing, baseProduct, 'product-db-uuid')
    const keys = Object.keys(variant.resolved_body)
    expect(keys).toHaveLength(1)
    expect(keys).toContain('headline')
    expect(variant.resolved_body.headline).toBe('Produto Base')
  })

  it('productToContext extremely large price (1_000_000.00): formats with thousands separators', () => {
    const product: CanonicalProduct = {
      ...baseProduct,
      price: 1_000_000.0,
      currency: 'BRL',
    }
    const ctx = productToContext(product)
    // BRL with pt-BR: "R$ 1.000.000,00"
    expect(ctx.price).toMatch(/1\.000\.000/)
    expect(ctx.price).toMatch(/,00$/)
  })
})
