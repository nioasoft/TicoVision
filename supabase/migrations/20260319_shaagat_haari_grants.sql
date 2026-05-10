-- ============================================================================
-- Shaagat HaAri Grants Module (מענקי "שאגת הארי")
-- Migration: 20260319_shaagat_haari_grants.sql
-- Created: 2026-03-19
--
-- 10 tables + RLS policies + indexes + triggers + 5 RPC functions + 1 view
-- ============================================================================

-- ============================================================================
-- TABLE 1: shaagat_feasibility_checks — בדיקות היתכנות (שלב 0)
-- External form submissions from clients via token-based access
-- ============================================================================
CREATE TABLE IF NOT EXISTS shaagat_feasibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Token for external access
  public_token TEXT UNIQUE NOT NULL,
  token_expires_at TIMESTAMPTZ,                  -- 7 days default

  -- Revenue data entered by client
  revenue_base DECIMAL(15,2),
  revenue_comparison DECIMAL(15,2),

  -- Computed
  decline_percentage DECIMAL(7,4),
  has_feasibility BOOLEAN DEFAULT FALSE,

  -- Client response
  client_interested BOOLEAN,
  interested_at TIMESTAMPTZ,

  -- Payment
  payment_status TEXT DEFAULT 'none' CHECK (payment_status IN ('none', 'pending', 'paid')),
  payment_received_at TIMESTAMPTZ,

  -- Tracking
  accessed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submitted_from_ip TEXT,

  -- Relevance
  is_relevant BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shaagat_feas_token ON shaagat_feasibility_checks(public_token);
CREATE INDEX IF NOT EXISTS idx_shaagat_feas_tenant ON shaagat_feasibility_checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_feas_client ON shaagat_feasibility_checks(client_id);

-- Updated_at trigger
CREATE TRIGGER set_shaagat_feas_updated_at
  BEFORE UPDATE ON shaagat_feasibility_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE shaagat_feasibility_checks ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full access within tenant
CREATE POLICY "shaagat_feas_tenant"
  ON shaagat_feasibility_checks
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_feasibility_checks.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- Anon: read-only via token (for external form)
CREATE POLICY "shaagat_feas_anon_select"
  ON shaagat_feasibility_checks
  FOR SELECT TO anon
  USING (public_token IS NOT NULL);

-- Anon: update via token (for external form submission)
CREATE POLICY "shaagat_feas_anon_update"
  ON shaagat_feasibility_checks
  FOR UPDATE TO anon
  USING (public_token IS NOT NULL);


