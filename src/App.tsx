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
const FeeTrackingPage = lazy(() => import('@/pages/FeeTrackingPage').then(m => ({ default: m.FeeTrackingPage })));
const LettersPage = lazy(() => import('@/pages/LettersPage').then(m => ({ default: m.LettersPage })));
const LetterTemplatesPage = lazy(() => import('@/pages/LetterTemplatesPage').then(m => ({ default: m.LetterTemplatesPage })));
const LetterHistoryPage = lazy(() => import('@/pages/LetterHistoryPage').then(m => ({ default: m.LetterHistoryPage })));
const ComponentSimulatorPage = lazy(() => import('@/pages/ComponentSimulatorPage').then(m => ({ default: m.ComponentSimulatorPage })));
const ForeignWorkersPage = lazy(() => import('@/pages/ForeignWorkersPage').then(m => ({ default: m.ForeignWorkersPage })));
const TzlulApprovalsPage = lazy(() => import('@/pages/TzlulApprovalsPage').then(m => ({ default: m.TzlulApprovalsPage })));
const CompanyOnboardingPage = lazy(() => import('@/pages/CompanyOnboardingPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage').then(m => ({ default: m.UsersPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const SuperAdminDashboard = lazy(() => import('@/pages/SuperAdminDashboard'));
const TenantManagementPage = lazy(() => import('@/pages/TenantManagementPage'));
const PermissionsPage = lazy(() => import('@/pages/PermissionsPage'));
const PaymentPage = lazy(() => import('@/pages/payment-page'));
const PaymentSuccessPage = lazy(() => import('@/pages/PaymentSuccessPage'));
const PaymentErrorPage = lazy(() => import('@/pages/PaymentErrorPage'));
const ClientGroupsPage = lazy(() => import('@/pages/ClientGroupsPage'));
const ContactsPage = lazy(() => import('@/pages/ContactsPage'));
const FilesManagerPage = lazy(() => import('@/pages/FilesManagerPage'));
const LetterViewer = lazy(() => import('@/pages/LetterViewer'));
const WelcomePage = lazy(() => import('@/pages/WelcomePage').then(m => ({ default: m.WelcomePage })));
const UnderConstructionPage = lazy(() => import('@/pages/UnderConstructionPage'));

// Help System
const HelpPage = lazy(() => import('@/modules/help/pages/HelpPage'));

// Collection System pages
const CollectionDashboard = lazy(() => import('@/modules/collections/pages/CollectionDashboard').then(m => ({ default: m.CollectionDashboard })));
const TodaysWorklistPage = lazy(() => import('@/modules/collections/pages/TodaysWorklistPage').then(m => ({ default: m.TodaysWorklistPage })));
const CollectionReportsPage = lazy(() => import('@/modules/collections/pages/CollectionReportsPage').then(m => ({ default: m.CollectionReportsPage })));
const NotificationSettings = lazy(() => import('@/modules/collections/pages/NotificationSettings').then(m => ({ default: m.NotificationSettings })));
const DisputesPage = lazy(() => import('@/modules/collections/pages/DisputesPage').then(m => ({ default: m.DisputesPage })));

// Documents System pages
const DocumentsHubPage = lazy(() => import('@/modules/documents/pages/DocumentsHubPage'));
const DocumentCategoryPage = lazy(() => import('@/modules/documents/pages/DocumentCategoryPage'));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Default redirect - all users go to welcome page
function DefaultRedirect() {
  return <Navigate to="/welcome" replace />;
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

                    {/* Help page - accessible to admin and accountant only */}
                    <Route element={<RoleBasedRoute allowedRoles={['admin', 'accountant']} />}>
                      <Route path="/help" element={
                        <ErrorBoundary>
                          <HelpPage />
                        </ErrorBoundary>
                      } />
                    </Route>

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

                    {/* Documents System - accessible to admin, accountant and bookkeeper */}
                    <Route element={<RoleBasedRoute allowedRoles={['admin', 'accountant', 'bookkeeper']} />}>
                      <Route path="/documents" element={
                        <ErrorBoundary>
                          <DocumentsHubPage />
                        </ErrorBoundary>
                      } />
                      <Route path="/documents/:categoryId" element={
                        <ErrorBoundary>
                          <DocumentCategoryPage />
                        </ErrorBoundary>
                      } />
                      {/* Legacy route - redirect to new location */}
                      <Route path="/foreign-workers" element={
                        <ErrorBoundary>
                          <ForeignWorkersPage />
                        </ErrorBoundary>
                      } />
                      {/* Tzlul company approvals - for Tzlul cleaning company only */}
                      <Route path="/tzlul-approvals" element={
                        <ErrorBoundary>
                          <TzlulApprovalsPage />
                        </ErrorBoundary>
                      } />
                      {/* Company Onboarding Letters */}
                      <Route path="/company-onboarding" element={
                        <ErrorBoundary>
                          <CompanyOnboardingPage />
                        </ErrorBoundary>
                      } />
                    </Route>

                    {/* Letters routes - accessible based on permissions */}
                    <Route element={<RoleBasedRoute allowedRoles={['admin', 'accountant', 'bookkeeper']} />}>
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
                    </Route>

                    {/* Admin-only routes */}
                    <Route element={<RoleBasedRoute allowedRoles={['admin']} />}>
                      <Route path="/dashboard" element={
                        <ErrorBoundary>
                          <DashboardPage />
                        </ErrorBoundary>
                      } />

                      {/* Contacts Management - Admin only */}
                      <Route path="/contacts" element={
                        <ErrorBoundary>
                          <ContactsPage />
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
                      <Route path="/collections/today" element={
                        <ErrorBoundary>
                          <TodaysWorklistPage />
                        </ErrorBoundary>
                      } />
                      <Route path="/collections/reports" element={
                        <ErrorBoundary>
                          <CollectionReportsPage />
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

                      {/* Under Construction pages */}
                      <Route path="/tax-advances-2026" element={
                        <ErrorBoundary>
                          <UnderConstructionPage />
                        </ErrorBoundary>
                      } />
                      <Route path="/auto-letters" element={
                        <ErrorBoundary>
                          <UnderConstructionPage />
                        </ErrorBoundary>
                      } />
                      <Route path="/follow-ups" element={
                        <ErrorBoundary>
                          <UnderConstructionPage />
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