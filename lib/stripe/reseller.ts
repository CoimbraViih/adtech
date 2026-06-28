import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { ResellerBilling, ResellerBillingInsert } from '@/types/database'

export function applyMarkup(baseAmountCents: number, markupPercent: number): number {
  if (markupPercent < 0 || markupPercent > 500) {
    throw new Error('markupPercent must be between 0 and 500')
  }
  return Math.round(baseAmountCents * (1 + markupPercent / 100))
}

export async function getResellerRelationship(clientOrgId: string): Promise<ResellerBilling | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('reseller_billing')
    .select('*')
    .eq('client_org_id', clientOrgId)
    .single()

  if (error || !data) return null
  return data as ResellerBilling
}

export async function setResellerMarkup(
  agencyOrgId: string,
  clientOrgId: string,
  markupPercent: number
): Promise<ResellerBilling> {
  applyMarkup(0, markupPercent) // validates range; throws on invalid input

  const supabase = await createServerSupabaseClient()
  const insert: ResellerBillingInsert = {
    agency_org_id: agencyOrgId,
    client_org_id: clientOrgId,
    markup_percent: markupPercent,
  }

  const { data, error } = await supabase
    .from('reseller_billing')
    .upsert(insert, { onConflict: 'client_org_id' })
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to set reseller markup: ${error?.message}`)
  return data as ResellerBilling
}