-- ============================================================================
-- TABLE 2: shaagat_eligibility_checks — בדיקות זכאות מלאות
-- Full eligibility checks with track_type, revenue data, and results
-- ============================================================================
CREATE TABLE IF NOT EXISTS shaagat_eligibility_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Track and reporting config
  track_type TEXT NOT NULL DEFAULT 'standard' CHECK (track_type IN (
    'standard', 'small', 'cash_basis', 'new_business', 'northern', 'contractor'
  )),
  business_type TEXT NOT NULL DEFAULT 'regular' CHECK (business_type IN ('regular', 'ngo')),
  reporting_type TEXT NOT NULL DEFAULT 'monthly' CHECK (reporting_type IN ('monthly', 'bimonthly')),

  -- Revenue data — generic names (not hardcoded to year)
  annual_revenue DECIMAL(15,2) NOT NULL DEFAULT 0,
  annual_revenue_2022 DECIMAL(15,2) DEFAULT 0,              -- for small business lookup
  revenue_base_period DECIMAL(15,2) NOT NULL DEFAULT 0,     -- base period revenue
  revenue_comparison_period DECIMAL(15,2) NOT NULL DEFAULT 0, -- comparison period revenue
  revenue_base_period_label TEXT,                            -- e.g. "03/2025", "3-4/2023"
  revenue_comparison_period_label TEXT,                      -- e.g. "03/2026", "3-4/2026"

  -- Revenue deductions
  capital_revenues_base DECIMAL(15,2) DEFAULT 0,
  capital_revenues_comparison DECIMAL(15,2) DEFAULT 0,
  self_accounting_revenues_base DECIMAL(15,2) DEFAULT 0,
  self_accounting_revenues_comparison DECIMAL(15,2) DEFAULT 0,

  -- Computed results
  net_revenue_base DECIMAL(15,2) DEFAULT 0,
  net_revenue_comparison DECIMAL(15,2) DEFAULT 0,
  decline_percentage DECIMAL(8,4) DEFAULT 0,
  eligibility_status TEXT NOT NULL DEFAULT 'NOT_ELIGIBLE' CHECK (
    eligibility_status IN ('ELIGIBLE', 'NOT_ELIGIBLE', 'GRAY_AREA')
  ),
  compensation_rate DECIMAL(5,2) DEFAULT 0,

  -- Service fee payment
  payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (
    payment_status IN ('UNPAID', 'PAID', 'EXEMPT')
  ),
  payment_link TEXT,
  payment_received_at TIMESTAMPTZ,

  -- Tracking
  email_sent BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_relevant BOOLEAN DEFAULT TRUE,                          -- relevance toggle
  version INTEGER NOT NULL DEFAULT 1,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shaagat_eligibility_client ON shaagat_eligibility_checks(client_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_eligibility_tenant ON shaagat_eligibility_checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_eligibility_status ON shaagat_eligibility_checks(eligibility_status);
CREATE INDEX IF NOT EXISTS idx_shaagat_eligibility_track ON shaagat_eligibility_checks(track_type);
CREATE INDEX IF NOT EXISTS idx_shaagat_eligibility_active ON shaagat_eligibility_checks(is_active) WHERE is_active = true;

-- Updated_at trigger
CREATE TRIGGER set_shaagat_eligibility_updated_at
  BEFORE UPDATE ON shaagat_eligibility_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE shaagat_eligibility_checks ENABLE ROW LEVEL SECURITY;

-- SELECT: all active tenant users
CREATE POLICY "shaagat_eligibility_select"
  ON shaagat_eligibility_checks FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_eligibility_checks.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- INSERT: admin + accountant
CREATE POLICY "shaagat_eligibility_insert"
  ON shaagat_eligibility_checks FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_eligibility_checks.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- UPDATE: admin + accountant
CREATE POLICY "shaagat_eligibility_update"
  ON shaagat_eligibility_checks FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_eligibility_checks.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- DELETE: admin only
CREATE POLICY "shaagat_eligibility_delete"
  ON shaagat_eligibility_checks FOR DELETE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_eligibility_checks.tenant_id
          AND uta.role = 'admin'
          AND uta.is_active = true
      )
    )
  );


