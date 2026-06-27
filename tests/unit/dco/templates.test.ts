import { describe, it, expect } from 'vitest'
import { renderTemplate, extractPlaceholders } from '@/lib/creatives/dco/templates'

describe('renderTemplate', () => {
  it('replaces all placeholders when context is complete', () => {
    const body = {
      headline: 'Buy {{title}} for {{price}}',
      cta: 'Shop now',
      url: '{{url}}',
    }
    const context = { title: 'Sneakers', price: 'R$ 199,90', url: 'https://example.com/sneakers' }
    const result = renderTemplate(body, context)
    expect(result.headline).toBe('Buy Sneakers for R$ 199,90')
    expect(result.cta).toBe('Shop now')
    expect(result.url).toBe('https://example.com/sneakers')
  })

  it('leaves unresolved placeholders as-is when context is partial', () => {
    const body = { headline: '{{title}} — {{price}}' }
    const context = { title: 'T-Shirt' }
    const result = renderTemplate(body, context)
    expect(result.headline).toBe('T-Shirt — {{price}}')
  })

  it('returns a copy of templateBody unchanged when there are no placeholders', () => {
    const body = { headline: 'Big Sale', description: 'Up to 50% off' }
    const result = renderTemplate(body, {})
    expect(result).toEqual({ headline: 'Big Sale', description: 'Up to 50% off' })
    // must be a new object, not the same reference
    expect(result).not.toBe(body)
  })

  it('replaces multiple occurrences of the same placeholder', () => {
    const body = { text: '{{title}} is great. Get {{title}} today!' }
    const context = { title: 'AdFlow' }
    const result = renderTemplate(body, context)
    expect(result.text).toBe('AdFlow is great. Get AdFlow today!')
  })

  it('handles empty templateBody', () => {
    const result = renderTemplate({}, { title: 'anything' })
    expect(result).toEqual({})
  })

  it('handles empty context with placeholders present', () => {
    const body = { headline: 'Hello {{name}}' }
    const result = renderTemplate(body, {})
    expect(result.headline).toBe('Hello {{name}}')
  })

  it('does not mutate the original templateBody', () => {
    const body = { headline: 'Buy {{title}}' }
    const original = { headline: 'Buy {{title}}' }
    renderTemplate(body, { title: 'Shoes' })
    expect(body).toEqual(original)
  })
})

describe('extractPlaceholders', () => {
  it('returns all placeholder names found across multiple fields', () => {
    const body = {
      headline: 'Buy {{title}} for {{price}}',
      description: '{{description}}',
      url: '{{url}}',
    }
    const placeholders = extractPlaceholders(body)
    expect(placeholders).toContain('title')
    expect(placeholders).toContain('price')
    expect(placeholders).toContain('description')
    expect(placeholders).toContain('url')
    expect(placeholders).toHaveLength(4)
  })

  it('returns unique names when the same placeholder appears multiple times', () => {
    const body = {
      headline: '{{title}} is on sale',
      footer: 'Get {{title}} now at {{price}}',
    }
    const placeholders = extractPlaceholders(body)
    expect(placeholders.filter(p => p === 'title')).toHaveLength(1)
    expect(placeholders).toContain('price')
    expect(placeholders).toHaveLength(2)
  })

  it('returns empty array when no placeholders are found', () => {
    const body = { headline: 'No placeholders here', cta: 'Buy now' }
    expect(extractPlaceholders(body)).toEqual([])
  })

  it('returns empty array for empty templateBody', () => {
    expect(extractPlaceholders({})).toEqual([])
  })

  it('handles a single field with multiple unique placeholders', () => {
    const body = { text: '{{a}} {{b}} {{c}}' }
    const placeholders = extractPlaceholders(body)
    expect(placeholders).toEqual(expect.arrayContaining(['a', 'b', 'c']))
    expect(placeholders).toHaveLength(3)
  })
})
