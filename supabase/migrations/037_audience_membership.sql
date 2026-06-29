-- supabase/migrations/037_audience_membership.sql
-- M8-DMP: adiciona user_id_hash a pixel_events para DMP segmentation

ALTER TABLE pixel_events
  ADD COLUMN IF NOT EXISTS user_id_hash TEXT;

-- Índice primário do DMP: lookup por hash
CREATE INDEX IF NOT EXISTS idx_pixel_events_user_id_hash
  ON pixel_events(user_id_hash)
  WHERE user_id_hash IS NOT NULL;

-- Índice composto para queries de regra: event_type + janela de tempo
CREATE INDEX IF NOT EXISTS idx_pixel_events_event_type_received
  ON pixel_events(event_type, received_at DESC)
  WHERE user_id_hash IS NOT NULL;

-- Índice composto para queries DMP completas: pixel_id + event_type + hash + tempo
CREATE INDEX IF NOT EXISTS idx_pixel_events_dmp
  ON pixel_events(pixel_id, event_type, user_id_hash, received_at DESC)
  WHERE user_id_hash IS NOT NULL;
