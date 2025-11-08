-- Migration 084: Migrate Existing Contacts to Shared System
-- Description: Deduplicate and migrate data from client_contacts to tenant_contacts
-- Date: 2025-11-08
-- Author: Claude Code

-- ==============================================
-- MIGRATION FUNCTION
-- Description: Migrates existing client_contacts to shared system
-- Deduplicates by email/phone, creates assignments
-- ==============================================

CREATE OR REPLACE FUNCTION migrate_to_shared_contacts()
RETURNS TABLE(
  tenant_id UUID,
  original_count INTEGER,
  unique_contacts_created INTEGER,
  assignments_created INTEGER,
  duplicates_merged INTEGER
) AS $$
DECLARE
  t_id UUID;
  original_cnt INTEGER;
  unique_cnt INTEGER;
  assignments_cnt INTEGER;
BEGIN
  -- Process each tenant separately
  FOR t_id IN SELECT DISTINCT cc.tenant_id FROM client_contacts cc LOOP

    -- Count original contacts for this tenant
    SELECT COUNT(*)::INTEGER INTO original_cnt
    FROM client_contacts cc
    WHERE cc.tenant_id = t_id;

    -- Step 1: Insert unique contacts into tenant_contacts
    -- Deduplicate by email OR phone (prioritize oldest record)
    INSERT INTO tenant_contacts (
      tenant_id,
      full_name,
      email,
      phone,
      contact_type,
      job_title,
      notes,
      created_at,
      updated_at,
      created_by
    )
    SELECT DISTINCT ON (
      COALESCE(LOWER(TRIM(email)), 'no-email-' || gen_random_uuid()::TEXT),
      COALESCE(TRIM(phone), 'no-phone-' || gen_random_uuid()::TEXT)
    )
      cc.tenant_id,
      TRIM(cc.full_name) as full_name,
      NULLIF(TRIM(LOWER(cc.email)), '') as email,
      NULLIF(TRIM(cc.phone), '') as phone,
      cc.contact_type,
      cc.position,
      cc.notes,
      cc.created_at,
      cc.updated_at,
      cc.created_by
    FROM client_contacts cc
    WHERE cc.tenant_id = t_id
      AND (
        (cc.email IS NOT NULL AND TRIM(cc.email) != '') OR
        (cc.phone IS NOT NULL AND TRIM(cc.phone) != '')
      )
    ORDER BY
      COALESCE(LOWER(TRIM(email)), 'no-email-' || gen_random_uuid()::TEXT),
      COALESCE(TRIM(phone), 'no-phone-' || gen_random_uuid()::TEXT),
      cc.created_at ASC -- Keep oldest record in case of duplicates
    ON CONFLICT (tenant_id, email) DO NOTHING
    ON CONFLICT (tenant_id, phone) DO NOTHING;

    -- Count unique contacts created
    SELECT COUNT(*)::INTEGER INTO unique_cnt
    FROM tenant_contacts tc
    WHERE tc.tenant_id = t_id;

    -- Step 2: Create assignments (link contacts to clients)
    -- Match by email OR phone
    INSERT INTO client_contact_assignments (
      client_id,
      contact_id,
      is_primary,
      email_preference,
      role_at_client,
      notes,
      created_at,
      updated_at,
      created_by
    )
    SELECT
      cc.client_id,
      tc.id as contact_id,
      cc.is_primary,
      cc.email_preference,
      cc.position as role_at_client, -- Use position as role_at_client
      cc.notes,
      cc.created_at,
      cc.updated_at,
      cc.created_by
    FROM client_contacts cc
    JOIN tenant_contacts tc ON (
      tc.tenant_id = cc.tenant_id
      AND (
        -- Match by email (case-insensitive)
        (
          tc.email IS NOT NULL
          AND cc.email IS NOT NULL
          AND LOWER(TRIM(tc.email)) = LOWER(TRIM(cc.email))
        )
        OR
        -- Match by phone (exact match)
        (
          tc.phone IS NOT NULL
          AND cc.phone IS NOT NULL
          AND TRIM(tc.phone) = TRIM(cc.phone)
        )
      )
    )
    WHERE cc.tenant_id = t_id
    ON CONFLICT (client_id, contact_id) DO NOTHING; -- Skip if already assigned

    -- Count assignments created
    SELECT COUNT(*)::INTEGER INTO assignments_cnt
    FROM client_contact_assignments cca
    JOIN tenant_contacts tc ON cca.contact_id = tc.id
    WHERE tc.tenant_id = t_id;

    -- Return statistics for this tenant
    RETURN QUERY
    SELECT
      t_id,
      original_cnt,
      unique_cnt,
      assignments_cnt,
      (original_cnt - unique_cnt)::INTEGER as duplicates_merged;

  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_to_shared_contacts IS 'Migrates client_contacts to shared system with deduplication - SAFE TO RUN MULTIPLE TIMES';

