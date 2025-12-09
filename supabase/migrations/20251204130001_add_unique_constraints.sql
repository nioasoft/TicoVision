-- Migration: Add UNIQUE constraints to prevent duplicates
-- Date: 2024-12-04
-- Description: Prevents duplicate clients by tax_id and duplicate groups by name

-- ============================================
-- PART 1: Unique constraint on clients (tenant_id + tax_id)
-- ============================================
-- This prevents the same tax_id from being used twice within a tenant
ALTER TABLE clients
ADD CONSTRAINT clients_tenant_tax_id_unique
UNIQUE (tenant_id, tax_id);

-- ============================================
-- PART 2: Unique constraint on client_groups (tenant_id + group_name_hebrew)
-- ============================================
-- This prevents the same group name from being used twice within a tenant
ALTER TABLE client_groups
ADD CONSTRAINT client_groups_tenant_name_unique
UNIQUE (tenant_id, group_name_hebrew);
