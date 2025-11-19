# reports/calling_urls.py

from django.urls import path
from .calling_views import (
    CallLogListCreateAPIView,
    CallLogDetailAPIView,
    FieldConfirmationListAPIView,
    update_field_confirmation,
    bulk_update_field_confirmations,
    update_calling_status,
    get_calling_stats,
    get_yellow_status_sites,
    get_status_history,
    send_thank_you_email,
    get_email_history,    
    check_email_status,
)

urlpatterns = [

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


    # Send thank you email
    path(
        'sites/<uuid:site_id>/send-thank-you-email/',
        send_thank_you_email,
        name='send-thank-you-email'
    ),
    
    # Get email sending history for a site
    path(
        'sites/<uuid:site_id>/email-history/',
        get_email_history,
        name='email-history'
    ),    

    # check-email-status
    path(
        'sites/<uuid:site_id>/check-email-status/',
        check_email_status,
        name='check-email-status'
    ),

]

