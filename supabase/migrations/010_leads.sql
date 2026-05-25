-- Migration 010: leads table for landing page waitlist capture

CREATE TABLE leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  name        TEXT NOT NULL,
  agency_size TEXT NOT NULL CHECK (agency_size IN ('solo', 'small', 'medium', 'large')),
  source      TEXT NOT NULL DEFAULT 'waitlist',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX leads_email_idx ON leads(email);

-- RLS: service role only (public endpoint uses service client, no authenticated user)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
