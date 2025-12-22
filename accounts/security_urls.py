# accounts/security_urls.py
# URL patterns for security management API endpoints

from django.urls import path
from . import security_views
from . import email_views

urlpatterns = [
    # Security Settings
    path('settings/', security_views.get_security_settings, name='security-settings'),
    path('settings/update/', security_views.update_security_settings, name='security-settings-update'),
    path('password-policy/', security_views.get_password_policy, name='password-policy'),
    
    # Two-Factor Authentication
    path('2fa/status/', security_views.get_2fa_status, name='2fa-status'),
    path('2fa/setup/totp/', security_views.setup_totp, name='setup-totp'),
    path('2fa/verify/totp/setup/', security_views.verify_totp_setup, name='verify-totp-setup'),
    path('2fa/verify/totp/', security_views.verify_totp, name='verify-totp'),
    path('2fa/disable/', security_views.disable_totp, name='disable-totp'),
    path('2fa/backup-codes/regenerate/', security_views.regenerate_backup_codes, name='regenerate-backup-codes'),
    path('2fa/backup-codes/verify/', security_views.verify_backup_code, name='verify-backup-code'),
    
    # Session Management
    path('sessions/', security_views.get_my_sessions, name='my-sessions'),
    path('sessions/<str:session_key>/terminate/', security_views.terminate_session, name='terminate-session'),
    path('sessions/terminate-others/', security_views.terminate_all_other_sessions, name='terminate-other-sessions'),
    path('sessions/all/', security_views.get_all_sessions, name='all-sessions'),  # Admin
    path('sessions/cleanup-stale/', security_views.cleanup_stale_sessions, name='cleanup-stale-sessions'),  # Admin
    path('sessions/admin/<str:session_key>/terminate/', security_views.admin_terminate_session, name='admin-terminate-session'),
    
    # API Keys
    path('api-keys/', security_views.get_my_api_keys, name='my-api-keys'),
    path('api-keys/create/', security_views.create_api_key, name='create-api-key'),
    path('api-keys/<uuid:key_id>/', security_views.update_api_key, name='update-api-key'),
    path('api-keys/<uuid:key_id>/revoke/', security_views.revoke_api_key, name='revoke-api-key'),
    path('api-keys/all/', security_views.get_all_api_keys, name='all-api-keys'),  # Admin
    
    # IP Whitelist/Blacklist
    path('ip-whitelist/', security_views.get_ip_whitelist, name='ip-whitelist'),
    path('ip-whitelist/add/', security_views.add_ip_whitelist, name='add-ip-whitelist'),
    path('ip-whitelist/<int:pk>/remove/', security_views.remove_ip_whitelist, name='remove-ip-whitelist'),
    path('ip-blacklist/', security_views.get_ip_blacklist, name='ip-blacklist'),
    path('ip-blacklist/add/', security_views.add_ip_blacklist, name='add-ip-blacklist'),
    path('ip-blacklist/<int:pk>/remove/', security_views.remove_ip_blacklist, name='remove-ip-blacklist'),
    
    # Audit Logs
    path('audit-logs/', security_views.get_audit_logs, name='audit-logs'),
    path('audit-logs/stats/', security_views.get_audit_log_stats, name='audit-log-stats'),
    path('audit-logs/event-types/', security_views.get_audit_log_event_types, name='audit-log-event-types'),
    
    # Login History & Failed Attempts
    path('login-history/', security_views.get_login_history, name='login-history'),
    path('failed-attempts/', security_views.get_failed_login_attempts, name='failed-login-attempts'),
    
    # Dashboard
    path('dashboard/', security_views.get_security_dashboard, name='security-dashboard'),
    
    # Audit Log Cleanup
    path('audit-logs/cleanup/preview/', security_views.get_cleanup_preview, name='cleanup-preview'),
    path('audit-logs/cleanup/run/', security_views.run_cleanup, name='run-cleanup'),
    
    # Email Templates & Branding
    path('email/branding/', email_views.get_email_branding, name='email-branding'),
    path('email/branding/update/', email_views.update_email_branding, name='update-email-branding'),
    path('email/templates/', email_views.get_email_templates, name='email-templates'),
    path('email/templates/types/', email_views.get_template_types, name='email-template-types'),
    path('email/templates/create-defaults/', email_views.create_default_templates, name='create-default-templates'),
    path('email/templates/<int:template_id>/', email_views.get_email_template, name='email-template-detail'),
    path('email/templates/<int:template_id>/update/', email_views.update_email_template, name='update-email-template'),
    path('email/templates/<int:template_id>/toggle/', email_views.toggle_email_template, name='toggle-email-template'),
    path('email/templates/<int:template_id>/reset/', email_views.reset_email_template, name='reset-email-template'),
    path('email/templates/preview/', email_views.preview_email_template, name='preview-email-template'),
    path('email/templates/send-test/', email_views.send_test_email, name='send-test-email'),
    path('email/templates/recreate-all/', email_views.recreate_all_templates, name='recreate-all-templates'),
    path('email/templates/create/', email_views.create_email_template, name='create-email-template'),
    path('email/templates/<int:template_id>/delete/', email_views.delete_email_template, name='delete-email-template'),
]