-- ============================================================================
-- TABLE 3: shaagat_detailed_calculations — חישובים מפורטים (4-step wizard)
-- All intermediate values stored for audit trail and recalculation
-- ============================================================================
CREATE TABLE IF NOT EXISTS shaagat_detailed_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  eligibility_check_id UUID NOT NULL REFERENCES shaagat_eligibility_checks(id) ON DELETE CASCADE,

  -- ═══ Step 1: Business data (from eligibility check — readonly) ═══
  track_type TEXT NOT NULL,
  business_type TEXT NOT NULL,
  reporting_type TEXT NOT NULL DEFAULT 'monthly',
  compensation_rate DECIMAL(5,2) NOT NULL,
  decline_percentage DECIMAL(8,4) NOT NULL,
  annual_revenue DECIMAL(15,2) NOT NULL,
  revenue_base_period DECIMAL(15,2) NOT NULL,
  revenue_comparison_period DECIMAL(15,2) NOT NULL,

  -- ═══ Step 2: Fixed expenses (inputs/תשומות) ═══
  vat_inputs DECIMAL(15,2) DEFAULT 0,                -- annual VAT inputs
  zero_vat_inputs DECIMAL(15,2) DEFAULT 0,           -- zero-rate VAT inputs
  inputs_months INTEGER DEFAULT 12,                  -- months for averaging (12 normally, N for new business)
  use_enhanced_rate BOOLEAN DEFAULT FALSE,           -- x1.5 multiplier flag

  -- Fixed expenses breakdown (7 categories for x1.5 decision)
  expense_rent DECIMAL(15,2) DEFAULT 0,
  expense_electricity DECIMAL(15,2) DEFAULT 0,
  expense_water DECIMAL(15,2) DEFAULT 0,
  expense_phone_internet DECIMAL(15,2) DEFAULT 0,
  expense_insurance DECIMAL(15,2) DEFAULT 0,
  expense_maintenance DECIMAL(15,2) DEFAULT 0,
  expense_other_fixed DECIMAL(15,2) DEFAULT 0,
  expense_other_description TEXT,
  total_actual_fixed_expenses DECIMAL(15,2) DEFAULT 0,

  -- Intermediate: fixed expenses
  monthly_avg_inputs DECIMAL(15,2) DEFAULT 0,
  effective_compensation_rate DECIMAL(5,2) DEFAULT 0,

  -- ═══ Step 3: Salary data ═══
  salary_gross DECIMAL(15,2) DEFAULT 0,              -- gross salary March 2026 (Form 102)
  num_employees INTEGER DEFAULT 0,
  miluim_deductions DECIMAL(15,2) DEFAULT 0,         -- miluim deduction (ILS)
  tips_deductions DECIMAL(15,2) DEFAULT 0,           -- tips deduction (ILS)
  chalat_deductions DECIMAL(15,2) DEFAULT 0,         -- unpaid leave deduction (ILS)
  vacation_deductions DECIMAL(15,2) DEFAULT 0,       -- vacation deduction (ILS)
  miluim_count INTEGER DEFAULT 0,                    -- employee count in miluim
  tips_count INTEGER DEFAULT 0,                      -- employee count with tips
  chalat_count INTEGER DEFAULT 0,                    -- employee count on unpaid leave
  vacation_count INTEGER DEFAULT 0,                  -- employee count on vacation

  -- Intermediate: salary
  total_deductions DECIMAL(15,2) DEFAULT 0,
  salary_after_deductions DECIMAL(15,2) DEFAULT 0,
  employer_cost_multiplier DECIMAL(5,3) DEFAULT 1.25,
  adjusted_salary DECIMAL(15,2) DEFAULT 0,
  effective_decline DECIMAL(8,4) DEFAULT 0,          -- after bimonthly doubling
  employees_after_deductions INTEGER DEFAULT 0,

  -- ═══ Step 4: Calculation results (auto-computed) ═══
  fixed_expenses_grant DECIMAL(15,2) DEFAULT 0,
  salary_grant_before_cap DECIMAL(15,2) DEFAULT 0,
  salary_grant_cap DECIMAL(15,2) DEFAULT 0,
  salary_grant DECIMAL(15,2) DEFAULT 0,              -- after cap
  total_calculated_grant DECIMAL(15,2) DEFAULT 0,    -- before overall cap
  grant_cap DECIMAL(15,2) DEFAULT 0,
  final_grant_amount DECIMAL(15,2) DEFAULT 0,        -- after overall cap

  -- Contractor multiplier
  contractor_multiplier_applied BOOLEAN DEFAULT FALSE,
  grant_before_contractor_multiplier DECIMAL(15,2) DEFAULT 0,

  -- Small business track comparison
  small_track_amount DECIMAL(15,2) DEFAULT 0,
  used_small_track BOOLEAN DEFAULT FALSE,

  -- Audit trail
  constants_version TEXT DEFAULT '1.0',

  -- Step tracking
  calculation_step INTEGER DEFAULT 1 CHECK (calculation_step BETWEEN 1 AND 4),
  is_completed BOOLEAN DEFAULT FALSE,

  -- Send to client
  is_sent_to_client BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,

  -- Client approval
  client_approved BOOLEAN,
  client_approved_at TIMESTAMPTZ,
  client_rejection_reason TEXT,
  approval_token TEXT UNIQUE,
  approval_token_expires_at TIMESTAMPTZ,

  -- Manual approval by accountant
  manual_approval BOOLEAN DEFAULT FALSE,
  manual_approval_note TEXT,
  manual_approved_by UUID REFERENCES auth.users(id),

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shaagat_calc_client ON shaagat_detailed_calculations(client_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_calc_eligibility ON shaagat_detailed_calculations(eligibility_check_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_calc_tenant ON shaagat_detailed_calculations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_calc_approval_token ON shaagat_detailed_calculations(approval_token)
  WHERE approval_token IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER set_shaagat_calc_updated_at
  BEFORE UPDATE ON shaagat_detailed_calculations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE shaagat_detailed_calculations ENABLE ROW LEVEL SECURITY;

-- SELECT: all active tenant users
CREATE POLICY "shaagat_calc_select"
  ON shaagat_detailed_calculations FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_detailed_calculations.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- INSERT: admin + accountant
CREATE POLICY "shaagat_calc_insert"
  ON shaagat_detailed_calculations FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_detailed_calculations.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- UPDATE: admin + accountant
CREATE POLICY "shaagat_calc_update"
  ON shaagat_detailed_calculations FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_detailed_calculations.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- DELETE: admin only
CREATE POLICY "shaagat_calc_delete"
  ON shaagat_detailed_calculations FOR DELETE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_detailed_calculations.tenant_id
          AND uta.role = 'admin'
          AND uta.is_active = true
      )
    )
  );


