-- Migration 110: Group Contacts System
-- Description: Extends the shared contacts system (tenant_contacts) to support group ownership tracking
-- Replaces comma-separated primary_owner/secondary_owners with proper contact assignments
-- Includes automatic migration of existing group owner data

-- ============================================================================
-- 1. Create group_contact_assignments table
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_contact_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  group_id UUID NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES tenant_contacts(id) ON DELETE CASCADE,

  -- Assignment metadata
  is_primary BOOLEAN DEFAULT false NOT NULL, -- Primary controlling owner
  notes TEXT,

  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT unique_group_contact UNIQUE(group_id, contact_id),
  CONSTRAINT one_primary_per_group UNIQUE NULLS NOT DISTINCT (group_id, is_primary) DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- 2. Indexes for performance
-- ============================================================================
CREATE INDEX idx_group_assignments_group ON group_contact_assignments(group_id);
CREATE INDEX idx_group_assignments_contact ON group_contact_assignments(contact_id);
CREATE INDEX idx_group_assignments_primary ON group_contact_assignments(group_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_group_assignments_tenant ON group_contact_assignments(group_id)
  INCLUDE (contact_id, is_primary);

-- ============================================================================
-- 3. Enable RLS
-- ============================================================================
ALTER TABLE group_contact_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant isolation via group membership
CREATE POLICY group_assignments_tenant_isolation ON group_contact_assignments
  FOR ALL
  USING (
    group_id IN (
      SELECT cg.id
      FROM client_groups cg
      WHERE cg.tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::UUID
    )
  );

-- ============================================================================
-- 4. Helper function: Get group contacts with full details
-- ============================================================================
CREATE OR REPLACE FUNCTION get_group_contacts_detailed(
  p_group_id UUID
)
RETURNS TABLE(
  assignment_id UUID,
  contact_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  contact_type contact_type,
  job_title TEXT,
  is_primary BOOLEAN,
  notes TEXT,
  other_groups_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gca.id as assignment_id,
    tc.id as contact_id,
    tc.full_name,
    tc.email,
    tc.phone,
    tc.contact_type,
    tc.job_title,
    gca.is_primary,
    gca.notes,
    (
      SELECT COUNT(*)::BIGINT
      FROM group_contact_assignments gca2
      WHERE gca2.contact_id = tc.id AND gca2.group_id != p_group_id
    ) as other_groups_count,
    gca.created_at
  FROM group_contact_assignments gca
  JOIN tenant_contacts tc ON gca.contact_id = tc.id
  WHERE gca.group_id = p_group_id
  ORDER BY gca.is_primary DESC NULLS LAST, tc.full_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_group_contacts_detailed IS
  'Returns all contacts assigned to a group with full details and reuse count';

-- ============================================================================
-- 5. Migration function: Convert existing group owners to contacts
-- ============================================================================
CREATE OR REPLACE FUNCTION migrate_existing_group_owners()
RETURNS TABLE(
  group_id UUID,
  primary_owner_created BOOLEAN,
  secondary_owners_created INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  v_group RECORD;
  v_tenant_id UUID;
  v_contact_id UUID;
  v_secondary_owner TEXT;
  v_error_messages TEXT[] := ARRAY[]::TEXT[];
  v_primary_created BOOLEAN;
  v_secondary_count INTEGER;
BEGIN
  -- Process each group
  FOR v_group IN
    SELECT
      id,
      tenant_id,
      primary_owner,
      secondary_owners
    FROM client_groups
    WHERE primary_owner IS NOT NULL
       OR (secondary_owners IS NOT NULL AND array_length(secondary_owners, 1) > 0)
  LOOP
    v_tenant_id := v_group.tenant_id;
    v_primary_created := FALSE;
    v_secondary_count := 0;
    v_error_messages := ARRAY[]::TEXT[];

    -- ========================================================================
    -- 5.1 Migrate primary_owner
    -- ========================================================================
    IF v_group.primary_owner IS NOT NULL AND trim(v_group.primary_owner) != '' THEN
      BEGIN
        -- Check if contact already exists in tenant_contacts
        SELECT id INTO v_contact_id
        FROM tenant_contacts
        WHERE tenant_id = v_tenant_id
          AND full_name = trim(v_group.primary_owner)
        LIMIT 1;

        -- If not exists, create new contact
        IF v_contact_id IS NULL THEN
          INSERT INTO tenant_contacts (
            tenant_id,
            full_name,
            contact_type
          ) VALUES (
            v_tenant_id,
            trim(v_group.primary_owner),
            'owner'
          )
          RETURNING id INTO v_contact_id;
        END IF;

        -- Create assignment (primary owner)
        INSERT INTO group_contact_assignments (
          group_id,
          contact_id,
          is_primary,
          notes
        ) VALUES (
          v_group.id,
          v_contact_id,
          true, -- This is the primary owner
          'מומר אוטומטית ממערכת ישנה'
        )
        ON CONFLICT (group_id, contact_id) DO NOTHING;

        v_primary_created := TRUE;

      EXCEPTION WHEN OTHERS THEN
        v_error_messages := array_append(v_error_messages,
          'Primary owner error: ' || SQLERRM);
      END;
    END IF;

    -- ========================================================================
    -- 5.2 Migrate secondary_owners array
    -- ========================================================================
    IF v_group.secondary_owners IS NOT NULL THEN
      FOREACH v_secondary_owner IN ARRAY v_group.secondary_owners
      LOOP
        IF trim(v_secondary_owner) != '' THEN
          BEGIN
            -- Check if contact already exists
            SELECT id INTO v_contact_id
            FROM tenant_contacts
            WHERE tenant_id = v_tenant_id
              AND full_name = trim(v_secondary_owner)
            LIMIT 1;

            -- If not exists, create new contact
            IF v_contact_id IS NULL THEN
              INSERT INTO tenant_contacts (
                tenant_id,
                full_name,
                contact_type
              ) VALUES (
                v_tenant_id,
                trim(v_secondary_owner),
                'owner'
              )
              RETURNING id INTO v_contact_id;
            END IF;

            -- Create assignment (not primary)
            INSERT INTO group_contact_assignments (
              group_id,
              contact_id,
              is_primary,
              notes
            ) VALUES (
              v_group.id,
              v_contact_id,
              false, -- Secondary owner
              'מומר אוטומטית ממערכת ישנה'
            )
            ON CONFLICT (group_id, contact_id) DO NOTHING;

            v_secondary_count := v_secondary_count + 1;

          EXCEPTION WHEN OTHERS THEN
            v_error_messages := array_append(v_error_messages,
              'Secondary owner "' || v_secondary_owner || '" error: ' || SQLERRM);
          END;
        END IF;
      END LOOP;
    END IF;

    -- Return result for this group
    RETURN QUERY SELECT
      v_group.id,
      v_primary_created,
      v_secondary_count,
      v_error_messages;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_existing_group_owners IS
  'One-time migration: Converts existing primary_owner and secondary_owners[] to group_contact_assignments';

-- ============================================================================
-- 6. Execute migration automatically
-- ============================================================================
DO $$
DECLARE
  v_migration_result RECORD;
  v_total_groups INTEGER := 0;
  v_successful_primary INTEGER := 0;
  v_total_secondary INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting automatic migration of existing group owners...';

  -- Run migration
  FOR v_migration_result IN
    SELECT * FROM migrate_existing_group_owners()
  LOOP
    v_total_groups := v_total_groups + 1;

    IF v_migration_result.primary_owner_created THEN
      v_successful_primary := v_successful_primary + 1;
    END IF;

    v_total_secondary := v_total_secondary + v_migration_result.secondary_owners_created;

    -- Log errors if any
    IF array_length(v_migration_result.errors, 1) > 0 THEN
      RAISE WARNING 'Group % had errors: %',
        v_migration_result.group_id,
        array_to_string(v_migration_result.errors, '; ');
    END IF;
  END LOOP;

  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '  - Total groups processed: %', v_total_groups;
  RAISE NOTICE '  - Primary owners migrated: %', v_successful_primary;
  RAISE NOTICE '  - Secondary owners migrated: %', v_total_secondary;
  RAISE NOTICE '  - Total contacts created/assigned: %', v_successful_primary + v_total_secondary;
END;
$$;

-- ============================================================================
-- 7. Update trigger for updated_at
-- ============================================================================
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON group_contact_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. Comments for documentation
-- ============================================================================
COMMENT ON TABLE group_contact_assignments IS
  'Links groups to contacts from the shared tenant_contacts pool. Replaces the old primary_owner/secondary_owners text fields with proper contact management.';

COMMENT ON COLUMN group_contact_assignments.is_primary IS
  'Marks the primary controlling owner of the group. Only one contact per group can be primary (enforced by constraint).';

COMMENT ON COLUMN group_contact_assignments.notes IS
  'Group-specific notes about this contact (e.g., "מנהל תפעול", "בעל מניות 40%")';
