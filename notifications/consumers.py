import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Notification
from .serializers import NotificationSerializer


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]

        if self.user.is_authenticated:
            self.room_group_name = f'notifications_{self.user.id}'

            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        pass

    async def notification_message(self, event):
        notification = event['notification']

        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': notification
        }))