-- ============================================================================
-- TABLE 4: shaagat_tax_submissions — שידור לרשות המיסים
-- submission_number + screenshot are MANDATORY (enforced in frontend)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shaagat_tax_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  calculation_id UUID NOT NULL REFERENCES shaagat_detailed_calculations(id) ON DELETE CASCADE,

  submission_number TEXT NOT NULL,                    -- tax authority request/confirmation number — MANDATORY
  submission_screenshot_url TEXT NOT NULL,            -- screenshot of submission — MANDATORY
  submission_date TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN (
    'SUBMITTED',        -- submitted
    'IN_REVIEW',        -- under review
    'OBJECTIONS',       -- objection filed
    'PARTIAL_PAYMENT',  -- advance payment received
    'FULL_PAYMENT',     -- full payment received
    'CLOSED'            -- closed
  )),

  expected_amount DECIMAL(15,2),
  received_amount DECIMAL(15,2) DEFAULT 0,

  -- Legal deadlines (auto-computed from submission_date via trigger)
  documents_due_date DATE,                           -- 30 days — document submission
  advance_due_date DATE,                             -- 21 days — 60% advance
  determination_due_date DATE,                       -- 150 days — eligibility determination
  full_payment_due_date DATE,                        -- 8 months — full payment
  objection_due_date DATE,                           -- 90 days from determination — file objection
  objection_determination_date DATE,                 -- 8 months from objection — if not handled = accepted
  appeal_due_date DATE,                              -- 8 months + 60 days — appeal

  -- Advance payment tracking
  advance_received BOOLEAN DEFAULT FALSE,
  advance_amount DECIMAL(15,2) DEFAULT 0,
  advance_received_at TIMESTAMPTZ,

  -- Flexible JSONB storage
  responses JSONB DEFAULT '[]',                      -- tax authority responses
  corrections JSONB DEFAULT '[]',                    -- corrections submitted
  payment_info JSONB DEFAULT '{}',                   -- payment details

  -- Closure
  is_closed BOOLEAN DEFAULT FALSE,
  closed_at TIMESTAMPTZ,
  closure_reason TEXT,
  closure_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shaagat_submissions_tenant ON shaagat_tax_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_submissions_client ON shaagat_tax_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_submissions_calc ON shaagat_tax_submissions(calculation_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_submissions_status ON shaagat_tax_submissions(status);
CREATE INDEX IF NOT EXISTS idx_shaagat_submissions_deadlines ON shaagat_tax_submissions(advance_due_date, determination_due_date, full_payment_due_date)
  WHERE is_closed = false;

-- Updated_at trigger
CREATE TRIGGER set_shaagat_submissions_updated_at
  BEFORE UPDATE ON shaagat_tax_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE shaagat_tax_submissions ENABLE ROW LEVEL SECURITY;

-- SELECT: all active tenant users
CREATE POLICY "shaagat_submissions_select"
  ON shaagat_tax_submissions FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_tax_submissions.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- INSERT/UPDATE/DELETE: admin + accountant
CREATE POLICY "shaagat_submissions_insert"
  ON shaagat_tax_submissions FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_tax_submissions.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

CREATE POLICY "shaagat_submissions_update"
  ON shaagat_tax_submissions FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_tax_submissions.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

CREATE POLICY "shaagat_submissions_delete"
  ON shaagat_tax_submissions FOR DELETE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_tax_submissions.tenant_id
          AND uta.role = 'admin'
          AND uta.is_active = true
      )
    )
  );


-- ============================================================================
-- TABLE 5: shaagat_tax_letters — מכתבים מ/אל רשות המיסים
-- ============================================================================
CREATE TABLE IF NOT EXISTS shaagat_tax_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES shaagat_tax_submissions(id) ON DELETE CASCADE,

  direction TEXT NOT NULL DEFAULT 'incoming' CHECK (direction IN ('incoming', 'outgoing')),

  type TEXT NOT NULL CHECK (type IN (
    'OBJECTION',          -- outgoing
    'REJECTION',          -- incoming
    'PARTIAL_APPROVAL',   -- incoming
    'FULL_APPROVAL',      -- incoming
    'INFO_REQUEST',       -- incoming
    'INFO_RESPONSE',      -- outgoing
    'APPEAL_SUBMITTED',   -- outgoing
    'ADVANCE_RECEIVED',   -- incoming
    'DETERMINATION',      -- incoming
    'OTHER'
  )),

  received_date DATE NOT NULL,
  response_due_date DATE,

  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'HANDLED', 'EXPIRED', 'INFO_ONLY'
  )),

  reference_number TEXT,
  amount DECIMAL(15,2),                              -- amount if relevant
  notes TEXT,
  file_url TEXT,

  -- Response tracking
  response_sent_date TIMESTAMPTZ,
  response_reference_number TEXT,
  response_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shaagat_letters_submission ON shaagat_tax_letters(submission_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_letters_tenant ON shaagat_tax_letters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_letters_status ON shaagat_tax_letters(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_shaagat_letters_due ON shaagat_tax_letters(response_due_date) WHERE status = 'PENDING';

-- Updated_at trigger
CREATE TRIGGER set_shaagat_letters_updated_at
  BEFORE UPDATE ON shaagat_tax_letters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE shaagat_tax_letters ENABLE ROW LEVEL SECURITY;

-- All operations: tenant users (SELECT for all, write for admin/accountant)
CREATE POLICY "shaagat_letters_select"
  ON shaagat_tax_letters FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_tax_letters.tenant_id
          AND uta.is_active = true
      )
    )
  );

