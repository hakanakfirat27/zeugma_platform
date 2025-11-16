# backend/announcements/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Announcement, AnnouncementView, AnnouncementAttachment


class AnnouncementAttachmentInline(admin.TabularInline):
    model = AnnouncementAttachment
    extra = 0
    readonly_fields = ['file_size', 'uploaded_at']


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'announcement_type_badge', 'priority_badge', 'status_badge',
        'target_audience', 'start_date', 'end_date', 'is_pinned',
        'views_count', 'created_by', 'created_at'
    ]
    list_filter = [
        'status', 'priority', 'announcement_type', 'target_audience',
        'is_pinned', 'show_popup', 'require_acknowledgment', 'created_at'
    ]
    search_fields = ['title', 'content', 'summary']
    readonly_fields = ['created_at', 'updated_at', 'views_count', 'created_by']
    filter_horizontal = ['specific_users']
    date_hierarchy = 'created_at'
    inlines = [AnnouncementAttachmentInline]

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'summary', 'content')
        }),
        ('Classification', {
            'fields': ('announcement_type', 'priority', 'status')
        }),
        ('Targeting', {
            'fields': ('target_audience', 'specific_users'),
            'description': 'Select who should see this announcement'
        }),
        ('Scheduling', {
            'fields': ('start_date', 'end_date'),
            'description': 'Set when announcement is active'
        }),
        ('Display Options', {
            'fields': ('is_pinned', 'show_popup', 'require_acknowledgment', 'icon', 'color_scheme'),
            'classes': ('collapse',)
        }),
        ('Call to Action', {
            'fields': ('action_button_text', 'action_button_url'),
            'classes': ('collapse',),
            'description': 'Optional action button'
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at', 'views_count'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # If creating new
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def announcement_type_badge(self, obj):
        colors = {
            'general': '#6B7280',
            'maintenance': '#F59E0B',
            'feature': '#10B981',
            'update': '#3B82F6',
            'event': '#8B5CF6',
            'alert': '#EF4444',
        }
        color = colors.get(obj.announcement_type, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            obj.get_announcement_type_display()
        )

    announcement_type_badge.short_description = 'Type'

    def priority_badge(self, obj):
        colors = {
            'low': '#10B981',
            'medium': '#3B82F6',
            'high': '#F59E0B',
            'critical': '#EF4444',
        }
        color = colors.get(obj.priority, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            obj.get_priority_display()
        )

    priority_badge.short_description = 'Priority'

    def status_badge(self, obj):
        colors = {
            'draft': '#6B7280',
            'scheduled': '#F59E0B',
            'active': '#10B981',
            'expired': '#EF4444',
            'archived': '#9CA3AF',
        }
        color = colors.get(obj.status, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 12px; font-size: 11px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )

    status_badge.short_description = 'Status'

    actions = ['publish_announcements', 'archive_announcements', 'update_status']

    def publish_announcements(self, request, queryset):
        updated = queryset.filter(status='draft').update(status='active')
        self.message_user(request, f'{updated} announcement(s) published successfully.')

    publish_announcements.short_description = 'Publish selected announcements'

    def archive_announcements(self, request, queryset):
        updated = queryset.update(status='archived')
        self.message_user(request, f'{updated} announcement(s) archived successfully.')

    archive_announcements.short_description = 'Archive selected announcements'

    def update_status(self, request, queryset):
        for announcement in queryset:
            announcement.update_status()
        self.message_user(request, f'Updated status for {queryset.count()} announcement(s).')

    update_status.short_description = 'Update status based on dates'


@admin.register(AnnouncementView)
class AnnouncementViewAdmin(admin.ModelAdmin):
    list_display = ['announcement', 'user', 'viewed_at', 'acknowledged', 'acknowledged_at']
    list_filter = ['acknowledged', 'viewed_at', 'acknowledged_at']
    search_fields = ['announcement__title', 'user__username', 'user__email']
    readonly_fields = ['announcement', 'user', 'viewed_at', 'acknowledged_at']
    date_hierarchy = 'viewed_at'

    def has_add_permission(self, request):
        return False


@admin.register(AnnouncementAttachment)
class AnnouncementAttachmentAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'announcement', 'file_size_display', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['file_name', 'announcement__title']
    readonly_fields = ['file_size', 'uploaded_at']

    def file_size_display(self, obj):
        return obj.get_file_size_display()

    file_size_display.short_description = 'File Size'