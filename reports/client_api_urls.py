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
    ReportFeedbackAPIView,
    ClientRecordDetailAPIView
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
from .client_notes_views import (
    ClientNotesListCreateAPIView,
    ClientNoteDetailAPIView,
    ClientNotesStatsAPIView
)
from .client_favorites_views import (
    FavoriteCompanyListCreateAPIView,
    FavoriteCompanyDeleteAPIView,
    FavoriteCompanyCheckAPIView,
    FavoriteCompanyStatsAPIView,
    PinnedReportListCreateAPIView,
    PinnedReportDeleteAPIView,
    PinnedReportReorderAPIView,
    CollectionListCreateAPIView,
    CollectionDetailAPIView,
    CollectionItemAddAPIView,
    CollectionItemRemoveAPIView,
    CollectionItemUpdateAPIView,
    AddToMultipleCollectionsAPIView,
    CompanyCollectionMembershipAPIView,
    CollectionStatsForReportAPIView
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
    
    # Client Notes
    path('notes/', ClientNotesListCreateAPIView.as_view(), name='client-notes'),
    path('notes/<uuid:note_id>/', ClientNoteDetailAPIView.as_view(), name='client-note-detail'),
    path('notes/stats/', ClientNotesStatsAPIView.as_view(), name='client-notes-stats'),
    
    # Favorite Companies
    path('favorites/', FavoriteCompanyListCreateAPIView.as_view(), name='client-favorites'),
    path('favorites/<uuid:favorite_id>/', FavoriteCompanyDeleteAPIView.as_view(), name='client-favorite-delete'),
    path('favorites/check/', FavoriteCompanyCheckAPIView.as_view(), name='client-favorite-check'),
    path('favorites/stats/', FavoriteCompanyStatsAPIView.as_view(), name='client-favorite-stats'),
    
    # Pinned Reports
    path('pinned-reports/', PinnedReportListCreateAPIView.as_view(), name='client-pinned-reports'),
    path('pinned-reports/<uuid:pin_id>/', PinnedReportDeleteAPIView.as_view(), name='client-pinned-report-delete'),
    path('pinned-reports/reorder/', PinnedReportReorderAPIView.as_view(), name='client-pinned-report-reorder'),
    
    # Collections
    path('collections/', CollectionListCreateAPIView.as_view(), name='client-collections'),
    path('collections/<uuid:collection_id>/', CollectionDetailAPIView.as_view(), name='client-collection-detail'),
    path('collections/<uuid:collection_id>/items/', CollectionItemAddAPIView.as_view(), name='client-collection-add-item'),
    path('collections/<uuid:collection_id>/items/<uuid:item_id>/', CollectionItemRemoveAPIView.as_view(), name='client-collection-remove-item'),
    path('collections/<uuid:collection_id>/items/<uuid:item_id>/update/', CollectionItemUpdateAPIView.as_view(), name='client-collection-update-item'),
    path('collections/add-to-multiple/', AddToMultipleCollectionsAPIView.as_view(), name='client-add-to-multiple-collections'),
    path('collections/membership/', CompanyCollectionMembershipAPIView.as_view(), name='client-collection-membership'),
    path('collections/stats/', CollectionStatsForReportAPIView.as_view(), name='client-collection-stats'),
    
    # Single record detail (for viewing favorites/collection items)
    path('reports/<uuid:report_id>/records/<str:record_id>/', ClientRecordDetailAPIView.as_view(), name='client-record-detail'),
]