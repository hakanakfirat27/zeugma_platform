# Generated migration for UserSettings

import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0015_googleanalyticsintegration_slackintegration_webhook_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserSettings',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('theme_mode', models.CharField(choices=[('light', 'Light'), ('dark', 'Dark'), ('system', 'System Preference')], default='system', help_text='Overall theme mode (light/dark/system)', max_length=10)),
                ('header_color_scheme', models.CharField(choices=[('default', 'Default'), ('dark', 'Dark'), ('midnight', 'Midnight Blue'), ('ocean', 'Ocean'), ('forest', 'Forest'), ('sunset', 'Sunset'), ('lavender', 'Lavender'), ('slate', 'Slate'), ('rose', 'Rose'), ('amber', 'Amber')], default='default', help_text='Color scheme for the header', max_length=20)),
                ('header_style', models.CharField(choices=[('default', 'Default'), ('gradient', 'Gradient'), ('solid', 'Solid Color'), ('minimal', 'Minimal'), ('glass', 'Glass Effect')], default='default', help_text='Style variant for the header', max_length=20)),
                ('sidebar_color_scheme', models.CharField(choices=[('default', 'Default'), ('dark', 'Dark'), ('midnight', 'Midnight Blue'), ('ocean', 'Ocean'), ('forest', 'Forest'), ('sunset', 'Sunset'), ('lavender', 'Lavender'), ('slate', 'Slate'), ('rose', 'Rose'), ('amber', 'Amber')], default='default', help_text='Color scheme for the sidebar', max_length=20)),
                ('sidebar_style', models.CharField(choices=[('default', 'Default'), ('compact', 'Compact'), ('expanded', 'Expanded'), ('minimal', 'Minimal'), ('glass', 'Glass Effect'), ('gradient', 'Gradient')], default='default', help_text='Style variant for the sidebar', max_length=20)),
                ('sidebar_collapsed', models.BooleanField(default=False, help_text='Whether sidebar is collapsed by default')),
                ('email_notifications', models.BooleanField(default=True, help_text='Receive email notifications')),
                ('push_notifications', models.BooleanField(default=True, help_text='Receive push notifications')),
                ('inapp_notifications', models.BooleanField(default=True, help_text='Receive in-app notifications')),
                ('notification_sound', models.BooleanField(default=False, help_text='Play sound for new notifications')),
                ('notification_preferences', models.JSONField(blank=True, default=dict, help_text='Granular notification preferences per type')),
                ('daily_summary_email', models.BooleanField(default=False, help_text='Receive daily summary email')),
                ('compact_mode', models.BooleanField(default=False, help_text='Use compact UI layout')),
                ('animation_enabled', models.BooleanField(default=True, help_text='Enable UI animations')),
                ('high_contrast', models.BooleanField(default=False, help_text='Enable high contrast mode for accessibility')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='settings', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'User Settings',
                'verbose_name_plural': 'User Settings',
            },
        ),
        migrations.CreateModel(
            name='DefaultUserSettings',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('role', models.CharField(choices=[('CLIENT', 'Client'), ('DATA_COLLECTOR', 'Data Collector'), ('GUEST', 'Guest'), ('STAFF_ADMIN', 'Staff Admin'), ('SUPERADMIN', 'Superadmin')], help_text='The user role this default applies to', max_length=20, unique=True)),
                ('default_theme_mode', models.CharField(choices=[('light', 'Light'), ('dark', 'Dark'), ('system', 'System Preference')], default='system', max_length=10)),
                ('default_header_color_scheme', models.CharField(choices=[('default', 'Default'), ('dark', 'Dark'), ('midnight', 'Midnight Blue'), ('ocean', 'Ocean'), ('forest', 'Forest'), ('sunset', 'Sunset'), ('lavender', 'Lavender'), ('slate', 'Slate'), ('rose', 'Rose'), ('amber', 'Amber')], default='default', max_length=20)),
                ('default_header_style', models.CharField(choices=[('default', 'Default'), ('gradient', 'Gradient'), ('solid', 'Solid Color'), ('minimal', 'Minimal'), ('glass', 'Glass Effect')], default='default', max_length=20)),
                ('default_sidebar_color_scheme', models.CharField(choices=[('default', 'Default'), ('dark', 'Dark'), ('midnight', 'Midnight Blue'), ('ocean', 'Ocean'), ('forest', 'Forest'), ('sunset', 'Sunset'), ('lavender', 'Lavender'), ('slate', 'Slate'), ('rose', 'Rose'), ('amber', 'Amber')], default='default', max_length=20)),
                ('default_sidebar_style', models.CharField(choices=[('default', 'Default'), ('compact', 'Compact'), ('expanded', 'Expanded'), ('minimal', 'Minimal'), ('glass', 'Glass Effect'), ('gradient', 'Gradient')], default='default', max_length=20)),
                ('default_email_notifications', models.BooleanField(default=True)),
                ('default_push_notifications', models.BooleanField(default=True)),
                ('default_inapp_notifications', models.BooleanField(default=True)),
                ('default_sidebar_collapsed', models.BooleanField(default=False)),
                ('default_animation_enabled', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='default_settings_updated', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Default User Settings',
                'verbose_name_plural': 'Default User Settings',
                'ordering': ['role'],
            },
        ),
    ]
