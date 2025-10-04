-- Migration: Create user_client_assignments table for client-user access control
-- Purpose: Enable accountants and bookkeepers to be assigned to specific clients
-- Date: 2025-10-03

-- Create the user_client_assignments table
CREATE TABLE IF NOT EXISTS user_client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique assignment per user-client-tenant combination
  UNIQUE(user_id, client_id, tenant_id)
);

-- Add indexes for performance
CREATE INDEX idx_user_client_assignments_user_id ON user_client_assignments(user_id);
CREATE INDEX idx_user_client_assignments_client_id ON user_client_assignments(client_id);
CREATE INDEX idx_user_client_assignments_tenant_id ON user_client_assignments(tenant_id);
CREATE INDEX idx_user_client_assignments_active ON user_client_assignments(is_active) WHERE is_active = true;

-- Add table comment
COMMENT ON TABLE user_client_assignments IS
'Links users (accountants/bookkeepers) to specific clients they can access';

COMMENT ON COLUMN user_client_assignments.user_id IS
'User who has access to the client';

COMMENT ON COLUMN user_client_assignments.client_id IS
'Client the user can access';

COMMENT ON COLUMN user_client_assignments.tenant_id IS
'Tenant ID for multi-tenant isolation';

COMMENT ON COLUMN user_client_assignments.assigned_by IS
'Admin user who created this assignment';

COMMENT ON COLUMN user_client_assignments.is_active IS
'Whether this assignment is currently active';

-- Enable Row Level Security
ALTER TABLE user_client_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admins see all assignments
CREATE POLICY "super_admins_all_access_assignments"
ON user_client_assignments
FOR ALL
TO public
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

-- RLS Policy: Admins can manage assignments in their tenant
CREATE POLICY "admins_manage_assignments_in_tenant"
ON user_client_assignments
FOR ALL
TO public
USING (
  tenant_id = get_current_tenant_id()
  AND EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    WHERE uta.user_id = auth.uid()
    AND uta.tenant_id = user_client_assignments.tenant_id
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
    AND uta.tenant_id = user_client_assignments.tenant_id
    AND uta.role = 'admin'
    AND uta.is_active = true
  )
);

-- RLS Policy: Users can view their own assignments
CREATE POLICY "users_view_own_assignments"
ON user_client_assignments
FOR SELECT
TO public
USING (
  user_id = auth.uid()
  AND tenant_id = get_current_tenant_id()
  AND is_active = true
);

COMMENT ON POLICY "super_admins_all_access_assignments" ON user_client_assignments IS
'Super admins have full access to all client assignments';

COMMENT ON POLICY "admins_manage_assignments_in_tenant" ON user_client_assignments IS
'Admins can create, update, and delete client assignments in their tenant';

COMMENT ON POLICY "users_view_own_assignments" ON user_client_assignments IS
'Users can view their own client assignments';
