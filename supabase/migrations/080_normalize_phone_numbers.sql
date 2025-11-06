-- Normalize phone numbers to consistent format: 0XX-XXXXXXX
-- This fixes display inconsistency where some phones have dash and some don't

-- Update contact_phone field in clients table
UPDATE clients
SET contact_phone =
  CASE
    -- If phone is exactly 10 digits without dash (0XXXXXXXXX)
    WHEN contact_phone ~ '^0\d{9}$' THEN
      SUBSTRING(contact_phone, 1, 3) || '-' || SUBSTRING(contact_phone, 4)
    -- If phone already has dash or other format, keep as-is
    ELSE contact_phone
  END
WHERE contact_phone IS NOT NULL
  AND contact_phone != '';

-- Add comment explaining the format
COMMENT ON COLUMN clients.contact_phone IS 'Israeli phone number in format: 0XX-XXXXXXX (e.g., 050-1234567)';

-- Log the number of updated rows
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Normalized % phone numbers to 0XX-XXXXXXX format', updated_count;
END $$;
