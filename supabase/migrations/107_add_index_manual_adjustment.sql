-- Migration 107: Add index_manual_adjustment field to fee_calculations
-- Purpose: Allow manual adjustment to inflation calculation (can be positive or negative)
-- Date: 2025-01-17

-- Add new column to fee_calculations table
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS index_manual_adjustment NUMERIC DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN fee_calculations.index_manual_adjustment
IS 'התאמת מדד ידנית בשקלים - סכום שמתווסף לחישוב המדד האוטומטי (יכול להיות שלילי)';

-- No RLS changes needed - inherits from table policies
