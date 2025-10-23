from django.contrib import admin
from .models import ChatRoom, ChatMessage, TypingStatus


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['room_id', 'client', 'assigned_staff', 'room_type', 'is_active', 'created_at']
    list_filter = ['room_type', 'is_active', 'created_at']
    search_fields = ['client__username', 'client__email', 'subject']
    raw_id_fields = ['client', 'assigned_staff']


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['message_id', 'room', 'sender', 'message_type', 'is_read', 'created_at']
    list_filter = ['message_type', 'is_read', 'created_at']
    search_fields = ['content', 'sender__username']
    raw_id_fields = ['room', 'sender']


@admin.register(TypingStatus)
class TypingStatusAdmin(admin.ModelAdmin):
    list_display = ['room', 'user', 'is_typing', 'last_activity']
    list_filter = ['is_typing', 'last_activity']
    raw_id_fields = ['room', 'user']