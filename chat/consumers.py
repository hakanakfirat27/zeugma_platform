# chat/consumers.py - WORKS WITH YOUR EXISTING NOTIFICATIONS SYSTEM

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        has_access = await self.check_room_access()
        if not has_access:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        print(f"✅ {self.user.username} connected to room {self.room_id}")

        # Broadcast that this user is online
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_status',
                'user_id': self.user.id,
                'username': self.user.username,
                'is_online': True
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.update_typing_status(False)

            # Broadcast that this user is offline
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_status',
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'is_online': False
                }
            )

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            print(f"🔴 {self.user.username} disconnected from room {self.room_id}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'chat_message':
                message = await self.create_message(data)
                if message:
                    message_data = self.serialize_message(message)

                    # Broadcast to room
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'chat_message',
                            'message': message_data
                        }
                    )

                    # Send notification
                    await self.send_chat_notification(message_data)
                    print(f"✅ Message sent and notification created")

            elif message_type == 'typing':
                is_typing = data.get('is_typing', False)
                await self.update_typing_status(is_typing)

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'typing_indicator',
                        'user_id': self.user.id,
                        'username': self.user.username,
                        'is_typing': is_typing
                    }
                )

            elif message_type == 'mark_read':
                message_id = data.get('message_id')
                if message_id:
                    await self.mark_message_read(message_id)

                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'message_read',
                            'message_id': str(message_id),
                            'user_id': self.user.id
                        }
                    )
                    print(f"✅ Message {message_id} marked as read")

        except Exception as e:
            print(f"❌ Error in receive: {e}")
            import traceback
            traceback.print_exc()

    def serialize_message(self, message_data):
        """Convert UUID fields to strings"""
        if isinstance(message_data, dict):
            serialized = {}
            for key, value in message_data.items():
                if hasattr(value, 'hex'):
                    serialized[key] = str(value)
                elif isinstance(value, dict):
                    serialized[key] = self.serialize_message(value)
                elif isinstance(value, list):
                    serialized[key] = [
                        self.serialize_message(item) if isinstance(item, dict) else item
                        for item in value
                    ]
                else:
                    serialized[key] = value
            return serialized
        return message_data

    # Receive handlers
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message': event['message']
        }))

    async def typing_indicator(self, event):
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing_indicator',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))

    async def message_read(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message_read',
            'message_id': event['message_id'],
            'user_id': event['user_id']
        }))

    async def user_status(self, event):
        """
        Handler for user_status messages.
        Sends online/offline status to the WebSocket.
        """
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_online': event['is_online']
        }))

    # Database operations
    @database_sync_to_async
    def check_room_access(self):
        from .models import ChatRoom
        try:
            room = ChatRoom.objects.get(room_id=self.room_id)
            if room.client == self.user:
                return True
            if self.user.role in ['SUPERADMIN', 'STAFF_ADMIN']:
                return True
            return False
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def create_message(self, data):
        from .models import ChatRoom, ChatMessage
        from .serializers import ChatMessageSerializer

        try:
            room = ChatRoom.objects.get(room_id=self.room_id)

            # --- *** THIS IS THE FIX *** ---
            # If the room is inactive, a new message reactivates it
            if not room.is_active:
                room.is_active = True
                room.save(update_fields=['is_active'])
                print(f"✅ Room {room.room_id} reactivated by new message.")
            # --- *** END OF FIX *** ---

            message = ChatMessage.objects.create(
                room=room,
                sender=self.user,
                message_type=data.get('message_type', 'TEXT'),
                content=data.get('content', '')
            )
            # This save updates the 'updated_at' timestamp, bumping it to the top
            room.save()

            serializer = ChatMessageSerializer(message)
            return serializer.data
        except Exception as e:
            print(f"❌ Error creating message: {e}")
            return None

    @database_sync_to_async
    def send_chat_notification(self, message_data):
        """
        Send notification using your existing notifications app
        Compatible with your notification types: 'message'
        """
        try:
            from notifications.models import Notification
            from accounts.models import User
            from .models import ChatRoom
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer

            room = ChatRoom.objects.get(room_id=self.room_id)

            # Determine recipients
            if self.user == room.client:
                # Client sent message - notify staff
                recipients = User.objects.filter(role__in=['SUPERADMIN', 'STAFF_ADMIN'])
            else:
                # Staff sent message - notify client
                recipients = [room.client]

            # Create notifications for each recipient
            for recipient in recipients:
                if recipient != self.user:
                    # Create notification using your existing model
                    notification = Notification.objects.create(
                        user=recipient,
                        notification_type='message',  # Using your existing type
                        title='New Chat Message',
                        message=f'{self.user.get_full_name() or self.user.username}: {message_data.get("content", "sent a file")[:50]}',
                        related_message_id=None  # You can link to the chat message if needed
                    )

                    # Send real-time notification via WebSocket
                    # Using your existing NotificationConsumer
                    channel_layer = get_channel_layer()
                    async_to_sync(channel_layer.group_send)(
                        f'notifications_{recipient.id}',
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

                    print(f"✅ Notification sent to {recipient.username}")

            return True

        except Exception as e:
            print(f"❌ Error sending notification: {e}")
            import traceback
            traceback.print_exc()
            return False

    @database_sync_to_async
    def update_typing_status(self, is_typing):
        from .models import ChatRoom, TypingStatus
        try:
            room = ChatRoom.objects.get(room_id=self.room_id)
            typing_status, created = TypingStatus.objects.get_or_create(
                room=room,
                user=self.user
            )
            typing_status.is_typing = is_typing
            typing_status.save()
        except Exception as e:
            print(f"❌ Error updating typing status: {e}")

    @database_sync_to_async
    def mark_message_read(self, message_id):
        from .models import ChatMessage
        try:
            message = ChatMessage.objects.get(message_id=message_id)
            if message.sender != self.user and not message.is_read:
                message.is_read = True
                message.read_at = timezone.now()
                message.save(update_fields=['is_read', 'read_at'])
                return True
            return False
        except ChatMessage.DoesNotExist:
            return False
        except Exception as e:
            print(f"❌ Error marking message as read: {e}")
            return False