# reports/api_urls.py

from django.urls import path, include
from django.views.generic import RedirectView
from . import views
from rest_framework.routers import DefaultRouter
from .views import (
    # NOTE: SuperdatabaseRecordListAPIView and SuperdatabaseRecordDetailAPIView removed
    # System now uses Company Database only
    DashboardStatsAPIView,
    EnhancedDashboardStatsAPIView,
    FilterOptionsAPIView,
    TechnicalFilterOptionsAPIView,
    DatabaseStatsAPIView,
    DashboardWidgetViewSet,
    EnabledWidgetsAPIView,
    HelpArticleFeedbackAdminAPIView,
    ReportFeedbackAdminAPIView,
)
from .company_views import (
    CompanyListCreateAPIView,
    CompanyDetailAPIView,
)
from .custom_report_views import (
    CustomReportListCreateAPIView,
    CustomReportDetailAPIView,
    ReportPreviewAPIView,
    ReportRecordsAPIView,
    SubscriptionListCreateAPIView,
    SubscriptionDetailAPIView,
    MySubscriptionsAPIView,
    MyActiveReportsAPIView,
    renew_subscription,
    cancel_subscription,
    ClientListAPIView,
    SubscriptionStatsAPIView,
    ClientSearchAPIView,
    ReportSearchAPIView,
)
from .field_metadata_view import (
    get_field_metadata_api,
    get_category_fields_api,
)

from .import_export_views import (
    download_import_template,
    export_sites,
    import_preview,
    import_confirm,
)

# Dashboard stats views (real data for widgets)
from .dashboard_stats_views import (
    comprehensive_dashboard_stats,
    widget_top_countries,
    widget_top_materials,
    widget_monthly_trend,
    widget_subscription_expiry,
    widget_verification_queue,
    widget_recent_activity,
    widget_system_health,
    # User tracking widgets
    widget_most_active_users,
    widget_login_activity_trend,
    widget_online_users,
    widget_user_activity_timeline,
    widget_new_registrations,
    widget_inactive_users,
    widget_session_stats,
    # Security & analytics widgets
    widget_geographic_distribution,
    widget_2fa_adoption,
    widget_device_browser_stats,
    widget_login_failure_rate,
    widget_active_sessions_detail,
    widget_successful_logins,
    widget_failed_logins_detail,
    widget_blocked_ips,
    widget_suspicious_activity,
)

# Management API (for running commands)
from .management_api import (
    sync_widgets_api,
    build_frontend_api,
    clear_cache_api,
    collect_static_api,
)

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'widgets', DashboardWidgetViewSet, basename='widget')

