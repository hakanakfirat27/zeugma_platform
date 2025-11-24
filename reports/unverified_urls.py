# reports/unverified_urls.py
"""
API URLs for Unverified Sites Management System
"""

from django.urls import path
from .unverified_views import (
    UnverifiedSiteListAPIView,
    UnverifiedSiteDetailAPIView,
    UnverifiedSiteCreateAPIView,
    UnverifiedSiteUpdateAPIView,
    UnverifiedSiteDeleteAPIView,
    UnverifiedSiteBulkActionAPIView,
    UnverifiedSiteStatsAPIView,
    ApproveUnverifiedSiteAPIView,
    RejectUnverifiedSiteAPIView,
    AssignReviewerAPIView,
    TransferToSuperdatabaseAPIView,
    VerificationHistoryListAPIView,
    UnverifiedSiteImportAPIView,
)

urlpatterns = [
    # =========================================================================
    # UNVERIFIED SITES CRUD
    # =========================================================================
    
    # List all unverified sites with filtering
    path('unverified-sites/', UnverifiedSiteListAPIView.as_view(), name='unverified-site-list'),
    
    # Get single unverified site details
    path('unverified-sites/<uuid:site_id>/', UnverifiedSiteDetailAPIView.as_view(), name='unverified-site-detail'),
    
    # Create new unverified site (manual entry)
    path('unverified-sites/create/', UnverifiedSiteCreateAPIView.as_view(), name='unverified-site-create'),
    
    # Update unverified site
    path('unverified-sites/<uuid:site_id>/update/', UnverifiedSiteUpdateAPIView.as_view(), name='unverified-site-update'),
    
    # Delete unverified site
    path('unverified-sites/<uuid:site_id>/delete/', UnverifiedSiteDeleteAPIView.as_view(), name='unverified-site-delete'),
    
    # =========================================================================
    # VERIFICATION ACTIONS
    # =========================================================================
    
    # Approve single site
    path('unverified-sites/<uuid:site_id>/approve/', ApproveUnverifiedSiteAPIView.as_view(), name='unverified-site-approve'),
    
    # Reject single site
    path('unverified-sites/<uuid:site_id>/reject/', RejectUnverifiedSiteAPIView.as_view(), name='unverified-site-reject'),
    
    # Assign reviewer to site
    path('unverified-sites/<uuid:site_id>/assign/', AssignReviewerAPIView.as_view(), name='unverified-site-assign'),
    
    # Transfer approved site to Superdatabase
    path('unverified-sites/<uuid:site_id>/transfer/', TransferToSuperdatabaseAPIView.as_view(), name='unverified-site-transfer'),
    
    # =========================================================================
    # BULK ACTIONS
    # =========================================================================
    
    # Bulk approve/reject/assign
    path('unverified-sites/bulk-action/', UnverifiedSiteBulkActionAPIView.as_view(), name='unverified-site-bulk-action'),
    
    # =========================================================================
    # STATISTICS & REPORTING
    # =========================================================================
    
    # Get statistics for dashboard
    path('unverified-sites/stats/', UnverifiedSiteStatsAPIView.as_view(), name='unverified-site-stats'),
    
    # =========================================================================
    # VERIFICATION HISTORY
    # =========================================================================
    
    # Get verification history for a site
    path('unverified-sites/<uuid:site_id>/history/', VerificationHistoryListAPIView.as_view(), name='verification-history'),
    
    # =========================================================================
    # IMPORT
    # =========================================================================
    
    # Import unverified data from Excel
    path('unverified-sites/import/', UnverifiedSiteImportAPIView.as_view(), name='unverified-site-import'),
]