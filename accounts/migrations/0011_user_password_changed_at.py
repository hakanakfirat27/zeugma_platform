# accounts/migrations/0011_user_password_changed_at.py
# Add password_changed_at field for password expiry tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_simplify_2fa_settings'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='password_changed_at',
            field=models.DateTimeField(
                blank=True, 
                null=True, 
                help_text='When password was last changed'
            ),
        ),
    ]
