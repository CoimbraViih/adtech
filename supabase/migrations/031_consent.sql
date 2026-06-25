-- supabase/migrations/031_consent.sql

-- 1. Adiciona consent_state na outbox (já populada com payload JSONB, mas precisamos coluna para queries)
ALTER TABLE events_outbox
  ADD COLUMN IF NOT EXISTS consent_state TEXT NOT NULL DEFAULT 'unknown'
    CHECK (consent_state IN ('granted', 'denied', 'unknown'));

-- 2. Registro de sinais de consentimento por sessão/pixel
CREATE TABLE IF NOT EXISTS consent_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pixel_id        TEXT NOT NULL,
  session_id      TEXT,
  consent_state   TEXT NOT NULL CHECK (consent_state IN ('granted', 'denied', 'unknown')),
  gcm_signals     JSONB,
  source          TEXT NOT NULL DEFAULT 'pixel'
    CHECK (source IN ('pixel', 'api', 'cmp')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_records_org_pixel
  ON consent_records (organization_id, pixel_id, created_at DESC);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consent_records: service_role only"
  ON consent_records AS RESTRICTIVE FOR ALL
  TO authenticated, anon USING (false) WITH CHECK (false);

-- 3. Pedidos de apagamento LGPD art. 18
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope           TEXT NOT NULL DEFAULT 'all'
    CHECK (scope IN ('all', 'pixel_events', 'analytics')),
  session_ids     TEXT[],
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  rows_deleted    INT,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS data_deletion_requests_updated_at ON data_deletion_requests;
CREATE TRIGGER data_deletion_requests_updated_at
  BEFORE UPDATE ON data_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deletion_requests: org owners and admins can manage"
  ON data_deletion_requests FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- 4. Configuração de CMP por pixel
ALTER TABLE pixels ADD COLUMN IF NOT EXISTS cmp_site_key TEXT;
ALTER TABLE pixels ADD COLUMN IF NOT EXISTS data_retention_days INT NOT NULL DEFAULT 365;

-- Função para anonimizar PII no payload JSONB do outbox (usada pelo endpoint LGPD)
-- p_session_ids: quando informado, aplica apenas às linhas com session_id correspondente
CREATE OR REPLACE FUNCTION strip_pii_from_outbox(
  p_organization_id UUID,
  p_session_ids TEXT[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE events_outbox
  SET payload = payload
    - 'session_id'
    - 'ip'
    - 'user_agent'
    - 'properties'
  WHERE organization_id = p_organization_id
    AND (
      p_session_ids IS NULL
      OR payload->>'session_id' = ANY(p_session_ids)
    );
END;
$$;
