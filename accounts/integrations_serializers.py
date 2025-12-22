# accounts/integrations_serializers.py
# Serializers for Integration settings API

from rest_framework import serializers
from .integrations_models import (
    SlackIntegration, 
    Webhook, 
    WebhookDeliveryLog,
    GoogleAnalyticsIntegration
)


class SlackIntegrationSerializer(serializers.ModelSerializer):
    """Serializer for Slack integration settings"""
    
    class Meta:
        model = SlackIntegration
        fields = [
            'is_enabled',
            'webhook_url',
            'channel_name',
            'bot_name',
            'bot_icon',
            'notify_user_created',
            'notify_user_invited',
            'notify_user_login',
            'notify_report_published',
            'notify_report_updated',
            'notify_data_imported',
            'notify_data_import_failed',
            'notify_security_alerts',
            'notify_system_announcements',
            'last_test_at',
            'last_test_success',
            'last_notification_at',
            'notification_count',
            'updated_at',
        ]
        read_only_fields = [
            'last_test_at',
            'last_test_success',
            'last_notification_at',
            'notification_count',
            'updated_at',
        ]

    def validate_webhook_url(self, value):
        """Validate Slack webhook URL format"""
        if value and not value.startswith('https://hooks.slack.com/'):
            raise serializers.ValidationError(
                'Invalid Slack webhook URL. It should start with https://hooks.slack.com/'
            )
        return value


class WebhookSerializer(serializers.ModelSerializer):
    """Serializer for Webhook configuration"""
    
    success_rate = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Webhook
        fields = [
            'id',
            'name',
            'description',
            'url',
            'secret',
            'status',
            'is_active',
            'events',
            'custom_headers',
            'max_retries',
            'retry_delay_seconds',
            'timeout_seconds',
            'total_deliveries',
            'successful_deliveries',
            'failed_deliveries',
            'success_rate',
            'last_delivery_at',
            'last_delivery_success',
            'last_error',
            'consecutive_failures',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = [
            'id',
            'secret',
            'total_deliveries',
            'successful_deliveries',
            'failed_deliveries',
            'success_rate',
            'last_delivery_at',
            'last_delivery_success',
            'last_error',
            'consecutive_failures',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
    
    def get_success_rate(self, obj):
        if obj.total_deliveries == 0:
            return None
        return round((obj.successful_deliveries / obj.total_deliveries) * 100, 1)
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name or obj.created_by.username
        return None

    def validate_url(self, value):
        """Validate webhook URL"""
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError('URL must start with http:// or https://')
        return value

    def validate_events(self, value):
        """Validate events list"""
        if not value or not isinstance(value, list):
            raise serializers.ValidationError('At least one event must be selected')
        
        available_events = [e['value'] for e in Webhook.get_available_events()]
        for event in value:
            if event not in available_events:
                raise serializers.ValidationError(f'Invalid event type: {event}')
        
        return value


class WebhookCreateSerializer(WebhookSerializer):
    """Serializer for creating webhooks - allows setting secret"""
    
    class Meta(WebhookSerializer.Meta):
        read_only_fields = [
            'id',
            'total_deliveries',
            'successful_deliveries',
            'failed_deliveries',
            'success_rate',
            'last_delivery_at',
            'last_delivery_success',
            'last_error',
            'consecutive_failures',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]


class WebhookDeliveryLogSerializer(serializers.ModelSerializer):
    """Serializer for webhook delivery logs"""
    
    webhook_name = serializers.SerializerMethodField()
    
    class Meta:
        model = WebhookDeliveryLog
        fields = [
            'id',
            'webhook',
            'webhook_name',
            'event_type',
            'payload',
            'request_headers',
            'response_status_code',
            'response_body',
            'success',
            'error_message',
            'duration_ms',
            'attempt_number',
            'created_at',
        ]
    
    def get_webhook_name(self, obj):
        return obj.webhook.name


class GoogleAnalyticsIntegrationSerializer(serializers.ModelSerializer):
    """Serializer for Google Analytics integration settings"""
    
    class Meta:
        model = GoogleAnalyticsIntegration
        fields = [
            'is_enabled',
            'measurement_id',
            'track_page_views',
            'track_report_downloads',
            'track_search_queries',
            'track_filter_usage',
            'track_user_actions',
            'anonymize_ip',
            'debug_mode',
            'updated_at',
        ]
        read_only_fields = ['updated_at']

    def validate_measurement_id(self, value):
        """Validate GA4 Measurement ID format"""
        if value and not value.startswith('G-'):
            raise serializers.ValidationError(
                'Invalid Measurement ID. GA4 IDs should start with G-'
            )
        return value


class WebhookEventsSerializer(serializers.Serializer):
    """Serializer for available webhook events"""
    
    value = serializers.CharField()
    label = serializers.CharField()
    category = serializers.CharField()


class IntegrationsSummarySerializer(serializers.Serializer):
    """Serializer for integrations dashboard summary"""
    
    slack = serializers.SerializerMethodField()
    webhooks = serializers.SerializerMethodField()
    google_analytics = serializers.SerializerMethodField()
    
    def get_slack(self, obj):
        from .integrations_models import SlackIntegration
        settings = SlackIntegration.get_settings()
        return {
            'is_enabled': settings.is_enabled,
            'is_connected': bool(settings.webhook_url),
            'notification_count': settings.notification_count,
            'last_notification_at': settings.last_notification_at,
        }
    
    def get_webhooks(self, obj):
        from .integrations_models import Webhook
        webhooks = Webhook.objects.filter(is_active=True)
        return {
            'total_count': webhooks.count(),
            'active_count': webhooks.filter(status='active').count(),
            'failed_count': webhooks.filter(status='failed').count(),
        }
    
    def get_google_analytics(self, obj):
        from .integrations_models import GoogleAnalyticsIntegration
        settings = GoogleAnalyticsIntegration.get_settings()
        return {
            'is_enabled': settings.is_enabled,
            'is_configured': bool(settings.measurement_id),
        }
