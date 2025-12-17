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
    ClientReportColumnsAPIView,
    ClientTechnicalFilterOptionsAPIView,
    ClientMaterialStatsAPIView,
    HelpArticleFeedbackAPIView,
    ReportFeedbackAPIView
)
from .saved_search_views import (
    SavedSearchListCreateAPIView,
    SavedSearchDetailAPIView
)
from .export_template_views import (
    ExportTemplateListCreateAPIView,
    ExportTemplateDetailAPIView,
    ExportToExcelAPIView
)
urlpatterns = [
    # Get all active subscriptions for the client
    path('subscriptions/', ClientSubscriptionsAPIView.as_view(), name='client-subscriptions'),

    # Get filtered records for a specific report
    path('report-data/', ClientReportDataAPIView.as_view(), name='client-report-data'),

    # Get stats for a specific report
    path('report-stats/', ClientReportStatsAPIView.as_view(), name='client-report-stats'),

    # Get filter options for a specific report
    path('filter-options/', ClientFilterOptionsAPIView.as_view(), name='client-report-filters'),

    # NEW: Get technical filter options for a specific report
    path('technical-filter-options/', ClientTechnicalFilterOptionsAPIView.as_view(), name='client-technical-filters'),

    path('report-export/', ClientReportExportAPIView.as_view(), name='client-report-export'),

    path('saved-searches/', SavedSearchListCreateAPIView.as_view(), name='client-saved-searches'),
    path('saved-searches/<uuid:search_id>/', SavedSearchDetailAPIView.as_view(), name='client-saved-search-detail'),

    path('export-templates/', ExportTemplateListCreateAPIView.as_view(), name='export-templates'),
    path('export-templates/<uuid:template_id>/', ExportTemplateDetailAPIView.as_view(), name='export-template-detail'),
    path('export-excel/', ExportToExcelAPIView.as_view(), name='export-excel'),
    path('report-columns/', ClientReportColumnsAPIView.as_view(), name='client-report-columns'),
    
    # Get material stats with filters applied
    path('material-stats/', ClientMaterialStatsAPIView.as_view(), name='client-material-stats'),
    
    # Help Center article feedback
    path('help-article-feedback/', HelpArticleFeedbackAPIView.as_view(), name='help-article-feedback'),
    
    # Report feedback
    path('report-feedback/', ReportFeedbackAPIView.as_view(), name='report-feedback'),
]