-- Migration: Make primary_owner nullable in client_groups
-- Reason: Contacts are now managed via group_contact_assignments table (migration 110)
--         Groups can be created first, contacts added afterward

-- Remove NOT NULL constraint
ALTER TABLE client_groups
  ALTER COLUMN primary_owner DROP NOT NULL;

-- Set default empty string for new groups
ALTER TABLE client_groups
  ALTER COLUMN primary_owner SET DEFAULT '';

-- Document the change
COMMENT ON COLUMN client_groups.primary_owner IS
  'Legacy field - primary owner display name. Use group_contact_assignments for full contact management.';
