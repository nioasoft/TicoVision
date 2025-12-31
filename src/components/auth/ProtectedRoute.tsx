import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute() {
  const { user, loading, isRestrictedUser, restrictedRoute } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Restricted user - redirect to allowed route if on wrong path
  if (isRestrictedUser && restrictedRoute && location.pathname !== restrictedRoute) {
    return <Navigate to={restrictedRoute} replace />;
  }

  // Render outlet - MainLayout handles restricted user UI
  return <Outlet />;
}