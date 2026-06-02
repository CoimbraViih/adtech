-- supabase/migrations/020_credentials_expiry.sql
-- Onda 1B (M-ADS Fase 2): add token-expiry and refresh-token columns to
-- org_api_credentials so that platform OAuth tokens can be refreshed
-- automatically without a full re-authorisation by the user.
--
-- Both columns are nullable and default to NULL so that credential rows
-- created before this migration (basic API-key providers that have no
-- expiry concept) are completely unaffected.
--
-- refresh_token is stored as an AES-256-GCM blob in the same
-- "iv:authTag:ciphertext" hex format used by the credentials column.

ALTER TABLE org_api_credentials
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN org_api_credentials.expires_at IS
  'UTC timestamp at which the access token stored inside credentials expires. '
  'NULL means the credential has no expiry (e.g. a static API key). '
  'When NOW() > expires_at the sync layer should attempt a token refresh before use.';

ALTER TABLE org_api_credentials
  ADD COLUMN IF NOT EXISTS refresh_token TEXT DEFAULT NULL;

COMMENT ON COLUMN org_api_credentials.refresh_token IS
  'AES-256-GCM encrypted refresh token in "iv:authTag:ciphertext" hex format — '
  'identical encoding to the credentials column. '
  'NULL for providers that do not issue refresh tokens (Meta long-lived tokens, '
  'static API keys, etc.).';
