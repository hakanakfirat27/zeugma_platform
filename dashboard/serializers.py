# dashboard/serializers.py

from rest_framework import serializers
from .models import UserActivity, RecentlyViewedCompany, ThemeSettings, NotificationSettings, NotificationTypeConfig


class UserActivitySerializer(serializers.ModelSerializer):
    activity_type_display = serializers.CharField(
        source='get_activity_type_display',
        read_only=True
    )
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = UserActivity
        fields = [
            'id',
            'activity_type',
            'activity_type_display',
            'company_name',
            'report_title',
            'collection_name',
            'report_id',
            'record_id',
            'collection_id',
            'description',
            'country',
            'created_at',
            'time_ago',
        ]
    
    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return 'Just now'
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes} minute{"s" if minutes > 1 else ""} ago'
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f'{hours} hour{"s" if hours > 1 else ""} ago'
        elif diff < timedelta(days=7):
            days = diff.days
            return f'{days} day{"s" if days > 1 else ""} ago'
        else:
            return obj.created_at.strftime('%b %d, %Y')


class RecentlyViewedCompanySerializer(serializers.ModelSerializer):
    report_id = serializers.UUIDField(source='report.report_id', read_only=True)
    report_title = serializers.CharField(source='report.title', read_only=True)
    
    class Meta:
        model = RecentlyViewedCompany
        fields = [
            'id',
            'report_id',
            'report_title',
            'record_id',
            'company_name',
            'country',
            'category',
            'viewed_at',
        ]


class ReportCategoryStatsSerializer(serializers.Serializer):
    """Serializer for reports by category statistics"""
    category = serializers.CharField()
    category_display = serializers.CharField()
    count = serializers.IntegerField()
    color = serializers.CharField()


class CountryStatsSerializer(serializers.Serializer):
    """Serializer for companies by country statistics"""
    country = serializers.CharField()
    count = serializers.IntegerField()
    flag = serializers.CharField(required=False)


class SubscriptionTimelineSerializer(serializers.Serializer):
    """Serializer for subscription timeline data"""
    id = serializers.UUIDField()
    report_title = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    days_remaining = serializers.IntegerField()
    progress_percentage = serializers.FloatField()
    status = serializers.CharField()
    is_expiring_soon = serializers.BooleanField()


class ThemeSettingsSerializer(serializers.ModelSerializer):
    """Serializer for theme settings"""
    layout_type_display = serializers.CharField(
        source='get_layout_type_display',
        read_only=True
    )
    default_theme_display = serializers.CharField(
        source='get_default_theme_display',
        read_only=True
    )
    toggle_variant_display = serializers.CharField(
        source='get_toggle_variant_display',
        read_only=True
    )
    sidebar_variant_display = serializers.CharField(
        source='get_sidebar_variant_display',
        read_only=True
    )
    updated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ThemeSettings
        fields = [
            'id',
            'layout_type',
            'layout_type_display',
            'default_theme',
            'default_theme_display',
            'allow_user_toggle',
            'show_toggle_in_header',
            'toggle_variant',
            'toggle_variant_display',
            'sidebar_variant',
            'sidebar_variant_display',
            'remember_user_preference',
            'updated_at',
            'updated_by',
            'updated_by_name',
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by']
    
    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name() or obj.updated_by.username
        return None
    
    def update(self, instance, validated_data):
        # Set the updated_by field to the current user
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            instance.updated_by = request.user
        return super().update(instance, validated_data)


class ThemeSettingsPublicSerializer(serializers.Serializer):
    """
    Public serializer for theme settings (for non-admin users).
    Only returns what's needed for the frontend to apply themes.
    """
    layout_type = serializers.CharField()
    default_theme = serializers.CharField()
    allow_user_toggle = serializers.BooleanField()
    show_toggle_in_header = serializers.BooleanField()
    toggle_variant = serializers.CharField()
    sidebar_variant = serializers.CharField()
    remember_user_preference = serializers.BooleanField()


class ThemeSettingsChoicesSerializer(serializers.Serializer):
    """Serializer to return available choices for theme settings"""
    layout_types = serializers.ListField(child=serializers.DictField())
    default_themes = serializers.ListField(child=serializers.DictField())
    toggle_variants = serializers.ListField(child=serializers.DictField())
    sidebar_variants = serializers.ListField(child=serializers.DictField())


# ============================================
# NOTIFICATION SETTINGS SERIALIZERS
# ============================================

class NotificationSettingsSerializer(serializers.ModelSerializer):
    """Serializer for global notification settings"""
    email_frequency_display = serializers.CharField(
        source='get_email_frequency_display',
        read_only=True
    )
    updated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = NotificationSettings
        fields = [
            'id',
            'notifications_enabled',
            'email_notifications_enabled',
            'email_from_name',
            'email_reply_to',
            'email_frequency',
            'email_frequency_display',
            'include_email_footer',
            'inapp_notifications_enabled',
            'notification_sound_enabled',
            'auto_dismiss_seconds',
            'max_notifications_shown',
            'push_notifications_enabled',
            'daily_summary_enabled',
            'daily_summary_time',
            'allow_user_preferences',
            'updated_at',
            'updated_by',
            'updated_by_name',
        ]
        read_only_fields = ['id', 'updated_at', 'updated_by']
    
    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name() or obj.updated_by.username
        return None
    
    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            instance.updated_by = request.user
        return super().update(instance, validated_data)


class NotificationTypeConfigSerializer(serializers.ModelSerializer):
    """Serializer for notification type configuration"""
    notification_type_display = serializers.SerializerMethodField()
    priority_display = serializers.CharField(
        source='get_priority_display',
        read_only=True
    )
    
    class Meta:
        model = NotificationTypeConfig
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'display_name',
            'description',
            'icon',
            'color',
            'email_enabled',
            'inapp_enabled',
            'push_enabled',
            'priority',
            'priority_display',
            'target_roles',
            'is_active',
        ]
        read_only_fields = ['id', 'notification_type']
    
    def get_notification_type_display(self, obj):
        return obj.display_name


class NotificationSettingsChoicesSerializer(serializers.Serializer):
    """Serializer to return available choices for notification settings"""
    email_frequencies = serializers.ListField(child=serializers.DictField())
    priorities = serializers.ListField(child=serializers.DictField())
    notification_types = serializers.ListField(child=serializers.DictField())


# ============================================
# NOTE: Security serializers have been moved to accounts/security_serializers.py
# The security models are now in accounts/security_models.py
# ============================================
