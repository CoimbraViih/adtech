-- supabase/migrations/037_audience_membership.sql
-- M8-DMP: adiciona user_id_hash a pixel_events para DMP segmentation

-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- If this migration is applied via a runner that wraps files in BEGIN/COMMIT,
-- run these statements manually outside the transaction, or split this file.

ALTER TABLE pixel_events
  ADD COLUMN IF NOT EXISTS user_id_hash TEXT;

-- Índice primário do DMP: lookup por hash
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pixel_events_user_id_hash
  ON pixel_events(user_id_hash)
  WHERE user_id_hash IS NOT NULL;

-- Índice composto para queries DMP completas: pixel_id + event_type + janela de tempo.
-- user_id_hash não entra na chave: não tem predicado de igualdade (só IS NOT NULL,
-- coberto pelo partial WHERE) nem aparece em ORDER BY, então colocá-lo entre as
-- colunas de igualdade e a coluna de range (received_at) só atrapalharia o range scan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pixel_events_dmp
  ON pixel_events(pixel_id, event_type, received_at DESC)
  WHERE user_id_hash IS NOT NULL;
