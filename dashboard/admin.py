# dashboard/admin.py

from django.contrib import admin
from .models import UserActivity, RecentlyViewedCompany


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
