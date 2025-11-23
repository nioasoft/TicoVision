-- Migration: Add client requested adjustment to fee_calculations
-- Purpose: Support "תיקון שכר טרחה לבקשת הלקוח" feature
-- Date: 2025-01-23

-- Add client_requested_adjustment column (negative values only)
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS client_requested_adjustment NUMERIC(10,2) DEFAULT 0
CHECK (client_requested_adjustment <= 0);

-- Add optional note for the adjustment (max 50 characters)
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS client_requested_adjustment_note TEXT
CHECK (char_length(client_requested_adjustment_note) <= 50);

-- Add comments for documentation
COMMENT ON COLUMN fee_calculations.client_requested_adjustment IS
  'תיקון שכר טרחה לבקשת לקוח - ערכים שליליים בלבד. מתווסף לחישוב לאחר מדד וריאלי, לפני הנחות תשלום.';

COMMENT ON COLUMN fee_calculations.client_requested_adjustment_note IS
  'הערה אופציונלית לתיקון (עד 50 תווים) - למשל: "לפי הסכמה טלפונית"';
