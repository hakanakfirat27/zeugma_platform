
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SuperdatabaseRecordListAPIView,
    DashboardStatsAPIView,
    EnhancedDashboardStatsAPIView,
    FilterOptionsAPIView,
    SuperdatabaseRecordDetailAPIView,
    DatabaseStatsAPIView,
    DashboardWidgetViewSet,
    EnabledWidgetsAPIView,
)

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'widgets', DashboardWidgetViewSet, basename='widget')

urlpatterns = [
    # Existing endpoints
    path('records/', SuperdatabaseRecordListAPIView.as_view(), name='api-record-list'),
    path('records/<uuid:factory_id>/', SuperdatabaseRecordDetailAPIView.as_view(), name='api-record-detail'),
    path('stats/', DashboardStatsAPIView.as_view(), name='api-dashboard-stats'),
    path('dashboard-stats/', EnhancedDashboardStatsAPIView.as_view(), name='api-enhanced-dashboard-stats'),
    path('filter-options/', FilterOptionsAPIView.as_view(), name='api-filter-options'),
    path('database-stats/', DatabaseStatsAPIView.as_view(), name='api-database-stats'),

    # Widget management endpoints
    path('enabled-widgets/', EnabledWidgetsAPIView.as_view(), name='api-enabled-widgets'),
    path('', include(router.urls)),  # This adds all widget CRUD endpoints
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