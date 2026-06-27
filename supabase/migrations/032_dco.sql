-- ============================================================
-- Migration 032: M15 Part 2 — Dynamic Creative Optimization (DCO)
-- Tables: creative_templates, creative_variants, variant_performance
-- ============================================================

-- creative_templates: DCO template with {{placeholder}} slots
CREATE TABLE IF NOT EXISTS public.creative_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id    UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  format          TEXT        NOT NULL CHECK (format IN ('copy', 'banner', 'video')),
  template_body   JSONB       NOT NULL DEFAULT '{}',
  -- template_body shape: { headline: "{{title}} por {{price}}", description: "{{description}}", imageUrl: "{{imageUrl}}", cta: "Comprar agora", url: "{{url}}" }
  placeholders    TEXT[]      NOT NULL DEFAULT '{}',  -- extracted placeholder names
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.creative_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read creative_templates"
  ON public.creative_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org admins can insert creative_templates"
  ON public.creative_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "org admins can update creative_templates"
  ON public.creative_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "org admins can delete creative_templates"
  ON public.creative_templates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "service role can manage creative_templates"
  ON public.creative_templates FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_creative_templates ON public.creative_templates;
CREATE TRIGGER set_updated_at_creative_templates
  BEFORE UPDATE ON public.creative_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- creative_variants: one variant per (template × product)
CREATE TABLE IF NOT EXISTS public.creative_variants (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id     UUID        NOT NULL REFERENCES public.creative_templates(id) ON DELETE CASCADE,
  product_id      UUID        REFERENCES public.products(id) ON DELETE SET NULL,
  -- resolved content (template rendered with product data)
  resolved_body   JSONB       NOT NULL DEFAULT '{}',
  -- bandit state
  impressions     BIGINT      NOT NULL DEFAULT 0,
  conversions     BIGINT      NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.creative_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read creative_variants"
  ON public.creative_variants FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org members can insert creative_variants"
  ON public.creative_variants FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "org members can update creative_variants"
  ON public.creative_variants FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "org admins can delete creative_variants"
  ON public.creative_variants FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "service role can manage creative_variants"
  ON public.creative_variants FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_creative_variants ON public.creative_variants;
CREATE TRIGGER set_updated_at_creative_variants
  BEFORE UPDATE ON public.creative_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- variant_performance: immutable event log for bandit signals
CREATE TABLE IF NOT EXISTS public.variant_performance (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  UUID        NOT NULL REFERENCES public.creative_variants(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL CHECK (event_type IN ('impression', 'click', 'conversion')),
  value       NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.variant_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read variant_performance"
  ON public.variant_performance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.creative_variants cv
      WHERE cv.id = variant_id
        AND cv.organization_id IN (
          SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "org members can insert variant_performance"
  ON public.variant_performance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creative_variants cv
      WHERE cv.id = variant_id
        AND cv.organization_id IN (
          SELECT organization_id FROM public.organization_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
        )
    )
  );

CREATE POLICY "service role can manage variant_performance"
  ON public.variant_performance FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_creative_templates_org ON public.creative_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_creative_templates_workspace ON public.creative_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_creative_variants_org ON public.creative_variants(organization_id);
CREATE INDEX IF NOT EXISTS idx_creative_variants_template ON public.creative_variants(template_id);
CREATE INDEX IF NOT EXISTS idx_creative_variants_product ON public.creative_variants(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_variant_performance_variant ON public.variant_performance(variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_performance_recorded_at ON public.variant_performance(variant_id, recorded_at DESC);
