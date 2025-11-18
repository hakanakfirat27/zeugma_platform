# reports/calling_urls.py
# NEW FILE - URL Configuration for Calling Workflow

"""
URL Configuration for Calling Workflow API endpoints.
Add this as a new file: reports/calling_urls.py

Then include in reports/api_urls.py:
path('', include('reports.calling_urls')),
"""

from django.urls import path
from .calling_views import (
    # Call Logs
    CallLogListCreateAPIView,
    CallLogDetailAPIView,
    
    # Field Confirmations
    FieldConfirmationListAPIView,
    update_field_confirmation,
    bulk_update_field_confirmations,
    
    # Calling Status
    update_calling_status,
    get_calling_stats,
    get_yellow_status_sites,
    get_status_history,
)

urlpatterns = [
    # =========================================================================
    # CALL LOG ENDPOINTS
    # =========================================================================
    
    # List call logs and create new call for a site
    path(
        'sites/<uuid:site_id>/call-logs/',
        CallLogListCreateAPIView.as_view(),
        name='site-call-logs'
    ),
    
    # Get, update, delete specific call log
    path(
        'call-logs/<uuid:call_id>/',
        CallLogDetailAPIView.as_view(),
        name='call-log-detail'
    ),
    
    # =========================================================================
    # FIELD CONFIRMATION ENDPOINTS
    # =========================================================================
    
    # List all field confirmations for a site
    path(
        'sites/<uuid:site_id>/field-confirmations/',
        FieldConfirmationListAPIView.as_view(),
        name='site-field-confirmations'
    ),
    
    # Bulk update field confirmations
    path(
        'sites/<uuid:site_id>/field-confirmations/bulk/',
        bulk_update_field_confirmations,
        name='bulk-field-confirmations'
    ),

    # Update specific field confirmation
    path(
        'sites/<uuid:site_id>/field-confirmations/<str:field_name>/',
        update_field_confirmation,
        name='update-field-confirmation'
    ),
    

    
    # =========================================================================
    # CALLING STATUS ENDPOINTS
    # =========================================================================
    
    # Update calling status
    path(
        'sites/<uuid:site_id>/calling-status/',
        update_calling_status,
        name='update-calling-status'
    ),
    
    # Get calling statistics
    path(
        'calling-stats/',
        get_calling_stats,
        name='calling-stats'
    ),
    
    # Get calling stats for specific project
    path(
        'projects/<uuid:project_id>/calling-stats/',
        get_calling_stats,
        name='project-calling-stats'
    ),
    
    # Get sites with YELLOW status (admin only)
    path(
        'yellow-status-sites/',
        get_yellow_status_sites,
        name='yellow-status-sites'
    ),

    # Get status change history
    path(
        'sites/<uuid:site_id>/status-history/',
        get_status_history,
        name='site-status-history'
    ),    
]


# =============================================================================
# UPDATE YOUR reports/api_urls.py
# =============================================================================

"""
In your reports/api_urls.py, add this line:

# Calling Workflow URLs
path('', include('reports.calling_urls')),

This will mount all calling workflow endpoints under /api/
"""