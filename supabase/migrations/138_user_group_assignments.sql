-- Migration: Create user_group_assignments table for group-based client access
-- Purpose: Enable users to be assigned to client groups, automatically granting access to all clients in the group
-- Date: 2025-12-09

-- Create the user_group_assignments table
CREATE TABLE IF NOT EXISTS user_group_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique assignment per user-group-tenant combination
  UNIQUE(user_id, group_id, tenant_id)
);

-- Add indexes for performance
CREATE INDEX idx_user_group_assignments_user_id ON user_group_assignments(user_id);
CREATE INDEX idx_user_group_assignments_group_id ON user_group_assignments(group_id);
CREATE INDEX idx_user_group_assignments_tenant_id ON user_group_assignments(tenant_id);

-- Add table comment
COMMENT ON TABLE user_group_assignments IS
'Links users to client groups - provides automatic access to all clients in the group. Works in parallel with user_client_assignments for direct client access.';

COMMENT ON COLUMN user_group_assignments.user_id IS
'User who has access to the group';

COMMENT ON COLUMN user_group_assignments.group_id IS
'Client group the user can access';

COMMENT ON COLUMN user_group_assignments.tenant_id IS
'Tenant ID for multi-tenant isolation';

COMMENT ON COLUMN user_group_assignments.assigned_by IS
'Admin user who created this assignment';

-- Enable Row Level Security
ALTER TABLE user_group_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admins see all assignments
CREATE POLICY "super_admins_all_access_group_assignments"
ON user_group_assignments
FOR ALL
TO public
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policy: Admins can manage group assignments in their tenant
CREATE POLICY "admins_manage_group_assignments_in_tenant"
ON user_group_assignments
FOR ALL
TO public
USING (
  tenant_id = get_current_tenant_id()
  AND EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = auth.uid()
    AND uta.tenant_id = user_group_assignments.tenant_id
    AND uta.role = 'admin'
    AND uta.is_active = true
  )
)
WITH CHECK (
  tenant_id = get_current_tenant_id()
  AND EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = auth.uid()
    AND uta.tenant_id = user_group_assignments.tenant_id
    AND uta.role = 'admin'
    AND uta.is_active = true
  )
);

-- RLS Policy: Users can view their own group assignments
CREATE POLICY "users_view_own_group_assignments"
ON user_group_assignments
FOR SELECT
TO public
USING (
  user_id = auth.uid()
  AND tenant_id = get_current_tenant_id()
);

COMMENT ON POLICY "super_admins_all_access_group_assignments" ON user_group_assignments IS
'Super admins have full access to all group assignments';

COMMENT ON POLICY "admins_manage_group_assignments_in_tenant" ON user_group_assignments IS
'Admins can create, update, and delete group assignments in their tenant';

COMMENT ON POLICY "users_view_own_group_assignments" ON user_group_assignments IS
'Users can view their own group assignments';
