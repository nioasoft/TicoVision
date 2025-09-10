import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { SetupPage } from '@/pages/SetupPage';
import { DashboardPage } from '@/pages/DashboardPage';
import ClientsPage from '@/pages/ClientsPage';
import { FeesPage } from '@/pages/FeesPage';
import { LettersPage } from '@/pages/LettersPage';
import { UsersPage } from '@/pages/UsersPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Toaster } from '@/components/ui/sonner';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-center" />
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
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;