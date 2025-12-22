# dashboard/urls.py

from django.urls import path
from .views import (
    staff_dashboard_view,
    client_dashboard_view,
    guest_dashboard_view,
    # API views
    recent_activities,
    recently_viewed_companies,
    track_company_view,
    reports_by_category,
    companies_by_country,
    subscription_timeline,
    dashboard_stats,
    # Theme settings views
    get_theme_settings,
    get_all_theme_settings,
    admin_get_theme_settings,
    admin_update_theme_settings,
    get_theme_choices,
    # Notification settings views
    admin_get_notification_settings,
    admin_update_notification_settings,
    admin_get_notification_type_configs,
    admin_update_notification_type_config,
    get_notification_choices,
    # System settings views
    system_overview,
    database_stats,
    cache_stats,
    clear_cache,
    performance_stats,
    system_logs,
    run_maintenance,
    environment_info,
)

# NOTE: Security settings views have been moved to accounts/security_urls.py
# Include them in your main urls.py with: path('api/security/', include('accounts.security_urls'))

app_name = 'dashboard'

urlpatterns = [
    # Template views
    path('', staff_dashboard_view, name='staff_dashboard'),
    path('client/', client_dashboard_view, name='client_dashboard'),
    path('guest/', guest_dashboard_view, name='guest_dashboard'),
    
    # API endpoints
    path('api/recent-activities/', recent_activities, name='recent_activities'),
    path('api/recently-viewed/', recently_viewed_companies, name='recently_viewed'),
    path('api/track-view/', track_company_view, name='track_view'),
    path('api/reports-by-category/', reports_by_category, name='reports_by_category'),
    path('api/companies-by-country/', companies_by_country, name='companies_by_country'),
    path('api/subscription-timeline/', subscription_timeline, name='subscription_timeline'),
    path('api/stats/', dashboard_stats, name='dashboard_stats'),
    
    # Theme Settings API endpoints (Public - for frontend)
    path('api/theme-settings/', get_theme_settings, name='get_theme_settings'),
    path('api/theme-settings/all/', get_all_theme_settings, name='get_all_theme_settings'),
    
    # Theme Settings API endpoints (Admin only)
    path('api/admin/theme-settings/', admin_get_theme_settings, name='admin_get_theme_settings'),
    path('api/admin/theme-settings/<str:layout_type>/', admin_update_theme_settings, name='admin_update_theme_settings'),
    path('api/admin/theme-choices/', get_theme_choices, name='get_theme_choices'),
    
    # Notification Settings API endpoints (Admin only)
    path('api/admin/notification-settings/', admin_get_notification_settings, name='admin_get_notification_settings'),
    path('api/admin/notification-settings/update/', admin_update_notification_settings, name='admin_update_notification_settings'),
    path('api/admin/notification-type-configs/', admin_get_notification_type_configs, name='admin_get_notification_type_configs'),
    path('api/admin/notification-type-configs/<str:notification_type>/', admin_update_notification_type_config, name='admin_update_notification_type_config'),
    path('api/admin/notification-choices/', get_notification_choices, name='get_notification_choices'),
    
    # System Settings API endpoints (Admin only)
    path('api/admin/system/overview/', system_overview, name='system_overview'),
    path('api/admin/system/database/', database_stats, name='database_stats'),
    path('api/admin/system/cache/', cache_stats, name='cache_stats'),
    path('api/admin/system/cache/clear/', clear_cache, name='clear_cache'),
    path('api/admin/system/performance/', performance_stats, name='performance_stats'),
    path('api/admin/system/logs/', system_logs, name='system_logs'),
    path('api/admin/system/maintenance/', run_maintenance, name='run_maintenance'),
    path('api/admin/system/environment/', environment_info, name='environment_info'),
]
