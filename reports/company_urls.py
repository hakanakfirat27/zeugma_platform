# reports/company_urls.py
"""
URL Configuration for Company-Centric API

Base URL: /api/companies/

Endpoints:
- Companies
    GET    /api/companies/                                    List all companies
    POST   /api/companies/                                    Create company
    GET    /api/companies/<company_id>/                       Company detail
    PUT    /api/companies/<company_id>/                       Update company
    DELETE /api/companies/<company_id>/                       Soft delete company

- Production Sites
    GET    /api/companies/<company_id>/sites/                 List production sites
    POST   /api/companies/<company_id>/sites/                 Add production site
    GET    /api/companies/<company_id>/sites/<site_id>/       Site detail
    DELETE /api/companies/<company_id>/sites/<site_id>/       Mark site inactive

- Versions
    GET    /api/companies/<company_id>/sites/<site_id>/versions/           List versions
    POST   /api/companies/<company_id>/sites/<site_id>/versions/           Create version
    GET    /api/companies/<company_id>/sites/<site_id>/versions/<v_id>/    Version detail
    PUT    /api/companies/<company_id>/sites/<site_id>/current/            Update current
    POST   /api/companies/<company_id>/sites/<site_id>/restore/<v_id>/     Restore version

- Notes
    GET    /api/companies/<company_id>/notes/                 List notes
    POST   /api/companies/<company_id>/notes/                 Add note
    GET    /api/companies/<company_id>/notes/<note_id>/       Note detail
    PUT    /api/companies/<company_id>/notes/<note_id>/       Update note
    DELETE /api/companies/<company_id>/notes/<note_id>/       Delete note

- History
    GET    /api/companies/<company_id>/history/               Company history

- Utilities
    POST   /api/companies/check-duplicate/                    Check for duplicates
    POST   /api/companies/bulk-status/                        Bulk status update
    GET    /api/companies/stats/                              Company statistics
"""

from django.urls import path
from .company_views import (
    # Company views
    CompanyListCreateAPIView,
    CompanyDetailAPIView,
    
    # Production site views
    ProductionSiteListAPIView,
    ProductionSiteCreateAPIView,
    ProductionSiteDetailAPIView,
    
    # Version views
    VersionListAPIView,
    VersionDetailAPIView,
    CreateVersionAPIView,
    UpdateCurrentVersionAPIView,
    RestoreVersionAPIView,
    
    # Note views
    CompanyNoteListCreateAPIView,
    CompanyNoteDetailAPIView,
    
    # History view
    CompanyHistoryAPIView,
    
    # Utility views
    DuplicateCheckAPIView,
    BulkStatusUpdateAPIView,
    company_stats,
    
    # Import views
    ImportCompaniesAPIView,
    DownloadImportReportAPIView,
    ImportTemplateAPIView,
    ToggleProductionSiteActiveAPIView
)

app_name = 'companies'

urlpatterns = [
    # ==========================================================================
    # COMPANY ENDPOINTS
    # ==========================================================================
    
    # List and create companies
    path('', CompanyListCreateAPIView.as_view(), name='company-list'),
    
    # Company detail, update, delete (supports both integer pk and UUID)
    path('<int:pk>/', CompanyDetailAPIView.as_view(), name='company-detail-pk'),
    path('<uuid:company_id>/', CompanyDetailAPIView.as_view(), name='company-detail'),
    
    # ==========================================================================
    # PRODUCTION SITE ENDPOINTS
    # ==========================================================================
    
    # List production sites for a company
    path('<uuid:company_id>/sites/', ProductionSiteListAPIView.as_view(), name='production-site-list'),
    
    # Add production site to company
    path('<uuid:company_id>/sites/add/', ProductionSiteCreateAPIView.as_view(), name='production-site-create'),
    
    # ==========================================================================
    # VERSION ENDPOINTS (must come BEFORE site detail to match correctly)
    # ==========================================================================
    
    # Update current version (without creating new version)
    path(
        '<uuid:company_id>/sites/<uuid:site_id>/current/',
        UpdateCurrentVersionAPIView.as_view(),
        name='version-update-current'
    ),
    
    # List all versions for a production site
    path(
        '<uuid:company_id>/sites/<uuid:site_id>/versions/',
        VersionListAPIView.as_view(),
        name='version-list'
    ),
    
    # Create new version (explicit action)
    path(
        '<uuid:company_id>/sites/<uuid:site_id>/versions/create/',
        CreateVersionAPIView.as_view(),
        name='version-create'
    ),
    
    # Get specific version detail
    path(
        '<uuid:company_id>/sites/<uuid:site_id>/versions/<uuid:version_id>/',
        VersionDetailAPIView.as_view(),
        name='version-detail'
    ),
    
    # Restore old version (creates new version based on old)
    path(
        '<uuid:company_id>/sites/<uuid:site_id>/restore/<uuid:version_id>/',
        RestoreVersionAPIView.as_view(),
        name='version-restore'
    ),
    
    # Production site detail and delete (MUST come AFTER more specific routes)
    path('<uuid:company_id>/sites/<uuid:site_id>/', ProductionSiteDetailAPIView.as_view(), name='production-site-detail'),
    
    # ==========================================================================
    # NOTE ENDPOINTS
    # ==========================================================================
    
    # List and create notes for a company
    path('<uuid:company_id>/notes/', CompanyNoteListCreateAPIView.as_view(), name='note-list'),
    
    # Note detail, update, delete
    path('<uuid:company_id>/notes/<uuid:note_id>/', CompanyNoteDetailAPIView.as_view(), name='note-detail'),
    
    # ==========================================================================
    # HISTORY ENDPOINT
    # ==========================================================================
    
    # Company audit history
    path('<uuid:company_id>/history/', CompanyHistoryAPIView.as_view(), name='company-history'),
    
    # ==========================================================================
    # UTILITY ENDPOINTS
    # ==========================================================================
    
    # Check for duplicate company names
    path('check-duplicate/', DuplicateCheckAPIView.as_view(), name='duplicate-check'),
    
    # Bulk status update
    path('bulk-status/', BulkStatusUpdateAPIView.as_view(), name='bulk-status'),
    
    # Company statistics
    path('stats/', company_stats, name='company-stats'),
    
    # ==========================================================================
    # IMPORT ENDPOINTS
    # ==========================================================================
    
    # Import companies from Excel
    path('import/', ImportCompaniesAPIView.as_view(), name='import-companies'),
    
    # Get import template info
    path('import/template/', ImportTemplateAPIView.as_view(), name='import-template'),
    
    # Download potential duplicates report
    path('import/download-report/<str:filename>/', DownloadImportReportAPIView.as_view(), name='import-report'),

    # Toggle production site active/inactive
    path('<uuid:company_id>/sites/<uuid:site_id>/toggle-active/', ToggleProductionSiteActiveAPIView.as_view(), name='production-site-toggle-active'),
]


# =============================================================================
# INCLUDE IN MAIN URLS
# =============================================================================
"""
Add to zeugma_core/urls.py:

    from django.urls import path, include
    
    urlpatterns = [
        ...
        path('api/companies/', include('reports.company_urls', namespace='companies')),
        ...
    ]
"""