# reports/calling_views.py

"""
API Views for the calling workflow system.
Add this as a new file: reports/calling_views.py
"""
import sys
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, Q
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
import uuid
import logging
logger = logging.getLogger(__name__)

from .models import CallLog, FieldConfirmation, UnverifiedSite
from .calling_serializers import (
    CallLogSerializer,
    CallLogCreateSerializer,
    FieldConfirmationSerializer,
    FieldConfirmationUpdateSerializer,
    BulkFieldConfirmationSerializer,
    CallingStatusUpdateSerializer,
    CallingStatsSerializer,
    SiteCallingDetailsSerializer,
    CallingStatusHistorySerializer,
    ThankYouEmailSerializer,  
    EmailLogSerializer,  

)
from .permissions import IsStaffOrDataCollector
from .project_permissions import user_can_access_site 
from accounts.models import UserRole



class CallLogListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: List all call logs for a site (timeline format)
    POST: Add a new call log entry
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CallLogCreateSerializer
        return CallLogSerializer
    
    def get_queryset(self):
        """Get call logs for specific site"""
        site_id = self.kwargs.get('site_id')
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        # Check permissions using project-based access
        user = self.request.user
        if not user_can_access_site(user, site):  # ✅ NEW
            return CallLog.objects.none()
        
        return site.call_logs.all().select_related('created_by')
    
    def perform_create(self, serializer):
        """Create new call log entry"""
        site_id = self.kwargs.get('site_id')
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        # Check permissions using project-based access
        user = self.request.user
        if not user_can_access_site(user, site):  # ✅ NEW
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to add call logs to this site")
        
        # Use the site's method to add call log (handles call number automatically)
        call_notes = serializer.validated_data['call_notes']
        call_log = site.add_call_log(notes=call_notes, created_by=user)
        
        # Update serializer instance
        serializer.instance = call_log



class CallLogDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Get specific call log
    PUT/PATCH: Update call log notes
    DELETE: Delete call log
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    serializer_class = CallLogSerializer
    lookup_field = 'call_id'
    
    def get_queryset(self):
        """Filter based on permissions"""
        user = self.request.user
        
        if user.role == UserRole.DATA_COLLECTOR:
            return CallLog.objects.filter(created_by=user)
        
        return CallLog.objects.all()
    
    def perform_destroy(self, instance):
        """Delete call log and update site's total_calls"""
        site = instance.site
        instance.delete()
        
        # Recalculate total calls
        site.total_calls = site.call_logs.count()
        site.save(update_fields=['total_calls'])



