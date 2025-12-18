-- Add payment promises fields to fee_calculations
-- Allows tracking of promised payment dates from clients

-- Add promised_payment_date column
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS promised_payment_date DATE;

-- Add promise_note column for additional context
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS promise_note TEXT;

-- Add promise_created_at to track when the promise was made
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS promise_created_at TIMESTAMPTZ;

-- Add promise_created_by to track who recorded the promise
ALTER TABLE fee_calculations
ADD COLUMN IF NOT EXISTS promise_created_by UUID REFERENCES auth.users(id);

-- Create index for querying overdue promises
CREATE INDEX IF NOT EXISTS idx_fee_calculations_promised_payment_date
ON fee_calculations(promised_payment_date)
WHERE promised_payment_date IS NOT NULL AND status NOT IN ('paid', 'cancelled');

-- Add comment for documentation
COMMENT ON COLUMN fee_calculations.promised_payment_date IS 'Date the client promised to pay';
COMMENT ON COLUMN fee_calculations.promise_note IS 'Notes about the payment promise';
COMMENT ON COLUMN fee_calculations.promise_created_at IS 'When the promise was recorded';
COMMENT ON COLUMN fee_calculations.promise_created_by IS 'User who recorded the promise';
