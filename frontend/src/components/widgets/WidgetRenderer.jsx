// frontend/src/components/widgets/WidgetRenderer.jsx
import { Suspense } from 'react';
import LoadingSpinner from '../LoadingSpinner';

// Import existing widgets
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
import UnverifiedSitesWidget from './UnverifiedSitesWidget';
import VerificationQueueWidget from './VerificationQueueWidget';

// Import new financial widgets
import SubscriptionRevenueWidget from './SubscriptionRevenueWidget';
import ConversionRateWidget from './ConversionRateWidget';
import { GrowthRateWidget, CustomerLifetimeValueWidget, ChurnRateWidget } from './GrowthChurnCLVWidgets';

// Import new activity & analytics widgets
import {
  PageViewsAnalyticsWidget,
  SessionDurationWidget,
  DeviceAnalyticsWidget,
  SearchAnalyticsWidget,
  TrafficSourcesWidget
} from './ActivityAnalyticsWidgets';

// Import new geographic widgets
import {
  GeographicHeatmapWidget,
  CountryDistributionWidget,
  RegionalPerformanceWidget,
  CityBreakdownWidget
} from './GeographicWidgets';

/**
 * Widget Registry - Maps widget keys to their components
 * Add new widgets here to make them available in the dashboard
 */
const WIDGET_COMPONENTS = {
  // === OVERVIEW WIDGETS ===
  total_records: TotalRecordsWidget,
  total_clients: TotalClientsWidget,
  custom_reports: CustomReportsWidget,
  active_subscriptions: ActiveSubscriptionsWidget,
  recent_activity: RecentActivityWidget,
  staff_members: StaffMembersWidget,
  guest_users: GuestUsersWidget,

  // === FINANCIAL ANALYTICS ===
  revenue_analytics: RevenueAnalyticsWidget,
  subscription_revenue: SubscriptionRevenueWidget,
  customer_lifetime_value: CustomerLifetimeValueWidget,
  churn_rate: ChurnRateWidget,

  // === CONVERSION & GROWTH ===
  conversion_rate: ConversionRateWidget,
  growth_rate: GrowthRateWidget,

  // === USER ACTIVITY & ENGAGEMENT ===
  activity_heatmap: ActivityHeatmapWidget,
  page_views_analytics: PageViewsAnalyticsWidget,
  session_duration: SessionDurationWidget,
  search_analytics: SearchAnalyticsWidget,
  device_analytics: DeviceAnalyticsWidget,
  traffic_sources: TrafficSourcesWidget,

  // === GEOGRAPHIC ANALYTICS ===
  geographic_heatmap: GeographicHeatmapWidget,
  country_distribution: CountryDistributionWidget,
  top_countries: TopCountriesWidget,
  regional_performance: RegionalPerformanceWidget,
  city_breakdown: CityBreakdownWidget,

  // === OTHER ANALYTICS ===
  records_by_category: RecordsByCategoryWidget,
  monthly_trend: MonthlyTrendWidget,
  top_materials: TopMaterialsWidget,
  subscription_expiry: SubscriptionExpiryWidget,
  activity_feed: RecentActivityFeedWidget,

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
          <h3 className="font-semibold text-gray-900 mb-2">Widget Not Implemented</h3>
          <p className="text-sm text-gray-500 mb-1">{widget.title}</p>
          <p className="text-xs text-gray-400 px-4 py-2 bg-gray-50 rounded-lg mt-2">
            Key: <code className="font-mono">{widget.widget_key}</code>
          </p>
          <p className="text-xs text-gray-400 mt-4 max-w-xs">
            This widget is registered in the backend but hasn't been created yet.
            Add it to the WidgetRenderer component to display it.
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