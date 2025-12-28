# Generated migration for performance optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0029_companycollection_collectionitem_favoritecompany_and_more'),
    ]

    operations = [
        # Add composite indexes for common query patterns on ProductionSiteVersion
        migrations.AddIndex(
            model_name='productionsiteversion',
            index=models.Index(
                fields=['is_current', 'is_active'],
                name='rpt_psv_curr_active_idx'
            ),
        ),
        # Add index for filtering by status and country together
        migrations.AddIndex(
            model_name='company',
            index=models.Index(
                fields=['status', 'country'],
                name='rpt_company_stat_cntry_idx'
            ),
        ),
        # Add index for is_current lookups (most common filter)
        migrations.AddIndex(
            model_name='productionsiteversion',
            index=models.Index(
                fields=['is_current'],
                name='rpt_psv_is_current_idx'
            ),
        ),
    ]