CREATE POLICY "shaagat_letters_insert"
  ON shaagat_tax_letters FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_tax_letters.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

CREATE POLICY "shaagat_letters_update"
  ON shaagat_tax_letters FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_tax_letters.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );


-- ============================================================================
-- TABLE 6: shaagat_additional_periods — תקופות נזק ישיר נוספות
-- ============================================================================
CREATE TABLE IF NOT EXISTS shaagat_additional_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES shaagat_tax_submissions(id) ON DELETE SET NULL,

  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_label TEXT,                                 -- e.g. "04/2026", "05-06/2026"

  -- Compensation type
  compensation_type TEXT NOT NULL CHECK (compensation_type IN (
    'direct_damage',          -- qualifying expenses
    'direct_damage_income',   -- additional grant (taxable income)
    'rent_loss_residential',  -- residential rent loss
    'rent_loss_non_dealer',   -- non-dealer property rent loss
    'rent_loss_dealer'        -- dealer property rent loss
  )),

  -- Calculation data
  qualifying_expenses DECIMAL(15,2) DEFAULT 0,
  monthly_taxable_income DECIMAL(15,2) DEFAULT 0,
  decline_percentage DECIMAL(8,4) DEFAULT 0,
  last_rent_amount DECIMAL(15,2) DEFAULT 0,

  -- Result
  calculated_amount DECIMAL(15,2) DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED')),

  -- Eligibility conditions
  property_unusable_until DATE,
  min_days_unused_met BOOLEAN DEFAULT FALSE,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shaagat_additional_client ON shaagat_additional_periods(client_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_additional_tenant ON shaagat_additional_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_additional_submission ON shaagat_additional_periods(submission_id)
  WHERE submission_id IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER set_shaagat_additional_updated_at
  BEFORE UPDATE ON shaagat_additional_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE shaagat_additional_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shaagat_additional_select"
  ON shaagat_additional_periods FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_additional_periods.tenant_id
          AND uta.is_active = true
      )
    )
  );

CREATE POLICY "shaagat_additional_modify"
  ON shaagat_additional_periods FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_additional_periods.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

CREATE POLICY "shaagat_additional_update"
  ON shaagat_additional_periods FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_additional_periods.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );


