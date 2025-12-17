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