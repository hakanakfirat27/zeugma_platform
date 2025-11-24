# reports/notes_views.py
"""
API Views for Site Review Notes Management
WITH FIXED UUID SERIALIZATION FOR WEBSOCKET
"""

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import ReviewNote, UnverifiedSite
from .project_serializers import ReviewNoteSerializer, ReviewNoteCreateSerializer
from .permissions import IsStaffOrDataCollector
from .project_permissions import user_can_access_site
from accounts.models import UserRole


class SiteReviewNotesListCreateAPIView(generics.ListCreateAPIView):
    """
    GET: List all review notes for a site
    POST: Add a new review note (with real-time WebSocket notification)
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReviewNoteCreateSerializer
        return ReviewNoteSerializer
    
    def get_queryset(self):
        """Get notes for specific site"""
        site_id = self.kwargs.get('site_id')
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        user = self.request.user
        
        # Check project-based access
        if not user_can_access_site(user, site):  # ✅ NEW
            return ReviewNote.objects.none()
        
        # Data collectors don't see internal notes
        if user.role == UserRole.DATA_COLLECTOR:
            return site.review_notes.filter(is_internal=False).order_by('-created_at')
        
        return site.review_notes.all().order_by('-created_at')
    
    def perform_create(self, serializer):
        """Create note for site and send WebSocket notification"""
        site_id = self.kwargs.get('site_id')
        site = get_object_or_404(UnverifiedSite, site_id=site_id)
        
        user = self.request.user
        
        # Check project-based access
        if not user_can_access_site(user, site):  # ✅ NEW
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to add notes to this site")
        
        is_internal = False
        if user.role in [UserRole.STAFF_ADMIN, UserRole.SUPERADMIN]:
            is_internal = serializer.validated_data.get('is_internal', False)
        
        note = serializer.save(
            site=site,
            created_by=user,
            is_internal=is_internal
        )
        
        self._send_note_notification(note, site, 'note_created')
    
    def _send_note_notification(self, note, site, notification_type):
        """
        Send WebSocket notification about a note
        ✅ FIXED: Manually creates dict to avoid UUID serialization issues
        """
        channel_layer = get_channel_layer()
        
        # ✅ Create clean dict with all UUIDs converted to strings
        note_data = {
            'note_id': str(note.note_id),
            'note_text': note.note_text,
            'created_by_name': note.created_by.get_full_name() if note.created_by else 'Unknown',
            'created_by_info': {
                'id': note.created_by.id if note.created_by else None,
                'username': note.created_by.username if note.created_by else None,
                'full_name': note.created_by.get_full_name() if note.created_by else 'Unknown',
                'role': note.created_by.role if note.created_by else None,
            },
            'created_at': note.created_at.isoformat(),
            'is_internal': note.is_internal,
        }
        
        # Determine recipients
        recipients = []
        if site.collected_by:
            recipients.append(site.collected_by.id)
        if note.created_by and note.created_by.id != site.collected_by.id:
            recipients.append(note.created_by.id)
        
        # Send to each recipient
        for user_id in recipients:
            async_to_sync(channel_layer.group_send)(
                f"notifications_{user_id}",
                {
                    'type': notification_type,
                    'note': note_data,
                    'site_id': str(site.site_id)
                }
            )
            print(f"📨 Sent {notification_type} notification to user {user_id}")


class ReviewNoteDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET: Get a specific note
    PUT/PATCH: Update a note (with real-time WebSocket notification)
    DELETE: Delete a note (with real-time WebSocket notification)
    """
    permission_classes = [IsAuthenticated, IsStaffOrDataCollector]
    serializer_class = ReviewNoteSerializer
    lookup_field = 'note_id'
    
    def get_queryset(self):
        """Filter notes based on permissions"""
        user = self.request.user
        
        if user.role == UserRole.DATA_COLLECTOR:
            return ReviewNote.objects.filter(
                created_by=user,
                is_internal=False
            )
        
        return ReviewNote.objects.all()
    
    def get_serializer_class(self):
        """Use create serializer for updates"""
        if self.request.method in ['PUT', 'PATCH']:
            return ReviewNoteCreateSerializer
        return ReviewNoteSerializer
    
    def perform_update(self, serializer):
        """Update note and send WebSocket notification"""
        note = self.get_object()
        
        if note.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only edit your own notes")
        
        updated_note = serializer.save()
        self._send_note_notification(updated_note, updated_note.site, 'note_updated')
    
    def perform_destroy(self, instance):
        """Delete note and send WebSocket notification"""
        if instance.created_by != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own notes")
        
        site = instance.site
        note_id = str(instance.note_id)
        
        instance.delete()
        
        # Send WebSocket notification
        channel_layer = get_channel_layer()
        if site.collected_by:
            async_to_sync(channel_layer.group_send)(
                f"notifications_{site.collected_by.id}",
                {
                    'type': 'note_deleted',
                    'note_id': note_id,
                    'site_id': str(site.site_id)
                }
            )
            print(f"📨 Sent note_deleted notification to user {site.collected_by.id}")
    
    def _send_note_notification(self, note, site, notification_type):
        """
        Send WebSocket notification about a note
        ✅ FIXED: Manually creates dict to avoid UUID serialization issues
        """
        channel_layer = get_channel_layer()
        
        # ✅ Create clean dict with all UUIDs converted to strings
        note_data = {
            'note_id': str(note.note_id),
            'note_text': note.note_text,
            'created_by_name': note.created_by.get_full_name() if note.created_by else 'Unknown',
            'created_by_info': {
                'id': note.created_by.id if note.created_by else None,
                'username': note.created_by.username if note.created_by else None,
                'full_name': note.created_by.get_full_name() if note.created_by else 'Unknown',
                'role': note.created_by.role if note.created_by else None,
            },
            'created_at': note.created_at.isoformat(),
            'is_internal': note.is_internal,
        }
        
        # Determine recipients
        recipients = []
        if site.collected_by:
            recipients.append(site.collected_by.id)
        if note.created_by and note.created_by.id != site.collected_by.id:
            recipients.append(note.created_by.id)
        
        # Send to each recipient
        for user_id in recipients:
            async_to_sync(channel_layer.group_send)(
                f"notifications_{user_id}",
                {
                    'type': notification_type,
                    'note': note_data,
                    'site_id': str(site.site_id)
                }
            )
            print(f"📨 Sent {notification_type} notification to user {user_id}")


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsStaffOrDataCollector])
def get_site_notes_summary(request, site_id):
    """Get a summary of notes for a site"""
    site = get_object_or_404(UnverifiedSite, site_id=site_id)
    
    user = request.user
    
    # Check project-based access
    if not user_can_access_site(user, site):  # ✅ NEW
        return Response(
            {'error': 'You do not have permission to view notes for this site'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    if user.role == UserRole.DATA_COLLECTOR:
        notes_count = site.review_notes.filter(is_internal=False).count()
    else:
        notes_count = site.review_notes.count()
    
    return Response({
        'site_id': str(site_id),
        'notes_count': notes_count,
        'has_notes': notes_count > 0,
    })