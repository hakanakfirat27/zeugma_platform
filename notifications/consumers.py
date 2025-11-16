# notifications/consumers.py
"""
Updated NotificationConsumer with Notes Support
Integrates with your existing notification system
"""

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
            print(f"✅ User {self.user.username} (ID: {self.user.id}) connected to notifications")
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            print(f"❌ User {self.user.username} disconnected from notifications")

    async def receive(self, text_data):
        pass

    # ========================================================================
    # EXISTING NOTIFICATION HANDLER (Keep your original)
    # ========================================================================
    
    async def notification_message(self, event):
        """Your existing notification handler"""
        notification = event['notification']

        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification': notification
        }))

    # ========================================================================
    # NEW NOTE HANDLERS (Add these)
    # ========================================================================
    
    async def note_created(self, event):
        """
        Send note created notification
        Called when a new note is added to a site
        """
        await self.send(text_data=json.dumps({
            'type': 'note_created',
            'note': event['note'],
            'site_id': event['site_id']
        }))
        print(f"📤 Sent note_created to user {self.user.username}")
    
    async def note_updated(self, event):
        """
        Send note updated notification
        Called when a note is edited
        """
        await self.send(text_data=json.dumps({
            'type': 'note_updated',
            'note': event['note'],
            'site_id': event['site_id']
        }))
        print(f"📤 Sent note_updated to user {self.user.username}")
    
    async def note_deleted(self, event):
        """
        Send note deleted notification
        Called when a note is removed
        """
        await self.send(text_data=json.dumps({
            'type': 'note_deleted',
            'note_id': event['note_id'],
            'site_id': event['site_id']
        }))
        print(f"📤 Sent note_deleted to user {self.user.username}")