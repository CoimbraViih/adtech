-- 033_dco_atomic_increment.sql
-- Atomic counter increment for DCO variant performance counters.
-- Replaces the unsafe read-then-write pattern in rotation.ts.

CREATE OR REPLACE FUNCTION public.increment_variant_counter(
  p_variant_id UUID,
  p_field TEXT  -- 'impressions' or 'conversions'
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF p_field = 'impressions' THEN
    UPDATE public.creative_variants SET impressions = impressions + 1 WHERE id = p_variant_id;
  ELSIF p_field = 'conversions' THEN
    UPDATE public.creative_variants SET conversions = conversions + 1 WHERE id = p_variant_id;
  END IF;
END;
$$;
