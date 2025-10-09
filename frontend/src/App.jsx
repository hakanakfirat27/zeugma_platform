import SuperdatabasePage from './pages/SuperdatabasePage';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

// Dashboard pages
import StaffDashboard from './pages/dashboards/StaffDashboard';
import ClientDashboard from './pages/dashboards/ClientDashboard';
import GuestDashboard from './pages/dashboards/GuestDashboard';

// Database page
import DatabasePage from './pages/DatabasePage';

// Public pages
import HomePage from './pages/HomePage';

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected Staff Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole={['SUPERADMIN', 'STAFF_ADMIN']}>
            <StaffDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/superdatabase"
        element={
          <ProtectedRoute requiredRole={['SUPERADMIN', 'STAFF_ADMIN']}>
            <SuperdatabasePage />
          </ProtectedRoute>
        }
      />

      {/* Protected Client Dashboard */}
      <Route
        path="/dashboard/client"
        element={
          <ProtectedRoute requiredRole="CLIENT">
            <ClientDashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected Guest Dashboard */}
      <Route
        path="/dashboard/guest"
        element={
          <ProtectedRoute requiredRole="GUEST">
            <GuestDashboard />
          </ProtectedRoute>
        }
      />

      {/* Database Page - Accessible to all authenticated users */}
      <Route
        path="/database"
        element={
          <ProtectedRoute requiredRole={['SUPERADMIN', 'STAFF_ADMIN', 'CLIENT', 'GUEST']}>
            <DatabasePage />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;