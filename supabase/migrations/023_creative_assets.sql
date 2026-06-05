-- M15: Creative Asset Uploads
-- Tabela creative_assets para armazenar referências de imagens no Supabase Storage

CREATE TABLE IF NOT EXISTS creative_assets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  creative_id      UUID REFERENCES creatives(id) ON DELETE SET NULL,
  campaign_id      UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  rtb_campaign_id  UUID REFERENCES rtb_campaigns(id) ON DELETE SET NULL,
  storage_path     TEXT NOT NULL,
  public_url       TEXT NOT NULL,
  filename         TEXT,
  mime_type        TEXT,
  size_bytes       INTEGER,
  width_px         INTEGER,
  height_px        INTEGER,
  alt_text         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para lookups comuns
CREATE INDEX IF NOT EXISTS creative_assets_workspace_id_idx  ON creative_assets(workspace_id);
CREATE INDEX IF NOT EXISTS creative_assets_creative_id_idx   ON creative_assets(creative_id) WHERE creative_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS creative_assets_campaign_id_idx   ON creative_assets(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS creative_assets_rtb_campaign_id_idx ON creative_assets(rtb_campaign_id) WHERE rtb_campaign_id IS NOT NULL;

-- RLS
ALTER TABLE creative_assets ENABLE ROW LEVEL SECURITY;

-- Workspace members leem
CREATE POLICY "workspace_members_select_creative_assets"
  ON creative_assets FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Workspace members criam
CREATE POLICY "workspace_members_insert_creative_assets"
  ON creative_assets FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Owners e admins deletam (via org membership)
CREATE POLICY "workspace_owners_delete_creative_assets"
  ON creative_assets FOR DELETE
  USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      JOIN organization_members om ON om.organization_id = (
        SELECT organization_id FROM workspaces WHERE id = wm.workspace_id
      )
      WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
      AND wm.workspace_id = creative_assets.workspace_id
    )
  );

-- Service role tem acesso irrestrito (para API routes server-side)
CREATE POLICY "service_role_full_access_creative_assets"
  ON creative_assets FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Supabase Storage bucket: creative-assets
-- Nota: o bucket precisa ser criado no Supabase Dashboard ou via API.
-- Configuração esperada:
--   name: creative-assets
--   public: true (URLs públicas para leitura)
--   file_size_limit: 10485760 (10 MB)
--   allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
