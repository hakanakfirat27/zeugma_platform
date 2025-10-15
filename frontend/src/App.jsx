
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import StaffDashboard from './pages/dashboards/StaffDashboard';
import ClientDashboard from './pages/dashboards/ClientDashboard';
import GuestDashboard from './pages/dashboards/GuestDashboard';
import SuperdatabasePage from './pages/SuperdatabasePage';
import WidgetManagement from './pages/dashboards/WidgetManagement';
import CustomReportsPage from './pages/CustomReportsPage';
import CreateReportPage from './pages/CreateReportPage';
import SubscriptionManagementPage from './pages/SubscriptionManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import CreatePasswordPage from './components/CreatePasswordPage';
import ProfileUpdatePage from './components/ProfileUpdatePage';


function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes */}
        <Route path="/staff-dashboard" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
        <Route path="/client-dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/guest-dashboard" element={<ProtectedRoute><GuestDashboard /></ProtectedRoute>} />
        <Route path="/superdatabase" element={<ProtectedRoute><SuperdatabasePage /></ProtectedRoute>} />
        <Route path="/widget-management" element={<ProtectedRoute><WidgetManagement /></ProtectedRoute>} />

        {/* User Management Route */}
        <Route path="/user-management" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
        <Route path="/create-password/:uidb64/:token" element={<CreatePasswordPage />} />
        <Route path="/update-profile" element={<ProfileUpdatePage />} />

        {/* Custom Reports Routes */}
        <Route path="/custom-reports" element={<ProtectedRoute><CustomReportsPage /></ProtectedRoute>} />
        <Route path="/custom-reports/create" element={<ProtectedRoute><CreateReportPage /></ProtectedRoute>} />
        <Route path="/custom-reports/:reportId/edit" element={<ProtectedRoute><CreateReportPage /></ProtectedRoute>} />

        {/* Subscription Management Routes */}
        <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionManagementPage /></ProtectedRoute>} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
