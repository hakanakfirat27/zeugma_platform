# chat/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Count
from .models import ChatRoom, ChatMessage, TypingStatus
from .serializers import (
    ChatRoomSerializer,
    ChatMessageSerializer,
    ChatMessageCreateSerializer,
    TypingStatusSerializer
)
from django.utils import timezone
from accounts.models import UserRole  # Import UserRole


class ChatRoomViewSet(viewsets.ModelViewSet):
    """ViewSet for chat rooms"""
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            queryset = ChatRoom.objects.all()
        elif user.role == UserRole.DATA_COLLECTOR:
            # Data collectors see only their own rooms
            queryset = ChatRoom.objects.filter(client=user)
        else:
            # Clients see only their own rooms
            queryset = ChatRoom.objects.filter(client=user)

        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.select_related('client', 'assigned_staff').prefetch_related('messages')

    def create(self, request, *args, **kwargs):
        """Create a new chat room"""
        if request.user.role in [UserRole.CLIENT, UserRole.DATA_COLLECTOR]:
            room, created = ChatRoom.objects.get_or_create(
                client=request.user,
                room_type='SUPPORT',
                defaults={'subject': request.data.get('subject', 'Support Request')}
            )
            if not room.is_active:
                room.is_active = True
                room.subject = request.data.get('subject', 'Support Request')
                room.save()
            status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
            serializer = self.get_serializer(room)
            return Response(serializer.data, status=status_code)

        # For staff creating a room
        client_id = request.data.get('client_id')
        if not client_id:
            return Response(
                {"error": "client_id is required for staff to create a room."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from accounts.models import User
            client = User.objects.get(id=client_id, role=UserRole.CLIENT)
        except User.DoesNotExist:
            return Response(
                {"error": "Client not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        room, created = ChatRoom.objects.get_or_create(
            client=client,
            room_type='SUPPORT',
            defaults={'subject': request.data.get('subject', 'Support Chat')}
        )
        if not room.is_active:
            room.is_active = True
            room.save()

        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        serializer = self.get_serializer(room)
        return Response(serializer.data, status=status_code)

    @action(detail=True, methods=['post'])
    def assign_staff(self, request, pk=None):
        """Assign staff member to a room"""
        if request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        room = self.get_object()
        staff_id = request.data.get('staff_id')
        if staff_id:
            from accounts.models import User
            try:
                staff = User.objects.get(id=staff_id, role__in=[UserRole.SUPERADMIN, UserRole.STAFF_ADMIN])
                room.assigned_staff = staff
                room.save()
                return Response({'status': 'Staff assigned successfully'})
            except User.DoesNotExist:
                return Response(
                    {'error': 'Staff member not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        return Response({'error': 'staff_id required'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close/deactivate a chat room"""
        room = self.get_object()
        room.is_active = False
        room.save()
        return Response({'status': 'Room closed successfully'})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get chat statistics for staff"""
        if request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        total_rooms = ChatRoom.objects.count()
        active_rooms = ChatRoom.objects.filter(is_active=True).count()
        unassigned_rooms = ChatRoom.objects.filter(assigned_staff__isnull=True, is_active=True).count()
        return Response({
            'total_rooms': total_rooms,
            'active_rooms': active_rooms,
            'unassigned_rooms': unassigned_rooms,
        })

    # --- *** THIS IS THE CORRECTED ACTION *** ---
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get total unread message count for current user"""
        user = request.user

        if not user.is_authenticated:
            return Response({'unread_count': 0})

        if user.role in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            # Staff: Count all unread messages sent by CLIENTS and DATA_COLLECTORS
            unread = ChatMessage.objects.filter(
                is_read=False,
                sender__role__in=[UserRole.CLIENT, UserRole.DATA_COLLECTOR]
            ).count()
        else:  # Client or Data Collector
            # Client/Data Collector: Count unread messages in their rooms sent by STAFF
            unread = ChatMessage.objects.filter(
                room__client=user,
                is_read=False,
                sender__role__in=[UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]
            ).count()

        return Response({'unread_count': unread})
    # --- *** END OF CORRECTED ACTION *** ---


class ChatMessageViewSet(viewsets.ModelViewSet):
    """ViewSet for chat messages"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return ChatMessageCreateSerializer
        return ChatMessageSerializer

    def get_queryset(self):
        user = self.request.user
        room_id = self.request.query_params.get('room_id')
        queryset = ChatMessage.objects.filter(is_deleted=False)
        if room_id:
            queryset = queryset.filter(room__room_id=room_id)
        if user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            queryset = queryset.filter(room__client=user)
        return queryset.select_related('sender', 'room').order_by('created_at')

    def create(self, request, *args, **kwargs):
        if 'file' in request.data:
            self.parser_classes = [MultiPartParser, FormParser]
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        message = serializer.save()
        read_serializer = ChatMessageSerializer(message, context={'request': request})
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        message = self.get_object()
        if message.room.client == request.user or message.room.assigned_staff == request.user:
            if message.sender != request.user:
                message.mark_as_read()
                return Response({'status': 'Message marked as read'})
        return Response({'error': 'Cannot mark own message or unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_room_read(self, request):
        room_id = request.data.get('room_id')
        if not room_id:
            return Response(
                {'error': 'room_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            if request.user.role in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
                room = ChatRoom.objects.get(room_id=room_id)
            else:
                room = ChatRoom.objects.get(room_id=room_id, client=request.user)
        except ChatRoom.DoesNotExist:
            return Response({'error': 'Room not found or access denied'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_403_FORBIDDEN)

        messages = ChatMessage.objects.filter(
            room=room,
            is_read=False
        ).exclude(sender=request.user)

        updated_count = messages.update(is_read=True, read_at=timezone.now())
        return Response({'status': f'{updated_count} messages marked as read'})