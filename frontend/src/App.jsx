
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AnnouncementProvider } from './contexts/AnnouncementContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast';

// Import pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';

// Dashboard-Layout Pages
import StaffDashboard from './pages/dashboards/StaffDashboard';
import ClientDashboard from './pages/client/ClientDashboard';
import GuestDashboard from './pages/dashboards/GuestDashboard';
import DataCollectorDashboard from './pages/dashboards/DataCollectorDashboard';
import DashboardLayout from './components/layout/DashboardLayout';
import ClientDashboardLayout from './components/layout/ClientDashboardLayout';
//import DataCollectorLayout from './components/layout/DataCollectorLayout';
import WidgetManagement from './pages/dashboards/WidgetManagement';

// User Management Pages
import UserManagementPage from './pages/UserManagementPage';
import CreatePasswordPage from './components/CreatePasswordPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './components/VerifyEmailPage';
import MyProfilePage from './pages/MyProfilePage';
import ProfileUpdatePage from './components/ProfileUpdatePage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';

import UserActivityDashboard from './components/userActivity/UserActivityDashboard';
import UserActivityPage from './pages/UserActivityPage';
//import TwoFactorSetupModal from './components/TwoFactorSetupModal';
//import TwoFactorVerificationModal from './components/TwoFactorVerificationModal';


// Database-Report Pages
import SuperdatabasePage from './pages/SuperdatabasePage';
import UnverifiedSitesPage from './pages/UnverifiedSitesPage';
import CreateReportPage from './pages/CreateReportPage';
import CustomReportsPage from './pages/CustomReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import UnverifiedSiteDetailPage from './pages/UnverifiedSiteDetailPage';
import UnverifiedSiteEditPage from './pages/UnverifiedSiteEditPage';

import ClientReportsPage from './pages/client/ClientReportsPage';
import ClientReportViewPage from './pages/client/ClientReportViewPage';
import ClientReportVisualizationPage from './pages/client/ClientReportVisualizationPage';

// Subscription Management Pages
import SubscriptionManagementPage from './pages/SubscriptionManagementPage';
import ClientSubscriptionsPage from './pages/client/ClientSubscriptionsPage';

// Announcement Management Pages
import AnnouncementsManagement from './pages/announcements/AnnouncementsManagement';
import AnnouncementForm from './pages/announcements/AnnouncementForm';
import UserAnnouncements from './pages/announcements/UserAnnouncements';
import AnnouncementDetail from './pages/announcements/AnnouncementDetail';

// Notifications Management Pages
import ClientNotifications from './pages/client/ClientNotifications';
import StaffNotifications from './pages/StaffNotifications';

// Chat Pages
import StaffChatPage from './pages/StaffChatPage';
import ClientChatPage from './pages/client/ClientChatPage';

// Project Management Pages
import ProjectManagementPage from './pages/ProjectManagementPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import AddSiteToProjectPage from './pages/AddSiteToProjectPage';
import ViewSitePage from './pages/ViewSitePage'; 
import EditSitePage from './pages/EditSitePage';   

