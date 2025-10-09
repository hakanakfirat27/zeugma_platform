from django.urls import path
from .views import (
    SuperdatabaseRecordListAPIView,
    DashboardStatsAPIView,
    FilterOptionsAPIView,
    SuperdatabaseRecordDetailAPIView
)

urlpatterns = [
    # This URL will be at /api/records/
    path('records/', SuperdatabaseRecordListAPIView.as_view(), name='api-record-list'),
    path('records/<uuid:factory_id>/', SuperdatabaseRecordDetailAPIView.as_view(), name='api-record-detail'),
    path('stats/', DashboardStatsAPIView.as_view(), name='api-dashboard-stats'),
    path('filter-options/', FilterOptionsAPIView.as_view(), name='api-filter-options'),
]