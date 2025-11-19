-- Migration 111: Letter Component Combinations Table
-- Purpose: Store saved component combinations for Component Simulator
-- Date: 2025-01-19

-- Create letter_component_combinations table
CREATE TABLE IF NOT EXISTS letter_component_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  body_template VARCHAR(100) NOT NULL,
  payment_template VARCHAR(100) NOT NULL,
  default_amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint: Unique name per tenant
  CONSTRAINT unique_combination_name_per_tenant
    UNIQUE (tenant_id, name)
);

-- Create index for tenant lookups
CREATE INDEX idx_letter_combinations_tenant
ON letter_component_combinations(tenant_id);

-- Create index for name searches
CREATE INDEX idx_letter_combinations_name
ON letter_component_combinations(tenant_id, name);

-- Enable Row Level Security
ALTER TABLE letter_component_combinations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Tenant isolation
CREATE POLICY tenant_isolation_letter_combinations
ON letter_component_combinations
FOR ALL
USING (tenant_id = public.get_current_tenant_id());

-- Add comments
COMMENT ON TABLE letter_component_combinations IS
'Saved component combinations for Letter Component Simulator. Allows users to save and quickly load favorite Body+Payment template combinations.';

COMMENT ON COLUMN letter_component_combinations.name IS
'User-friendly name for the combination (e.g., "הנהח"ש רגיל", "ביקורת מדד")';

COMMENT ON COLUMN letter_component_combinations.body_template IS
'Body template filename (e.g., "bookkeeping-index.html")';

COMMENT ON COLUMN letter_component_combinations.payment_template IS
'Payment section template filename (e.g., "payment-section-audit.html")';

COMMENT ON COLUMN letter_component_combinations.default_amount IS
'Optional default amount to use with this combination (in ILS)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 111 completed: letter_component_combinations table created';
END
$$;
