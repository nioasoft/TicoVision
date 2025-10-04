import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/user-role';

interface RoleBasedRouteProps {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

export function RoleBasedRoute({ allowedRoles, redirectTo = '/clients' }: RoleBasedRouteProps) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user has no role or role is not in allowedRoles, redirect
  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
