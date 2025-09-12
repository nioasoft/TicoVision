import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Toaster } from '@/components/ui/sonner';
import { Loader2 } from 'lucide-react';

// Lazy load all pages for better performance
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SetupPage = lazy(() => import('@/pages/SetupPage').then(m => ({ default: m.SetupPage })));
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
    <div dir="rtl" className="min-h-screen">
      <Router>
        <AuthProvider>
          <Toaster position="top-center" />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/setup" element={<SetupPage />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/fees" element={<FeesPage />} />
                  <Route path="/letters" element={<LettersPage />} />
                  <Route path="/letter-templates" element={<LetterTemplatesPage />} />
                  <Route path="/users" element={<UsersPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  
                  {/* Super Admin routes */}
                  <Route path="/super-admin" element={<SuperAdminDashboard />} />
                  <Route path="/super-admin/tenants/:id" element={<TenantManagementPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;