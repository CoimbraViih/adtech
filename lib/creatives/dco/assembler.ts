/**
 * DCO Assembler — converts CanonicalProduct + CreativeTemplate into a CreativeVariant record.
 * Pure functions, no DB calls, no side effects.
 */

import type { CanonicalProduct } from '@/lib/commerce/types'
import type { CreativeTemplate, CreativeVariant } from '@/types/database'
import { renderTemplate } from './templates'

/**
 * Converts a CanonicalProduct to a string context map for template rendering.
 *
 * Mappings:
 *   "title"       → product.title
 *   "price"       → formatted price string, or "" if null
 *   "imageUrl"    → product.imageUrl ?? ""
 *   "url"         → product.url ?? ""
 *   "description" → product.description ?? ""
 *
 * Price formatting:
 *   BRL  → Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })  → "R$ 99,90"
 *   Other → Intl.NumberFormat('en-US', { style: 'currency', currency: <ISO> })
 */
export function productToContext(product: CanonicalProduct): Record<string, string> {
  let priceStr = ''
  if (product.price !== null) {
    const locale = product.currency === 'BRL' ? 'pt-BR' : 'en-US'
    try {
      priceStr = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: product.currency,
      }).format(product.price)
    } catch {
      priceStr = String(product.price)
    }
  }

  return {
    title: product.title,
    price: priceStr,
    imageUrl: product.imageUrl ?? '',
    url: product.url ?? '',
    description: product.description ?? '',
  }
}

/**
 * Assembles a variant record from a template + product data.
 * Returns the fields needed to INSERT into creative_variants
 * (excluding id, impressions, conversions, is_active, created_at, updated_at).
 *
 * @param template   - The CreativeTemplate row from the DB
 * @param product    - The CanonicalProduct (from commerce layer)
 * @param productDbId - UUID from the products table (not externalId)
 */
export function assembleVariant(
  template: CreativeTemplate,
  product: CanonicalProduct,
  productDbId: string,
): Pick<CreativeVariant, 'template_id' | 'product_id' | 'resolved_body'> {
  const context = productToContext(product)
  const resolved_body = renderTemplate(template.template_body, context)

  return {
    template_id: template.id,
    product_id: productDbId,
    resolved_body,
  }
}
