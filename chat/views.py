from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone
from .models import ChatMessage, ChatRoom
from .serializers import ChatMessageSerializer, ChatRoomSerializer, UserSerializer
from accounts.models import User


class ChatViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        user = self.request.user
        return ChatMessage.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).select_related('sender', 'receiver')

    @action(detail=False, methods=['get'])
    def conversations(self, request):
        user = request.user

        if user.role in ['SUPERADMIN', 'STAFF_ADMIN']:
            rooms = ChatRoom.objects.filter(admin=user).select_related('client', 'admin')
        else:
            rooms = ChatRoom.objects.filter(client=user).select_related('client', 'admin')

        serializer = ChatRoomSerializer(rooms, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def get_messages(self, request):
        other_user_id = request.query_params.get('user_id')

        if not other_user_id:
            return Response({'error': 'user_id parameter is required'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'},
                            status=status.HTTP_404_NOT_FOUND)

        user = request.user
        messages = ChatMessage.objects.filter(
            Q(sender=user, receiver=other_user) |
            Q(sender=other_user, receiver=user)
        ).select_related('sender', 'receiver').order_by('created_at')

        # Mark as read
        ChatMessage.objects.filter(
            sender=other_user, receiver=user, is_read=False
        ).update(is_read=True)

        self._update_room_unread_count(user, other_user)

        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def send_message(self, request):
        receiver_id = request.data.get('receiver_id')
        message_text = request.data.get('message')

        if not receiver_id or not message_text:
            return Response({'error': 'receiver_id and message are required'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            receiver = User.objects.get(id=receiver_id)
        except User.DoesNotExist:
            return Response({'error': 'Receiver not found'},
                            status=status.HTTP_404_NOT_FOUND)

        sender = request.user

        if sender.role == 'CLIENT' and receiver.role not in ['SUPERADMIN', 'STAFF_ADMIN']:
            return Response({'error': 'Clients can only send messages to administrators'},
                            status=status.HTTP_403_FORBIDDEN)

        message = ChatMessage.objects.create(
            sender=sender, receiver=receiver, message=message_text
        )

        self._update_or_create_room(sender, receiver, message_text)

        # Create notification
        try:
            from notifications.models import Notification
            Notification.objects.create(
                user=receiver,
                notification_type='message',
                title=f'New message from {sender.full_name or sender.username}',
                message=message_text[:100],
                related_message_id=message.id
            )
        except:
            pass

        serializer = self.get_serializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def search_users(self, request):
        user = request.user

        if user.role not in ['SUPERADMIN', 'STAFF_ADMIN']:
            return Response({'error': 'Only administrators can search users'},
                            status=status.HTTP_403_FORBIDDEN)

        query = request.query_params.get('q', '')

        # If no query, return empty list
        if not query:
            return Response([])

        users = User.objects.filter(
            Q(username__icontains=query) |
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        ).exclude(id=user.id)[:10]

        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        user = request.user
        count = ChatMessage.objects.filter(receiver=user, is_read=False).count()
        return Response({'unread_count': count})

    def _update_or_create_room(self, sender, receiver, message_text):
        if sender.role == 'CLIENT':
            client, admin = sender, receiver
        else:
            client, admin = receiver, sender

        room, created = ChatRoom.objects.get_or_create(client=client, admin=admin)
        room.last_message = message_text
        room.last_message_time = timezone.now()

        if sender == client:
            room.unread_count_admin += 1
        else:
            room.unread_count_client += 1

        room.save()

    def _update_room_unread_count(self, user, other_user):
        if user.role == 'CLIENT':
            try:
                room = ChatRoom.objects.get(client=user, admin=other_user)
                room.unread_count_client = 0
                room.save()
            except ChatRoom.DoesNotExist:
                pass
        else:
            try:
                room = ChatRoom.objects.get(client=other_user, admin=user)
                room.unread_count_admin = 0
                room.save()
            except ChatRoom.DoesNotExist:
                pass