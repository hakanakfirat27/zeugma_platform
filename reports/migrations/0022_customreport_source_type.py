# Generated migration for CustomReport source_type field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0021_alter_productionsite_source_project'),
    ]

    operations = [
        migrations.AddField(
            model_name='customreport',
            name='source_type',
            field=models.CharField(
                choices=[('SUPERDATABASE', 'Superdatabase'), ('COMPANY_DATABASE', 'Company Database')],
                default='SUPERDATABASE',
                help_text='Which database this report queries from',
                max_length=20,
            ),
        ),
    ]
