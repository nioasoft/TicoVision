-- Migration: Add tax withholding file numbers to clients table
-- Purpose: Store income tax withholding (ניכויים) and social security withholding file numbers
--          so they can be pre-filled when generating onboarding letters for new clients.
-- Date: 2026-05-12

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS income_tax_withholding_file_number text,
  ADD COLUMN IF NOT EXISTS social_security_withholding_file_number text;

COMMENT ON COLUMN clients.income_tax_withholding_file_number
  IS 'מספר תיק ניכויים במס הכנסה (עובדים)';
COMMENT ON COLUMN clients.social_security_withholding_file_number
  IS 'מספר תיק ניכויים בביטוח לאומי';
