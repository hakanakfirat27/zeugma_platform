// frontend/src/components/widgets/WidgetRenderer.jsx
import { Suspense } from 'react';
import LoadingSpinner from '../LoadingSpinner';

// ============================================================================
// DATABASE WIDGETS
// ============================================================================
import TotalCompaniesWidget from './TotalCompaniesWidget';
import TotalProductionSitesWidget from './TotalProductionSitesWidget';
import TotalRecordsWidget from './TotalRecordsWidget';
import CompaniesByStatusWidget from './CompaniesByStatusWidget';
import RecordsByCategoryWidget from './RecordsByCategoryWidget';
import TopCountriesWidget from './TopCountriesWidget';
import MultiCategoryCompaniesWidget from './MultiCategoryCompaniesWidget';
import NewCompaniesThisMonthWidget from './NewCompaniesThisMonthWidget';
import TopMaterialsWidget from './TopMaterialsWidget';
import MonthlyTrendWidget from './MonthlyTrendWidget';

// ============================================================================
// USER WIDGETS
// ============================================================================
import TotalUsersWidget from './TotalUsersWidget';
import TotalClientsWidget from './TotalClientsWidget';
import StaffMembersWidget from './StaffMembersWidget';
import DataCollectorsWidget from './DataCollectorsWidget';
import GuestUsersWidget from './GuestUsersWidget';
import NewUsersThisMonthWidget from './NewUsersThisMonthWidget';
import UsersByRoleWidget from './UsersByRoleWidget';
import MostActiveUsersWidget from './MostActiveUsersWidget';
import LoginActivityTrendWidget from './LoginActivityTrendWidget';
import OnlineUsersWidget from './OnlineUsersWidget';
import UserActivityTimelineWidget from './UserActivityTimelineWidget';
import NewRegistrationsWidget from './NewRegistrationsWidget';
import InactiveUsersWidget from './InactiveUsersWidget';
import SessionStatsWidget from './SessionStatsWidget';
import GeographicDistributionWidget from './GeographicDistributionWidget';
import TwoFactorAdoptionWidget from './TwoFactorAdoptionWidget';
import DeviceBrowserStatsWidget from './DeviceBrowserStatsWidget';
import LoginFailureRateWidget from './LoginFailureRateWidget';
import ActiveSessionsWidget from './ActiveSessionsWidget';
import SuccessfulLoginsWidget from './SuccessfulLoginsWidget';
import FailedLoginsWidget from './FailedLoginsWidget';
import IPBlockedWidget from './IPBlockedWidget';
import SuspiciousActivityWidget from './SuspiciousActivityWidget';

// ============================================================================
// REPORT & SUBSCRIPTION WIDGETS
// ============================================================================
import TotalReportsWidget from './TotalReportsWidget';
import TotalSubscriptionsWidget from './TotalSubscriptionsWidget';
import PendingSubscriptionsWidget from './PendingSubscriptionsWidget';
import SubscriptionExpiryWidget from './SubscriptionExpiryWidget';
import ActiveSubscriptionsWidget from './ActiveSubscriptionsWidget';
import CustomReportsWidget from './CustomReportsWidget';

// ============================================================================
// ACTIVITY WIDGETS
// ============================================================================
import RecentActivityWidget from './RecentActivityWidget';
import RecentActivityFeedWidget from './RecentActivityFeedWidget';
import RecentLoginsWidget from './RecentLoginsWidget';
import ActivityHeatmapWidget from './ActivityHeatmapWidget';

// ============================================================================
// PROJECT WIDGETS
// ============================================================================
import ActiveProjectsWidget from './ActiveProjectsWidget';
import TotalProjectsWidget from './TotalProjectsWidget';
import UnverifiedSitesPendingWidget from './UnverifiedSitesPendingWidget';
import VerificationQueueWidget from './VerificationQueueWidget';

// ============================================================================
// SYSTEM WIDGETS (Health, Security, Monitoring)
// ============================================================================
import SystemHealthWidget from './SystemHealthWidget';
import DatabaseStatusWidget from './DatabaseStatusWidget';
import CacheStatusWidget from './CacheStatusWidget';
import StorageStatusWidget from './StorageStatusWidget';
import BackgroundTasksWidget from './BackgroundTasksWidget';
import EmailServiceWidget from './EmailServiceWidget';
import SystemResourcesWidget from './SystemResourcesWidget';
import FailedLoginsAlertWidget from './FailedLoginsAlertWidget';
import PendingVerificationsAlertWidget from './PendingVerificationsAlertWidget';

