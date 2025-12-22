# backend/announcements/views.py
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count
from django_filters.rest_framework import DjangoFilterBackend

from .models import Announcement, AnnouncementView, AnnouncementAttachment
from .serializers import (
    AnnouncementListSerializer,
    AnnouncementDetailSerializer,
    AnnouncementViewSerializer,
    AnnouncementAttachmentSerializer,
    AnnouncementStatsSerializer
)
from .permissions import IsStaffOrSuperAdmin


class AnnouncementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing announcements

    Staff and SuperAdmin can create, update, delete
    All authenticated users can view announcements targeted to them
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'announcement_type', 'target_audience']
    search_fields = ['title', 'content', 'summary']
    ordering_fields = ['created_at', 'start_date', 'priority', 'views_count']
    ordering = ['-is_pinned', '-start_date']

    def get_queryset(self):
        """
        Filter announcements based on user role and permissions
        """
        user = self.request.user

        # Staff and SuperAdmin see all announcements in management view
        if self.action in ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy', 'publish', 'archive']:
            if user.role in ['SUPERADMIN', 'STAFF_ADMIN']:
                return Announcement.objects.all()

        # Regular users see only announcements targeted to them
        queryset = Announcement.objects.filter(status='active')

        # Filter by target audience
        queryset = queryset.filter(
            Q(target_audience='all') |
            Q(target_audience='clients') |
            Q(target_audience='staff') |
            Q(target_audience='custom', specific_users=user)
        ).distinct()

        # Filter by date range
        now = timezone.now()
        queryset = queryset.filter(start_date__lte=now)
        queryset = queryset.filter(Q(end_date__isnull=True) | Q(end_date__gte=now))

        return queryset

    def get_serializer_class(self):
        """Use different serializers for list and detail views"""
        if self.action == 'list':
            return AnnouncementListSerializer
        return AnnouncementDetailSerializer

    def get_permissions(self):
        """
        Staff/SuperAdmin can create/update/delete
        All authenticated users can view
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'publish', 'archive']:
            return [IsStaffOrSuperAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Send notifications when announcement is created as active"""
        announcement = serializer.save(created_by=self.request.user)
        
        # If created directly as active, send notifications
        if announcement.status == 'active':
            self._send_announcement_notifications(announcement)

    def perform_update(self, serializer):
        """Send notifications when announcement status changes to active"""
        old_status = self.get_object().status
        announcement = serializer.save()
        
        # If status changed to active, send notifications
        if old_status != 'active' and announcement.status == 'active':
            self._send_announcement_notifications(announcement)

    def retrieve(self, request, *args, **kwargs):
        """Mark announcement as viewed when retrieved"""
        announcement = self.get_object()

        # Track view
        view_obj, created = AnnouncementView.objects.get_or_create(
            announcement=announcement,
            user=request.user
        )

        # Increment view counter (only on first view)
        if created:
            announcement.increment_views()

        serializer = self.get_serializer(announcement)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_announcements(self, request):
        """Get announcements for the current user"""
        user = request.user
        now = timezone.now()

        # Get IDs of announcements that user has hidden (marked as viewed via delete_for_user)
        hidden_ids = AnnouncementView.objects.filter(
            user=user,
            hidden=True  # NEW: We'll add this field
        ).values_list('announcement_id', flat=True)

        # Get active announcements targeted to user
        queryset = Announcement.objects.filter(
            status='active',
            start_date__lte=now
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=now)
        ).exclude(
            id__in=hidden_ids  # Exclude hidden announcements
        )

        # Filter by target audience
        if user.role == 'SUPERADMIN':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='superadmin') |
                Q(target_audience='staff') |
                Q(target_audience='custom', specific_users=user)
            )
        elif user.role == 'STAFF_ADMIN':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='staff') |
                Q(target_audience='custom', specific_users=user)
            )
        elif user.role == 'DATA_COLLECTOR':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='data_collectors') |
                Q(target_audience='custom', specific_users=user)
            )
        else:  # CLIENT
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='clients') |
                Q(target_audience='custom', specific_users=user)
            )

        queryset = queryset.distinct().order_by('-is_pinned', '-start_date')

        serializer = AnnouncementListSerializer(
            queryset,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread announcements for current user"""
        user = request.user
        now = timezone.now()

        # Get viewed announcement IDs
        viewed_ids = AnnouncementView.objects.filter(
            user=user
        ).values_list('announcement_id', flat=True)

        # Get hidden announcement IDs
        hidden_ids = AnnouncementView.objects.filter(
            user=user,
            hidden=True
        ).values_list('announcement_id', flat=True)

        # Get active announcements not yet viewed and not hidden
        queryset = Announcement.objects.filter(
            status='active',
            start_date__lte=now
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=now)
        ).exclude(
            id__in=viewed_ids
        ).exclude(
            id__in=hidden_ids
        )

        # Filter by target audience
        if user.role == 'SUPERADMIN':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='superadmin') |
                Q(target_audience='staff') |
                Q(target_audience='custom', specific_users=user)
            )
        elif user.role == 'STAFF_ADMIN':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='staff') |
                Q(target_audience='custom', specific_users=user)
            )
        elif user.role == 'DATA_COLLECTOR':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='data_collectors') |
                Q(target_audience='custom', specific_users=user)
            )
        else:  # CLIENT
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='clients') |
                Q(target_audience='custom', specific_users=user)
            )

        unread_count = queryset.distinct().count()

        return Response({'unread_count': unread_count})

    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread announcements for current user"""
        user = request.user
        now = timezone.now()

        # Get active announcements not yet viewed by user
        viewed_ids = AnnouncementView.objects.filter(
            user=user
        ).values_list('announcement_id', flat=True)

        # Get hidden announcement IDs
        hidden_ids = AnnouncementView.objects.filter(
            user=user,
            hidden=True
        ).values_list('announcement_id', flat=True)

        queryset = Announcement.objects.filter(
            status='active',
            start_date__lte=now
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=now)
        ).exclude(
            id__in=viewed_ids
        ).exclude(
            id__in=hidden_ids
        )

        # Filter by target audience (same logic as my_announcements)
        if user.role == 'SUPERADMIN':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='superadmin') |
                Q(target_audience='staff') |
                Q(target_audience='custom', specific_users=user)
            )
        elif user.role == 'STAFF_ADMIN':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='staff') |
                Q(target_audience='custom', specific_users=user)
            )
        elif user.role == 'DATA_COLLECTOR':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='data_collectors') |
                Q(target_audience='custom', specific_users=user)
            )
        else:  # CLIENT
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='clients') |
                Q(target_audience='custom', specific_users=user)
            )

        queryset = queryset.distinct().order_by('-is_pinned', '-priority', '-start_date')

        serializer = AnnouncementListSerializer(
            queryset,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def popup(self, request):
        """Get popup announcements for current user (unviewed popups)"""
        user = request.user
        now = timezone.now()

        # Get viewed announcement IDs
        viewed_ids = AnnouncementView.objects.filter(
            user=user
        ).values_list('announcement_id', flat=True)

        # Get hidden announcement IDs
        hidden_ids = AnnouncementView.objects.filter(
            user=user,
            hidden=True
        ).values_list('announcement_id', flat=True)

        # Get popup announcements not yet viewed
        queryset = Announcement.objects.filter(
            status='active',
            show_popup=True,
            start_date__lte=now
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=now)
        ).exclude(
            id__in=viewed_ids
        ).exclude(
            id__in=hidden_ids
        )

        # Filter by target audience
        if user.role == 'SUPERADMIN':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='superadmin') |
                Q(target_audience='staff') |
                Q(target_audience='custom', specific_users=user)
            )
        elif user.role == 'STAFF_ADMIN':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='staff') |
                Q(target_audience='custom', specific_users=user)
            )
        elif user.role == 'DATA_COLLECTOR':
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='data_collectors') |
                Q(target_audience='custom', specific_users=user)
            )
        else:  # CLIENT
            queryset = queryset.filter(
                Q(target_audience='all') |
                Q(target_audience='clients') |
                Q(target_audience='custom', specific_users=user)
            )

        queryset = queryset.distinct().order_by('-priority', '-start_date')[:1]  # Get highest priority unviewed popup

        serializer = AnnouncementDetailSerializer(
            queryset,
            many=True,
            context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        """Mark announcement as acknowledged by user"""
        announcement = self.get_object()

        view_obj, created = AnnouncementView.objects.get_or_create(
            announcement=announcement,
            user=request.user
        )

        view_obj.acknowledge()

        return Response({
            'status': 'acknowledged',
            'acknowledged_at': view_obj.acknowledged_at
        })

    @action(detail=True, methods=['delete'])
    def delete_for_user(self, request, pk=None):
        """Delete announcement from user's view (hide it permanently)"""
        announcement = self.get_object()

        # Create or update view record to mark as viewed AND hidden
        view_obj, created = AnnouncementView.objects.get_or_create(
            announcement=announcement,
            user=request.user
        )

        # Mark as hidden so it won't appear again
        view_obj.hidden = True
        view_obj.save()

        # Increment views count only if this is the first time
        if created:
            announcement.increment_views()

        return Response({
            'status': 'deleted',
            'message': 'Announcement removed from your view'
        })

    @action(detail=True, methods=['get'])
    def views(self, request, pk=None):
        """Get all views for an announcement (Staff/SuperAdmin only)"""
        if request.user.role not in ['SUPERADMIN', 'STAFF_ADMIN']:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        announcement = self.get_object()
        views = announcement.user_views.all()
        serializer = AnnouncementViewSerializer(views, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get announcement statistics (Staff/SuperAdmin only)"""
        if request.user.role not in ['SUPERADMIN', 'STAFF_ADMIN']:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        total = Announcement.objects.count()
        active = Announcement.objects.filter(status='active').count()
        scheduled = Announcement.objects.filter(status='scheduled').count()
        draft = Announcement.objects.filter(status='draft').count()

        # Announcements by type
        by_type = dict(
            Announcement.objects.values('announcement_type').annotate(
                count=Count('id')
            ).values_list('announcement_type', 'count')
        )

        # Announcements by priority
        by_priority = dict(
            Announcement.objects.values('priority').annotate(
                count=Count('id')
            ).values_list('priority', 'count')
        )

        # Total views
        total_views = sum(
            Announcement.objects.values_list('views_count', flat=True)
        )

        # Recent announcements
        recent = Announcement.objects.all()[:5]

        stats = {
            'total_announcements': total,
            'active_announcements': active,
            'scheduled_announcements': scheduled,
            'draft_announcements': draft,
            'total_views': total_views,
            'announcements_by_type': by_type,
            'announcements_by_priority': by_priority,
            'recent_announcements': recent,
        }

        serializer = AnnouncementStatsSerializer(stats, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish a draft announcement (Staff/SuperAdmin only)"""
        if request.user.role not in ['SUPERADMIN', 'STAFF_ADMIN']:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        announcement = self.get_object()

        if announcement.status != 'draft':
            return Response(
                {'error': 'Only draft announcements can be published'},
                status=status.HTTP_400_BAD_REQUEST
            )

        announcement.status = 'active'
        announcement.save()

        # Send notifications to target users
        self._send_announcement_notifications(announcement)

        serializer = self.get_serializer(announcement)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive an announcement (Staff/SuperAdmin only)"""
        if request.user.role not in ['SUPERADMIN', 'STAFF_ADMIN']:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        announcement = self.get_object()
        announcement.status = 'archived'
        announcement.save()

        return Response({'status': 'archived'})

    def _send_announcement_notifications(self, announcement):
        """Send notifications to target users when announcement is published"""
        try:
            from notifications.models import Notification
            from notifications.services import check_notification_allowed, check_channel_enabled
            from notifications.push_service import send_push_notification
            from django.contrib.auth import get_user_model
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            User = get_user_model()

            # Check if notifications are allowed globally
            is_allowed, _ = check_notification_allowed('announcement')
            if not is_allowed:
                print(f"🚫 Announcement notification blocked by global settings")
                return

            # Check if in-app notifications are enabled
            inapp_enabled = check_channel_enabled('announcement', 'inapp')
            push_enabled = check_channel_enabled('announcement', 'push')

            # Get target users
            target_users = announcement.get_target_users()

            # Create notifications for each user
            notifications_to_create = []
            channel_layer = get_channel_layer()

            for user in target_users:
                # Create in-app notification
                if inapp_enabled:
                    notification = Notification(
                        user=user,
                        title=f"New Announcement: {announcement.title}",
                        message=announcement.summary or announcement.content[:100],
                        notification_type='announcement',
                        is_read=False,
                        related_announcement_id=announcement.id
                    )
                    notifications_to_create.append(notification)

            # Bulk create in-app notifications
            if notifications_to_create:
                created_notifications = Notification.objects.bulk_create(notifications_to_create)
                print(f"✅ Created {len(created_notifications)} in-app announcement notifications")

                # Send real-time WebSocket notifications
                for i, user in enumerate(target_users):
                    if i < len(created_notifications):
                        notification = created_notifications[i]
                        try:
                            async_to_sync(channel_layer.group_send)(
                                f'notifications_{user.id}',
                                {
                                    'type': 'notification_message',
                                    'notification': {
                                        'id': notification.id,
                                        'notification_type': notification.notification_type,
                                        'title': notification.title,
                                        'message': notification.message,
                                        'is_read': notification.is_read,
                                        'created_at': notification.created_at.isoformat(),
                                    }
                                }
                            )
                        except Exception as ws_error:
                            print(f"⚠️ WebSocket notification failed for {user.username}: {ws_error}")

            # Send push notifications
            if push_enabled:
                push_success = 0
                for user in target_users:
                    try:
                        result = send_push_notification(
                            user=user,
                            title=f"📢 {announcement.title}",
                            message=announcement.summary or announcement.content[:100],
                            url='/announcements',
                            tag=f'announcement_{announcement.id}',
                            notification_type='announcement'
                        )
                        if result.get('success', 0) > 0:
                            push_success += 1
                    except Exception as push_error:
                        print(f"⚠️ Push notification failed for {user.username}: {push_error}")
                
                if push_success > 0:
                    print(f"📱 Sent {push_success} push notifications for announcement")

        except Exception as e:
            # If notification system doesn't exist or fails, just log and continue
            print(f"❌ Failed to send notifications: {e}")
            import traceback
            traceback.print_exc()