-- ============================================================================
-- TABLE 7: shaagat_bank_details — פרטי בנק (external form via token)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shaagat_bank_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Bank details
  account_holder_name TEXT NOT NULL,
  bank_number TEXT NOT NULL,
  branch_number TEXT NOT NULL,
  account_number TEXT NOT NULL,

  -- Verification
  verification_tax_id TEXT,
  is_verified BOOLEAN DEFAULT FALSE,

  -- Token for external access
  access_token TEXT UNIQUE NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shaagat_bank_client ON shaagat_bank_details(client_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_bank_tenant ON shaagat_bank_details(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_bank_token ON shaagat_bank_details(access_token)
  WHERE submitted_at IS NULL;

-- Updated_at trigger
CREATE TRIGGER set_shaagat_bank_updated_at
  BEFORE UPDATE ON shaagat_bank_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE shaagat_bank_details ENABLE ROW LEVEL SECURITY;

-- Authenticated: read access for tenant users
CREATE POLICY "shaagat_bank_select"
  ON shaagat_bank_details FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_bank_details.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- Authenticated: insert/update for admin + accountant
CREATE POLICY "shaagat_bank_insert"
  ON shaagat_bank_details FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_bank_details.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

CREATE POLICY "shaagat_bank_update"
  ON shaagat_bank_details FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_bank_details.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- NOTE: Anon access via SECURITY DEFINER RPC functions (see below)


-- ============================================================================
-- TABLE 8: shaagat_accounting_submissions — נתוני שכר מרואה חשבון/לקוח
-- Includes fruit_vegetable_purchases_annual + monthly_fixed_expenses
-- ============================================================================
CREATE TABLE IF NOT EXISTS shaagat_accounting_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Salary data from accountant
  salary_gross DECIMAL(15,2),                        -- gross salary (Form 102)
  miluim_deductions DECIMAL(15,2),
  tips_deductions DECIMAL(15,2),
  chalat_deductions DECIMAL(15,2),
  vacation_deductions DECIMAL(15,2),
  num_employees INTEGER,
  miluim_count INTEGER DEFAULT 0,
  tips_count INTEGER DEFAULT 0,
  chalat_count INTEGER DEFAULT 0,
  vacation_count INTEGER DEFAULT 0,

  -- Salary period (03/2026 or 04/2026 for contractors)
  salary_period TEXT DEFAULT '03/2026',

  -- Additional data
  fruit_vegetable_purchases_annual DECIMAL(15,2) DEFAULT 0,  -- annual fruit/vegetable purchases
  monthly_fixed_expenses DECIMAL(15,2) DEFAULT 0,            -- monthly fixed expenses

  -- Submitter info
  submitted_by_email VARCHAR(255),
  submitted_by_business_id VARCHAR(20),
  submission_token VARCHAR(255) UNIQUE,              -- external form token
  token_expires_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shaagat_accounting_client ON shaagat_accounting_submissions(client_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_accounting_tenant ON shaagat_accounting_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_accounting_token ON shaagat_accounting_submissions(submission_token)
  WHERE submission_token IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER set_shaagat_accounting_updated_at
  BEFORE UPDATE ON shaagat_accounting_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE shaagat_accounting_submissions ENABLE ROW LEVEL SECURITY;

-- Authenticated: read access for tenant users
CREATE POLICY "shaagat_accounting_select"
  ON shaagat_accounting_submissions FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_accounting_submissions.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- Authenticated: insert/update for admin + accountant
CREATE POLICY "shaagat_accounting_insert"
  ON shaagat_accounting_submissions FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_accounting_submissions.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

CREATE POLICY "shaagat_accounting_update"
  ON shaagat_accounting_submissions FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_accounting_submissions.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- NOTE: External form uses SECURITY DEFINER RPC (see below)


-- ============================================================================
-- TABLE 9: shaagat_email_logs — לוג מיילים
-- ============================================================================
CREATE TABLE IF NOT EXISTS shaagat_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  eligibility_check_id UUID REFERENCES shaagat_eligibility_checks(id) ON DELETE SET NULL,

  email_type TEXT NOT NULL CHECK (email_type IN (
    'ELIGIBLE',
    'NOT_ELIGIBLE',
    'GRAY_AREA',
    'DETAILED_CALCULATION',
    'SUBMISSION_CONFIRMATION',
    'ACCOUNTING_FORM_REQUEST',
    'SALARY_DATA_REQUEST'
  )),

  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'FAILED')),
  error_message TEXT,
  html_content TEXT,                                 -- stored HTML for review

  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shaagat_email_client ON shaagat_email_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_email_tenant ON shaagat_email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_email_type ON shaagat_email_logs(email_type);

-- RLS
ALTER TABLE shaagat_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shaagat_email_logs_select"
  ON shaagat_email_logs FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_email_logs.tenant_id
          AND uta.is_active = true
      )
    )
  );

CREATE POLICY "shaagat_email_logs_insert"
  ON shaagat_email_logs FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_email_logs.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );


-- ============================================================================
-- TABLE 10: shaagat_status_history — מעקב שינויים (polymorphic audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS shaagat_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Polymorphic reference
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'eligibility_check', 'calculation', 'submission', 'letter', 'additional_period'
  )),
  entity_id UUID NOT NULL,

  -- Change details
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,

  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shaagat_history_entity ON shaagat_status_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_history_tenant ON shaagat_status_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shaagat_history_changed_at ON shaagat_status_history(changed_at);

-- RLS
ALTER TABLE shaagat_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shaagat_history_select"
  ON shaagat_status_history FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_status_history.tenant_id
          AND uta.is_active = true
      )
    )
  );

CREATE POLICY "shaagat_history_insert"
  ON shaagat_status_history FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = shaagat_status_history.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );


