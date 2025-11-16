import json
from channels.generic.websocket import AsyncWebsocketConsumer


class UserStatusConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time user status updates"""

    async def connect(self):
        await self.channel_layer.group_add("user_status", self.channel_name)
        await self.accept()
        print(f"✅ User status WebSocket connected")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("user_status", self.channel_name)
        print(f"❌ User status WebSocket disconnected")

    async def user_status_update(self, event):
        """Receive status update from channel layer and send to WebSocket"""
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_online': event['is_online']
        }))