import type { CreativeVariant } from '@/types/database'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Epsilon-greedy bandit selection.
 * 10% of the time: explore (random variant)
 * 90% of the time: exploit (variant with highest conversion rate)
 */
export const EPSILON = 0.1

/**
 * Pure function — picks a variant using epsilon-greedy strategy.
 * Conversion rate = conversions / max(impressions, 1)
 * Throws if variants array is empty.
 */
export function selectVariant(variants: CreativeVariant[]): CreativeVariant {
  return selectVariantWithStrategy(variants).variant
}

export type SelectionResult = {
  variant: CreativeVariant
  strategy: 'exploit' | 'explore'
}

/**
 * Same epsilon-greedy logic as selectVariant() but also returns which
 * strategy was used: 'explore' if a random variant was chosen, 'exploit'
 * if the variant with the highest conversion rate was chosen.
 * Throws if variants array is empty.
 */
export function selectVariantWithStrategy(variants: CreativeVariant[]): SelectionResult {
  if (variants.length === 0) {
    throw new Error('No variants to select from')
  }

  // Explore: pick a random variant
  if (Math.random() < EPSILON) {
    return {
      variant: variants[Math.floor(Math.random() * variants.length)],
      strategy: 'explore',
    }
  }

  // Exploit: pick variant with highest conversion rate
  const rated = computeConversionRates(variants)
  return {
    variant: rated[0].variant,
    strategy: 'exploit',
  }
}

/**
 * Pure function — returns variants sorted descending by conversion rate.
 * Conversion rate = conversions / max(impressions, 1)
 */
export function computeConversionRates(
  variants: CreativeVariant[]
): Array<{ variant: CreativeVariant; rate: number }> {
  return variants
    .map((variant) => ({
      variant,
      rate: variant.conversions / Math.max(variant.impressions, 1),
    }))
    .sort((a, b) => b.rate - a.rate)
}

/**
 * Records an impression: inserts into variant_performance and increments
 * creative_variants.impressions. Server-side only (uses service client).
 */
export async function recordImpression(variantId: string): Promise<void> {
  const supabase = createServiceClient()

  const { error: insertError } = await supabase
    .from('variant_performance')
    .insert({ variant_id: variantId, event_type: 'impression' })

  if (insertError) throw insertError

  const { data: current, error: selectError } = await supabase
    .from('creative_variants')
    .select('impressions')
    .eq('id', variantId)
    .single()

  if (selectError) throw selectError

  const { error: updateError } = await supabase
    .from('creative_variants')
    .update({ impressions: (current?.impressions ?? 0) + 1 })
    .eq('id', variantId)

  if (updateError) throw updateError
}

/**
 * Records a conversion: inserts into variant_performance and increments
 * creative_variants.conversions. Server-side only (uses service client).
 */
export async function recordConversion(variantId: string, value?: number): Promise<void> {
  const supabase = createServiceClient()

  const { error: insertError } = await supabase
    .from('variant_performance')
    .insert({
      variant_id: variantId,
      event_type: 'conversion',
      ...(value !== undefined ? { value } : {}),
    })

  if (insertError) throw insertError

  const { data: current, error: selectError } = await supabase
    .from('creative_variants')
    .select('conversions')
    .eq('id', variantId)
    .single()

  if (selectError) throw selectError

  const { error: updateError } = await supabase
    .from('creative_variants')
    .update({ conversions: (current?.conversions ?? 0) + 1 })
    .eq('id', variantId)

  if (updateError) throw updateError
}

/**
 * Reconciles bandit counters by re-counting from variant_performance table.
 * Updates creative_variants.impressions and .conversions for all variants
 * of the given template.
 */
export async function refreshBanditState(templateId: string): Promise<void> {
  const supabase = createServiceClient()

  // Fetch all variants for this template
  const { data: variants, error: variantsError } = await supabase
    .from('creative_variants')
    .select('id')
    .eq('template_id', templateId)

  if (variantsError) throw variantsError
  if (!variants || variants.length === 0) return

  const variantIds = variants.map((v: { id: string }) => v.id)

  // Fetch all performance events for these variants
  const { data: events, error: eventsError } = await supabase
    .from('variant_performance')
    .select('variant_id, event_type')
    .in('variant_id', variantIds)

  if (eventsError) throw eventsError

  // Aggregate counts per variant
  const counts: Record<string, { impressions: number; conversions: number }> = {}
  for (const id of variantIds) {
    counts[id] = { impressions: 0, conversions: 0 }
  }

  if (events) {
    for (const event of events as Array<{ variant_id: string; event_type: string }>) {
      if (!counts[event.variant_id]) continue
      if (event.event_type === 'impression') {
        counts[event.variant_id].impressions += 1
      } else if (event.event_type === 'conversion') {
        counts[event.variant_id].conversions += 1
      }
    }
  }

  // Update each variant
  await Promise.all(
    variantIds.map(async (id: string) => {
      const { error } = await supabase
        .from('creative_variants')
        .update({
          impressions: counts[id].impressions,
          conversions: counts[id].conversions,
        })
        .eq('id', id)

      if (error) throw error
    })
  )
}
