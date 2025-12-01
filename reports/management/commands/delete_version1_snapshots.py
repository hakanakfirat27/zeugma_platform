# reports/management/commands/delete_version1_snapshots.py
"""
Management command to delete all Version 1 (Current) snapshots.

After running create_initial_versions, each production site has:
- Initial Version (version_number = 0, is_initial = True)
- Version 1 (version_number = 1, is_current = True)

This command removes all Version 1 snapshots and makes Initial Version the current version.

Usage:
    python manage.py delete_version1_snapshots --dry-run
    python manage.py delete_version1_snapshots
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from reports.company_models import ProductionSite, ProductionSiteVersion


class Command(BaseCommand):
    help = 'Delete all Version 1 (Current) snapshots, keeping only Initial Versions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without making them'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))
        
        # Find all Version 1 snapshots
        version1_snapshots = ProductionSiteVersion.objects.filter(
            version_number=1
        ).select_related('production_site', 'production_site__company')
        
        count = version1_snapshots.count()
        self.stdout.write(f'Found {count} Version 1 snapshots to delete')
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No Version 1 snapshots to delete'))
            return
        
        deleted_count = 0
        errors = []
        
        for version in version1_snapshots:
            site = version.production_site
            company_name = site.company.company_name if site.company else 'Unknown'
            category = site.get_category_display()
            
            try:
                if dry_run:
                    self.stdout.write(f'  Would delete Version 1 for {company_name} - {category}')
                    deleted_count += 1
                    continue
                
                with transaction.atomic():
                    # Find the Initial Version for this site
                    initial_version = ProductionSiteVersion.objects.filter(
                        production_site=site,
                        is_initial=True
                    ).first()
                    
                    # If no initial version with is_initial=True, check for version_number=0
                    if not initial_version:
                        initial_version = ProductionSiteVersion.objects.filter(
                            production_site=site,
                            version_number=0
                        ).first()
                    
                    if initial_version:
                        # Make Initial Version the current version
                        initial_version.is_current = True
                        initial_version.save()
                    
                    # Delete Version 1
                    version.delete()
                    deleted_count += 1
                    
                    self.stdout.write(f'  Deleted Version 1 for {company_name} - {category}')
                    
            except Exception as e:
                errors.append(f'{company_name} - {category}: {str(e)}')
                self.stdout.write(self.style.ERROR(f'  Error for {company_name} - {category}: {e}'))
        
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(f'DRY RUN: Would delete {deleted_count} Version 1 snapshots'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Deleted {deleted_count} Version 1 snapshots'))
        
        if errors:
            self.stdout.write(self.style.ERROR(f'\nErrors ({len(errors)}):'))
            for error in errors:
                self.stdout.write(f'  - {error}')