-- ==============================================
-- VERIFICATION FUNCTIONS
-- ==============================================

-- Function: Compare old vs new contact system
CREATE OR REPLACE FUNCTION verify_contacts_migration()
RETURNS TABLE(
  metric TEXT,
  old_system_count BIGINT,
  new_system_count BIGINT,
  difference BIGINT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      (SELECT COUNT(*) FROM client_contacts) as old_contacts,
      (SELECT COUNT(*) FROM tenant_contacts) as new_contacts,
      (SELECT COUNT(*) FROM client_contact_assignments) as assignments,
      (SELECT COUNT(DISTINCT tenant_id) FROM client_contacts) as tenants
  )
  SELECT
    'Total Contacts'::TEXT as metric,
    stats.old_contacts,
    stats.new_contacts,
    stats.old_contacts - stats.new_contacts as difference,
    CASE
      WHEN stats.new_contacts > 0 THEN '✅ Migration completed'
      ELSE '⚠️ Not migrated yet'
    END as status
  FROM stats
  UNION ALL
  SELECT
    'Assignments Created'::TEXT,
    stats.old_contacts,
    stats.assignments,
    stats.old_contacts - stats.assignments,
    CASE
      WHEN stats.assignments >= stats.old_contacts THEN '✅ All assigned'
      WHEN stats.assignments > 0 THEN '⚠️ Partial assignments'
      ELSE '❌ No assignments'
    END
  FROM stats
  UNION ALL
  SELECT
    'Duplicates Removed'::TEXT,
    stats.old_contacts,
    stats.new_contacts,
    stats.old_contacts - stats.new_contacts,
    CASE
      WHEN stats.old_contacts - stats.new_contacts > 0
        THEN '✅ ' || (stats.old_contacts - stats.new_contacts)::TEXT || ' duplicates merged'
      ELSE 'ℹ️ No duplicates found'
    END
  FROM stats;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION verify_contacts_migration IS 'Verification report: compares old vs new contact system';

-- Function: Find contacts that appear in multiple clients (shared contacts)
CREATE OR REPLACE FUNCTION find_shared_contacts()
RETURNS TABLE(
  contact_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  contact_type contact_type,
  job_title TEXT,
  client_count BIGINT,
  client_names TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id as contact_id,
    tc.full_name,
    tc.email,
    tc.phone,
    tc.contact_type,
    tc.job_title,
    COUNT(cca.client_id) as client_count,
    STRING_AGG(c.company_name, ', ' ORDER BY c.company_name) as client_names
  FROM tenant_contacts tc
  JOIN client_contact_assignments cca ON tc.id = cca.contact_id
  JOIN clients c ON cca.client_id = c.id
  GROUP BY tc.id
  HAVING COUNT(cca.client_id) > 1
  ORDER BY COUNT(cca.client_id) DESC, tc.full_name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION find_shared_contacts IS 'Find contacts assigned to multiple clients (most valuable use case)';

-- ==============================================
-- DEPRECATION PREPARATION
-- ==============================================

-- View: client_contacts_legacy (backward compatibility)
-- Allows old queries to still work while we transition
CREATE OR REPLACE VIEW client_contacts_legacy AS
SELECT
  cca.id,
  tc.tenant_id,
  cca.client_id,
  tc.contact_type,
  tc.full_name,
  tc.email,
  tc.phone,
  COALESCE(cca.role_at_client, tc.job_title) as job_title,
  cca.is_primary,
  true as is_active, -- Always true in new system
  cca.email_preference::TEXT,
  cca.notes,
  cca.created_at,
  cca.updated_at,
  cca.created_by
FROM client_contact_assignments cca
JOIN tenant_contacts tc ON cca.contact_id = tc.id;

COMMENT ON VIEW client_contacts_legacy IS 'Backward compatibility view - mimics old client_contacts structure';

-- ==============================================
-- MIGRATION NOTES
-- ==============================================

-- To run migration:
-- SELECT * FROM migrate_to_shared_contacts();

-- To verify migration:
-- SELECT * FROM verify_contacts_migration();

-- To find shared contacts:
-- SELECT * FROM find_shared_contacts();

-- To check a specific contact's assignments:
-- SELECT * FROM get_client_contacts_detailed('client-id-here');

-- Expected Results from backup analysis:
-- - 15 original contacts
-- - ~8-10 unique contacts after deduplication
-- - 15 assignments created (all original contacts linked to their clients)
-- - ~5-7 duplicates merged (תומר לרר x5, רונית ויונטה x2, etc.)
