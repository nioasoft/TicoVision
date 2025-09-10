-- Fix RLS policies for setup process
-- Allow unauthenticated tenant creation for setup

-- Drop existing tenant policy
DROP POLICY IF EXISTS admin_full_access_tenants ON tenants;

-- Create new policy that allows setup operations
CREATE POLICY tenant_setup_and_access ON tenants
    FOR ALL USING (
        -- Allow access during setup (when no authentication)
        auth.uid() IS NULL OR
        -- Allow access to own tenant
        id = public.get_current_tenant_id() OR
        -- Allow admin access to all tenants  
        public.get_current_user_role() = 'admin'
    );

-- Also allow INSERT for anonymous users during setup
CREATE POLICY tenant_setup_insert ON tenants
    FOR INSERT WITH CHECK (
        -- Allow insert when no user is authenticated (setup process)
        auth.uid() IS NULL OR
        -- Allow authenticated admin users to create tenants
        public.get_current_user_role() = 'admin'
    );