-- ============================================================================
-- TRIGGER: Auto-compute legal deadlines on tax submissions
-- When submission_date changes, recompute all deadline dates
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_shaagat_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.submission_date IS NOT NULL AND (
    TG_OP = 'INSERT' OR OLD.submission_date IS DISTINCT FROM NEW.submission_date
  ) THEN
    NEW.documents_due_date := (NEW.submission_date + INTERVAL '30 days')::DATE;
    NEW.advance_due_date := (NEW.submission_date + INTERVAL '21 days')::DATE;
    NEW.determination_due_date := (NEW.submission_date + INTERVAL '150 days')::DATE;
    NEW.full_payment_due_date := (NEW.submission_date + INTERVAL '8 months')::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shaagat_compute_deadlines
  BEFORE INSERT OR UPDATE ON shaagat_tax_submissions
  FOR EACH ROW EXECUTE FUNCTION compute_shaagat_deadlines();


-- ============================================================================
-- RPC FUNCTION 1: get_shaagat_bank_form_by_token
-- Anon access: Retrieve bank form data via token
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_shaagat_bank_form_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', bd.id,
    'client_name', c.company_name,
    'client_tax_id', c.tax_id,
    'is_submitted', bd.submitted_at IS NOT NULL
  ) INTO v_result
  FROM shaagat_bank_details bd
  JOIN clients c ON bd.client_id = c.id
  WHERE bd.access_token = p_token
    AND bd.token_expires_at > NOW()
    AND bd.submitted_at IS NULL;

  RETURN COALESCE(v_result, '{"error": "invalid_or_expired_token"}'::JSONB);
END;
$$;


-- ============================================================================
-- RPC FUNCTION 2: submit_shaagat_bank_details
-- Anon access: Submit bank details via token with tax_id verification
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_shaagat_bank_details(
  p_token TEXT,
  p_account_holder TEXT,
  p_bank_number TEXT,
  p_branch_number TEXT,
  p_account_number TEXT,
  p_verification_tax_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_id UUID;
  v_client_tax_id TEXT;
BEGIN
  -- Verify token and get client tax_id
  SELECT bd.id, c.tax_id INTO v_bank_id, v_client_tax_id
  FROM shaagat_bank_details bd
  JOIN clients c ON bd.client_id = c.id
  WHERE bd.access_token = p_token
    AND bd.token_expires_at > NOW()
    AND bd.submitted_at IS NULL;

  IF v_bank_id IS NULL THEN
    RETURN '{"error": "invalid_or_expired_token"}'::JSONB;
  END IF;

  -- Verify tax_id matches
  IF v_client_tax_id != p_verification_tax_id THEN
    RETURN '{"error": "tax_id_mismatch"}'::JSONB;
  END IF;

  -- Update bank details
  UPDATE shaagat_bank_details SET
    account_holder_name = p_account_holder,
    bank_number = p_bank_number,
    branch_number = p_branch_number,
    account_number = p_account_number,
    verification_tax_id = p_verification_tax_id,
    is_verified = TRUE,
    submitted_at = NOW()
  WHERE id = v_bank_id;

  RETURN '{"success": true}'::JSONB;
END;
$$;


-- ============================================================================
-- RPC FUNCTION 3: get_shaagat_accounting_form_by_token
-- Anon access: Retrieve accounting form data via token
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_shaagat_accounting_form_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', acs.id,
    'client_name', c.company_name,
    'salary_period', acs.salary_period,
    'is_submitted', acs.submitted_by_email IS NOT NULL
  ) INTO v_result
  FROM shaagat_accounting_submissions acs
  JOIN clients c ON acs.client_id = c.id
  WHERE acs.submission_token = p_token
    AND acs.token_expires_at > NOW();

  RETURN COALESCE(v_result, '{"error": "invalid_or_expired_token"}'::JSONB);
END;
$$;


-- ============================================================================
-- RPC FUNCTION 4: get_shaagat_approval_by_token
-- Anon access: Retrieve grant approval data via token
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_shaagat_approval_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', dc.id,
    'client_name', c.company_name,
    'fixed_expenses_grant', dc.fixed_expenses_grant,
    'salary_grant', dc.salary_grant,
    'final_grant_amount', dc.final_grant_amount,
    'is_approved', dc.client_approved IS NOT NULL,
    'track_type', dc.track_type
  ) INTO v_result
  FROM shaagat_detailed_calculations dc
  JOIN clients c ON dc.client_id = c.id
  WHERE dc.approval_token = p_token
    AND dc.approval_token_expires_at > NOW();

  RETURN COALESCE(v_result, '{"error": "invalid_or_expired_token"}'::JSONB);
