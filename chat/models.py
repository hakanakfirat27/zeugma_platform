# chat/models.py

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class ChatRoom(models.Model):
    """Chat room between staff and client"""
    ROOM_TYPE_CHOICES = [
        ('DIRECT', 'Direct Message'),
        ('SUPPORT', 'Support Ticket'),
    ]

    room_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='SUPPORT')
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='client_rooms'
    )
    assigned_staff = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_rooms'
    )
    subject = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.room_type} - {self.client.username}"

    def get_last_message(self):
        return self.messages.order_by('-created_at').first()


class ChatMessage(models.Model):
    """Individual chat message"""
    MESSAGE_TYPE_CHOICES = [
        ('TEXT', 'Text Message'),
        ('FILE', 'File Attachment'),
        ('IMAGE', 'Image'),
        ('SYSTEM', 'System Message'),
    ]

    message_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES, default='TEXT')
    content = models.TextField(blank=True)

    # File attachment fields
    file = models.FileField(upload_to='chat_files/%Y/%m/', null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.IntegerField(null=True, blank=True)  # in bytes
    file_type = models.CharField(max_length=100, blank=True)

    # Message status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class TypingStatus(models.Model):
    """Track who is typing in which room"""
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='typing_statuses')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_typing = models.BooleanField(default=False)
    last_activity = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['room', 'user']
        verbose_name_plural = 'Typing statuses'

    def __str__(self):
        return f"{self.user.username} typing in {self.room.room_id}"