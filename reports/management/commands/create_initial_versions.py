# reports/management/commands/create_initial_versions.py
"""
Management command to create Initial Version snapshots for all existing production sites.

The Initial Version is a baseline snapshot that:
- Has version_number = 0
- Has is_initial = True
- Has version_notes = "Initial Version"
- Cannot be deleted
- Captures the current state of company info, contacts, notes, and technical fields

Usage:
    python manage.py create_initial_versions
    python manage.py create_initial_versions --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from reports.company_models import Company, ProductionSite, ProductionSiteVersion


class Command(BaseCommand):
    help = 'Create Initial Version snapshots for all existing production sites'

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
        
        # Find all production sites that don't have an initial version
        sites_without_initial = []
        sites_with_initial = 0
        
        for site in ProductionSite.objects.all().select_related('company'):
            has_initial = site.versions.filter(is_initial=True).exists()
            if has_initial:
                sites_with_initial += 1
            else:
                sites_without_initial.append(site)
        
        self.stdout.write(f'Found {len(sites_without_initial)} sites without Initial Version')
        self.stdout.write(f'Found {sites_with_initial} sites already with Initial Version')
        
        if not sites_without_initial:
            self.stdout.write(self.style.SUCCESS('All sites already have Initial Version'))
            return
        
        created_count = 0
        errors = []
        
        for site in sites_without_initial:
            company = site.company
            
            try:
                if dry_run:
                    self.stdout.write(f'  Would create Initial Version for {company.company_name} - {site.get_category_display()}')
                    created_count += 1
                    continue
                
                with transaction.atomic():
                    # Get the current version to copy technical fields from
                    current_version = site.current_version
                    
                    # Build snapshot data from company
                    company_data_snapshot = {
                        'company_name': company.company_name,
                        'address_1': company.address_1 or '',
                        'address_2': company.address_2 or '',
                        'address_3': company.address_3 or '',
                        'address_4': company.address_4 or '',
                        'region': company.region or '',
                        'country': company.country or '',
                        'geographical_coverage': company.geographical_coverage or '',
                        'phone_number': company.phone_number or '',
                        'company_email': company.company_email or '',
                        'website': company.website or '',
                        'accreditation': company.accreditation or '',
                        'parent_company': company.parent_company or '',
                        'status': company.status,
                        'unique_key': company.unique_key,
                    }
                    
                    contact_data_snapshot = {}
                    for i in range(1, 5):
                        contact_data_snapshot[f'title_{i}'] = getattr(company, f'title_{i}', '') or ''
                        contact_data_snapshot[f'initials_{i}'] = getattr(company, f'initials_{i}', '') or ''
                        contact_data_snapshot[f'surname_{i}'] = getattr(company, f'surname_{i}', '') or ''
                        contact_data_snapshot[f'position_{i}'] = getattr(company, f'position_{i}', '') or ''
                    
                    notes_snapshot = []
                    for note in company.notes.all():
                        notes_snapshot.append({
                            'note_id': str(note.note_id),
                            'note_type': note.note_type,
                            'content': note.content,
                            'created_at': note.created_at.isoformat() if note.created_at else None,
                            'created_by': note.created_by.username if note.created_by else None,
                            'is_pinned': note.is_pinned,
                        })
                    
                    # Fields to exclude when copying technical data
                    excluded_fields = {
                        'version_id', 'id', 'production_site', 'production_site_id',
                        'version_number', 'is_current', 'is_active', 'is_initial',
                        'created_at', 'created_by', 'created_by_id',
                        'verified_at', 'verified_by', 'verified_by_id',
                        'version_notes', 'company_data_snapshot', 'contact_data_snapshot', 'notes_snapshot'
                    }
                    
                    # Copy technical fields from current version
                    version_data = {}
                    if current_version:
                        for field in ProductionSiteVersion._meta.get_fields():
                            if hasattr(field, 'concrete') and field.concrete:
                                field_name = field.name
                                if field_name not in excluded_fields:
                                    try:
                                        version_data[field_name] = getattr(current_version, field_name)
                                    except AttributeError:
                                        pass
                    
                    # Create Initial Version with version_number = 0
                    # Set is_current=False for now (current version will be deleted later)
                    initial_version = ProductionSiteVersion.objects.create(
                        production_site=site,
                        version_number=0,
                        is_current=False,  # Will become current after Version 1 is deleted
                        is_active=True,
                        is_initial=True,
                        version_notes='Initial Version',
                        company_data_snapshot=company_data_snapshot,
                        contact_data_snapshot=contact_data_snapshot,
                        notes_snapshot=notes_snapshot,
                        created_by=company.created_by,
                        **version_data
                    )
                    
                    created_count += 1
                    self.stdout.write(f'  Created Initial Version for {company.company_name} - {site.get_category_display()}')
                    
            except Exception as e:
                errors.append(f'{company.company_name} - {site.get_category_display()}: {str(e)}')
                self.stdout.write(self.style.ERROR(f'  Error for {company.company_name}: {e}'))
        
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(f'DRY RUN: Would create {created_count} Initial Versions'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Created {created_count} Initial Versions'))
        
        if errors:
            self.stdout.write(self.style.ERROR(f'\nErrors ({len(errors)}):'))
            for error in errors:
                self.stdout.write(f'  - {error}')
