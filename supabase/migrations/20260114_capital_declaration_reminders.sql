-- Capital Declaration Reminder System
-- Migration: 20260114_capital_declaration_reminders.sql
-- Purpose: Add tables and columns for automated capital declaration reminders

-- ============================================================================
-- TABLE: capital_declaration_reminder_settings
-- Per-tenant settings for reminder automation
-- ============================================================================
CREATE TABLE IF NOT EXISTS capital_declaration_reminder_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Client Reminder Settings
    enable_client_reminders BOOLEAN NOT NULL DEFAULT TRUE,
    client_reminder_frequency_days INTEGER NOT NULL DEFAULT 9,

    -- Weekly Report Settings
    enable_weekly_report BOOLEAN NOT NULL DEFAULT TRUE,
    weekly_report_email TEXT,

    -- Banner tracking
    show_weekly_banner BOOLEAN NOT NULL DEFAULT FALSE,
    banner_triggered_at TIMESTAMPTZ,
    last_banner_dismissed_at TIMESTAMPTZ,
    last_banner_dismissed_by UUID REFERENCES auth.users(id),

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT capital_declaration_reminder_settings_tenant_unique UNIQUE(tenant_id)
);

-- Comments
COMMENT ON TABLE capital_declaration_reminder_settings IS 'Per-tenant settings for capital declaration automated reminders';
COMMENT ON COLUMN capital_declaration_reminder_settings.client_reminder_frequency_days IS 'Days between automatic client reminders (default: 9)';
COMMENT ON COLUMN capital_declaration_reminder_settings.weekly_report_email IS 'Email address for weekly report (manager responsible for capital declarations)';
COMMENT ON COLUMN capital_declaration_reminder_settings.show_weekly_banner IS 'Flag set by weekly report edge function to show banner';
COMMENT ON COLUMN capital_declaration_reminder_settings.banner_triggered_at IS 'When the banner was last triggered by weekly report';
COMMENT ON COLUMN capital_declaration_reminder_settings.last_banner_dismissed_at IS 'When user dismissed the banner';

-- Index
CREATE INDEX IF NOT EXISTS idx_cd_reminder_settings_tenant
    ON capital_declaration_reminder_settings(tenant_id);

-- ============================================================================
-- TABLE: capital_declaration_reminders
-- Log of all reminders sent for audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS capital_declaration_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    declaration_id UUID NOT NULL REFERENCES capital_declarations(id) ON DELETE CASCADE,

    -- Reminder details
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('client_auto', 'weekly_report', 'manual')),
    reminder_sequence INTEGER,

    -- Delivery
    sent_via TEXT CHECK (sent_via IN ('email', 'whatsapp')),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_to_email TEXT,

    -- Email tracking
    email_opened BOOLEAN NOT NULL DEFAULT FALSE,
    email_opened_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE capital_declaration_reminders IS 'Audit log of all reminders sent for capital declarations';