END;
$$;


-- ============================================================================
-- RPC FUNCTION 5: get_shaagat_dashboard_stats
-- Authenticated access: Dashboard aggregation stats for a tenant
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_shaagat_dashboard_stats(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller has access to tenant
  IF NOT EXISTS (
    SELECT 1 FROM user_tenant_access
    WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
  ) AND NOT is_super_admin(auth.uid()) THEN
    RETURN '{"error": "unauthorized"}'::JSONB;
  END IF;

  SELECT jsonb_build_object(
    'total_clients', COUNT(*),
    'eligible', COUNT(*) FILTER (WHERE ec.eligibility_status = 'ELIGIBLE'),
    'not_eligible', COUNT(*) FILTER (WHERE ec.eligibility_status = 'NOT_ELIGIBLE'),
    'gray_area', COUNT(*) FILTER (WHERE ec.eligibility_status = 'GRAY_AREA'),
    'paid', COUNT(*) FILTER (WHERE ec.payment_status = 'PAID'),
    'calculations_completed', (
      SELECT COUNT(*) FROM shaagat_detailed_calculations dc
      WHERE dc.tenant_id = p_tenant_id AND dc.is_completed = true AND dc.is_active = true
    ),
    'submitted_to_tax', (
      SELECT COUNT(*) FROM shaagat_tax_submissions ts
      WHERE ts.tenant_id = p_tenant_id AND ts.status != 'CLOSED'
    ),
    'pending_deadlines', (
      SELECT COUNT(*) FROM shaagat_tax_submissions ts
      WHERE ts.tenant_id = p_tenant_id
        AND ts.is_closed = false
        AND (
          ts.advance_due_date <= CURRENT_DATE + INTERVAL '7 days'
          OR ts.determination_due_date <= CURRENT_DATE + INTERVAL '7 days'
          OR ts.full_payment_due_date <= CURRENT_DATE + INTERVAL '7 days'
        )
    ),
    'total_expected_amount', (
      SELECT COALESCE(SUM(ts.expected_amount), 0)
      FROM shaagat_tax_submissions ts
      WHERE ts.tenant_id = p_tenant_id AND ts.is_closed = false
    ),
    'total_received_amount', (
      SELECT COALESCE(SUM(ts.received_amount), 0)
      FROM shaagat_tax_submissions ts
      WHERE ts.tenant_id = p_tenant_id
    )
  ) INTO v_result
  FROM shaagat_eligibility_checks ec
  WHERE ec.tenant_id = p_tenant_id AND ec.is_active = true;

  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$;


-- ============================================================================
-- VIEW: shaagat_dashboard_view
-- Security invoker = true: uses the calling user's RLS policies
-- Joins eligibility → calculation → submission for dashboard display
-- ============================================================================
CREATE OR REPLACE VIEW shaagat_dashboard_view
WITH (security_invoker = true)
AS
SELECT
  ec.id AS eligibility_check_id,
  ec.tenant_id,
  ec.client_id,
  c.company_name,
  c.tax_id,
  ec.track_type,
  ec.business_type,
  ec.reporting_type,
  ec.eligibility_status,
  ec.decline_percentage,
  ec.compensation_rate,
  ec.payment_status,
  ec.email_sent,
  ec.is_relevant,
  ec.created_at AS check_date,
  -- Calculation info
  dc.id AS calculation_id,
  dc.is_completed AS calculation_completed,
  dc.final_grant_amount,
  dc.client_approved,
  dc.calculation_step,
  -- Submission info
  ts.id AS submission_id,
  ts.status AS submission_status,
  ts.submission_number,
  ts.expected_amount,
  ts.received_amount,
  ts.advance_due_date,
  ts.determination_due_date,
  ts.full_payment_due_date,
  -- Pending letters count
  (SELECT COUNT(*) FROM shaagat_tax_letters tl
   WHERE tl.submission_id = ts.id AND tl.status = 'PENDING') AS pending_letters_count
FROM shaagat_eligibility_checks ec
JOIN clients c ON ec.client_id = c.id
LEFT JOIN shaagat_detailed_calculations dc ON dc.eligibility_check_id = ec.id AND dc.is_active = true
LEFT JOIN shaagat_tax_submissions ts ON ts.calculation_id = dc.id AND ts.is_closed = false
WHERE ec.is_active = true;


-- ============================================================================
-- DONE
-- ============================================================================
