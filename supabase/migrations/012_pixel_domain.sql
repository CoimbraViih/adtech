-- supabase/migrations/012_pixel_domain.sql
-- Adds an optional allowed origin domain to pixels for CORS restriction.
-- If null, the endpoint accepts all origins (development mode).
-- Example value: "https://meusite.com.br"

ALTER TABLE pixels ADD COLUMN domain TEXT;

COMMENT ON COLUMN pixels.domain IS
  'Allowed CORS origin for this pixel (e.g. https://meusite.com.br). NULL = unrestricted (dev only).';
