import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AnnouncementProvider } from './contexts/AnnouncementContext';
import { TourProvider } from './contexts/TourContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ToastContainer } from './components/Toast';

// Import pages
import HomePage from './pages/HomePage';
import AuthPage from './pages/auth/LoginPage';

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
import UserManagementPage from './pages/users/UserManagementPage';
import CreatePasswordPage from './pages/auth/CreatePasswordPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from '././pages/auth/VerifyEmailPage';
import MyProfilePage from './pages/profile/MyProfilePage';
import ProfileUpdatePage from './pages/profile/ProfileUpdatePage';
import ProfileSettingsPage from './pages/profile/ProfileSettingsPage';

import UserActivityDashboard from './components/userActivity/UserActivityDashboard';
import UserActivityPage from './pages/users/UserActivityPage';
//import TwoFactorSetupModal from './components/TwoFactorSetupModal';
//import TwoFactorVerificationModal from './components/TwoFactorVerificationModal';


// Database-Report Pages
import UnverifiedSitesPage from './pages/database/UnverifiedSitesPage';
import CreateCompanyReportPage from './pages/reports/CreateCompanyReportPage';
import CustomReportsPage from './pages/reports/CustomReportsPage';
import ReportDetailPage from './pages/reports/ReportDetailPage';
import ReportCompanyViewPage from './pages/reports/ReportCompanyViewPage';
import UnverifiedSiteDetailPage from './pages/database/UnverifiedSiteDetailPage';
import UnverifiedSiteEditPage from './pages/database/UnverifiedSiteEditPage';
import UnverifiedSiteAddPage from './pages/database/UnverifiedSiteAddPage';

import ClientReportsPage from './pages/client/ClientReportsPage';
import ClientReportViewPage from './pages/client/ClientReportViewPage';
import ClientReportVisualizationPage from './pages/client/ClientReportVisualizationPage';
import ClientReportFocusViewPage from './pages/client/ClientReportFocusViewPage';
import CollectionsPage from './pages/client/CollectionsPage';
import CollectionDetailPage from './pages/client/CollectionDetailPage';

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
import DataCollectorNotifications from './pages/DataCollectorNotifications';

// Chat Pages
import StaffChatPage from './pages/StaffChatPage';
import ClientChatPage from './pages/client/ClientChatPage';
import DataCollectorChatPage from './pages/DataCollectorChatPage';

// Project Management Pages
import ProjectManagementPage from './pages/projects/ProjectManagementPage';
import ProjectDetailPage from './pages/projects/ProjectDetailPage';
import AddSiteToProjectPage from './pages/projects/AddSiteToProjectPage';
import ViewSitePage from './pages/projects/ViewSitePage'; 
import EditSitePage from './pages/projects/EditSitePage';   

// Import admin project pages
import AdminProjectManagementPage from './pages/admin/AdminProjectManagementPage';
import AdminProjectDetailPage from './pages/admin/AdminProjectDetailPage';
import AdminAddSiteToProjectPage from './pages/admin/AdminAddSiteToProjectPage';
import AdminViewSitePage from './pages/admin/AdminViewSitePage';
import AdminEditSitePage from './pages/admin/AdminEditSitePage';

// Other Pages
import MyTasksPage from './pages/MyTasksPage';
import ClientFAQPage from './pages/client/ClientFAQPage';
import ClientHelpCenter from './pages/client/ClientHelpCenter';
import CompanyResearchPage from './pages/CompanyResearchPage';
import FeedbackPage from './pages/FeedbackPage';

