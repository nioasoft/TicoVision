import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleBasedRoute } from '@/components/auth/RoleBasedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';

// Lazy load all pages for better performance
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SetupPage = lazy(() => import('@/pages/SetupPage').then(m => ({ default: m.SetupPage })));
const SetPasswordPage = lazy(() => import('@/pages/SetPasswordPage').then(m => ({ default: m.SetPasswordPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const FeesPage = lazy(() => import('@/pages/FeesPage').then(m => ({ default: m.FeesPage })));
const LettersPage = lazy(() => import('@/pages/LettersPage').then(m => ({ default: m.LettersPage })));
const LetterTemplatesPage = lazy(() => import('@/pages/LetterTemplatesPage').then(m => ({ default: m.LetterTemplatesPage })));
const UsersPage = lazy(() => import('@/pages/UsersPage').then(m => ({ default: m.UsersPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard'));
const TenantManagementPage = lazy(() => import('@/pages/TenantManagementPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <div dir="rtl" className="min-h-screen">
        <Router>
          <AuthProvider>
            <Toaster position="top-center" />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={
                  <ErrorBoundary>
                    <LoginPage />
                  </ErrorBoundary>
                } />
                <Route path="/setup" element={
                  <ErrorBoundary>
                    <SetupPage />
                  </ErrorBoundary>
                } />
                <Route path="/set-password" element={
                  <ErrorBoundary>
                    <SetPasswordPage />
                  </ErrorBoundary>
                } />

                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<MainLayout />}>
                    {/* Default redirect to clients for all users */}
                    <Route path="/" element={<Navigate to="/clients" replace />} />

                    {/* Clients page - accessible to all roles */}
                    <Route path="/clients" element={
                      <ErrorBoundary>
                        <ClientsPage />
                      </ErrorBoundary>
                    } />

                    {/* Admin-only routes */}
                    <Route element={<RoleBasedRoute allowedRoles={['admin']} />}>
                      <Route path="/dashboard" element={
                        <ErrorBoundary>
                          <DashboardPage />
                        </ErrorBoundary>
                      } />
                      <Route path="/fees" element={
                        <ErrorBoundary>
                          <FeesPage />
                        </ErrorBoundary>
                      } />
                      <Route path="/letters" element={
                        <ErrorBoundary>
                          <LettersPage />
                        </ErrorBoundary>
                      } />
                      <Route path="/letter-templates" element={
                        <ErrorBoundary>
                          <LetterTemplatesPage />
                        </ErrorBoundary>
                      } />
                      <Route path="/users" element={
                        <ErrorBoundary>
                          <UsersPage />
                        </ErrorBoundary>
                      } />
                      <Route path="/settings" element={
                        <ErrorBoundary>
                          <SettingsPage />
                        </ErrorBoundary>
                      } />

                      {/* Super Admin routes */}
                      <Route path="/super-admin" element={
                        <ErrorBoundary>
                          <SuperAdminDashboard />
                        </ErrorBoundary>
                      } />
                      <Route path="/super-admin/tenants/:id" element={
                        <ErrorBoundary>
                          <TenantManagementPage />
                        </ErrorBoundary>
                      } />
                    </Route>
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </AuthProvider>
        </Router>
      </div>
    </ErrorBoundary>
  );
}

export default App;