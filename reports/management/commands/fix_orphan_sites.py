# reports/management/commands/fix_orphan_sites.py
"""
Fix orphaned production sites that don't have any versions.

This can happen when site creation partially fails - the site is created
but the version creation fails due to validation errors.

Usage:
    python manage.py fix_orphan_sites
    python manage.py fix_orphan_sites --dry-run  # See what would be fixed without making changes
"""

from django.core.management.base import BaseCommand
from reports.company_models import ProductionSite, ProductionSiteVersion


class Command(BaseCommand):
    help = 'Fix orphaned production sites that have no versions'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be fixed without making changes'
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Delete orphaned sites instead of creating versions for them'
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        delete_orphans = options['delete']
        
        # Find sites without any versions
        orphan_sites = ProductionSite.objects.filter(versions__isnull=True)
        
        if not orphan_sites.exists():
            self.stdout.write(self.style.SUCCESS('No orphaned production sites found!'))
            return
        
        self.stdout.write(f'Found {orphan_sites.count()} orphaned production sites:')
        
        for site in orphan_sites:
            self.stdout.write(f'  - {site.company.company_name} - {site.get_category_display()} (site_id: {site.site_id})')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\nDry run - no changes made'))
            return
        
        if delete_orphans:
            # Delete orphaned sites
            count = orphan_sites.count()
            orphan_sites.delete()
            self.stdout.write(self.style.SUCCESS(f'\nDeleted {count} orphaned production sites'))
        else:
            # Create initial version for each orphaned site
            fixed_count = 0
            for site in orphan_sites:
                try:
                    ProductionSiteVersion.objects.create(
                        production_site=site,
                        version_number=1,
                        is_current=True,
                        is_active=True,
                        created_by=site.created_by
                    )
                    fixed_count += 1
                    self.stdout.write(f'  Created version for: {site.company.company_name} - {site.get_category_display()}')
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'  Error creating version for {site.site_id}: {e}'))
            
            self.stdout.write(self.style.SUCCESS(f'\nFixed {fixed_count} orphaned production sites'))
