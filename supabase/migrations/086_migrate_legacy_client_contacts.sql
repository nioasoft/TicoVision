-- Migration 086: Migrate Legacy Client Contacts to Shared Contacts System
-- Date: 2025-11-08
-- Purpose: Fix clients created without contacts in client_contact_assignments
-- Root Cause: TenantContactService.createOrGet() was missing tenant_id, causing silent failures

-- This migration finds all clients with contact_email but no assigned contacts,
-- then creates the contacts in tenant_contacts and assignments in client_contact_assignments.

DO $$
DECLARE
  client_record RECORD;
  new_contact_id UUID;
  existing_contact_id UUID;
  migrated_count INT := 0;
BEGIN
  -- Loop through all clients with contact_email but no contact assignments
  FOR client_record IN
    SELECT
      c.id as client_id,
      c.tenant_id,
      c.company_name,
      c.contact_name,
      c.contact_email,
      c.contact_phone,
      c.accountant_name,
      c.accountant_email,
      c.accountant_phone
    FROM clients c
    WHERE c.contact_email IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM client_contact_assignments cca
      WHERE cca.client_id = c.id
    )
  LOOP
    RAISE NOTICE 'Migrating contacts for client: % (ID: %)', client_record.company_name, client_record.client_id;

    -- 1. Create or find OWNER contact
    IF client_record.contact_name IS NOT NULL AND client_record.contact_email IS NOT NULL THEN
      -- Check if contact already exists by email OR phone
      SELECT id INTO existing_contact_id
      FROM tenant_contacts
      WHERE tenant_id = client_record.tenant_id
      AND (
        email = client_record.contact_email
        OR (client_record.contact_phone IS NOT NULL AND phone = client_record.contact_phone)
      )
      LIMIT 1;

      IF existing_contact_id IS NULL THEN
        -- Create new owner contact
        INSERT INTO tenant_contacts (
          tenant_id,
          full_name,
          email,
          phone,
          contact_type,
          job_title
        ) VALUES (
          client_record.tenant_id,
          client_record.contact_name,
          client_record.contact_email,
          client_record.contact_phone,
          'owner'::contact_type,
          'איש קשר מהותי'
        ) RETURNING id INTO new_contact_id;

        RAISE NOTICE '  ✅ Created owner contact: % (ID: %)', client_record.contact_name, new_contact_id;
      ELSE
        new_contact_id := existing_contact_id;
        RAISE NOTICE '  ✅ Found existing owner contact: % (ID: %)', client_record.contact_name, existing_contact_id;
      END IF;

      -- Create assignment
      INSERT INTO client_contact_assignments (
        client_id,
        contact_id,
        is_primary,
        email_preference,
        role_at_client
      ) VALUES (
        client_record.client_id,
        new_contact_id,
        true, -- Owner is primary contact
        'all', -- Default: receives all emails
        'בעל הבית'
      );

      RAISE NOTICE '  ✅ Assigned owner to client';
    END IF;

    -- 2. Create or find ACCOUNTANT contact (if exists)
    IF client_record.accountant_name IS NOT NULL AND client_record.accountant_email IS NOT NULL THEN
      -- Check if contact already exists by email OR phone
      SELECT id INTO existing_contact_id
      FROM tenant_contacts
      WHERE tenant_id = client_record.tenant_id
      AND (
        email = client_record.accountant_email
        OR (client_record.accountant_phone IS NOT NULL AND phone = client_record.accountant_phone)
      )
      LIMIT 1;

      IF existing_contact_id IS NULL THEN
        -- Create new accountant contact
        INSERT INTO tenant_contacts (
          tenant_id,
          full_name,
          email,
          phone,
          contact_type,
          job_title
        ) VALUES (
          client_record.tenant_id,
          client_record.accountant_name,
          client_record.accountant_email,
          client_record.accountant_phone,
          'accountant_manager'::contact_type,
          'מנהלת חשבונות'
        ) RETURNING id INTO new_contact_id;

        RAISE NOTICE '  ✅ Created accountant contact: % (ID: %)', client_record.accountant_name, new_contact_id;
      ELSE
        new_contact_id := existing_contact_id;
        RAISE NOTICE '  ✅ Found existing accountant contact: % (ID: %)', client_record.accountant_name, existing_contact_id;
      END IF;

      -- Create assignment
      INSERT INTO client_contact_assignments (
        client_id,
        contact_id,
        is_primary,
        email_preference,
        role_at_client
      ) VALUES (
        client_record.client_id,
        new_contact_id,
        false, -- Accountant is not primary
        'all', -- Default: receives all emails
        'מנהלת חשבונות'
      );

      RAISE NOTICE '  ✅ Assigned accountant to client';
    END IF;

    migrated_count := migrated_count + 1;
  END LOOP;

  RAISE NOTICE '✅ Migration complete! Migrated % clients', migrated_count;
END $$;

-- Verify results
DO $$
DECLARE
  total_clients INT;
  clients_with_contacts INT;
  clients_without_contacts INT;
BEGIN
  SELECT COUNT(*) INTO total_clients FROM clients WHERE contact_email IS NOT NULL;

  SELECT COUNT(DISTINCT client_id) INTO clients_with_contacts
  FROM client_contact_assignments
  WHERE client_id IN (SELECT id FROM clients WHERE contact_email IS NOT NULL);

  clients_without_contacts := total_clients - clients_with_contacts;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Migration Results:';
  RAISE NOTICE '  Total clients with contact_email: %', total_clients;
  RAISE NOTICE '  Clients with assigned contacts: %', clients_with_contacts;
  RAISE NOTICE '  Clients still missing contacts: %', clients_without_contacts;

  IF clients_without_contacts > 0 THEN
    RAISE WARNING '⚠️ Some clients still missing contacts! Check logs for errors.';
  ELSE
    RAISE NOTICE '✅ All clients now have assigned contacts!';
  END IF;
END $$;
