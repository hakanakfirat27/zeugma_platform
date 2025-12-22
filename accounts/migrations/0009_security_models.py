# accounts/migrations/0009_security_models.py
# Generated migration for security models

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_alter_user_role'),
    ]

    operations = [
        # SecuritySettings - Global security configuration
        migrations.CreateModel(
            name='SecuritySettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                # 2FA Settings
                ('enforce_2fa_for_admins', models.BooleanField(default=True, help_text='Require 2FA for admin users')),
                ('enforce_2fa_for_all', models.BooleanField(default=False, help_text='Require 2FA for all users')),
                ('totp_enabled', models.BooleanField(default=True, help_text='Allow TOTP authenticator app')),
                ('email_2fa_enabled', models.BooleanField(default=True, help_text='Allow email-based 2FA')),
                ('backup_codes_count', models.IntegerField(default=10, help_text='Number of backup codes to generate')),
                # Session Settings
                ('session_timeout_minutes', models.IntegerField(default=60, help_text='Session timeout in minutes (0 = no timeout)')),
                ('max_concurrent_sessions', models.IntegerField(default=5, help_text='Maximum concurrent sessions per user (0 = unlimited)')),
                ('single_session_mode', models.BooleanField(default=False, help_text='Allow only one session per user')),
                # Password Policy
                ('min_password_length', models.IntegerField(default=8)),
                ('require_uppercase', models.BooleanField(default=True)),
                ('require_lowercase', models.BooleanField(default=True)),
                ('require_numbers', models.BooleanField(default=True)),
                ('require_special_chars', models.BooleanField(default=False)),
                ('password_expiry_days', models.IntegerField(default=0, help_text='Days until password expires (0 = never)')),
                ('password_history_count', models.IntegerField(default=5, help_text='Number of previous passwords to remember')),
                # Login Security
                ('max_failed_attempts', models.IntegerField(default=5, help_text='Failed attempts before lockout')),
                ('lockout_duration_minutes', models.IntegerField(default=30, help_text='Account lockout duration in minutes')),
                ('enable_ip_whitelist', models.BooleanField(default=False, help_text='Only allow logins from whitelisted IPs')),
                ('enable_ip_blacklist', models.BooleanField(default=True, help_text='Block logins from blacklisted IPs')),
                # Audit Settings
                ('log_all_logins', models.BooleanField(default=True)),
                ('log_failed_logins', models.BooleanField(default=True)),
                ('log_admin_actions', models.BooleanField(default=True)),
                ('audit_retention_days', models.IntegerField(default=90, help_text='Days to keep audit logs')),
                # Metadata
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acc_security_settings_updates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Security Settings',
                'verbose_name_plural': 'Security Settings',
                'db_table': 'accounts_securitysettings',
            },
        ),
        
        # UserTOTPDevice - TOTP authenticator configuration
        migrations.CreateModel(
            name='UserTOTPDevice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('secret_key', models.CharField(max_length=32)),
                ('is_verified', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_used_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='totp_device', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User TOTP Device',
                'verbose_name_plural': 'User TOTP Devices',
            },
        ),
        
        # TwoFactorBackupCode - Backup codes for 2FA recovery
        migrations.CreateModel(
            name='TwoFactorBackupCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code_hash', models.CharField(max_length=128)),
                ('is_used', models.BooleanField(default=False)),
                ('used_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='backup_codes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Two-Factor Backup Code',
                'verbose_name_plural': 'Two-Factor Backup Codes',
            },
        ),
        
        # UserSession - Track active sessions
        migrations.CreateModel(
            name='UserSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_key', models.CharField(max_length=40, unique=True)),
                ('device_name', models.CharField(blank=True, max_length=255)),
                ('device_type', models.CharField(choices=[('desktop', 'Desktop'), ('mobile', 'Mobile'), ('tablet', 'Tablet'), ('unknown', 'Unknown')], default='unknown', max_length=20)),
                ('browser', models.CharField(blank=True, max_length=100)),
                ('os', models.CharField(blank=True, max_length=100)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('location', models.CharField(blank=True, max_length=255)),
                ('is_current', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_activity', models.DateTimeField(auto_now=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='acc_active_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Session',
                'verbose_name_plural': 'User Sessions',
                'ordering': ['-last_activity'],
                'db_table': 'accounts_usersession',
            },
        ),
        
        # PasswordHistory - Track password history
        migrations.CreateModel(
            name='PasswordHistory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password_hash', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='acc_password_history', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Password History',
                'verbose_name_plural': 'Password Histories',
                'ordering': ['-created_at'],
                'db_table': 'accounts_passwordhistory',
            },
        ),
        
        # APIKey - API keys for programmatic access
        migrations.CreateModel(
            name='APIKey',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('key_prefix', models.CharField(max_length=8)),
                ('key_hash', models.CharField(max_length=128)),
                ('scopes', models.JSONField(default=list, help_text='List of allowed API scopes')),
                ('last_used_at', models.DateTimeField(blank=True, null=True)),
                ('last_used_ip', models.GenericIPAddressField(blank=True, null=True)),
                ('usage_count', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('expires_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='acc_api_keys', to=settings.AUTH_USER_MODEL)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acc_created_api_keys', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'API Key',
                'verbose_name_plural': 'API Keys',
                'ordering': ['-created_at'],
                'db_table': 'accounts_apikey',
            },
        ),
        
        # IPWhitelist - Whitelisted IP addresses
        migrations.CreateModel(
            name='IPWhitelist',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ip_address', models.GenericIPAddressField()),
                ('description', models.CharField(blank=True, max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_ip_whitelists', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'IP Whitelist',
                'verbose_name_plural': 'IP Whitelists',
                'unique_together': {('ip_address',)},
            },
        ),
        
        # IPBlacklist - Blacklisted IP addresses
        migrations.CreateModel(
            name='IPBlacklist',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ip_address', models.GenericIPAddressField()),
                ('reason', models.CharField(blank=True, max_length=255)),
                ('is_active', models.BooleanField(default=True)),
                ('blocked_until', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_ip_blacklists', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'IP Blacklist',
                'verbose_name_plural': 'IP Blacklists',
                'unique_together': {('ip_address',)},
            },
        ),
        
        # FailedLoginAttempt - Track failed logins
        migrations.CreateModel(
            name='FailedLoginAttempt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('username', models.CharField(max_length=150)),
                ('ip_address', models.GenericIPAddressField()),
                ('user_agent', models.TextField(blank=True)),
                ('attempted_at', models.DateTimeField(auto_now_add=True)),
                ('reason', models.CharField(choices=[('invalid_password', 'Invalid Password'), ('invalid_username', 'Invalid Username'), ('account_locked', 'Account Locked'), ('account_disabled', 'Account Disabled'), ('ip_blocked', 'IP Blocked')], default='invalid_password', max_length=50)),
            ],
            options={
                'verbose_name': 'Failed Login Attempt',
                'verbose_name_plural': 'Failed Login Attempts',
                'ordering': ['-attempted_at'],
            },
        ),
        
        # Add indexes for FailedLoginAttempt
        migrations.AddIndex(
            model_name='failedloginattempt',
            index=models.Index(fields=['ip_address', '-attempted_at'], name='accounts_fa_ip_idx'),
        ),
        migrations.AddIndex(
            model_name='failedloginattempt',
            index=models.Index(fields=['username', '-attempted_at'], name='accounts_fa_user_idx'),
        ),
        
        # AuditLog - Security audit log
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(choices=[
                    ('login_success', 'Login Success'),
                    ('login_failed', 'Login Failed'),
                    ('logout', 'Logout'),
                    ('password_change', 'Password Change'),
                    ('password_reset', 'Password Reset'),
                    ('2fa_enabled', '2FA Enabled'),
                    ('2fa_disabled', '2FA Disabled'),
                    ('2fa_verified', '2FA Verified'),
                    ('2fa_failed', '2FA Failed'),
                    ('backup_code_used', 'Backup Code Used'),
                    ('session_created', 'Session Created'),
                    ('session_terminated', 'Session Terminated'),
                    ('session_expired', 'Session Expired'),
                    ('api_key_created', 'API Key Created'),
                    ('api_key_revoked', 'API Key Revoked'),
                    ('api_key_used', 'API Key Used'),
                    ('user_created', 'User Created'),
                    ('user_updated', 'User Updated'),
                    ('user_deleted', 'User Deleted'),
                    ('user_locked', 'User Locked'),
                    ('user_unlocked', 'User Unlocked'),
                    ('settings_changed', 'Settings Changed'),
                    ('ip_blocked', 'IP Blocked'),
                    ('ip_unblocked', 'IP Unblocked'),
                    ('suspicious_activity', 'Suspicious Activity'),
                ], max_length=50)),
                ('severity', models.CharField(choices=[('info', 'Info'), ('warning', 'Warning'), ('critical', 'Critical')], default='info', max_length=20)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('description', models.TextField(blank=True)),
                ('details', models.JSONField(blank=True, default=dict)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acc_audit_logs', to=settings.AUTH_USER_MODEL)),
                ('target_user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='acc_audit_logs_as_target', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Audit Log',
                'verbose_name_plural': 'Audit Logs',
                'ordering': ['-timestamp'],
                'db_table': 'accounts_auditlog',
            },
        ),
        
        # Add indexes for AuditLog
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['-timestamp'], name='accounts_al_time_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['event_type', '-timestamp'], name='accounts_al_event_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['user', '-timestamp'], name='accounts_al_user_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['severity', '-timestamp'], name='accounts_al_sev_idx'),
        ),
    ]
