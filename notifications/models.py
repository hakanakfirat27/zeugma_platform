# notifications/models.py

import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('report', 'New Report'),
        ('subscription', 'Subscription'),
        ('message', 'Message'),
        ('announcement', 'Announcement'),
        ('payment', 'Payment'),
        ('system', 'System'),
        ('calling', 'Calling Workflow'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # Optional: Link to related objects
    related_report_id = models.IntegerField(null=True, blank=True)
    related_subscription_id = models.IntegerField(null=True, blank=True)
    related_message_id = models.IntegerField(null=True, blank=True)
    related_announcement_id = models.IntegerField(null=True, blank=True)
    related_site_id = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title}"

    def time_since(self):
        """Return human-readable time difference"""
        now = timezone.now()
        diff = now - self.created_at

        if diff.days > 365:
            years = diff.days // 365
            return f"{years} year{'s' if years > 1 else ''} ago"
        elif diff.days > 30:
            months = diff.days // 30
            return f"{months} month{'s' if months > 1 else ''} ago"
        elif diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"


class PushSubscription(models.Model):
    """
    Stores Web Push subscription information for each user/browser.
    A user can have multiple subscriptions (different browsers/devices).
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='push_subscriptions'
    )
    
    # The push subscription endpoint URL
    endpoint = models.TextField(unique=True)
    
    # Encryption keys from the browser
    p256dh_key = models.CharField(max_length=255)
    auth_key = models.CharField(max_length=255)
    
    # Device/browser info for identification
    user_agent = models.TextField(blank=True, null=True)
    device_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Push Subscription"
        verbose_name_plural = "Push Subscriptions"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.device_name or 'Unknown Device'}"
    
    def get_subscription_info(self):
        """Return subscription info in the format required by pywebpush."""
        return {
            "endpoint": self.endpoint,
            "keys": {
                "p256dh": self.p256dh_key,
                "auth": self.auth_key
            }
        }