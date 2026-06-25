-- ============================================================
-- Migration 029: M16 E-commerce Integrations
-- Tables: product_catalogs, products, commerce_orders
-- ============================================================

-- product_catalogs: uma por org+provider (registro de conexão e última sync)
CREATE TABLE IF NOT EXISTS public.product_catalogs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id      UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider          TEXT        NOT NULL CHECK (provider IN ('nuvemshop','vtex','shopify')),
  external_store_id TEXT        NOT NULL,            -- user_id (Nuvemshop), accountName (VTEX), shop domain (Shopify)
  store_name        TEXT,
  synced_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider)
);

ALTER TABLE public.product_catalogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read catalogs"
  ON public.product_catalogs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org admins can write catalogs"
  ON public.product_catalogs FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );

-- products: itens do catálogo importados da plataforma
CREATE TABLE IF NOT EXISTS public.products (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  catalog_id      UUID        NOT NULL REFERENCES public.product_catalogs(id) ON DELETE CASCADE,
  external_id     TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  description     TEXT,
  price           NUMERIC(12,2),
  currency        TEXT        NOT NULL DEFAULT 'BRL',
  image_url       TEXT,
  url             TEXT,
  status          TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  raw_data        JSONB       NOT NULL DEFAULT '{}',
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (catalog_id, external_id)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read products"
  ON public.products FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service role can write products"
  ON public.products FOR ALL
  USING (auth.role() = 'service_role');

-- commerce_orders: pedidos recebidos via webhook
CREATE TABLE IF NOT EXISTS public.commerce_orders (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  catalog_id        UUID        NOT NULL REFERENCES public.product_catalogs(id) ON DELETE CASCADE,
  external_order_id TEXT        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'created',
  total_value       NUMERIC(12,2),
  currency          TEXT        NOT NULL DEFAULT 'BRL',
  line_items        JSONB       NOT NULL DEFAULT '[]',
  customer_email    TEXT,
  placed_at         TIMESTAMPTZ,
  event_id          UUID,         -- FK para events_outbox.event_id (soft link)
  raw_data          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (catalog_id, external_order_id)
);

ALTER TABLE public.commerce_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can read orders"
  ON public.commerce_orders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "service role can write orders"
  ON public.commerce_orders FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at triggers
CREATE TRIGGER set_updated_at_product_catalogs
  BEFORE UPDATE ON public.product_catalogs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices de performance
CREATE INDEX idx_products_catalog_id ON public.products(catalog_id);
CREATE INDEX idx_products_org_status ON public.products(organization_id, status);
CREATE INDEX idx_commerce_orders_catalog ON public.commerce_orders(catalog_id);
CREATE INDEX idx_commerce_orders_org ON public.commerce_orders(organization_id);
