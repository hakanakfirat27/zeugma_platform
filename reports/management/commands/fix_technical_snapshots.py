"""
Management command to populate technical_data_snapshot for existing versions.

This fixes the bug where technical fields (checkboxes) in version snapshots
display current live values instead of frozen historical states.

For Initial Versions: Captures ALL technical fields with their current values
(which represent the original state at creation time).

For Snapshot Versions: Captures ALL technical fields with their values at
the time the snapshot was created.
"""

from django.core.management.base import BaseCommand
from reports.company_models import ProductionSiteVersion


class Command(BaseCommand):
    help = 'Populate technical_data_snapshot for existing versions that are missing it'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Overwrite existing technical_data_snapshot (use with caution)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))
        
        if force:
            self.stdout.write(self.style.WARNING('FORCE MODE - Will overwrite existing snapshots'))
        
        # Get all versions
        versions = ProductionSiteVersion.objects.all().order_by('created_at')
        
        total_count = versions.count()
        updated_count = 0
        skipped_count = 0
        
        self.stdout.write(f'Found {total_count} total versions to check')
        
        # Fields to exclude from technical snapshot (metadata fields)
        excluded_fields = {
            'version_id', 'production_site', 'version_number', 'is_current',
            'is_initial', 'is_active', 'version_notes', 'created_at', 'updated_at',
            'company_data_snapshot', 'contact_data_snapshot', 'notes_snapshot',
            'technical_data_snapshot', 'verified_at', 'verified_by', 'created_by',
            'id', 'pk', '_state', 'productionsiteversion_ptr_id'
        }
        
        # Process in batches
        batch_size = 100
        for i in range(0, total_count, batch_size):
            batch = versions[i:i+batch_size]
            
            for version in batch:
                # Check if technical_data_snapshot already exists
                current_snapshot = getattr(version, 'technical_data_snapshot', None) or {}
                
                if current_snapshot and len(current_snapshot) > 0 and not force:
                    skipped_count += 1
                    continue
                
                # Build complete technical_data_snapshot from ALL technical fields
                technical_data = {}
                
                # Get all field names from the model
                for field in version._meta.get_fields():
                    # Skip non-concrete fields (relations, etc.)
                    if not hasattr(field, 'column'):
                        continue
                    
                    field_name = field.name
                    
                    # Skip excluded fields
                    if field_name in excluded_fields:
                        continue
                    
                    try:
                        value = getattr(version, field_name, None)
                        # Store the value
                        technical_data[field_name] = value
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(f'  Could not get field {field_name}: {e}')
                        )
                
                if technical_data:
                    version_label = 'Initial' if version.is_initial else f'v{version.version_number}'
                    self.stdout.write(
                        f'  Version {version.version_id} ({version_label}): '
                        f'Capturing {len(technical_data)} technical fields'
                    )
                    
                    if not dry_run:
                        version.technical_data_snapshot = technical_data
                        version.save(update_fields=['technical_data_snapshot'])
                    
                    updated_count += 1
            
            # Progress update
            processed = min(i + batch_size, total_count)
            self.stdout.write(f'Processed {processed}/{total_count} versions...')
        
        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'=== Summary ==='))
        self.stdout.write(f'Total versions checked: {total_count}')
        self.stdout.write(f'Versions updated: {updated_count}')
        self.stdout.write(f'Versions skipped (already had snapshot): {skipped_count}')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nDRY RUN - No changes were made'))
        else:
            self.stdout.write(self.style.SUCCESS('\nDone!'))
