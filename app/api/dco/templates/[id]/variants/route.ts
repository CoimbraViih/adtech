import { NextRequest, NextResponse } from 'next/server'
import { requireServerSession } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { assembleVariant } from '@/lib/creatives/dco/assembler'
import { computeConversionRates } from '@/lib/creatives/dco/rotation'
import type { CanonicalProduct } from '@/lib/commerce/types'
import type { CreativeTemplate, CreativeVariant } from '@/types/database'

type RouteParams = { params: Promise<{ id: string }> }

// ── GET /api/dco/templates/[id]/variants ─────────────────────────────────────
// Returns variants with computed conversionRate, sorted descending

export async function GET(_req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireServerSession>>
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const orgId = session.organization.id
  const { id: templateId } = await params

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('creative_variants')
    .select('*')
    .eq('template_id', templateId)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[dco/templates/[id]/variants GET]', error.message)
    return NextResponse.json({ error: 'Falha ao buscar variants.' }, { status: 500 })
  }

  const variants = (data ?? []) as CreativeVariant[]
  const rated = computeConversionRates(variants)
  const withRate = rated.map(({ variant, rate }) => ({
    ...variant,
    conversionRate: rate,
  }))

  // Sort by conversion rate descending
  withRate.sort((a, b) => b.conversionRate - a.conversionRate)

  return NextResponse.json({ variants: withRate })
}

// ── POST /api/dco/templates/[id]/variants ────────────────────────────────────
// Body: { catalogId: string }
// Bulk-generates variants from a product catalog

export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  let session: Awaited<ReturnType<typeof requireServerSession>>
  try {
    session = await requireServerSession()
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const orgId = session.organization.id
  const { id: templateId } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const b = body as Record<string, unknown>

  if (!b.catalogId || typeof b.catalogId !== 'string') {
    return NextResponse.json({ error: 'O campo "catalogId" é obrigatório.' }, { status: 422 })
  }

  const supabase = createServiceClient()

  // Fetch the template (enforces org ownership)
  const { data: templateData, error: templateError } = await supabase
    .from('creative_templates')
    .select('*')
    .eq('id', templateId)
    .eq('organization_id', orgId)
    .maybeSingle()

  if (templateError) {
    console.error('[dco/templates/[id]/variants POST] template fetch', templateError.message)
    return NextResponse.json({ error: 'Falha ao buscar template.' }, { status: 500 })
  }

  if (!templateData) {
    return NextResponse.json({ error: 'Template não encontrado.' }, { status: 404 })
  }

  const template = templateData as CreativeTemplate

  // Fetch products from the catalog
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('catalog_id', b.catalogId)
    .eq('organization_id', orgId)

  if (productsError) {
    console.error('[dco/templates/[id]/variants POST] products fetch', productsError.message)
    return NextResponse.json({ error: 'Falha ao buscar produtos do catálogo.' }, { status: 500 })
  }

  if (!productsData || productsData.length === 0) {
    return NextResponse.json({ error: 'Nenhum produto encontrado no catálogo.' }, { status: 404 })
  }

  // Map DB rows to CanonicalProduct and assemble variants
  const variantInserts = productsData.map((row) => {
    const rawStatus = row.status
    const status: 'active' | 'archived' = rawStatus === 'archived' ? 'archived' : 'active'
    const canonical: CanonicalProduct = {
      externalId: row.external_id as string,
      title: row.title as string,
      description: row.description as string | null,
      price: row.price as number | null,
      currency: (row.currency as string) ?? 'BRL',
      imageUrl: row.image_url as string | null,
      url: row.url as string | null,
      status: status,
      rawData: row as Record<string, unknown>,
    }

    const assembled = assembleVariant(template, canonical, row.id as string)

    return {
      ...assembled,
      organization_id: orgId,
      impressions: 0,
      conversions: 0,
      is_active: true,
    }
  })

  // Bulk insert
  const { data: insertedData, error: insertError } = await supabase
    .from('creative_variants')
    .insert(variantInserts)
    .select()

  if (insertError) {
    console.error('[dco/templates/[id]/variants POST] insert', insertError.message)
    return NextResponse.json({ error: 'Falha ao criar variants.' }, { status: 500 })
  }

  const inserted = (insertedData ?? []) as CreativeVariant[]

  return NextResponse.json({ generated: inserted.length, variants: inserted }, { status: 201 })
}
