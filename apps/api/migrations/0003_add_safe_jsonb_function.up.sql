-- digi_user_verification.data is free-text (populated by an external OCR/verification
-- service) — not guaranteed to always be valid JSON. A plain ::jsonb cast aborts the
-- whole query on the first bad row; this wraps it so malformed rows just yield NULL.
CREATE OR REPLACE FUNCTION safe_to_jsonb(input text)
RETURNS jsonb AS $$
BEGIN
  RETURN input::jsonb;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
