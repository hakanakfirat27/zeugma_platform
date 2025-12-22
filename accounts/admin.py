# accounts/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

# This is the customized admin view for our User model.
class CustomUserAdmin(UserAdmin):
    # This adds the 'role' field to the detail view in the admin panel.
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('role',)}),
    )

    # These are the new additions to make the user list more powerful!

    # list_display: Controls which columns are shown in the user list.
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_staff']

    # list_filter: Adds a sidebar to filter the user list.
    list_filter = ['role', 'is_staff', 'is_superuser', 'is_active']

    # search_fields: Adds a search bar at the top of the user list.
    search_fields = ['username', 'first_name', 'last_name', 'email']


# Register your User model with the new, customized admin view.
admin.site.register(User, CustomUserAdmin)


# =============================================================================
# INTEGRATION MODELS ADMIN
# =============================================================================
from .integrations_models import SlackIntegration, Webhook, WebhookDeliveryLog, GoogleAnalyticsIntegration


@admin.register(SlackIntegration)
class SlackIntegrationAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'is_enabled', 'notification_count', 'last_notification_at', 'updated_at']
    readonly_fields = ['notification_count', 'last_test_at', 'last_test_success', 'last_notification_at', 'created_at', 'updated_at']
    fieldsets = (
        ('Status', {
            'fields': ('is_enabled', 'webhook_url', 'channel_name', 'bot_name', 'bot_icon')
        }),
        ('Notification Events', {
            'fields': (
                'notify_user_created', 'notify_user_invited', 'notify_user_login',
                'notify_report_published', 'notify_report_updated',
                'notify_data_imported', 'notify_data_import_failed',
                'notify_security_alerts', 'notify_system_announcements'
            )
        }),
        ('Statistics', {
            'fields': ('notification_count', 'last_notification_at', 'last_test_at', 'last_test_success'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    list_display = ['name', 'url', 'status', 'is_active', 'total_deliveries', 'success_rate', 'created_at']
    list_filter = ['status', 'is_active', 'created_at']
    search_fields = ['name', 'url', 'description']
    readonly_fields = ['secret', 'total_deliveries', 'successful_deliveries', 'failed_deliveries', 
                       'last_delivery_at', 'last_delivery_success', 'last_error', 'consecutive_failures',
                       'created_at', 'updated_at']
    
    def success_rate(self, obj):
        if obj.total_deliveries == 0:
            return 'N/A'
        rate = (obj.successful_deliveries / obj.total_deliveries) * 100
        return f'{rate:.1f}%'
    success_rate.short_description = 'Success Rate'


@admin.register(WebhookDeliveryLog)
class WebhookDeliveryLogAdmin(admin.ModelAdmin):
    list_display = ['webhook', 'event_type', 'success', 'response_status_code', 'duration_ms', 'created_at']
    list_filter = ['success', 'event_type', 'webhook', 'created_at']
    search_fields = ['webhook__name', 'event_type']
    readonly_fields = ['webhook', 'event_type', 'payload', 'request_headers', 'response_status_code',
                       'response_body', 'response_headers', 'success', 'error_message', 'duration_ms',
                       'attempt_number', 'created_at']
    date_hierarchy = 'created_at'


@admin.register(GoogleAnalyticsIntegration)
class GoogleAnalyticsIntegrationAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'is_enabled', 'measurement_id', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Status', {
            'fields': ('is_enabled', 'measurement_id')
        }),
        ('Tracking Options', {
            'fields': (
                'track_page_views', 'track_report_downloads', 'track_search_queries',
                'track_filter_usage', 'track_user_actions', 'anonymize_ip', 'debug_mode'
            )
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )