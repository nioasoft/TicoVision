-- Fix address column: Change from TEXT to JSONB
-- This resolves the issue where address data is not loading properly in the client form

-- Step 1: Add new JSONB columns temporarily
ALTER TABLE clients
  ADD COLUMN address_new JSONB DEFAULT '{}',
  ADD COLUMN city_new TEXT,
  ADD COLUMN postal_code_new TEXT;

-- Step 2: Migrate data from old columns to new JSONB structure
-- For rows where address is valid JSON, parse it
UPDATE clients
SET address_new = CASE
  -- If address is already valid JSON, use it
  WHEN address IS NOT NULL AND address LIKE '{%' THEN address::jsonb
  -- Otherwise, build JSON from separate columns
  ELSE jsonb_build_object(
    'street', COALESCE(address, ''),
    'city', COALESCE(city, ''),
    'postal_code', COALESCE(postal_code, '')
  )
END
WHERE address IS NOT NULL OR city IS NOT NULL OR postal_code IS NOT NULL;

-- Step 3: Drop old columns
ALTER TABLE clients
  DROP COLUMN address,
  DROP COLUMN city,
  DROP COLUMN postal_code;

-- Step 4: Rename new columns to final names
ALTER TABLE clients
  RENAME COLUMN address_new TO address;

-- Add comment to document the structure
COMMENT ON COLUMN clients.address IS 'JSONB object with structure: {street: string, city: string, postal_code: string}';
