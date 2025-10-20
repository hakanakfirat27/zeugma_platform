from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]  # 👈 Changed back from AllowAny

    def get_queryset(self):
        """Only return notifications for the current user"""
        return Notification.objects.filter(user=self.request.user)  # 👈 Only authenticated user's notifications

    def list(self, request, *args, **kwargs):
        """Get all notifications for the current user"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        unread_count = queryset.filter(is_read=False).count()

        return Response({
            'notifications': serializer.data,
            'unread_count': unread_count
        })

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark a single notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'})

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Mark all notifications as read"""
        self.get_queryset().update(is_read=True)
        return Response({'status': 'all notifications marked as read'})

    @action(detail=True, methods=['delete'])
    def delete_notification(self, request, pk=None):
        """Delete a single notification"""
        notification = self.get_object()
        notification.delete()
        return Response({'status': 'notification deleted'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        """Delete all notifications for the user"""
        self.get_queryset().delete()
        return Response({'status': 'all notifications cleared'}, status=status.HTTP_204_NO_CONTENT)