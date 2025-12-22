from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.conf import settings
from .models import Notification, PushSubscription
from .serializers import (
    NotificationSerializer,
    PushSubscriptionSerializer,
    PushSubscriptionCreateSerializer
)


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


# ============================================
# PUSH NOTIFICATION API VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_vapid_public_key(request):
    """
    Get the VAPID public key for push subscription.
    This is needed by the frontend to subscribe to push notifications.
    """
    public_key = getattr(settings, 'VAPID_PUBLIC_KEY', None)
    
    if not public_key:
        return Response(
            {'error': 'Push notifications not configured'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    return Response({
        'public_key': public_key
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subscribe_push(request):
    """
    Subscribe to push notifications.
    Creates or updates a push subscription for the current user.
    """
    serializer = PushSubscriptionCreateSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        subscription = serializer.save()
        return Response({
            'status': 'subscribed',
            'subscription': PushSubscriptionSerializer(subscription).data
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unsubscribe_push(request):
    """
    Unsubscribe from push notifications.
    Deactivates the subscription for the given endpoint.
    """
    endpoint = request.data.get('endpoint')
    
    if not endpoint:
        return Response(
            {'error': 'endpoint is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        subscription = PushSubscription.objects.get(
            user=request.user,
            endpoint=endpoint
        )
        subscription.is_active = False
        subscription.save(update_fields=['is_active'])
        
        return Response({'status': 'unsubscribed'})
    except PushSubscription.DoesNotExist:
        return Response(
            {'error': 'Subscription not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_push_subscriptions(request):
    """
    List all push subscriptions for the current user.
    """
    subscriptions = PushSubscription.objects.filter(
        user=request.user,
        is_active=True
    )
    
    serializer = PushSubscriptionSerializer(subscriptions, many=True)
    return Response({
        'subscriptions': serializer.data,
        'count': subscriptions.count()
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_push_subscription(request, subscription_id):
    """
    Delete a specific push subscription.
    """
    try:
        subscription = PushSubscription.objects.get(
            id=subscription_id,
            user=request.user
        )
        subscription.delete()
        return Response({'status': 'deleted'}, status=status.HTTP_204_NO_CONTENT)
    except PushSubscription.DoesNotExist:
        return Response(
            {'error': 'Subscription not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_push_notification(request):
    """
    Send a test push notification to the current user.
    Useful for testing push notification setup.
    """
    from .push_service import send_push_notification
    
    result = send_push_notification(
        user=request.user,
        title='Test Notification 🔔',
        message='Push notifications are working! This is a test from Zeugma.',
        url='/admin/settings?section=notifications',
        notification_type='system'
    )
    
    if result.get('blocked'):
        return Response({
            'status': 'blocked',
            'message': 'Push notifications are disabled in settings'
        })
    
    if result.get('no_subscriptions'):
        return Response({
            'status': 'no_subscriptions',
            'message': 'No push subscriptions found for this user'
        })
    
    if result.get('error'):
        return Response({
            'status': 'error',
            'message': result['error']
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'status': 'sent',
        'success': result['success'],
        'failed': result['failed']
    })