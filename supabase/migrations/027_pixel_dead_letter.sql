-- ─────────────────────────────────────────────────────────────────────────────
-- M14: Pixel Dead-Letter Queue
-- Eventos que falham validação ou persistência vão aqui em vez de ser descartados
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pixel_dead_letter (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id         TEXT         NOT NULL,
  organization_id  UUID,                        -- null quando pixel lookup falha
  rejection_reason TEXT         NOT NULL,        -- 'validation_failed' | 'persistence_failed' | 'synthetic_check_failed'
  event_payload    JSONB,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índice para queries de janela temporal (cron de alerta)
CREATE INDEX IF NOT EXISTS pixel_dead_letter_created_at_idx
  ON pixel_dead_letter(created_at DESC);

-- Índice para filtrar por motivo + janela de tempo (detecção de falhas consecutivas)
CREATE INDEX IF NOT EXISTS pixel_dead_letter_reason_created_idx
  ON pixel_dead_letter(rejection_reason, created_at DESC);

ALTER TABLE pixel_dead_letter ENABLE ROW LEVEL SECURITY;

-- Apenas service role pode ler/escrever (bypassa RLS por definição)
-- A policy abaixo bloqueia anon e authenticated keys
DROP POLICY IF EXISTS "pixel_dead_letter: service role only" ON pixel_dead_letter;
CREATE POLICY "pixel_dead_letter: service role only"
  ON pixel_dead_letter
  USING (false)
  WITH CHECK (false);