class FieldConfirmationListAPIView(generics.ListAPIView):
    """
    GET: List all field confirmations for a site
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    serializer_class = FieldConfirmationSerializer
    
    def get_queryset(self):
        """Get confirmations for specific site"""
        site_id = self.kwargs.get('site_id')
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        # Check permissions using project-based access
        user = self.request.user
        if not user_can_access_site(user, site):  # ✅ NEW
            return FieldConfirmation.objects.none()
        
        return site.field_confirmations.all().select_related('confirmed_by')



@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def update_field_confirmation(request, site_id, field_name):
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    
    # Check permissions using project-based access
    user = request.user
    if not user_can_access_site(user, site):  # ✅ NEW
        return Response(
            {'error': 'You do not have permission to update confirmations for this site'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get or create confirmation
    confirmation, created = FieldConfirmation.objects.get_or_create(
        site=site,
        field_name=field_name,
        defaults={
            'confirmed_by': user,
            'confirmed_at': timezone.now() if request.data.get('is_confirmed') else None,
        }
    )
    
    # Update using serializer
    serializer = FieldConfirmationUpdateSerializer(
        confirmation,
        data=request.data,
        context={'request': request},
        partial=True
    )
    
    if serializer.is_valid():
        serializer.save()
        
        # Return full serializer
        full_serializer = FieldConfirmationSerializer(confirmation)
        return Response(full_serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def bulk_update_field_confirmations(request, site_id):
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    
    # Check permissions using project-based access
    user = request.user
    if not user_can_access_site(user, site):  # ✅ NEW
        return Response(
            {'error': 'You do not have permission to update confirmations for this site'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Validate input
    serializer = BulkFieldConfirmationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    confirmations_data = serializer.validated_data['confirmations']
    updated_confirmations = []
    
    # Process each confirmation
    for conf_data in confirmations_data:
        field_name = conf_data['field_name']
        
        # Get or create confirmation
        confirmation, created = FieldConfirmation.objects.get_or_create(
            site=site,
            field_name=field_name,
            defaults={'confirmed_by': user}
        )
        
        # Update fields
        if 'is_confirmed' in conf_data:
            confirmation.is_confirmed = conf_data['is_confirmed']
            if conf_data['is_confirmed'] and not confirmation.confirmed_at:
                confirmation.confirmed_at = timezone.now()
                confirmation.confirmed_by = user
        
        if 'is_new_data' in conf_data:
            confirmation.is_new_data = conf_data['is_new_data']
        
        # Handle is_pre_filled - once true, stays true       
        if 'is_pre_filled' in conf_data:
            new_value = conf_data['is_pre_filled']
            
            if new_value:
                # Setting to True - always allow
                confirmation.is_pre_filled = True
            else:
                # Trying to set to False
                if confirmation.is_pre_filled:

                    # Currently False - allow setting to False
                    confirmation.is_pre_filled = False
                    # If already True, keep it True (pre-filled cannot be unchecked)

               
        # Handle last_selected (determines field color)
        if 'last_selected' in conf_data:
            confirmation.last_selected = conf_data['last_selected']
        
        if 'notes' in conf_data:
            confirmation.notes = conf_data['notes']
        
        confirmation.save()
        updated_confirmations.append(confirmation)        
    
    # Return updated confirmations
    response_serializer = FieldConfirmationSerializer(updated_confirmations, many=True)
    
    return Response({
        'updated_count': len(updated_confirmations),
        'confirmations': response_serializer.data,
    })



@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def update_calling_status(request, site_id):
    """Update calling status of a site"""
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    
    # Check permissions using project-based access
    user = request.user
    if not user_can_access_site(user, site):  # ✅ NEW
        return Response(
            {'error': 'You do not have permission to update status for this site'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Validate input
    serializer = CallingStatusUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    new_status = serializer.validated_data['calling_status']
    status_notes = serializer.validated_data.get('notes', '')
    
    # Update status using model method (now includes notes)
    site.update_calling_status(
        new_status=new_status,
        changed_by=user,
        status_notes=status_notes
    )
    
    # Return updated site data
    response_serializer = SiteCallingDetailsSerializer(site)
    return Response(response_serializer.data)



@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def get_calling_stats(request, project_id=None):
    """
    GET: Get calling workflow statistics
    
    Optional query params:
    - project_id: Filter by project
    """
    user = request.user
    
    # Base queryset
    queryset = UnverifiedSite.objects.all()
    
    # Filter by project if specified
    if project_id:
        queryset = queryset.filter(project_id=project_id)
    
    # Filter by user role
    if user.role == UserRole.DATA_COLLECTOR:
        queryset = queryset.filter(collected_by=user)
    
    # Calculate statistics
    stats = {
        'total_sites': queryset.count(),
        'not_started': queryset.filter(calling_status='NOT_STARTED').count(),
        'yellow_status': queryset.filter(calling_status='YELLOW').count(),
        'red_status': queryset.filter(calling_status='RED').count(),
        'purple_status': queryset.filter(calling_status='PURPLE').count(),
        'blue_status': queryset.filter(calling_status='BLUE').count(),
        'green_status': queryset.filter(calling_status='GREEN').count(),
        'avg_calls_per_site': queryset.aggregate(Avg('total_calls'))['total_calls__avg'] or 0,
        'total_calls_made': queryset.aggregate(models.Sum('total_calls'))['total_calls__sum'] or 0,
        'sites_needing_attention': queryset.filter(calling_status='YELLOW').count(),
        'sites_ready_for_review': queryset.filter(calling_status='GREEN').count(),
    }
    
    serializer = CallingStatsSerializer(stats)
    return Response(serializer.data)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_yellow_status_sites(request):
    """
    GET: Get all sites with YELLOW status (needs alternative numbers)
    For admin use - shows sites needing attention
    """
    user = request.user
    
    # Only staff/admin can access
    if user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
        return Response(
            {'error': 'Only admins can view yellow status sites'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get sites with YELLOW status
    yellow_sites = UnverifiedSite.objects.filter(
        calling_status='YELLOW'
    ).select_related(
        'collected_by',
        'project',
        'calling_status_changed_by'
    ).order_by('-calling_status_changed_at')
    
    # Serialize
    from .project_serializers import UnverifiedSiteSerializer
    serializer = UnverifiedSiteSerializer(yellow_sites, many=True)
    
    return Response({
        'count': yellow_sites.count(),
        'sites': serializer.data
    })



@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def get_status_history(request, site_id):
    """GET: Get all status change history for a site"""
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    
    # Check permissions
    user = request.user
    if not user_can_access_site(user, site):
        return Response(
            {'error': 'You can only view history for your own sites'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get history
    history = site.status_history.all()
    serializer = CallingStatusHistorySerializer(history, many=True)
    
    return Response(serializer.data)



@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def send_thank_you_email(request, site_id):
    """
    POST: Send thank you email to a company
    
    Features:
    - 12-hour cooldown per site
    - No daily limits
    - Can send again after 12 hours
    
    Body:
    {
        "company_name": "Example Corp",
        "recipient_email": "contact@example.com",
        "additional_message": "Optional custom message"
    }
    """
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    
    # Check permissions
    user = request.user
    if not user_can_access_site(user, site):
        return Response(
            {'error': 'You can only send emails for your own sites'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Validate input
    serializer = ThankYouEmailSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    company_name = serializer.validated_data['company_name']
    recipient_email = serializer.validated_data['recipient_email']
    additional_message = serializer.validated_data.get('additional_message', '')
    
    # ========================================================================
    # 12-HOUR COOLDOWN: Check last email sent for THIS site
    # ========================================================================
    
    from datetime import timedelta
    
    # Get the last email sent for this site (any email address)
    last_email_log = CallLog.objects.filter(
        site=site,
        call_notes__icontains='✉️ Thank you email sent to:'
    ).order_by('-created_at').first()
    
    if last_email_log:
        time_since_last = timezone.now() - last_email_log.created_at
        cooldown_hours = 12  # 12-hour cooldown per site
        
        if time_since_last < timedelta(hours=cooldown_hours):
            hours_remaining = cooldown_hours - (time_since_last.total_seconds() / 3600)
            minutes_remaining = (hours_remaining * 60) % 60
            
            # Extract previous recipient email from notes
            import re
            email_match = re.search(r'email sent to: ([^\s]+@[^\s]+)', last_email_log.call_notes)
            previous_recipient = email_match.group(1) if email_match else 'unknown'
            
            return Response({
                'success': False,
                'error': 'Cooldown period active',
                'details': f'A thank you email was sent for this site {time_since_last.total_seconds() / 3600:.1f} hours ago. '
                          f'Please wait {hours_remaining:.0f} hours and {minutes_remaining:.0f} minutes before sending another email.',
                'cooldown_info': {
                    'last_sent_at': last_email_log.created_at.isoformat(),
                    'last_sent_by': last_email_log.created_by.get_full_name() or last_email_log.created_by.username,
                    'previous_recipient': previous_recipient,
                    'hours_since_last': round(time_since_last.total_seconds() / 3600, 1),
                    'hours_remaining': round(hours_remaining, 1),
                    'minutes_remaining': round(minutes_remaining, 0),
                    'cooldown_hours': cooldown_hours
                }
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    # ========================================================================
    # SEND EMAIL
    # ========================================================================
    
    try:
        # Prepare email context
        context = {
            'company_name': company_name,
            'sender_name': user.get_full_name() or user.username,
            'additional_message': additional_message,
        }
        
        # Render HTML email
        html_content = render_to_string('email_templates/thank_you_email.html', context)
        
        # Create email subject
        subject = f'Thank You for Your Time - {company_name}'
        
        # Create email message
        email = EmailMultiAlternatives(
            subject=subject,
            body=f'Thank you for your time, {company_name}. Please view this email in HTML format.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient_email],
        )
        
        # Attach HTML content
        email.attach_alternative(html_content, "text/html")
        
        # Send email
        email.send(fail_silently=False)
        
        # Log the email in call notes
        call_note = f"✉️ Thank you email sent to: {recipient_email} ({company_name})"
        if additional_message:
            call_note += f"\nAdditional message: {additional_message}"
        
        # Create call log entry
        call_log = site.add_call_log(
            notes=call_note,
            created_by=user
        )
        
        logger.info(f"Thank you email sent to {recipient_email} for site {site_id} by {user.username}")
        
        return Response({
            'success': True,
            'message': f'Thank you email sent successfully to {recipient_email}',
            'details': {
                'company_name': company_name,
                'recipient_email': recipient_email,
                'sent_by': user.get_full_name() or user.username,
                'sent_at': timezone.now().isoformat(),
                'call_log_id': str(call_log.call_id),
            },
            'cooldown_info': {
                'cooldown_hours': 12,
                'next_available_at': (timezone.now() + timedelta(hours=12)).isoformat()
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error sending thank you email for site {site_id}: {str(e)}")
        
        # Log the failed attempt
        site.add_call_log(
            notes=f"❌ Failed to send thank you email to: {recipient_email} ({company_name}). Error: {str(e)}",
            created_by=user
        )
        
        return Response({
            'success': False,
            'error': 'Failed to send email',
            'details': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def check_email_status(request, site_id):
    """
    GET: Check if an email can be sent for this site
    Returns cooldown status and countdown timer
    """
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    user = request.user
    
    # Check permissions
    if not user_can_access_site(user, site):
        return Response(
            {'error': 'You can only check status for your own sites'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get last email sent for this site
    last_email_log = CallLog.objects.filter(
        site=site,
        call_notes__icontains='✉️ Thank you email sent to:'
    ).order_by('-created_at').first()
    
    can_send = True
    cooldown_info = None
    
    if last_email_log:
        from datetime import timedelta
        time_since_last = timezone.now() - last_email_log.created_at
        cooldown_hours = 12
        
        # Extract previous recipient email from notes
        import re
        email_match = re.search(r'email sent to: ([^\s]+@[^\s]+)', last_email_log.call_notes)
        previous_recipient = email_match.group(1) if email_match else 'unknown'
        
        if time_since_last < timedelta(hours=cooldown_hours):
            can_send = False
            hours_remaining = cooldown_hours - (time_since_last.total_seconds() / 3600)
            minutes_remaining = (hours_remaining * 60) % 60
            
            cooldown_info = {
                'last_sent_at': last_email_log.created_at.isoformat(),
                'last_sent_by': last_email_log.created_by.get_full_name() or last_email_log.created_by.username,
                'previous_recipient': previous_recipient,
                'hours_since_last': round(time_since_last.total_seconds() / 3600, 2),
                'hours_remaining': round(hours_remaining, 2),
                'minutes_remaining': int(minutes_remaining),
                'next_available_at': (last_email_log.created_at + timedelta(hours=cooldown_hours)).isoformat(),
                'cooldown_hours': cooldown_hours
            }
        else:
            # Cooldown expired, can send again
            cooldown_info = {
                'last_sent_at': last_email_log.created_at.isoformat(),
                'last_sent_by': last_email_log.created_by.get_full_name() or last_email_log.created_by.username,
                'previous_recipient': previous_recipient,
                'hours_since_last': round(time_since_last.total_seconds() / 3600, 2),
                'cooldown_expired': True
            }
    
    return Response({
        'can_send': can_send,
        'cooldown_info': cooldown_info,
        'site_id': str(site_id),
        'company_name': site.company_name
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def get_email_history(request, site_id):
    """
    GET: Get history of sent emails for a site
    (extracted from call logs)
    """
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    
    # Check permissions
    user = request.user
    if not user_can_access_site(user, site):
        return Response(
            {'error': 'You can only view email history for your own sites'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get call logs that contain email references
    email_logs = site.call_logs.filter(
        call_notes__icontains='email sent to:'
    ).order_by('-created_at')
    
    serializer = CallLogSerializer(email_logs, many=True)
    
    return Response({
        'site_id': str(site_id),
        'company_name': site.company_name,
        'email_count': email_logs.count(),
        'emails': serializer.data
    })