print("🔥 calling_views.py IS BEING LOADED")

# reports/calling_views.py
# NEW FILE - API Views for Calling Workflow

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
)
from .permissions import IsStaffOrDataCollector
from accounts.models import UserRole


# =============================================================================
# CALL LOG ENDPOINTS
# =============================================================================

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
        
        # Check permissions
        user = self.request.user
        if user.role == UserRole.DATA_COLLECTOR:
            if site.collected_by != user:
                return CallLog.objects.none()
        
        return site.call_logs.all().select_related('created_by')
    
    def perform_create(self, serializer):
        """Create new call log entry"""
        site_id = self.kwargs.get('site_id')
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        # Check permissions
        user = self.request.user
        if user.role == UserRole.DATA_COLLECTOR and site.collected_by != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only add call logs to your own sites")
        
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


# =============================================================================
# FIELD CONFIRMATION ENDPOINTS
# =============================================================================

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
        
        # Check permissions
        user = self.request.user
        if user.role == UserRole.DATA_COLLECTOR:
            if site.collected_by != user:
                return FieldConfirmation.objects.none()
        
        return site.field_confirmations.all().select_related('confirmed_by')


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def update_field_confirmation(request, site_id, field_name):
    """
    POST: Update or create field confirmation for a specific field
    
    Body:
    {
        "is_confirmed": true,
        "is_new_data": false,
        "notes": "Optional notes"
    }
    """
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    
    # Check permissions
    user = request.user
    if user.role == UserRole.DATA_COLLECTOR and site.collected_by != user:
        return Response(
            {'error': 'You can only update confirmations for your own sites'},
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
    """
    POST: Bulk update field confirmations
    
    Body:
    {
        "confirmations": [
            {
                "field_name": "company_name",
                "is_confirmed": true,
                "is_new_data": false,
                "is_pre_filled": true,
                "last_selected": "is_confirmed"
            },
            {
                "field_name": "phone_number",
                "is_confirmed": false,
                "is_new_data": true,
                "is_pre_filled": true,
                "last_selected": "is_new_data"
            }
        ]
    }
    """
    print("="*80)
    print("BULK UPDATE FUNCTION CALLED!")
    print(f"Site ID: {site_id}")
    print(f"Request data: {request.data}")
    print("="*80)

    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    
    # Check permissions
    user = request.user
    if user.role == UserRole.DATA_COLLECTOR and site.collected_by != user:
        return Response(
            {'error': 'You can only update confirmations for your own sites'},
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
        
        # ========================================================================
        # UPDATE FIELDS WITH BUSINESS LOGIC ENFORCEMENT
        # ========================================================================
        
        if 'is_confirmed' in conf_data:
            confirmation.is_confirmed = conf_data['is_confirmed']
            if conf_data['is_confirmed'] and not confirmation.confirmed_at:
                confirmation.confirmed_at = timezone.now()
                confirmation.confirmed_by = user
        
        if 'is_new_data' in conf_data:
            confirmation.is_new_data = conf_data['is_new_data']
        
        # ⭐ Handle is_pre_filled - once true, stays true (cannot be unchecked)
        # ⭐ Handle is_pre_filled - COMPREHENSIVE DEBUG VERSION
        print(f"\n{'='*80}")
        print(f"DEBUG: Processing field '{field_name}'")
        print(f"  Received conf_data keys: {list(conf_data.keys())}")
        print(f"  Full conf_data: {conf_data}")
        print(f"  'is_pre_filled' in conf_data? {'is_pre_filled' in conf_data}")
        
        if 'is_pre_filled' in conf_data:
            new_value = conf_data['is_pre_filled']
            print(f"  new_value = {new_value}")
            print(f"  type(new_value) = {type(new_value)}")
            print(f"  bool(new_value) = {bool(new_value)}")
            print(f"  Current confirmation.is_pre_filled = {confirmation.is_pre_filled}")
            
            if new_value:
                # Setting to True - always allow
                print(f"  ✅ SETTING is_pre_filled to TRUE")
                confirmation.is_pre_filled = True
                print(f"  After setting: confirmation.is_pre_filled = {confirmation.is_pre_filled}")
            else:
                print(f"  ⚠️ new_value is falsy, handling False case...")
                # Trying to set to False
                if confirmation.is_pre_filled:
                    # Already True - keep it True (don't uncheck)
                    print(f"  🔒 Already True, keeping it True")
                    pass
                else:
                    # Currently False - allow setting to False
                    print(f"  ℹ️ Setting to False")
                    confirmation.is_pre_filled = False
        else:
            print(f"  ⏭️ 'is_pre_filled' not in conf_data, skipping")
        
        print(f"  Final value before save: confirmation.is_pre_filled = {confirmation.is_pre_filled}")
        print(f"{'='*80}\n")
        
        # ⭐ Handle last_selected (determines field color)
        if 'last_selected' in conf_data:
            confirmation.last_selected = conf_data['last_selected']
        
        if 'notes' in conf_data:
            confirmation.notes = conf_data['notes']
        
        # ========================================================================
        # END UPDATE SECTION
        # ========================================================================
        # DEBUG: Print what we're about to save
        import sys
        sys.stdout.flush()
        
        print(f"  is_pre_filled: {confirmation.is_pre_filled}")
        print(f"  is_confirmed: {confirmation.is_confirmed}")
        print(f"  is_new_data: {confirmation.is_new_data}")
        print(f"  last_selected: {confirmation.last_selected}")
        
        sys.stdout.flush()

        confirmation.save()
        updated_confirmations.append(confirmation)        
    
    # Return updated confirmations WITH DEBUG INFO
    response_serializer = FieldConfirmationSerializer(updated_confirmations, many=True)
    
    # ⭐ DEBUG: Build debug info from database
    debug_info = []
    for conf in updated_confirmations:
        debug_info.append({
            'field_name': conf.field_name,
            'is_pre_filled_in_db': conf.is_pre_filled,
            'is_confirmed_in_db': conf.is_confirmed,
            'is_new_data_in_db': conf.is_new_data,
            'last_selected_in_db': conf.last_selected,
        })
    
    return Response({
        'TESTING_NEW_CODE': 'YES_IT_WORKS',
        'updated_count': len(updated_confirmations),
        'confirmations': response_serializer.data,
        'debug_info': debug_info,  # ⭐ What's actually in database
        'received_data': confirmations_data,  # ⭐ What frontend sent
    })


# =============================================================================
# CALLING STATUS ENDPOINTS
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def update_calling_status(request, site_id):
    """Update calling status of a site"""
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    
    # Check permissions
    user = request.user
    if user.role == UserRole.DATA_COLLECTOR and site.collected_by != user:
        return Response(
            {'error': 'You can only update status for your own sites'},
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
    if user.role == UserRole.DATA_COLLECTOR and site.collected_by != user:
        return Response(
            {'error': 'You can only view history for your own sites'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get history
    history = site.status_history.all()
    serializer = CallingStatusHistorySerializer(history, many=True)
    
    return Response(serializer.data)