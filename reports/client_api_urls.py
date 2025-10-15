"""
Client-specific API URLs for purchased reports and subscriptions.

"""

from django.urls import path
from .client_views import (
    ClientSubscriptionsAPIView,
    ClientReportDataAPIView,
    ClientReportStatsAPIView,
    ClientFilterOptionsAPIView,
    ClientReportExportAPIView,
)

urlpatterns = [
    # Get all active subscriptions for the client
    path('subscriptions/', ClientSubscriptionsAPIView.as_view(), name='client-subscriptions'),

    # Get filtered records for a specific report
    path('report-data/', ClientReportDataAPIView.as_view(), name='client-report-data'),

    # Get stats for a specific report
    path('report-stats/', ClientReportStatsAPIView.as_view(), name='client-report-stats'),

    # Get filter options for a specific report
    path('filter-options/', ClientFilterOptionsAPIView.as_view(), name='client-filter-options'),

    path('report-export/', ClientReportExportAPIView.as_view(), name='client-report-export'),
]