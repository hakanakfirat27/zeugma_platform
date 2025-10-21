from django.contrib import admin
from .models import ChatMessage, ChatRoom

@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'receiver', 'message', 'is_read', 'created_at']
    list_filter = ['is_read', 'created_at']
    search_fields = ['sender__username', 'receiver__username', 'message']

@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['client', 'admin', 'last_message_time', 'unread_count_client', 'unread_count_admin']
    list_filter = ['created_at']