/**
 * Widget Registry - Maps widget keys to their components
 * 
 * CATEGORIES:
 * - USERS: User management statistics
 * - REPORTS: Report and subscription metrics
 * - DATABASE: Company database statistics
 * - ACTIVITY: User activity tracking
 * - PROJECTS: Data collection projects
 * - SYSTEM: System health, security and monitoring
 */
const WIDGET_COMPONENTS = {
  // === USER WIDGETS ===
  total_users: TotalUsersWidget,
  total_clients: TotalClientsWidget,
  staff_members: StaffMembersWidget,
  data_collectors: DataCollectorsWidget,
  guest_users: GuestUsersWidget,
  new_users_this_month: NewUsersThisMonthWidget,
  users_by_role: UsersByRoleWidget,
  most_active_users: MostActiveUsersWidget,
  login_activity_trend: LoginActivityTrendWidget,
  online_users: OnlineUsersWidget,
  user_activity_timeline: UserActivityTimelineWidget,
  new_registrations: NewRegistrationsWidget,
  inactive_users: InactiveUsersWidget,
  session_stats: SessionStatsWidget,
  geographic_distribution: GeographicDistributionWidget,
  '2fa_adoption': TwoFactorAdoptionWidget,
  device_browser_stats: DeviceBrowserStatsWidget,
  login_failure_rate: LoginFailureRateWidget,
  active_sessions_detail: ActiveSessionsWidget,
  successful_logins: SuccessfulLoginsWidget,
  failed_logins_detail: FailedLoginsWidget,
  blocked_ips: IPBlockedWidget,
  suspicious_activity: SuspiciousActivityWidget,

  // === REPORT & SUBSCRIPTION WIDGETS ===
  total_reports: TotalReportsWidget,
  custom_reports: CustomReportsWidget,
  active_subscriptions: ActiveSubscriptionsWidget,
  total_subscriptions: TotalSubscriptionsWidget,
  pending_subscriptions: PendingSubscriptionsWidget,
  subscription_expiry: SubscriptionExpiryWidget,

  // === DATABASE WIDGETS ===
  total_companies: TotalCompaniesWidget,
  total_records: TotalRecordsWidget,
  total_production_sites: TotalProductionSitesWidget,
  companies_by_status: CompaniesByStatusWidget,
  records_by_category: RecordsByCategoryWidget,
  top_countries: TopCountriesWidget,
  multi_category_companies: MultiCategoryCompaniesWidget,
  new_companies_this_month: NewCompaniesThisMonthWidget,
  top_materials: TopMaterialsWidget,
  monthly_trend: MonthlyTrendWidget,

  // === ACTIVITY WIDGETS ===
  recent_activity: RecentActivityWidget,
  activity_feed: RecentActivityFeedWidget,
  recent_logins: RecentLoginsWidget,
  activity_heatmap: ActivityHeatmapWidget,

  // === PROJECT WIDGETS ===
  active_projects: ActiveProjectsWidget,
  total_projects: TotalProjectsWidget,
  unverified_sites_pending: UnverifiedSitesPendingWidget,
  verification_queue: VerificationQueueWidget,

  // === SYSTEM WIDGETS (Health, Security, Monitoring) ===
  system_health: SystemHealthWidget,
  database_status: DatabaseStatusWidget,
  cache_status: CacheStatusWidget,
  storage_status: StorageStatusWidget,
  background_tasks: BackgroundTasksWidget,
  email_service: EmailServiceWidget,
  system_resources: SystemResourcesWidget,
  failed_logins_alert: FailedLoginsAlertWidget,
  pending_verifications_alert: PendingVerificationsAlertWidget,
};

/**
 * WidgetRenderer - Dynamically renders the correct widget component
 * based on the widget configuration from the backend
 */
const WidgetRenderer = ({ widget, stats, onRefresh }) => {
  // Get the component for this widget
  const WidgetComponent = WIDGET_COMPONENTS[widget.widget_key];

  // If widget component doesn't exist, show a nice placeholder
  if (!WidgetComponent) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full hover:shadow-md transition-shadow">
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🔧</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Widget Coming Soon</h3>
          <p className="text-sm text-gray-500 mb-1">{widget.title}</p>
          <p className="text-xs text-gray-400 px-4 py-2 bg-gray-50 rounded-lg mt-2">
            Key: <code className="font-mono">{widget.widget_key}</code>
          </p>
        </div>
      </div>
    );
  }

  // Render the widget component with error boundary
  return (
    <Suspense fallback={
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    }>
      <WidgetComponent
        config={widget}
        stats={stats}
        onRefresh={onRefresh}
      />
    </Suspense>
  );
};

export default WidgetRenderer;
