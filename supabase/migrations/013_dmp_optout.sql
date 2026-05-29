-- supabase/migrations/013_dmp_optout.sql
CREATE TABLE dmp_optouts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_hash    TEXT NOT NULL UNIQUE,
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE dmp_optouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dmp_optouts: deny all direct access" ON dmp_optouts USING (false);
