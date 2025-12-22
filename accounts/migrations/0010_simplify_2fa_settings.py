# accounts/migrations/0010_simplify_2fa_settings.py
# Simplify 2FA settings - remove TOTP and admin-specific enforcement

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_security_models'),
    ]

    operations = [
        # Remove old fields
        migrations.RemoveField(
            model_name='securitysettings',
            name='enforce_2fa_for_admins',
        ),
        migrations.RemoveField(
            model_name='securitysettings',
            name='enforce_2fa_for_all',
        ),
        migrations.RemoveField(
            model_name='securitysettings',
            name='totp_enabled',
        ),
        
        # Add new simplified field
        migrations.AddField(
            model_name='securitysettings',
            name='enforce_2fa_first_login',
            field=models.BooleanField(default=False, help_text='Require all users to set up 2FA on first login (users can disable later)'),
        ),
        
        # Update backup codes default to 5
        migrations.AlterField(
            model_name='securitysettings',
            name='backup_codes_count',
            field=models.IntegerField(default=5, help_text='Number of backup codes to generate for recovery'),
        ),
    ]
