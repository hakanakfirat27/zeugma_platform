"""
API Views for Client Notes functionality.
Allows clients to add private notes to reports and individual company records.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count

from .models import ClientNote, CustomReport, Subscription
from accounts.models import UserRole


class ClientNoteSerializer:
    """Simple serializer for ClientNote model"""
    
    @staticmethod
    def serialize(note):
        return {
            'id': str(note.id),
            'report_id': str(note.report.report_id),
            'record_id': note.record_id,
            'company_name': note.company_name,
            'title': note.title,
            'content': note.content,
            'color': note.color,
            'is_pinned': note.is_pinned,
            'is_report_note': note.is_report_note,
            'created_at': note.created_at.isoformat(),
            'updated_at': note.updated_at.isoformat(),
        }
    
    @staticmethod
    def serialize_many(notes):
        return [ClientNoteSerializer.serialize(note) for note in notes]


class ClientNotesListCreateAPIView(APIView):
    """
    List and create client notes.
    
    GET /api/client/notes/?report_id=<uuid>&record_id=<int>
    POST /api/client/notes/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get notes for a specific report or record"""
        
        # Only clients can access
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can access notes"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        report_id = request.query_params.get('report_id')
        record_id = request.query_params.get('record_id')
        notes_type = request.query_params.get('type')  # 'report', 'record', or 'all'
        
        if not report_id:
            return Response(
                {"error": "report_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify report exists and user has access
        try:
            report = CustomReport.objects.get(report_id=report_id)
        except CustomReport.DoesNotExist:
            return Response(
                {"error": "Report not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify subscription
        today = timezone.now().date()
        has_subscription = Subscription.objects.filter(
            client=request.user,
            report=report,
            status='ACTIVE',
            start_date__lte=today,
            end_date__gte=today
        ).exists()
        
        if not has_subscription:
            return Response(
                {"error": "You don't have access to this report"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Build queryset
        notes = ClientNote.objects.filter(user=request.user, report=report)
        
        # Filter by type
        if notes_type == 'report':
            notes = notes.filter(record_id__isnull=True)
        elif notes_type == 'record':
            notes = notes.filter(record_id__isnull=False)
        
        # Filter by specific record
        if record_id:
            notes = notes.filter(record_id=record_id)
        
        # Get stats
        total_notes = ClientNote.objects.filter(user=request.user, report=report).count()
        report_notes_count = ClientNote.objects.filter(
            user=request.user, report=report, record_id__isnull=True
        ).count()
        record_notes_count = ClientNote.objects.filter(
            user=request.user, report=report, record_id__isnull=False
        ).count()
        
        return Response({
            "count": notes.count(),
            "stats": {
                "total": total_notes,
                "report_notes": report_notes_count,
                "company_notes": record_notes_count,
            },
            "results": ClientNoteSerializer.serialize_many(notes)
        })
    
    def post(self, request):
        """Create a new note"""
        
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can create notes"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        report_id = request.data.get('report_id')
        record_id = request.data.get('record_id')
        company_name = request.data.get('company_name')
        title = request.data.get('title', '')
        content = request.data.get('content')
        color = request.data.get('color', 'yellow')
        is_pinned = request.data.get('is_pinned', False)
        
        if not report_id:
            return Response(
                {"error": "report_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not content:
            return Response(
                {"error": "content is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify report
        try:
            report = CustomReport.objects.get(report_id=report_id)
        except CustomReport.DoesNotExist:
            return Response(
                {"error": "Report not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verify subscription
        today = timezone.now().date()
        has_subscription = Subscription.objects.filter(
            client=request.user,
            report=report,
            status='ACTIVE',
            start_date__lte=today,
            end_date__gte=today
        ).exists()
        
        if not has_subscription:
            return Response(
                {"error": "You don't have access to this report"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Create note
        note = ClientNote.objects.create(
            user=request.user,
            report=report,
            record_id=record_id,
            company_name=company_name,
            title=title,
            content=content,
            color=color,
            is_pinned=is_pinned
        )
        
        return Response(
            ClientNoteSerializer.serialize(note),
            status=status.HTTP_201_CREATED
        )


class ClientNoteDetailAPIView(APIView):
    """
    Retrieve, update, or delete a specific note.
    
    GET /api/client/notes/<uuid:note_id>/
    PATCH /api/client/notes/<uuid:note_id>/
    DELETE /api/client/notes/<uuid:note_id>/
    """
    
    permission_classes = [IsAuthenticated]
    
    def get_note(self, note_id, user):
        """Helper to get note and verify ownership"""
        try:
            note = ClientNote.objects.get(id=note_id, user=user)
            return note, None
        except ClientNote.DoesNotExist:
            return None, Response(
                {"error": "Note not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def get(self, request, note_id):
        """Get a specific note"""
        
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can access notes"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        note, error = self.get_note(note_id, request.user)
        if error:
            return error
        
        return Response(ClientNoteSerializer.serialize(note))
    
    def patch(self, request, note_id):
        """Update a note"""
        
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can update notes"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        note, error = self.get_note(note_id, request.user)
        if error:
            return error
        
        # Update allowed fields
        if 'title' in request.data:
            note.title = request.data['title']
        if 'content' in request.data:
            note.content = request.data['content']
        if 'color' in request.data:
            note.color = request.data['color']
        if 'is_pinned' in request.data:
            note.is_pinned = request.data['is_pinned']
        
        note.save()
        
        return Response(ClientNoteSerializer.serialize(note))
    
    def delete(self, request, note_id):
        """Delete a note"""
        
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can delete notes"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        note, error = self.get_note(note_id, request.user)
        if error:
            return error
        
        note.delete()
        
        return Response(
            {"message": "Note deleted successfully"},
            status=status.HTTP_204_NO_CONTENT
        )


class ClientNotesStatsAPIView(APIView):
    """
    Get notes statistics for a report.
    Returns counts of notes by record_id for showing badges on company rows.
    
    GET /api/client/notes/stats/?report_id=<uuid>
    """
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can access notes"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        report_id = request.query_params.get('report_id')
        
        if not report_id:
            return Response(
                {"error": "report_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify report
        try:
            report = CustomReport.objects.get(report_id=report_id)
        except CustomReport.DoesNotExist:
            return Response(
                {"error": "Report not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get notes with counts grouped by record_id
        notes = ClientNote.objects.filter(user=request.user, report=report)
        
        # Get record IDs that have notes
        record_notes = notes.filter(record_id__isnull=False).values('record_id').annotate(
            count=Count('id')
        )
        
        # Build map of record_id -> note count
        record_notes_map = {item['record_id']: item['count'] for item in record_notes}
        
        return Response({
            "total_notes": notes.count(),
            "report_notes_count": notes.filter(record_id__isnull=True).count(),
            "company_notes_count": notes.filter(record_id__isnull=False).count(),
            "record_notes_map": record_notes_map,  # {record_id: count}
        })
