-- supabase/migrations/038_pmp_deals.sql
-- M12: PMP & Deal Enforcement
-- pmp_deals: Programmatic guaranteed, preferred, and private deals table

CREATE TABLE pmp_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  deal_id TEXT NOT NULL UNIQUE,
  deal_name TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('private','preferred','guaranteed')),
  floor_price NUMERIC(10,4) NOT NULL DEFAULT 0,
  publisher_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','expired')),
  wseat TEXT[],
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pmp_deals_deal_id ON pmp_deals(deal_id);
CREATE INDEX idx_pmp_deals_workspace ON pmp_deals(workspace_id);

ALTER TABLE pmp_deals ENABLE ROW LEVEL SECURITY;

-- workspace members can read
CREATE POLICY "pmp_deals_select" ON pmp_deals
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- only owner/admin can insert
CREATE POLICY "pmp_deals_insert" ON pmp_deals
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      JOIN organization_members om ON om.organization_id = (
        SELECT organization_id FROM workspaces WHERE id = wm.workspace_id
      )
      WHERE wm.user_id = auth.uid()
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- only owner/admin can update
CREATE POLICY "pmp_deals_update" ON pmp_deals
  FOR UPDATE USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      JOIN organization_members om ON om.organization_id = (
        SELECT organization_id FROM workspaces WHERE id = wm.workspace_id
      )
      WHERE wm.user_id = auth.uid()
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- only owner/admin can delete
CREATE POLICY "pmp_deals_delete" ON pmp_deals
  FOR DELETE USING (
    workspace_id IN (
      SELECT wm.workspace_id FROM workspace_members wm
      JOIN organization_members om ON om.organization_id = (
        SELECT organization_id FROM workspaces WHERE id = wm.workspace_id
      )
      WHERE wm.user_id = auth.uid()
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE TRIGGER pmp_deals_updated_at
  BEFORE UPDATE ON pmp_deals
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