urlpatterns = [
    # Company Database endpoints (replacing Superdatabase)
    path('records/', CompanyListCreateAPIView.as_view(), name='api-record-list'),
    path('records/<int:pk>/', CompanyDetailAPIView.as_view(), name='api-record-detail'),
    path('stats/', DashboardStatsAPIView.as_view(), name='api-dashboard-stats'),
    path('dashboard/', DashboardStatsAPIView.as_view(), name='dashboard-stats'),
    path('dashboard-stats/', EnhancedDashboardStatsAPIView.as_view(), name='api-enhanced-dashboard-stats'),

    # Redirect old Superdatabase endpoints to Company Database
    path('superdatabase/', CompanyListCreateAPIView.as_view(), name='superdatabase-list'),
    path('superdatabase/<int:pk>/', CompanyDetailAPIView.as_view(), name='superdatabase-detail'),
    
    # Filter options (now query Company Database)
    path('filter-options/', FilterOptionsAPIView.as_view(), name='api-filter-options'),
    path('technical-filter-options/', TechnicalFilterOptionsAPIView.as_view(), name='api-technical-filter-options'),
    
    # Database stats (queries Company Database)
    path('database-stats/', DatabaseStatsAPIView.as_view(), name='api-database-stats'),
    path('widgets/update_order/', views.update_widget_order, name='update_widget_order'),

    # Widget management endpoints
    path('enabled-widgets/', EnabledWidgetsAPIView.as_view(), name='api-enabled-widgets'),
    path('', include(router.urls)),  # This adds all widget CRUD endpoints

    # Custom Reports URLs
    path('custom-reports/', CustomReportListCreateAPIView.as_view(), name='api-custom-report-list'),
    path('custom-reports/<uuid:report_id>/', CustomReportDetailAPIView.as_view(), name='api-custom-report-detail'),
    path('custom-reports/<uuid:report_id>/records/', ReportRecordsAPIView.as_view(), name='api-report-records'),
    path('report-preview/', ReportPreviewAPIView.as_view(), name='api-report-preview'),
    path('client/report-export/', views.client_report_export, name='client-report-export'),
    path('client/report_stats/', views.client_report_stats, name='client_report_stats'),

    # Subscription URLs
    path('subscriptions/', SubscriptionListCreateAPIView.as_view(), name='api-subscription-list'),
    path('subscriptions/<uuid:subscription_id>/', SubscriptionDetailAPIView.as_view(), name='api-subscription-detail'),
    path('subscriptions/<uuid:subscription_id>/renew/', renew_subscription, name='api-subscription-renew'),
    path('subscriptions/<uuid:subscription_id>/cancel/', cancel_subscription, name='api-subscription-cancel'),
    path('my-subscriptions/', MySubscriptionsAPIView.as_view(), name='api-my-subscriptions'),
    path('my-active-reports/', MyActiveReportsAPIView.as_view(), name='api-my-active-reports'),
    path('subscription-stats/', SubscriptionStatsAPIView.as_view(), name='api-subscription-stats'),

    # Server-side Search URLs (for subscription modal)
    path('client/', include('reports.client_api_urls')),
    path('clients/search/', ClientSearchAPIView.as_view(), name='client-search'),
    path('reports/search/', ReportSearchAPIView.as_view(), name='report-search'),

    # Client Management URLs
    path('clients/', ClientListAPIView.as_view(), name='api-client-list'),

    # Unverified Sites URLs
    path('', include('reports.unverified_urls')),
    path('', include('reports.project_urls')),

    # Field metadata endpoints
    path('fields/metadata/', get_field_metadata_api, name='field-metadata-all'),
    path('fields/metadata/<str:category>/', get_category_fields_api, name='field-metadata-category'),

    path('', include('reports.calling_urls')),

    # Import/Export URLs
    path('import-export/template/', download_import_template, name='download-import-template'),
    path('import-export/export/', export_sites, name='export-sites'),
    path('import-export/preview/', import_preview, name='import-preview'),
    path('import-export/confirm/', import_confirm, name='import-confirm'),

    # Help Center Feedback Admin
    path('help-center-feedback/', HelpArticleFeedbackAdminAPIView.as_view(), name='help-center-feedback-admin'),
    
    # Report Feedback Admin
    path('report-feedback/', ReportFeedbackAdminAPIView.as_view(), name='report-feedback-admin'),
    
    # =========================================================================
    # DASHBOARD WIDGET DATA ENDPOINTS (Real Data)
    # =========================================================================
    path('dashboard/comprehensive/', comprehensive_dashboard_stats, name='comprehensive-dashboard-stats'),
    path('dashboard/widgets/top-countries/', widget_top_countries, name='widget-top-countries'),
    path('dashboard/widgets/top-materials/', widget_top_materials, name='widget-top-materials'),
    path('dashboard/widgets/monthly-trend/', widget_monthly_trend, name='widget-monthly-trend'),
    path('dashboard/widgets/subscription-expiry/', widget_subscription_expiry, name='widget-subscription-expiry'),
    path('dashboard/widgets/verification-queue/', widget_verification_queue, name='widget-verification-queue'),
    path('dashboard/widgets/recent-activity/', widget_recent_activity, name='widget-recent-activity'),
    path('dashboard/widgets/system-health/', widget_system_health, name='widget-system-health'),
    
    # User tracking widget endpoints
    path('dashboard/widgets/most-active-users/', widget_most_active_users, name='widget-most-active-users'),
    path('dashboard/widgets/login-activity-trend/', widget_login_activity_trend, name='widget-login-activity-trend'),
    path('dashboard/widgets/online-users/', widget_online_users, name='widget-online-users'),
    path('dashboard/widgets/user-activity-timeline/', widget_user_activity_timeline, name='widget-user-activity-timeline'),
    path('dashboard/widgets/new-registrations/', widget_new_registrations, name='widget-new-registrations'),
    path('dashboard/widgets/inactive-users/', widget_inactive_users, name='widget-inactive-users'),
    path('dashboard/widgets/session-stats/', widget_session_stats, name='widget-session-stats'),
    
    # Security & analytics widget endpoints
    path('dashboard/widgets/geographic-distribution/', widget_geographic_distribution, name='widget-geographic-distribution'),
    path('dashboard/widgets/2fa-adoption/', widget_2fa_adoption, name='widget-2fa-adoption'),
    path('dashboard/widgets/device-browser-stats/', widget_device_browser_stats, name='widget-device-browser-stats'),
    path('dashboard/widgets/login-failure-rate/', widget_login_failure_rate, name='widget-login-failure-rate'),
    path('dashboard/widgets/active-sessions/', widget_active_sessions_detail, name='widget-active-sessions'),
    path('dashboard/widgets/successful-logins/', widget_successful_logins, name='widget-successful-logins'),
    path('dashboard/widgets/failed-logins-detail/', widget_failed_logins_detail, name='widget-failed-logins-detail'),
    path('dashboard/widgets/blocked-ips/', widget_blocked_ips, name='widget-blocked-ips'),
    path('dashboard/widgets/suspicious-activity/', widget_suspicious_activity, name='widget-suspicious-activity'),
    
    # =========================================================================
    # MANAGEMENT API ENDPOINTS (Superadmin only)
    # =========================================================================
    path('management/sync-widgets/', sync_widgets_api, name='sync-widgets-api'),
    path('management/build-frontend/', build_frontend_api, name='build-frontend-api'),
    path('management/clear-cache/', clear_cache_api, name='clear-cache-api'),
    path('management/collect-static/', collect_static_api, name='collect-static-api'),
]

# The router automatically creates these endpoints:
# GET    /api/widgets/                  - List all widgets
# POST   /api/widgets/                  - Create a widget
# GET    /api/widgets/{id}/             - Get specific widget
# PUT    /api/widgets/{id}/             - Update widget
# PATCH  /api/widgets/{id}/             - Partial update
# DELETE /api/widgets/{id}/             - Delete widget
# POST   /api/widgets/{id}/toggle_enabled/  - Toggle widget enabled status
# POST   /api/widgets/reorder/          - Reorder widgets
# POST   /api/widgets/bulk_toggle/      - Bulk enable/disable