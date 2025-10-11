// frontend/src/components/widgets/WidgetRenderer.jsx
import { Suspense } from 'react';
import LoadingSpinner from '../LoadingSpinner';

// Import ONLY the widgets that exist
import TotalRecordsWidget from './TotalRecordsWidget';
import TotalClientsWidget from './TotalClientsWidget';
import CustomReportsWidget from './CustomReportsWidget';
import ActiveSubscriptionsWidget from './ActiveSubscriptionsWidget';
import RecentActivityWidget from './RecentActivityWidget';
import StaffMembersWidget from './StaffMembersWidget';
import GuestUsersWidget from './GuestUsersWidget';
import RecordsByCategoryWidget from './RecordsByCategoryWidget';
import TopCountriesWidget from './TopCountriesWidget';
import MonthlyTrendWidget from './MonthlyTrendWidget';
import TopMaterialsWidget from './TopMaterialsWidget';
import RevenueAnalyticsWidget from './RevenueAnalyticsWidget';
import ActivityHeatmapWidget from './ActivityHeatmapWidget';
import SubscriptionExpiryWidget from './SubscriptionExpiryWidget';
import RecentActivityFeedWidget from './RecentActivityFeedWidget';

/**
 * Widget Registry - Maps widget keys to their components
 * ONLY add widgets here that you have actually created!
 */
const WIDGET_COMPONENTS = {
  // Overview widgets
  total_records: TotalRecordsWidget,
  total_clients: TotalClientsWidget,
  custom_reports: CustomReportsWidget,
  active_subscriptions: ActiveSubscriptionsWidget,
  recent_activity: RecentActivityWidget,
  staff_members: StaffMembersWidget,
  guest_users: GuestUsersWidget,

  // Analytics widgets
  records_by_category: RecordsByCategoryWidget,
  top_countries: TopCountriesWidget,
  monthly_trend: MonthlyTrendWidget,
  top_materials: TopMaterialsWidget,
  revenue_analytics: RevenueAnalyticsWidget,
  activity_heatmap: ActivityHeatmapWidget,
  subscription_expiry: SubscriptionExpiryWidget,
  activity_feed: RecentActivityFeedWidget,

  // When you create more widgets, add them here:
  // Example:
  // subscription_expiry: SubscriptionExpiryWidget,
  // activity_feed: ActivityFeedWidget,
};

/**
 * WidgetRenderer - Dynamically renders the correct widget component
 * based on the widget configuration from the backend
 */
const WidgetRenderer = ({ widget, stats, onRefresh }) => {
  // Get the component for this widget
  const WidgetComponent = WIDGET_COMPONENTS[widget.widget_key];

  // If widget component doesn't exist, show placeholder
  if (!WidgetComponent) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">Widget Not Implemented</p>
          <p className="text-sm text-gray-400">{widget.title}</p>
          <p className="text-xs text-gray-400 mt-2">Key: {widget.widget_key}</p>
        </div>
      </div>
    );
  }

  // Render the widget component
  return (
    <Suspense fallback={
      <div className="card">
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