
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Import pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import StaffDashboard from './pages/dashboards/StaffDashboard';
{/*import ClientDashboard from './pages/dashboards/ClientDashboard';*/}
import GuestDashboard from './pages/dashboards/GuestDashboard';
import SuperdatabasePage from './pages/SuperdatabasePage';
import WidgetManagement from './pages/dashboards/WidgetManagement';
import CustomReportsPage from './pages/CustomReportsPage';
import CreateReportPage from './pages/CreateReportPage';
import SubscriptionManagementPage from './pages/SubscriptionManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import CreatePasswordPage from './components/CreatePasswordPage';
import ProfileUpdatePage from './components/ProfileUpdatePage';
import ClientDashboard from './pages/client/ClientDashboard';
import ClientReportsPage from './pages/client/ClientReportsPage';
import ClientReportViewPage from './pages/client/ClientReportViewPage';
import ClientSubscriptionsPage from './pages/client/ClientSubscriptionsPage';
import ClientChatPage from './pages/client/ClientChatPage';
import ClientFAQPage from './pages/client/ClientFAQPage';
import VerifyEmailPage from './components/VerifyEmailPage';
//import TwoFactorSetupModal from './components/TwoFactorSetupModal';
//import TwoFactorVerificationModal from './components/TwoFactorVerificationModal';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import ClientDashboardLayout from './components/layout/ClientDashboardLayout';
import ClientNotifications from './pages/client/ClientNotifications';
import ClientReportVisualizationPage from './pages/client/ClientReportVisualizationPage';
import MyProfilePage from './pages/MyProfilePage';


function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email/:uidb64/:token" element={<VerifyEmailPage />} />

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
        <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />
        <Route path="/my-profile" element={<ProtectedRoute><MyProfilePage /></ProtectedRoute>} />

        {/* Custom Reports Routes */}
        <Route path="/custom-reports" element={<ProtectedRoute><CustomReportsPage /></ProtectedRoute>} />
        <Route path="/custom-reports/create" element={<ProtectedRoute><CreateReportPage /></ProtectedRoute>} />
        <Route path="/custom-reports/:reportId/edit" element={<ProtectedRoute><CreateReportPage /></ProtectedRoute>} />
        <Route path="/custom-reports/:reportId" element={<ProtectedRoute><ReportDetailPage /></ProtectedRoute>} />

        {/* Subscription Management Routes */}
        <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionManagementPage /></ProtectedRoute>} />

        {/* Client Routes */}
        <Route path="/client/dashboard" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientDashboard /></ProtectedRoute>}/>
        <Route path="/client/reports" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientReportsPage /></ProtectedRoute>}/>
        <Route path="/client/reports/:reportId" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientReportViewPage /></ProtectedRoute>}/>
        <Route path="/client/subscriptions" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientSubscriptionsPage /></ProtectedRoute>}/>
        <Route path="/client/chat" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientChatPage /></ProtectedRoute>}/>
        <Route path="/client/faq" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientFAQPage /></ProtectedRoute>}/>
        <Route path="/client/notifications" element={<ProtectedRoute><ClientDashboardLayout><ClientNotifications /></ClientDashboardLayout></ProtectedRoute>}/>
        <Route path="/client/reports/:reportId/visualization" element={<ClientReportVisualizationPage />} />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
