import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { UserRole } from '@/types/user-role';

interface RoleBasedRouteProps {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function RoleBasedRoute({ allowedRoles, redirectTo = '/clients' }: RoleBasedRouteProps) {
  const { role, loading: authLoading } = useAuth();
  const { isRouteAccessible, isSuperAdmin, loading: permissionsLoading } = usePermissions();
  const location = useLocation();

  const loading = authLoading || permissionsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Super admin can access everything
  if (isSuperAdmin) {
    return <Outlet />;
  }

  // If user has no role, redirect
  if (!role) {
    return <Navigate to={redirectTo} replace />;
  }

  // First check: Static role check (baseline security)
  if (!allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Second check: Dynamic permission check (DB overrides)
  // This respects custom permission settings from tenant_settings
  if (!isRouteAccessible(location.pathname)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
