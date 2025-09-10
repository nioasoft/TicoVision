-- Migration: Add missing columns and fix structure issues
-- Purpose: Add Hebrew support and missing fields for proper CRM functionality

-- 1. Add missing columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS company_name_hebrew TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30, -- Days for payment
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'he' CHECK (preferred_language IN ('he', 'en'));

-- Add comment explaining the columns
COMMENT ON COLUMN public.clients.company_name_hebrew IS 'Company name in Hebrew for letters and documents';
COMMENT ON COLUMN public.clients.contact_email IS 'Contact person email (different from main company email)';
COMMENT ON COLUMN public.clients.contact_phone IS 'Contact person phone (different from main company phone)';
COMMENT ON COLUMN public.clients.payment_terms IS 'Payment terms in days (default 30)';
COMMENT ON COLUMN public.clients.preferred_language IS 'Preferred language for communications (Hebrew/English)';

-- 2. Update fee_calculations table structure to match TypeScript interface
ALTER TABLE public.fee_calculations
ADD COLUMN IF NOT EXISTS month INTEGER CHECK (month BETWEEN 1 AND 12),
ADD COLUMN IF NOT EXISTS period_start DATE,
ADD COLUMN IF NOT EXISTS period_end DATE,
ADD COLUMN IF NOT EXISTS previous_year_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS previous_year_discount NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS previous_year_base NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS base_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS inflation_adjustment NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS real_adjustment_reason TEXT,
ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS final_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Update column names to be consistent
ALTER TABLE public.fee_calculations 
RENAME COLUMN calculated_base_amount TO base_amount_calculated;

-- Ensure we have proper constraints
ALTER TABLE public.fee_calculations
ALTER COLUMN inflation_rate SET DEFAULT 3.0;

-- Add comments to explain the columns
COMMENT ON COLUMN public.fee_calculations.month IS 'Month for monthly calculations (NULL for annual)';
COMMENT ON COLUMN public.fee_calculations.period_start IS 'Start date of the fee calculation period';
COMMENT ON COLUMN public.fee_calculations.period_end IS 'End date of the fee calculation period';
COMMENT ON COLUMN public.fee_calculations.previous_year_amount IS 'Previous year total amount for comparison';
COMMENT ON COLUMN public.fee_calculations.previous_year_discount IS 'Previous year discount percentage';
COMMENT ON COLUMN public.fee_calculations.previous_year_base IS 'Previous year base amount before adjustments';
COMMENT ON COLUMN public.fee_calculations.base_amount IS 'Current base amount before adjustments';
COMMENT ON COLUMN public.fee_calculations.inflation_adjustment IS 'Calculated inflation adjustment amount';
COMMENT ON COLUMN public.fee_calculations.real_adjustment_reason IS 'Explanation for real (non-inflation) adjustments';
COMMENT ON COLUMN public.fee_calculations.discount_percentage IS 'Discount percentage applied';
COMMENT ON COLUMN public.fee_calculations.discount_amount IS 'Calculated discount amount';
COMMENT ON COLUMN public.fee_calculations.final_amount IS 'Final amount before VAT';
COMMENT ON COLUMN public.fee_calculations.payment_date IS 'Date when payment was received';
COMMENT ON COLUMN public.fee_calculations.payment_reference IS 'Payment transaction reference';
COMMENT ON COLUMN public.fee_calculations.updated_by IS 'User who last updated the record';

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_company_name_hebrew ON public.clients(company_name_hebrew);
CREATE INDEX IF NOT EXISTS idx_clients_contact_email ON public.clients(contact_email);
CREATE INDEX IF NOT EXISTS idx_fee_calculations_year_month ON public.fee_calculations(year, month);
CREATE INDEX IF NOT EXISTS idx_fee_calculations_status_due_date ON public.fee_calculations(status, due_date);
CREATE INDEX IF NOT EXISTS idx_fee_calculations_client_year ON public.fee_calculations(client_id, year);

-- 4. Add trigger to update updated_at and updated_by
CREATE OR REPLACE FUNCTION update_fee_calculation_metadata()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF auth.uid() IS NOT NULL THEN
        NEW.updated_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fee_calculation_metadata_trigger ON public.fee_calculations;
CREATE TRIGGER update_fee_calculation_metadata_trigger
BEFORE UPDATE ON public.fee_calculations
FOR EACH ROW
EXECUTE FUNCTION update_fee_calculation_metadata();

-- 5. Update RLS policies for new columns
-- Already covered by existing policies, but let's ensure they're working

-- 6. Add sample data for testing (only in development)
-- This will help test the Hebrew fields
DO $$
BEGIN
    -- Only run in development (check if we have test data)
    IF EXISTS (SELECT 1 FROM public.tenants WHERE name = 'Demo Accounting Firm') THEN
        -- Update existing clients with Hebrew names
        UPDATE public.clients 
        SET 
            company_name_hebrew = 'חברת הדגמה בע"מ',
            contact_email = 'contact@demo.co.il',
            contact_phone = '050-1234567',
            preferred_language = 'he'
        WHERE company_name = 'Demo Company Ltd' AND company_name_hebrew IS NULL;
        
        UPDATE public.clients 
        SET 
            company_name_hebrew = 'טכנולוגיות מתקדמות בע"מ',
            contact_email = 'info@techstart.co.il',
            contact_phone = '052-9876543',
            preferred_language = 'he'
        WHERE company_name = 'Tech Startup Inc' AND company_name_hebrew IS NULL;
    END IF;
END $$;