COMMENT ON COLUMN capital_declaration_reminders.reminder_type IS 'Type: client_auto (9-day cycle), weekly_report, manual';
COMMENT ON COLUMN capital_declaration_reminders.reminder_sequence IS 'Sequence number (1st, 2nd, 3rd reminder, etc.)';
COMMENT ON COLUMN capital_declaration_reminders.sent_to_email IS 'Email address the reminder was sent to';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cd_reminders_declaration
    ON capital_declaration_reminders(declaration_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_cd_reminders_tenant_type
    ON capital_declaration_reminders(tenant_id, reminder_type, sent_at DESC);

-- ============================================================================
-- ALTER: Add reminder tracking columns to capital_declarations
-- ============================================================================
ALTER TABLE capital_declarations
    ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS next_reminder_due_at TIMESTAMPTZ;

-- Comments
COMMENT ON COLUMN capital_declarations.reminder_count IS 'Total number of reminders sent for this declaration';
COMMENT ON COLUMN capital_declarations.last_reminder_sent_at IS 'Timestamp of last reminder sent';
COMMENT ON COLUMN capital_declarations.next_reminder_due_at IS 'Calculated next reminder date (for efficient querying)';

-- Index for finding declarations needing reminders
CREATE INDEX IF NOT EXISTS idx_cd_next_reminder
    ON capital_declarations(tenant_id, next_reminder_due_at)
    WHERE next_reminder_due_at IS NOT NULL;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE capital_declaration_reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE capital_declaration_reminders ENABLE ROW LEVEL SECURITY;

-- Settings policies
CREATE POLICY "tenant_isolation_cd_reminder_settings_select"
    ON capital_declaration_reminder_settings
    FOR SELECT
    USING (tenant_id = (SELECT public.get_current_tenant_id()));

CREATE POLICY "tenant_isolation_cd_reminder_settings_insert"
    ON capital_declaration_reminder_settings
    FOR INSERT
    WITH CHECK (tenant_id = (SELECT public.get_current_tenant_id()));

CREATE POLICY "tenant_isolation_cd_reminder_settings_update"
    ON capital_declaration_reminder_settings
    FOR UPDATE
    USING (tenant_id = (SELECT public.get_current_tenant_id()));

CREATE POLICY "tenant_isolation_cd_reminder_settings_delete"
    ON capital_declaration_reminder_settings
    FOR DELETE
    USING (tenant_id = (SELECT public.get_current_tenant_id()));

-- Reminders log policies
CREATE POLICY "tenant_isolation_cd_reminders_select"
    ON capital_declaration_reminders
    FOR SELECT
    USING (tenant_id = (SELECT public.get_current_tenant_id()));

CREATE POLICY "tenant_isolation_cd_reminders_insert"
    ON capital_declaration_reminders
    FOR INSERT
    WITH CHECK (tenant_id = (SELECT public.get_current_tenant_id()));

-- ============================================================================
-- Trigger: Update updated_at on settings change
-- ============================================================================
CREATE OR REPLACE FUNCTION update_cd_reminder_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cd_reminder_settings_updated_at ON capital_declaration_reminder_settings;
CREATE TRIGGER trigger_cd_reminder_settings_updated_at
    BEFORE UPDATE ON capital_declaration_reminder_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_cd_reminder_settings_updated_at();

-- ============================================================================
-- Function: Get or create reminder settings for tenant
-- ============================================================================
CREATE OR REPLACE FUNCTION get_or_create_cd_reminder_settings(p_tenant_id UUID)
RETURNS capital_declaration_reminder_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_settings capital_declaration_reminder_settings;
BEGIN
    -- Try to get existing settings
    SELECT * INTO v_settings
    FROM capital_declaration_reminder_settings
    WHERE tenant_id = p_tenant_id;

    -- If not found, create with defaults
    IF v_settings IS NULL THEN
        INSERT INTO capital_declaration_reminder_settings (tenant_id)
        VALUES (p_tenant_id)
        RETURNING * INTO v_settings;
    END IF;

    RETURN v_settings;
END;
$$;

COMMENT ON FUNCTION get_or_create_cd_reminder_settings IS 'Get or create default reminder settings for a tenant';

-- ============================================================================
-- Function: Get declarations needing reminders
-- Used by the Edge Function to find declarations due for reminder
-- ============================================================================
CREATE OR REPLACE FUNCTION get_declarations_needing_reminders(
    p_tenant_id UUID,
    p_frequency_days INTEGER DEFAULT 9
)
RETURNS TABLE (
    declaration_id UUID,
    contact_name TEXT,
    contact_email TEXT,
    tax_year INTEGER,
    declaration_date DATE,
    portal_link TEXT,
    reminder_count INTEGER,
    last_reminder_sent_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cd.id AS declaration_id,
        cd.contact_name,
        cd.contact_email,
        cd.tax_year,
        cd.declaration_date,
        'https://tico.franco.co.il/capital-declaration/' || cd.public_token AS portal_link,
        cd.reminder_count,
        cd.last_reminder_sent_at
    FROM capital_declarations cd
    WHERE cd.tenant_id = p_tenant_id
      -- Has email
      AND cd.contact_email IS NOT NULL
      AND cd.contact_email != ''
      -- Not in terminal/review statuses
      AND cd.status NOT IN ('draft', 'documents_received', 'reviewing', 'in_preparation', 'pending_approval', 'submitted')
      -- Due for reminder (never sent OR interval passed)
      AND (
          cd.last_reminder_sent_at IS NULL
          OR cd.last_reminder_sent_at < NOW() - (p_frequency_days || ' days')::INTERVAL
      )
    ORDER BY cd.last_reminder_sent_at NULLS FIRST, cd.created_at;
END;
$$;

COMMENT ON FUNCTION get_declarations_needing_reminders IS 'Get capital declarations due for automatic reminder email';

-- ============================================================================
-- Function: Get declaration status counts for weekly report
-- ============================================================================
CREATE OR REPLACE FUNCTION get_cd_status_counts(p_tenant_id UUID)
RETURNS TABLE (
    status TEXT,
    count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cd.status,
        COUNT(*)::BIGINT AS count
    FROM capital_declarations cd
    WHERE cd.tenant_id = p_tenant_id
      AND cd.status != 'submitted'
    GROUP BY cd.status
    ORDER BY
        CASE cd.status
            WHEN 'sent' THEN 1
            WHEN 'in_progress' THEN 2
            WHEN 'waiting_documents' THEN 3
            WHEN 'documents_received' THEN 4
            WHEN 'reviewing' THEN 5
            WHEN 'in_preparation' THEN 6
            WHEN 'pending_approval' THEN 7
            WHEN 'waiting' THEN 8
            WHEN 'draft' THEN 9
            ELSE 10
        END;
END;
$$;

COMMENT ON FUNCTION get_cd_status_counts IS 'Get count of capital declarations by status for weekly report';

-- ============================================================================
-- Success message
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Capital Declaration Reminder System - Migration Complete';
    RAISE NOTICE '=================================================';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  - capital_declaration_reminder_settings';
    RAISE NOTICE '  - capital_declaration_reminders';
    RAISE NOTICE 'Columns added to capital_declarations:';
    RAISE NOTICE '  - reminder_count';
    RAISE NOTICE '  - last_reminder_sent_at';
    RAISE NOTICE '  - next_reminder_due_at';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  - get_or_create_cd_reminder_settings()';
    RAISE NOTICE '  - get_declarations_needing_reminders()';
    RAISE NOTICE '  - get_cd_status_counts()';
    RAISE NOTICE '=================================================';
END $$;
