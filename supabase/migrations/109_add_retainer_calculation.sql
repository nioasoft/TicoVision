-- Migration: Add retainer_calculation JSONB field to fee_calculations
-- Description: Stores dedicated calculation data for retainer clients (monthly input + index adjustment)
-- Date: 2025-11-18
-- Related: Migration 043 (is_retainer field in clients table)

-- Add retainer_calculation JSONB column to fee_calculations table
-- Structure similar to bookkeeping_calculation but specifically for retainer clients
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS retainer_calculation JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN fee_calculations.retainer_calculation IS
'חישוב ייעודי ללקוחות ריטיינר - כולל הזנה חודשית והתאמת מדד.
מבנה: {
  "monthly_amount": number,        -- סכום חודשי בסיס (לפני מדד ותוספות)
  "apply_inflation_index": boolean, -- האם להחיל התאמת מדד
  "inflation_rate": number,         -- אחוז מדד (ברירת מחדל 3.0)
  "inflation_adjustment": number,   -- התאמת מדד מחושבת (שנתי)
  "real_adjustment": number,        -- תוספת ריאלית (שנתי)
  "real_adjustment_reason": string, -- סיבת התוספת הריאלית
  "discount_percentage": number,    -- אחוז הנחה (deprecated - תמיד 0)
  "discount_amount": number,        -- סכום הנחה (deprecated - תמיד 0)
  "final_amount": number,           -- סך הכל שנתי לפני מע"מ
  "vat_amount": number,             -- מע"מ 18%
  "total_with_vat": number          -- סך הכל כולל מע"מ (שנתי)
}';

-- Add index for efficient queries on retainer calculations
-- Only indexes rows where retainer_calculation is not null
CREATE INDEX IF NOT EXISTS idx_fee_calculations_retainer
ON fee_calculations(tenant_id, client_id, year)
WHERE retainer_calculation IS NOT NULL;

-- Note: No data migration needed - this field starts NULL for all existing records
-- It will only be populated for new retainer client calculations
