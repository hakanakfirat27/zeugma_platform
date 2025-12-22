# accounts/integrations_models.py
# Integration settings models for Slack, Webhooks, and Google Analytics

from django.db import models
from django.utils import timezone
from django.conf import settings
import json
import hashlib
import secrets


class SlackIntegration(models.Model):
    """
    Slack webhook integration settings - singleton model
    """
    is_enabled = models.BooleanField(default=False)
    webhook_url = models.URLField(blank=True, null=True, help_text='Slack Incoming Webhook URL')
    channel_name = models.CharField(max_length=100, blank=True, default='#general', help_text='Channel name for display')
    bot_name = models.CharField(max_length=100, blank=True, default='Zeugma Bot', help_text='Bot display name')
    bot_icon = models.CharField(max_length=50, blank=True, default=':robot_face:', help_text='Bot icon emoji')
    
    # Event toggles
    notify_user_created = models.BooleanField(default=True, help_text='Notify when new user is created')
    notify_user_invited = models.BooleanField(default=True, help_text='Notify when user is invited')
    notify_user_login = models.BooleanField(default=False, help_text='Notify on user login (high volume)')
    notify_report_published = models.BooleanField(default=True, help_text='Notify when report is published')
    notify_report_updated = models.BooleanField(default=False, help_text='Notify when report is updated')
    notify_data_imported = models.BooleanField(default=True, help_text='Notify when data import completes')
    notify_data_import_failed = models.BooleanField(default=True, help_text='Notify when data import fails')
    notify_security_alerts = models.BooleanField(default=True, help_text='Notify on security events (failed logins, 2FA changes)')
    notify_system_announcements = models.BooleanField(default=True, help_text='Notify on system announcements')
    
    # Metadata
    last_test_at = models.DateTimeField(null=True, blank=True)
    last_test_success = models.BooleanField(null=True, blank=True)
    last_notification_at = models.DateTimeField(null=True, blank=True)
    notification_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='slack_integration_updates'
    )

    class Meta:
        verbose_name = 'Slack Integration'
        verbose_name_plural = 'Slack Integration'

    def __str__(self):
        status = "Enabled" if self.is_enabled else "Disabled"
        return f"Slack Integration ({status})"

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance"""
        settings_obj, created = cls.objects.get_or_create(pk=1)
        return settings_obj

    def save(self, *args, **kwargs):
        self.pk = 1  # Ensure singleton
        super().save(*args, **kwargs)


class Webhook(models.Model):
    """
    Custom webhook endpoints for external integrations
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('failed', 'Failed'),
    ]
    
    name = models.CharField(max_length=255, help_text='Webhook name for identification')
    description = models.TextField(blank=True, help_text='Optional description')
    url = models.URLField(help_text='Endpoint URL to send events to')
    secret = models.CharField(max_length=64, blank=True, help_text='Secret for HMAC signature verification')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_active = models.BooleanField(default=True)
    
    # Event subscriptions (stored as JSON list)
    events = models.JSONField(default=list, help_text='List of event types to subscribe to')
    
    # Headers (stored as JSON dict)
    custom_headers = models.JSONField(default=dict, blank=True, help_text='Custom HTTP headers to include')
    
    # Retry settings
    max_retries = models.PositiveIntegerField(default=3, help_text='Max retry attempts on failure')
    retry_delay_seconds = models.PositiveIntegerField(default=60, help_text='Delay between retries')
    timeout_seconds = models.PositiveIntegerField(default=30, help_text='Request timeout')
    
    # Statistics
    total_deliveries = models.PositiveIntegerField(default=0)
    successful_deliveries = models.PositiveIntegerField(default=0)
    failed_deliveries = models.PositiveIntegerField(default=0)
    last_delivery_at = models.DateTimeField(null=True, blank=True)
    last_delivery_success = models.BooleanField(null=True, blank=True)
    last_error = models.TextField(blank=True, null=True)
    consecutive_failures = models.PositiveIntegerField(default=0)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='webhooks_created'
    )

    class Meta:
        verbose_name = 'Webhook'
        verbose_name_plural = 'Webhooks'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.status})"

    def save(self, *args, **kwargs):
        # Generate secret if not provided
        if not self.secret:
            self.secret = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def generate_signature(self, payload):
        """Generate HMAC-SHA256 signature for payload"""
        import hmac
        if isinstance(payload, dict):
            payload = json.dumps(payload, sort_keys=True)
        return hmac.new(
            self.secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    def record_delivery(self, success, error=None):
        """Record delivery attempt result"""
        self.total_deliveries += 1
        self.last_delivery_at = timezone.now()
        self.last_delivery_success = success
        
        if success:
            self.successful_deliveries += 1
            self.consecutive_failures = 0
            self.last_error = None
            if self.status == 'failed':
                self.status = 'active'
        else:
            self.failed_deliveries += 1
            self.consecutive_failures += 1
            self.last_error = error
            
            # Auto-disable after too many failures
            if self.consecutive_failures >= 10:
                self.status = 'failed'
        
        self.save()

    @classmethod
    def get_available_events(cls):
        """Return list of available webhook events"""
        return [
            {'value': 'user.created', 'label': 'User Created', 'category': 'Users'},
            {'value': 'user.invited', 'label': 'User Invited', 'category': 'Users'},
            {'value': 'user.updated', 'label': 'User Updated', 'category': 'Users'},
            {'value': 'user.deleted', 'label': 'User Deleted', 'category': 'Users'},
            {'value': 'user.login', 'label': 'User Login', 'category': 'Users'},
            {'value': 'user.password_changed', 'label': 'Password Changed', 'category': 'Users'},
            {'value': 'user.2fa_enabled', 'label': '2FA Enabled', 'category': 'Security'},
            {'value': 'user.2fa_disabled', 'label': '2FA Disabled', 'category': 'Security'},
            {'value': 'security.failed_login', 'label': 'Failed Login Attempt', 'category': 'Security'},
            {'value': 'security.account_locked', 'label': 'Account Locked', 'category': 'Security'},
            {'value': 'report.created', 'label': 'Report Created', 'category': 'Reports'},
            {'value': 'report.published', 'label': 'Report Published', 'category': 'Reports'},
            {'value': 'report.updated', 'label': 'Report Updated', 'category': 'Reports'},
            {'value': 'report.deleted', 'label': 'Report Deleted', 'category': 'Reports'},
            {'value': 'company.created', 'label': 'Company Created', 'category': 'Companies'},
            {'value': 'company.updated', 'label': 'Company Updated', 'category': 'Companies'},
            {'value': 'company.deleted', 'label': 'Company Deleted', 'category': 'Companies'},
            {'value': 'data.import_started', 'label': 'Data Import Started', 'category': 'Data'},
            {'value': 'data.import_completed', 'label': 'Data Import Completed', 'category': 'Data'},
            {'value': 'data.import_failed', 'label': 'Data Import Failed', 'category': 'Data'},
            {'value': 'announcement.created', 'label': 'Announcement Created', 'category': 'System'},
        ]


class WebhookDeliveryLog(models.Model):
    """
    Log of webhook delivery attempts
    """
    webhook = models.ForeignKey(
        Webhook,
        on_delete=models.CASCADE,
        related_name='delivery_logs'
    )
    event_type = models.CharField(max_length=100)
    payload = models.JSONField()
    
    # Request details
    request_headers = models.JSONField(default=dict)
    
    # Response details
    response_status_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True, null=True)
    response_headers = models.JSONField(default=dict, blank=True)
    
    # Result
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, null=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True, help_text='Request duration in milliseconds')
    
    # Retry info
    attempt_number = models.PositiveIntegerField(default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Webhook Delivery Log'
        verbose_name_plural = 'Webhook Delivery Logs'
        ordering = ['-created_at']
        # Keep only last 1000 logs per webhook
        indexes = [
            models.Index(fields=['webhook', '-created_at']),
            models.Index(fields=['event_type']),
        ]

    def __str__(self):
        status = "✓" if self.success else "✗"
        return f"{status} {self.event_type} → {self.webhook.name}"


class GoogleAnalyticsIntegration(models.Model):
    """
    Google Analytics integration settings - singleton model
    """
    is_enabled = models.BooleanField(default=False)
    measurement_id = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text='GA4 Measurement ID (e.g., G-XXXXXXXXXX)'
    )
    
    # Tracking options
    track_page_views = models.BooleanField(default=True, help_text='Track page views')
    track_report_downloads = models.BooleanField(default=True, help_text='Track report downloads')
    track_search_queries = models.BooleanField(default=True, help_text='Track search queries')
    track_filter_usage = models.BooleanField(default=True, help_text='Track filter usage')
    track_user_actions = models.BooleanField(default=False, help_text='Track user actions (requires consent)')
    anonymize_ip = models.BooleanField(default=True, help_text='Anonymize user IP addresses')
    
    # Debug mode
    debug_mode = models.BooleanField(default=False, help_text='Enable debug mode for testing')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ga_integration_updates'
    )

    class Meta:
        verbose_name = 'Google Analytics Integration'
        verbose_name_plural = 'Google Analytics Integration'

    def __str__(self):
        status = "Enabled" if self.is_enabled else "Disabled"
        return f"Google Analytics ({status})"

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance"""
        settings_obj, created = cls.objects.get_or_create(pk=1)
        return settings_obj

    def save(self, *args, **kwargs):
        self.pk = 1  # Ensure singleton
        super().save(*args, **kwargs)
