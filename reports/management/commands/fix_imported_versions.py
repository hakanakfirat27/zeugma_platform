# reports/management/commands/fix_imported_versions.py
"""
Management command to fix imported versions that were created as Version 1 instead of Initial Version.

This command:
1. Finds all ProductionSiteVersions with version_number=1 and no Initial Version (version_number=0)
2. Converts them to Initial Version (version_number=0, is_initial=True)
3. Adds snapshot data if missing

Usage:
    python manage.py fix_imported_versions
    python manage.py fix_imported_versions --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from reports.company_models import (
    Company, ProductionSite, ProductionSiteVersion
)


# Company-level fields for snapshots
COMMON_FIELDS = ['company_name', 'address_1', 'address_2', 'address_3', 'address_4', 
                 'region', 'country', 'geographical_coverage', 'phone_number', 
                 'company_email', 'website', 'accreditation', 'parent_company']

CONTACT_FIELDS = ['title_1', 'initials_1', 'surname_1', 'position_1', 
                  'title_2', 'initials_2', 'surname_2', 'position_2', 
                  'title_3', 'initials_3', 'surname_3', 'position_3', 
                  'title_4', 'initials_4', 'surname_4', 'position_4']


class Command(BaseCommand):
    help = 'Fix imported versions that were created as Version 1 instead of Initial Version'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made\n'))
        
        # Find all production sites that have Version 1 but no Initial Version (version_number=0)
        sites_to_fix = []
        
        for site in ProductionSite.objects.all():
            versions = list(site.versions.order_by('version_number'))
            
            if not versions:
                continue
            
            # Check if there's no Initial Version (version_number=0)
            has_initial = any(v.version_number == 0 for v in versions)
            has_version_1 = any(v.version_number == 1 for v in versions)
            
            if not has_initial and has_version_1:
                # Find the version to convert (the lowest version number, which should be 1)
                version_to_fix = min(versions, key=lambda v: v.version_number)
                sites_to_fix.append((site, version_to_fix))
        
        self.stdout.write(f'Found {len(sites_to_fix)} production sites to fix\n')
        
        if not sites_to_fix:
            self.stdout.write(self.style.SUCCESS('No fixes needed!'))
            return
        
        fixed_count = 0
        
        for site, version in sites_to_fix:
            company = site.company
            
            self.stdout.write(f'  Fixing: {company.company_name} - {site.get_category_display()} (Version {version.version_number})')
            
            if not dry_run:
                with transaction.atomic():
                    # Update version to be Initial Version
                    version.version_number = 0
                    version.is_initial = True
                    version.version_notes = 'Initial Version'
                    
                    # Add snapshot data if missing
                    if not version.company_data_snapshot:
                        company_snapshot = {}
                        for field in COMMON_FIELDS:
                            company_snapshot[field] = getattr(company, field, '') or ''
                        version.company_data_snapshot = company_snapshot
                    
                    if not version.contact_data_snapshot:
                        contact_snapshot = {}
                        for field in CONTACT_FIELDS:
                            contact_snapshot[field] = getattr(company, field, '') or ''
                        version.contact_data_snapshot = contact_snapshot
                    
                    if version.notes_snapshot is None:
                        version.notes_snapshot = []
                    
                    version.save()
                    
                    fixed_count += 1
        
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(f'Would fix {len(sites_to_fix)} versions'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Fixed {fixed_count} versions!'))
