import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
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
const FeeTrackingPage = lazy(() => import('@/pages/FeeTrackingPage').then(m => ({ default: m.FeeTrackingPage })));
const LettersPage = lazy(() => import('@/pages/LettersPage').then(m => ({ default: m.LettersPage })));
const LetterTemplatesPage = lazy(() => import('@/pages/LetterTemplatesPage').then(m => ({ default: m.LetterTemplatesPage })));
const LetterHistoryPage = lazy(() => import('@/pages/LetterHistoryPage').then(m => ({ default: m.LetterHistoryPage })));
const ComponentSimulatorPage = lazy(() => import('@/pages/ComponentSimulatorPage').then(m => ({ default: m.ComponentSimulatorPage })));
const ForeignWorkersPage = lazy(() => import('@/pages/ForeignWorkersPage').then(m => ({ default: m.ForeignWorkersPage })));
const UsersPage = lazy(() => import('@/pages/UsersPage').then(m => ({ default: m.UsersPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard'));
const TenantManagementPage = lazy(() => import('@/pages/TenantManagementPage'));
const PermissionsPage = lazy(() => import('@/pages/PermissionsPage'));
const PaymentPage = lazy(() => import('@/pages/payment-page'));
const PaymentSuccessPage = lazy(() => import('@/pages/PaymentSuccessPage'));
const PaymentErrorPage = lazy(() => import('@/pages/PaymentErrorPage'));
const ClientGroupsPage = lazy(() => import('@/pages/ClientGroupsPage'));
const FilesManagerPage = lazy(() => import('@/pages/FilesManagerPage'));
const LetterViewer = lazy(() => import('@/pages/LetterViewer'));
const WelcomePage = lazy(() => import('@/pages/WelcomePage').then(m => ({ default: m.WelcomePage })));

// Collection System pages
const CollectionDashboard = lazy(() => import('@/modules/collections/pages/CollectionDashboard').then(m => ({ default: m.CollectionDashboard })));
const NotificationSettings = lazy(() => import('@/modules/collections/pages/NotificationSettings').then(m => ({ default: m.NotificationSettings })));
const DisputesPage = lazy(() => import('@/modules/collections/pages/DisputesPage').then(m => ({ default: m.DisputesPage })));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Default redirect based on user role
function DefaultRedirect() {
  const { role } = useAuth();

  if (role === 'accountant') {
    return <Navigate to="/welcome" replace />;
  }
  return <Navigate to="/clients" replace />;
}

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
                <Route path="/payment" element={
                  <ErrorBoundary>
                    <PaymentPage />
                  </ErrorBoundary>
                } />
                <Route path="/payment/success" element={
                  <ErrorBoundary>
                    <PaymentSuccessPage />
                  </ErrorBoundary>
                } />
                <Route path="/payment/error" element={
                  <ErrorBoundary>
                    <PaymentErrorPage />
                  </ErrorBoundary>
                } />
                <Route path="/letters/view/:id" element={
                  <ErrorBoundary>
                    <LetterViewer />
                  </ErrorBoundary>
                } />
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
                    {/* Default redirect based on role */}
                    <Route path="/" element={<DefaultRedirect />} />

                    {/* Welcome page - for accountant role */}
                    <Route path="/welcome" element={
                      <ErrorBoundary>
                        <WelcomePage />
                      </ErrorBoundary>
                    } />

                    {/* Clients page - accessible if has permission */}
                    <Route element={<RoleBasedRoute allowedRoles={['admin', 'accountant', 'bookkeeper', 'client']} />}>
                      <Route path="/clients" element={
                        <ErrorBoundary>
                          <ClientsPage />
                        </ErrorBoundary>
                      } />
                    </Route>

                    {/* Client Groups page - accessible if has permission */}
                    <Route element={<RoleBasedRoute allowedRoles={['admin', 'accountant', 'bookkeeper']} />}>
                      <Route path="/client-groups" element={
                        <ErrorBoundary>
                          <ClientGroupsPage />
                        </ErrorBoundary>
                      } />
                    </Route>

                    {/* Files Manager - accessible if has permission */}
                    <Route element={<RoleBasedRoute allowedRoles={['admin', 'accountant', 'bookkeeper']} />}>
                      <Route path="/files" element={
                        <ErrorBoundary>
                          <FilesManagerPage />
                        </ErrorBoundary>
                      } />
                    </Route>

                    {/* Foreign Workers - accessible to admin, accountant and bookkeeper */}
                    <Route element={<RoleBasedRoute allowedRoles={['admin', 'accountant', 'bookkeeper']} />}>
                      <Route path="/foreign-workers" element={
                        <ErrorBoundary>
                          <ForeignWorkersPage />
                        </ErrorBoundary>
                      } />
                    </Route>

                    {/* Admin-only routes */}
                    <Route element={<RoleBasedRoute allowedRoles={['admin']} />}>
                      <Route path="/dashboard" element={
                        <ErrorBoundary>
                          <DashboardPage />
                        </ErrorBoundary>
                      } />

                      {/* Fee Management Routes */}
                      <Route path="/fees/tracking" element={
                        <ErrorBoundary>
                          <FeeTrackingPage />
                        </ErrorBoundary>
                      } />
                      <Route path="/fees/calculate" element={
                        <ErrorBoundary>
                          <FeesPage />
                        </ErrorBoundary>
                      } />
                      {/* Legacy redirect: /fees → /fees/tracking */}
                      <Route path="/fees" element={<Navigate to="/fees/tracking" replace />} />
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
                      <Route path="/letter-history" element={
                        <ErrorBoundary>
                          <LetterHistoryPage />
                        </ErrorBoundary>
                      } />
                      <Route path="/component-simulator" element={
                        <ErrorBoundary>
                          <ComponentSimulatorPage />
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

                      {/* Collection Management routes */}
                      <Route path="/collections" element={
                        <ErrorBoundary>
                          <CollectionDashboard />
                        </ErrorBoundary>
                      } />
                      <Route path="/collections/settings" element={
                        <ErrorBoundary>
                          <NotificationSettings />
                        </ErrorBoundary>
                      } />
                      <Route path="/collections/disputes" element={
                        <ErrorBoundary>
                          <DisputesPage />
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
                      <Route path="/super-admin/permissions" element={
                        <ErrorBoundary>
                          <PermissionsPage />
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