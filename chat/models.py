# chat/models.py

from django.db import models
from django.conf import settings
from django.utils import timezone

class ChatMessage(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_messages'
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['sender', 'receiver', '-created_at']),
            models.Index(fields=['receiver', 'is_read']),
        ]

    def __str__(self):
        return f"{self.sender.username} to {self.receiver.username}: {self.message[:50]}"

class ChatRoom(models.Model):
    """
    Represents a conversation between a client and admin
    """
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='client_rooms',
        limit_choices_to={'role': 'CLIENT'}
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='admin_rooms',
        limit_choices_to={'role__in': ['SUPERADMIN', 'STAFF_ADMIN']}
    )
    last_message = models.TextField(blank=True, null=True)
    last_message_time = models.DateTimeField(null=True, blank=True)
    unread_count_client = models.IntegerField(default=0)
    unread_count_admin = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['client', 'admin']
        ordering = ['-last_message_time']

    def __str__(self):
        return f"Chat: {self.client.username} <-> {self.admin.username}"