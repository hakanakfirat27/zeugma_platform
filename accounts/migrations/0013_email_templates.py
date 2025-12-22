# accounts/migrations/0013_email_templates.py
# Migration for email templates and branding

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0012_rename_accounts_al_time_idx_accounts_au_timesta_40aa9a_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailBranding',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company_name', models.CharField(default='Zeugma Platform', max_length=255)),
                ('logo_url', models.URLField(blank=True, help_text='URL to company logo', null=True)),
                ('primary_color', models.CharField(default='#dc2626', help_text='Primary brand color (hex)', max_length=7)),
                ('secondary_color', models.CharField(default='#1f2937', help_text='Secondary brand color (hex)', max_length=7)),
                ('footer_text', models.TextField(blank=True, default='© 2025 Zeugma Platform. All rights reserved.')),
                ('support_email', models.EmailField(blank=True, default='support@zeugma.com', max_length=254)),
                ('website_url', models.URLField(blank=True, default='https://zeugma.com')),
                ('social_links', models.JSONField(blank=True, default=dict)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='email_branding_updates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Email Branding',
                'verbose_name_plural': 'Email Branding',
            },
        ),
        migrations.CreateModel(
            name='EmailTemplate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('template_type', models.CharField(choices=[
                    ('welcome', 'Welcome Email'),
                    ('password_reset', 'Password Reset'),
                    ('password_changed', 'Password Changed Confirmation'),
                    ('2fa_code', '2FA Verification Code'),
                    ('2fa_enabled', '2FA Enabled Confirmation'),
                    ('2fa_disabled', '2FA Disabled Notification'),
                    ('login_alert', 'New Login Alert'),
                    ('account_locked', 'Account Locked Notification'),
                    ('subscription_welcome', 'Subscription Welcome'),
                    ('subscription_expiring', 'Subscription Expiring Soon'),
                    ('subscription_expired', 'Subscription Expired'),
                    ('report_ready', 'Report Ready Notification'),
                    ('report_shared', 'Report Shared With You'),
                    ('user_invited', 'User Invitation'),
                    ('announcement', 'System Announcement'),
                ], max_length=50, unique=True)),
                ('name', models.CharField(max_length=255)),
                ('subject', models.CharField(help_text='Email subject line. Can use {{variables}}', max_length=255)),
                ('html_content', models.TextField(help_text='HTML email content. Can use {{variables}}')),
                ('text_content', models.TextField(blank=True, help_text='Plain text fallback content')),
                ('available_variables', models.JSONField(blank=True, default=list)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='email_template_updates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Email Template',
                'verbose_name_plural': 'Email Templates',
                'ordering': ['name'],
            },
        ),
    ]
