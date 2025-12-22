# dashboard/admin.py

from django.contrib import admin
from .models import UserActivity, RecentlyViewedCompany, ThemeSettings


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'activity_type', 'company_name', 'report_title', 'created_at']
    list_filter = ['activity_type', 'created_at']
    search_fields = ['user__username', 'company_name', 'report_title']
    ordering = ['-created_at']
    readonly_fields = ['id', 'created_at']


@admin.register(RecentlyViewedCompany)
class RecentlyViewedCompanyAdmin(admin.ModelAdmin):
    list_display = ['user', 'company_name', 'country', 'report', 'viewed_at']
    list_filter = ['viewed_at', 'country']
    search_fields = ['user__username', 'company_name']
    ordering = ['-viewed_at']
    readonly_fields = ['id', 'viewed_at']


@admin.register(ThemeSettings)
class ThemeSettingsAdmin(admin.ModelAdmin):
    list_display = [
        'layout_type', 
        'default_theme', 
        'allow_user_toggle', 
        'toggle_variant',
        'sidebar_variant',
        'updated_at'
    ]
    list_filter = ['layout_type', 'default_theme', 'allow_user_toggle']
    readonly_fields = ['id', 'updated_at', 'updated_by']
    
    fieldsets = (
        ('Layout', {
            'fields': ('layout_type',)
        }),
        ('Theme Settings', {
            'fields': (
                'default_theme',
                'allow_user_toggle',
                'show_toggle_in_header',
                'toggle_variant',
                'remember_user_preference',
            )
        }),
        ('Sidebar Settings', {
            'fields': ('sidebar_variant',)
        }),
        ('Metadata', {
            'fields': ('updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)
