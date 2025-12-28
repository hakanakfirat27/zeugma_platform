# Generated migration for DefaultUserSettings UI fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0016_usersettings'),
        ('accounts', '0017_alter_emailtemplate_template_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='defaultusersettings',
            name='default_sidebar_collapsed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='defaultusersettings',
            name='default_animation_enabled',
            field=models.BooleanField(default=True),
        ),
    ]
