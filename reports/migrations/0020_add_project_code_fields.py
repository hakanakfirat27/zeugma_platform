# reports/migrations/0020_add_project_code_fields.py

from django.db import migrations, models
import django.db.models.deletion


def generate_project_codes(apps, schema_editor):
    """Generate unique project codes for existing projects"""
    DataCollectionProject = apps.get_model('reports', 'DataCollectionProject')
    
    projects = DataCollectionProject.objects.all().order_by('created_at')
    
    for index, project in enumerate(projects, start=1):
        project.project_code = f"PRJ-{str(index).zfill(6)}"
        project.save(update_fields=['project_code'])


def reverse_project_codes(apps, schema_editor):
    """Reverse: clear project codes"""
    DataCollectionProject = apps.get_model('reports', 'DataCollectionProject')
    DataCollectionProject.objects.all().update(project_code='')


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0019_productionsiteversion_technical_data_snapshot'),
    ]

    operations = [
        # Step 1: Add project_code field to DataCollectionProject (NO db_index yet)
        migrations.AddField(
            model_name='datacollectionproject',
            name='project_code',
            field=models.CharField(
                blank=True,
                default='',
                editable=False,
                help_text='Auto-generated project code (e.g., PRJ-000001)',
                max_length=20,
            ),
        ),
        
        # Step 2: Generate unique project codes for existing projects
        migrations.RunPython(generate_project_codes, reverse_project_codes),
        
        # Step 3: Now add the unique constraint AND db_index
        migrations.AlterField(
            model_name='datacollectionproject',
            name='project_code',
            field=models.CharField(
                blank=True,
                db_index=True,
                editable=False,
                help_text='Auto-generated project code (e.g., PRJ-000001)',
                max_length=20,
                unique=True,
            ),
        ),
        
        # Step 4: Add source_project_code to ProductionSite
        migrations.AddField(
            model_name='productionsite',
            name='source_project_code',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='Project code from which this site was transferred (e.g., PRJ-000001)',
                max_length=20,
            ),
        ),
        
        # Step 5: Add source_project ForeignKey to ProductionSite
        migrations.AddField(
            model_name='productionsite',
            name='source_project',
            field=models.ForeignKey(
                blank=True,
                help_text='Original project this site came from',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='transferred_production_sites',
                to='reports.datacollectionproject',
            ),
        ),
    ]