import CompanyDatabasePage from './pages/database/CompanyDatabasePage';
import CompanyDetailPage from './pages/database/CompanyDetailPage';
import AddCompanyPage from './pages/database/AddCompanyPage';
import VersionsPage from './pages/database/VersionsPage';




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
    <ThemeProvider>
      <QueryClientProvider client={queryClient}> 
        <AuthProvider>
          <ToastProvider>
            <TourProvider>
            <ToastRenderer />
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage initialMode="signup" />} />
            <Route path="/verify-email/:uidb64/:token" element={<VerifyEmailPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:uidb64/:token" element={<ResetPasswordPage />} />

            {/* Protected routes */}
            <Route path="/staff-dashboard" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
            <Route path="/client-dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
            <Route path="/guest-dashboard" element={<ProtectedRoute><GuestDashboard /></ProtectedRoute>} />
            <Route path="/data-collector-dashboard" element={<ProtectedRoute allowedRoles={['DATA_COLLECTOR']}><DataCollectorDashboard /></ProtectedRoute>} />
            <Route path="/superdatabase" element={<Navigate to="/company-database" replace />} />
            <Route path="/widget-management" element={<ProtectedRoute><WidgetManagement /></ProtectedRoute>} />

            {/* User Management Route */}
            <Route path="/user-management" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
            <Route path="/create-password/:uidb64/:token" element={<CreatePasswordPage />} />
            <Route path="/update-profile" element={<ProfileUpdatePage />} />
            <Route path="/profile-settings" element={<ProtectedRoute><ProfileSettingsPage /></ProtectedRoute>} />
            <Route path="/my-profile" element={<ProtectedRoute><MyProfilePage /></ProtectedRoute>} />
            <Route path="/dashboard/user-activity" element={<ProtectedRoute><DashboardLayout><UserActivityDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/user-activity" element={<UserActivityPage />} />

            {/* Custom Reports Routes - Now using Company Database */}
            <Route path="/custom-reports" element={<ProtectedRoute><CustomReportsPage /></ProtectedRoute>} />
            <Route path="/custom-reports/create" element={<ProtectedRoute><CreateCompanyReportPage /></ProtectedRoute>} />
            <Route path="/custom-reports/:reportId" element={<ProtectedRoute><ReportDetailPage /></ProtectedRoute>} />
            <Route path="/custom-reports/:reportId/edit" element={<ProtectedRoute><CreateCompanyReportPage /></ProtectedRoute>} />
            <Route path="/custom-reports/:reportId/companies/:companyId" element={<ProtectedRoute><ReportCompanyViewPage /></ProtectedRoute>} />

            <Route path="/client/reports/:reportId/visualization" element={<ClientReportVisualizationPage />} />
            <Route path="/client/reports/:reportId/focus" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientReportFocusViewPage /></ProtectedRoute>}/>
            <Route path="/client/reports" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientReportsPage /></ProtectedRoute>}/>
            <Route path="/client/reports/:reportId" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientReportViewPage /></ProtectedRoute>}/>

            {/* Subscription Management Routes */}
            <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionManagementPage /></ProtectedRoute>} />

            {/* Client Routes */}
            <Route path="/client/dashboard" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientDashboard /></ProtectedRoute>}/>
            <Route path="/client/subscriptions" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientSubscriptionsPage /></ProtectedRoute>}/>
            <Route path="/client/faq" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientFAQPage /></ProtectedRoute>}/>
            <Route path="/client/help-center" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientHelpCenter /></ProtectedRoute>}/>
            <Route path="/client/collections" element={<ProtectedRoute allowedRoles={['CLIENT']}><CollectionsPage /></ProtectedRoute>}/>
            <Route path="/client/collections/:collectionId" element={<ProtectedRoute allowedRoles={['CLIENT']}><CollectionDetailPage /></ProtectedRoute>}/>

            {/* Notifications Routes */}
            <Route path="/client/notifications" element={<ProtectedRoute><ClientDashboardLayout><ClientNotifications /></ClientDashboardLayout></ProtectedRoute>}/>
            <Route path="/staff/notifications" element={<ProtectedRoute><DashboardLayout><StaffNotifications /></DashboardLayout></ProtectedRoute>}/>
            <Route path="/notifications" element={<ProtectedRoute allowedRoles={['DATA_COLLECTOR']}><DataCollectorNotifications /></ProtectedRoute>}/>

            {/* Chat Routes */}
            <Route path="/client/chat" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientChatPage /></ProtectedRoute>}/>
            <Route path="/staff-chat" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><StaffChatPage /></ProtectedRoute>} />
            <Route path="/data-collector-chat" element={<ProtectedRoute allowedRoles={['DATA_COLLECTOR']}><DataCollectorChatPage /></ProtectedRoute>} />

            {/* Announcement Routes */}
            <Route path="/announcements-management" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><AnnouncementsManagement /></ProtectedRoute>} />
            <Route path="/announcements-management/:id" element={<AnnouncementDetail />} />
            <Route path="/announcements/new" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><AnnouncementForm /></ProtectedRoute>} />
            <Route path="/announcements/edit/:id" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><AnnouncementForm /></ProtectedRoute>} />
            <Route path="/announcements" element={<ProtectedRoute><UserAnnouncements /></ProtectedRoute>} />
            <Route path="/client/announcements" element={<ProtectedRoute allowedRoles={['CLIENT']}><UserAnnouncements /></ProtectedRoute>}/>

            {/* Unverified Sites Routes */}
            <Route path="/unverified-sites" element={<ProtectedRoute><UnverifiedSitesPage /></ProtectedRoute>} />
            <Route path="/unverified-sites/add" element={<ProtectedRoute><UnverifiedSiteAddPage /></ProtectedRoute>} />
            <Route path="/unverified-sites/:siteId" element={<ProtectedRoute><UnverifiedSiteDetailPage /></ProtectedRoute>} />
            <Route path="/unverified-sites/:siteId/edit" element={<ProtectedRoute><UnverifiedSiteEditPage /></ProtectedRoute>} />

            {/* Projects Routes */}
            <Route path="/projects" element={<ProtectedRoute><ProjectManagementPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/add-site" element={<ProtectedRoute><AddSiteToProjectPage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/sites/:siteId/view" element={<ProtectedRoute><ViewSitePage /></ProtectedRoute>} />
            <Route path="/projects/:projectId/sites/:siteId/edit" element={<ProtectedRoute><EditSitePage /></ProtectedRoute>} />


            {/* Admin Project Routes */}
            <Route path="/admin/projects" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><AdminProjectManagementPage /></ProtectedRoute>} />
            <Route path="/admin/projects/:projectId" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><AdminProjectDetailPage /></ProtectedRoute>} />
            <Route path="/admin/projects/:projectId/add-site" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><AdminAddSiteToProjectPage /></ProtectedRoute>} />
            <Route path="/admin/projects/:projectId/sites/:siteId/view" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><AdminViewSitePage /></ProtectedRoute>} />
            <Route path="/admin/projects/:projectId/sites/:siteId/edit" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><AdminEditSitePage /></ProtectedRoute>} />

            {/* Feedback (Admin) - Combined Help Center & Report Feedback */}
            <Route path="/feedback" element={<ProtectedRoute allowedRoles={['SUPERADMIN', 'STAFF_ADMIN']}><FeedbackPage /></ProtectedRoute>} />
            {/* Redirect old routes to new combined page */}
            <Route path="/help-center-feedback" element={<Navigate to="/feedback?tab=help" replace />} />
            <Route path="/report-feedback" element={<Navigate to="/feedback?tab=report" replace />} />            

            <Route path="/my-tasks" element={<ProtectedRoute><MyTasksPage /></ProtectedRoute>} />
            <Route path="/company-research" element={<ProtectedRoute allowedRoles={['DATA_COLLECTOR', 'STAFF_ADMIN', 'SUPERADMIN']}><CompanyResearchPage /></ProtectedRoute>} />


            <Route path="/company-database" element={<ProtectedRoute><CompanyDatabasePage /></ProtectedRoute>} />
            <Route path="/company-database/new" element={<ProtectedRoute><AddCompanyPage /></ProtectedRoute>} />
            <Route path="/companies/:id" element={<ProtectedRoute><CompanyDetailPage /></ProtectedRoute>} />
            <Route path="/companies/:id/sites/:siteId/versions" element={<ProtectedRoute><VersionsPage /></ProtectedRoute>} />

            {/* Company Reports Routes - Reports from Company Database */}
            <Route path="/company-reports/create" element={<ProtectedRoute><CreateCompanyReportPage /></ProtectedRoute>} />
            <Route path="/company-reports/:reportId/edit" element={<ProtectedRoute><CreateCompanyReportPage /></ProtectedRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
            </TourProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;