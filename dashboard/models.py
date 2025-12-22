# dashboard/models.py

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache


class ActivityType(models.TextChoices):
    """Types of user activities to track"""
    FAVORITE_ADDED = 'FAVORITE_ADDED', 'Added to Favorites'
    FAVORITE_REMOVED = 'FAVORITE_REMOVED', 'Removed from Favorites'
    COLLECTION_CREATED = 'COLLECTION_CREATED', 'Created Collection'
    COLLECTION_DELETED = 'COLLECTION_DELETED', 'Deleted Collection'
    COLLECTION_ITEM_ADDED = 'COLLECTION_ITEM_ADDED', 'Added to Collection'
    COLLECTION_ITEM_REMOVED = 'COLLECTION_ITEM_REMOVED', 'Removed from Collection'
    COMPANY_VIEWED = 'COMPANY_VIEWED', 'Viewed Company'
    REPORT_VIEWED = 'REPORT_VIEWED', 'Viewed Report'
    NOTE_ADDED = 'NOTE_ADDED', 'Added Note'
    NOTE_UPDATED = 'NOTE_UPDATED', 'Updated Note'
    EXPORT_CREATED = 'EXPORT_CREATED', 'Exported Data'


class UserActivity(models.Model):
    """
    Tracks user activities for the activity feed on the dashboard.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    
    activity_type = models.CharField(
        max_length=30,
        choices=ActivityType.choices
    )
    
    # Optional related objects
    company_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Name of the company involved"
    )
    
    report_title = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Title of the report involved"
    )
    
    collection_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Name of the collection involved"
    )
    
    # Store IDs for linking
    report_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="UUID of the related report"
    )
    
    record_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="ID of the company record"
    )
    
    collection_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="UUID of the related collection"
    )
    
    # Additional context
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Additional description of the activity"
    )
    
    # Metadata
    country = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "User Activity"
        verbose_name_plural = "User Activities"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['activity_type']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_activity_type_display()} - {self.created_at}"


class RecentlyViewedCompany(models.Model):
    """
    Tracks companies that users have recently viewed.
    Limited to last N companies per user.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recently_viewed_companies'
    )
    
    # Report association
    report = models.ForeignKey(
        'reports.CustomReport',
        on_delete=models.CASCADE,
        related_name='recently_viewed'
    )
    
    # Record identifier
    record_id = models.CharField(
        max_length=50,
        help_text="ID of the company record"
    )
    
    # Denormalized for quick access
    company_name = models.CharField(
        max_length=255,
        help_text="Company name for display purposes"
    )
    
    country = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    
    category = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Company category"
    )
    
    # Timestamps
    viewed_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Recently Viewed Company"
        verbose_name_plural = "Recently Viewed Companies"
        ordering = ['-viewed_at']
        indexes = [
            models.Index(fields=['user', '-viewed_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} viewed {self.company_name}"
    
    @classmethod
    def add_view(cls, user, report, record_id, company_name, country=None, category=None):
        """
        Add or update a recently viewed company.
        Maintains a maximum of 20 entries per user.
        """
        MAX_RECENT = 20
        
        # Update existing or create new
        obj, created = cls.objects.update_or_create(
            user=user,
            report=report,
            record_id=record_id,
            defaults={
                'company_name': company_name,
                'country': country,
                'category': category,
                'viewed_at': timezone.now()
            }
        )
        
        # Clean up old entries
        user_views = cls.objects.filter(user=user).order_by('-viewed_at')
        if user_views.count() > MAX_RECENT:
            # Get IDs of entries to keep
            keep_ids = list(user_views[:MAX_RECENT].values_list('id', flat=True))
            # Delete the rest
            cls.objects.filter(user=user).exclude(id__in=keep_ids).delete()
        
        return obj


class ThemeSettings(models.Model):
    """
    Theme configuration settings for different user roles/layouts.
    Admin can control theme settings per layout from the admin panel.
    """
    
    class LayoutType(models.TextChoices):
        CLIENT = 'client', 'Client Portal'
        DATA_COLLECTOR = 'data_collector', 'Data Collector'
        GUEST = 'guest', 'Guest Layout'
        ADMIN = 'admin', 'Admin Dashboard'
    
    class DefaultTheme(models.TextChoices):
        LIGHT = 'light', 'Light'
        DARK = 'dark', 'Dark'
        SYSTEM = 'system', 'System Preference'
    
    class ToggleVariant(models.TextChoices):
        MINIMAL = 'minimal', 'Minimal (Icon only)'
        PILL = 'pill', 'Pill (Classic toggle)'
        SCENE = 'scene', 'Scene (Day/Night illustration)'
        GLOW = 'glow', 'Glow (Neon effect)'
        IOS = 'ios', 'iOS (Apple style)'
        NEUMORPHIC = 'neumorphic', 'Neumorphic (3D soft)'
        ECLIPSE = 'eclipse', 'Eclipse (Sun/Moon)'
        NEON = 'neon', 'Neon Border'
        LIQUID = 'liquid', 'Liquid (Morphing)'
        ROCKER = 'rocker', 'Rocker (Vertical switch)'
        TEXT = 'text', 'Text Slide (Dark/Light label)'
        BOUNCY = 'bouncy', 'Bouncy (Elastic)'
    
    class SidebarVariant(models.TextChoices):
        DEFAULT = 'default', 'Default (Current)'
        GLASS = 'glass', 'Glass Morphism'
        GRADIENT = 'gradient', 'Gradient Flow'
        MINIMAL = 'minimal', 'Minimal Dark'
        ACCENT = 'accent', 'Accent Line'
        FLOATING = 'floating', 'Floating Cards'
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    layout_type = models.CharField(
        max_length=20,
        choices=LayoutType.choices,
        unique=True,
        help_text="The layout/role this setting applies to"
    )
    
    # Theme Settings
    default_theme = models.CharField(
        max_length=10,
        choices=DefaultTheme.choices,
        default=DefaultTheme.SYSTEM,
        help_text="Default theme for new users"
    )
    
    allow_user_toggle = models.BooleanField(
        default=True,
        help_text="Allow users to change their theme"
    )
    
    show_toggle_in_header = models.BooleanField(
        default=True,
        help_text="Show theme toggle button in header"
    )
    
    toggle_variant = models.CharField(
        max_length=20,
        choices=ToggleVariant.choices,
        default=ToggleVariant.SCENE,
        help_text="Style of the theme toggle button"
    )
    
    # Sidebar Settings
    sidebar_variant = models.CharField(
        max_length=20,
        choices=SidebarVariant.choices,
        default=SidebarVariant.DEFAULT,
        help_text="Style of the sidebar navigation"
    )
    
    # Additional Options
    remember_user_preference = models.BooleanField(
        default=True,
        help_text="Remember user's theme preference across sessions"
    )
    
    # Metadata
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='theme_settings_updated'
    )
    
    class Meta:
        verbose_name = "Theme Setting"
        verbose_name_plural = "Theme Settings"
        ordering = ['layout_type']
    
    def __str__(self):
        return f"Theme Settings for {self.get_layout_type_display()}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Clear cache when settings are updated
        cache.delete(f'theme_settings_{self.layout_type}')
        cache.delete('theme_settings_all')
    
    @classmethod
    def get_settings_for_layout(cls, layout_type):
        """
        Get theme settings for a specific layout with caching.
        Creates default settings if none exist.
        """
        cache_key = f'theme_settings_{layout_type}'
        settings_data = cache.get(cache_key)
        
        if settings_data is None:
            obj, created = cls.objects.get_or_create(
                layout_type=layout_type,
                defaults={
                    'default_theme': cls.DefaultTheme.SYSTEM,
                    'allow_user_toggle': True,
                    'show_toggle_in_header': True,
                    'toggle_variant': cls.ToggleVariant.SCENE,
                    'sidebar_variant': cls.SidebarVariant.DEFAULT,
                }
            )
            settings_data = {
                'layout_type': obj.layout_type,
                'default_theme': obj.default_theme,
                'allow_user_toggle': obj.allow_user_toggle,
                'show_toggle_in_header': obj.show_toggle_in_header,
                'toggle_variant': obj.toggle_variant,
                'sidebar_variant': obj.sidebar_variant,
                'remember_user_preference': obj.remember_user_preference,
            }
            cache.set(cache_key, settings_data, 60 * 60)  # Cache for 1 hour
        
        return settings_data
    
    @classmethod
    def get_all_settings(cls):
        """Get all theme settings with caching."""
        cache_key = 'theme_settings_all'
        all_settings = cache.get(cache_key)
        
        if all_settings is None:
            all_settings = {}
            for layout_type, _ in cls.LayoutType.choices:
                all_settings[layout_type] = cls.get_settings_for_layout(layout_type)
            cache.set(cache_key, all_settings, 60 * 60)
        
        return all_settings


class NotificationSettings(models.Model):
    """
    Global notification configuration settings.
    Admin can control which notifications are enabled and how they are delivered.
    """
    
    class NotificationType(models.TextChoices):
        REPORT = 'report', 'New Report'
        SUBSCRIPTION = 'subscription', 'Subscription'
        MESSAGE = 'message', 'Message'
        ANNOUNCEMENT = 'announcement', 'Announcement'
        PAYMENT = 'payment', 'Payment'
        SYSTEM = 'system', 'System'
        SITE_SUBMITTED = 'site_submitted', 'Site Submitted'
        SITE_APPROVED = 'site_approved', 'Site Approved'
        SITE_REJECTED = 'site_rejected', 'Site Rejected'
    
    class EmailFrequency(models.TextChoices):
        INSTANT = 'instant', 'Instant'
        HOURLY = 'hourly', 'Hourly Digest'
        DAILY = 'daily', 'Daily Digest'
        WEEKLY = 'weekly', 'Weekly Digest'
        NEVER = 'never', 'Never'
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    # ===== Global Settings =====
    notifications_enabled = models.BooleanField(
        default=True,
        help_text="Master switch for all notifications"
    )
    
    # ===== Email Settings =====
    email_notifications_enabled = models.BooleanField(
        default=True,
        help_text="Enable email notifications globally"
    )
    
    email_from_name = models.CharField(
        max_length=100,
        default='Zeugma Platform',
        help_text="Sender name for emails"
    )
    
    email_reply_to = models.EmailField(
        blank=True,
        null=True,
        help_text="Reply-to email address"
    )
    
    email_frequency = models.CharField(
        max_length=20,
        choices=EmailFrequency.choices,
        default=EmailFrequency.INSTANT,
        help_text="Default email delivery frequency"
    )
    
    include_email_footer = models.BooleanField(
        default=True,
        help_text="Include unsubscribe link in emails"
    )
    
    # ===== In-App Notification Settings =====
    inapp_notifications_enabled = models.BooleanField(
        default=True,
        help_text="Enable in-app notifications"
    )
    
    notification_sound_enabled = models.BooleanField(
        default=False,
        help_text="Play sound for new notifications"
    )
    
    auto_dismiss_seconds = models.IntegerField(
        default=0,
        help_text="Auto-dismiss toast after N seconds (0 = never)"
    )
    
    max_notifications_shown = models.IntegerField(
        default=50,
        help_text="Maximum notifications to keep in history"
    )
    
    # ===== Push Notification Settings =====
    push_notifications_enabled = models.BooleanField(
        default=False,
        help_text="Enable browser push notifications"
    )
    
    # ===== Daily Summary Settings =====
    daily_summary_enabled = models.BooleanField(
        default=True,
        help_text="Send daily summary emails to staff"
    )
    
    daily_summary_time = models.TimeField(
        default='09:00',
        help_text="Time to send daily summary (UTC)"
    )
    
    # ===== User Preference Settings =====
    allow_user_preferences = models.BooleanField(
        default=True,
        help_text="Allow users to customize their notification preferences"
    )
    
    # Metadata
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notification_settings_updated'
    )
    
    class Meta:
        verbose_name = "Notification Settings"
        verbose_name_plural = "Notification Settings"
    
    def __str__(self):
        return "Global Notification Settings"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and NotificationSettings.objects.exists():
            existing = NotificationSettings.objects.first()
            self.pk = existing.pk
        super().save(*args, **kwargs)
        cache.delete('notification_settings')
    
    @classmethod
    def get_settings(cls):
        """Get notification settings with caching."""
        cache_key = 'notification_settings'
        settings_data = cache.get(cache_key)
        
        if settings_data is None:
            obj, created = cls.objects.get_or_create(
                defaults={
                    'notifications_enabled': True,
                    'email_notifications_enabled': True,
                    'inapp_notifications_enabled': True,
                }
            )
            settings_data = {
                'notifications_enabled': obj.notifications_enabled,
                'email_notifications_enabled': obj.email_notifications_enabled,
                'email_from_name': obj.email_from_name,
                'email_reply_to': obj.email_reply_to,
                'email_frequency': obj.email_frequency,
                'include_email_footer': obj.include_email_footer,
                'inapp_notifications_enabled': obj.inapp_notifications_enabled,
                'notification_sound_enabled': obj.notification_sound_enabled,
                'auto_dismiss_seconds': obj.auto_dismiss_seconds,
                'max_notifications_shown': obj.max_notifications_shown,
                'push_notifications_enabled': obj.push_notifications_enabled,
                'daily_summary_enabled': obj.daily_summary_enabled,
                'daily_summary_time': str(obj.daily_summary_time),
                'allow_user_preferences': obj.allow_user_preferences,
                'updated_at': obj.updated_at.isoformat() if obj.updated_at else None,
            }
            cache.set(cache_key, settings_data, 60 * 60)
        
        return settings_data


class NotificationTypeConfig(models.Model):
    """
    Configuration for each notification type.
    Controls which channels are enabled per notification type.
    """
    
    NOTIFICATION_TYPES = [
        ('report', 'New Report'),
        ('subscription', 'Subscription Updates'),
        ('message', 'Messages'),
        ('announcement', 'Announcements'),
        ('payment', 'Payment'),
        ('system', 'System Notifications'),
        ('site_submitted', 'Site Submitted (Staff)'),
        ('site_approved', 'Site Approved'),
        ('site_rejected', 'Site Rejected'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        unique=True
    )
    
    # Display settings
    display_name = models.CharField(
        max_length=100,
        help_text="Human-readable name"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Description of this notification type"
    )
    
    icon = models.CharField(
        max_length=50,
        default='bell',
        help_text="Lucide icon name"
    )
    
    color = models.CharField(
        max_length=20,
        default='blue',
        help_text="Color theme (blue, green, purple, orange, red, etc.)"
    )
    
    # Channel settings
    email_enabled = models.BooleanField(
        default=True,
        help_text="Send email for this notification type"
    )
    
    inapp_enabled = models.BooleanField(
        default=True,
        help_text="Show in-app notification"
    )
    
    push_enabled = models.BooleanField(
        default=False,
        help_text="Send browser push notification"
    )
    
    # Priority
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='normal'
    )
    
    # Target roles
    target_roles = models.JSONField(
        default=list,
        help_text="List of roles that receive this notification"
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text="Enable/disable this notification type"
    )
    
    class Meta:
        verbose_name = "Notification Type Config"
        verbose_name_plural = "Notification Type Configs"
        ordering = ['notification_type']
    
    def __str__(self):
        return self.display_name
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        cache.delete('notification_type_configs')
    
    @classmethod
    def get_all_configs(cls):
        """Get all notification type configs with caching."""
        cache_key = 'notification_type_configs'
        configs = cache.get(cache_key)
        
        if configs is None:
            # Create default configs if none exist
            defaults = [
                {'notification_type': 'report', 'display_name': 'New Report', 'description': 'When a new report is assigned to a client', 'icon': 'file-text', 'color': 'purple', 'target_roles': ['CLIENT']},
                {'notification_type': 'subscription', 'display_name': 'Subscription Updates', 'description': 'Subscription expiry reminders and renewals', 'icon': 'credit-card', 'color': 'green', 'target_roles': ['CLIENT']},
                {'notification_type': 'message', 'display_name': 'Messages', 'description': 'New chat messages', 'icon': 'message-square', 'color': 'orange', 'target_roles': ['CLIENT', 'STAFF_ADMIN', 'SUPERADMIN', 'DATA_COLLECTOR']},
                {'notification_type': 'announcement', 'display_name': 'Announcements', 'description': 'Platform announcements and news', 'icon': 'megaphone', 'color': 'pink', 'target_roles': ['CLIENT', 'STAFF_ADMIN', 'SUPERADMIN', 'DATA_COLLECTOR']},
                {'notification_type': 'payment', 'display_name': 'Payment', 'description': 'Payment confirmations and issues', 'icon': 'credit-card', 'color': 'blue', 'target_roles': ['CLIENT']},
                {'notification_type': 'system', 'display_name': 'System Notifications', 'description': 'System updates and maintenance', 'icon': 'settings', 'color': 'gray', 'target_roles': ['CLIENT', 'STAFF_ADMIN', 'SUPERADMIN', 'DATA_COLLECTOR']},
                {'notification_type': 'site_submitted', 'display_name': 'Site Submitted', 'description': 'When a new site is submitted for verification', 'icon': 'database', 'color': 'teal', 'target_roles': ['STAFF_ADMIN', 'SUPERADMIN']},
                {'notification_type': 'site_approved', 'display_name': 'Site Approved', 'description': 'When a submitted site is approved', 'icon': 'check-circle', 'color': 'green', 'target_roles': ['DATA_COLLECTOR']},
                {'notification_type': 'site_rejected', 'display_name': 'Site Rejected', 'description': 'When a submitted site is rejected', 'icon': 'x-circle', 'color': 'red', 'target_roles': ['DATA_COLLECTOR']},
            ]
            
            for default in defaults:
                cls.objects.get_or_create(
                    notification_type=default['notification_type'],
                    defaults=default
                )
            
            configs = list(cls.objects.all().values(
                'id', 'notification_type', 'display_name', 'description',
                'icon', 'color', 'email_enabled', 'inapp_enabled',
                'push_enabled', 'priority', 'target_roles', 'is_active'
            ))
            cache.set(cache_key, configs, 60 * 60)
        
        return configs


# ============================================
# NOTE: Security models have been moved to accounts/security_models.py
# The following models are now in accounts app:
# - SecuritySettings
# - TwoFactorAuth (now TwoFactorBackupCode + UserTOTPDevice)
# - UserSession
# - PasswordHistory
# - APIKey
# - LoginAttempt (now FailedLoginAttempt)
# - AuditLog
# - IPWhitelist
# - IPBlacklist
# ============================================