// Other Pages
import MyTasksPage from './pages/MyTasksPage';
import ClientFAQPage from './pages/client/ClientFAQPage';



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Helper component to render toasts from context
const ToastRenderer = () => {
  const { toasts, removeToast } = useToast();
  return <ToastContainer toasts={toasts} removeToast={removeToast} />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}> 
      <AuthProvider>
        <ToastProvider>
          <ToastRenderer />
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email/:uidb64/:token" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:uidb64/:token" element={<ResetPasswordPage />} />

            {/* Protected routes */}
            <Route path="/staff-dashboard" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
            <Route path="/client-dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
            <Route path="/guest-dashboard" element={<ProtectedRoute><GuestDashboard /></ProtectedRoute>} />
            <Route path="/data-collector-dashboard" element={<ProtectedRoute allowedRoles={['DATA_COLLECTOR']}><DataCollectorDashboard /></ProtectedRoute>} />
            <Route path="/superdatabase" element={<ProtectedRoute><SuperdatabasePage /></ProtectedRoute>} />
            <Route path="/widget-management" element={<ProtectedRoute><WidgetManagement /></ProtectedRoute>} />

            {/* User Management Route */}
            <Route path="/user-management" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
            <Route path="/create-password/:uidb64/:token" element={<CreatePasswordPage />} />
            <Route path="/update-profile" element={<ProfileUpdatePage />} />
            <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />
            <Route path="/my-profile" element={<ProtectedRoute><MyProfilePage /></ProtectedRoute>} />
            <Route path="/dashboard/user-activity" element={<ProtectedRoute><DashboardLayout><UserActivityDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/user-activity" element={<UserActivityPage />} />

            {/* Custom Reports Routes */}
            <Route path="/custom-reports" element={<ProtectedRoute><CustomReportsPage /></ProtectedRoute>} />
            <Route path="/custom-reports/create" element={<ProtectedRoute><CreateReportPage /></ProtectedRoute>} />
            <Route path="/custom-reports/:reportId" element={<ProtectedRoute><ReportDetailPage /></ProtectedRoute>} />
            <Route path="/custom-reports/:reportId/edit" element={<ProtectedRoute><CreateReportPage /></ProtectedRoute>} />

            <Route path="/client/reports/:reportId/visualization" element={<ClientReportVisualizationPage />} />
            <Route path="/client/reports" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientReportsPage /></ProtectedRoute>}/>
            <Route path="/client/reports/:reportId" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientReportViewPage /></ProtectedRoute>}/>

            {/* Subscription Management Routes */}
            <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionManagementPage /></ProtectedRoute>} />

            {/* Client Routes */}
            <Route path="/client/dashboard" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientDashboard /></ProtectedRoute>}/>
            <Route path="/client/subscriptions" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientSubscriptionsPage /></ProtectedRoute>}/>
            <Route path="/client/faq" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientFAQPage /></ProtectedRoute>}/>

            {/* Notifications Routes */}
            <Route path="/client/notifications" element={<ProtectedRoute><ClientDashboardLayout><ClientNotifications /></ClientDashboardLayout></ProtectedRoute>}/>
            <Route path="/staff/notifications" element={<ProtectedRoute><DashboardLayout><StaffNotifications /></DashboardLayout></ProtectedRoute>}/>

            {/* Chat Routes */}
            <Route path="/client/chat" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientChatPage /></ProtectedRoute>}/>
            <Route path="/staff-chat" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><StaffChatPage /></ProtectedRoute>} />

            {/* Announcement Routes */}
            <Route path="/announcements-management" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><AnnouncementsManagement /></ProtectedRoute>} />
            <Route path="/announcements-management/:id" element={<AnnouncementDetail />} />
            <Route path="/announcements/new" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><AnnouncementForm /></ProtectedRoute>} />
            <Route path="/announcements/edit/:id" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><AnnouncementForm /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute><UserAnnouncements /></ProtectedRoute>} />
            <Route path="/client/announcements" element={<ProtectedRoute allowedRoles={['CLIENT']}><UserAnnouncements /></ProtectedRoute>}/>

            {/* Unverified Sites Routes */}
            <Route path="/unverified-sites" element={<ProtectedRoute><UnverifiedSitesPage /></ProtectedRoute>} />
            <Route path="/unverified-sites/:siteId" element={<ProtectedRoute><UnverifiedSiteDetailPage /></ProtectedRoute>} />
            <Route path="/unverified-sites/:siteId/edit" element={<ProtectedRoute><UnverifiedSiteEditPage /></ProtectedRoute>} />

            {/* Projects Routes */}
            <Route path="/projects" element={<ProtectedRoute><ProjectManagementPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/add-site" element={<ProtectedRoute><AddSiteToProjectPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/sites/:siteId/view" element={<ProtectedRoute><ViewSitePage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/sites/:siteId/edit" element={<ProtectedRoute><EditSitePage /></ProtectedRoute>} />

            <Route path="/my-tasks" element={<ProtectedRoute><MyTasksPage /></ProtectedRoute>} />



            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
