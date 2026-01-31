-- Add reminder_count column to billing_letters table
-- Used to track how many reminder emails have been sent for unpaid billing letters

ALTER TABLE billing_letters
ADD COLUMN reminder_count INTEGER NOT NULL DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN billing_letters.reminder_count IS 'Number of reminder emails sent for this billing letter';
